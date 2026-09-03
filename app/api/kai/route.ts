import { NextResponse } from "next/server";
import OpenAI from "openai";
import { createClient } from "@/lib/supabase/server";
import { getKaiMemberContext, KAI_SYSTEM_PROMPT } from "@/lib/kai-server";
import { getKaiPageContext } from "@/lib/kai-context";

type KaiPayload = { message?: string; route?: string; conversationId?: string | null };

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in to use live Kai coaching." }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "Live Kai is not activated yet. Your question was not sent or saved." }, { status: 503 });
  const payload = await request.json() as KaiPayload;
  const message = payload.message?.trim() ?? "";
  const route = payload.route?.startsWith("/") ? payload.route.slice(0, 300) : "/";
  if (!message || message.length > 1000) return NextResponse.json({ error: "Enter a question of 1,000 characters or fewer." }, { status: 400 });

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: membership } = await supabase.from("memberships").select("tier,status").eq("user_id", user.id).maybeSingle();
  const paidActive = membership?.status === "active" || membership?.status === "trialing";
  const hourlyLimit = paidActive && (membership?.tier === "architect" || membership?.tier === "architect_coaching") ? 60 : paidActive && membership?.tier === "builder" ? 30 : 8;
  const { count } = await supabase.from("kai_usage_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", since);
  if ((count ?? 0) >= hourlyLimit) return NextResponse.json({ error: "Kai has reached the hourly limit for this membership. Try again later." }, { status: 429 });

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const moderation = await openai.moderations.create({ model: "omni-moderation-latest", input: message });
    if (moderation.results[0]?.flagged) return NextResponse.json({ error: "Kai cannot help with that request. If this involves immediate danger, contact local emergency services." }, { status: 400 });
    const context = await getKaiMemberContext(supabase, user.id);
    const page = getKaiPageContext(route);
    let conversationId = payload.conversationId ?? null;
    if (conversationId) {
      const { data } = await supabase.from("kai_conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
      if (!data) conversationId = null;
    }
    if (!conversationId) {
      const { data, error } = await supabase.from("kai_conversations").insert({ user_id: user.id, title: message.slice(0, 80) }).select("id").single();
      if (error) throw error;
      conversationId = data.id;
    }
    const { data: history } = await supabase.from("kai_messages").select("role,content").eq("conversation_id", conversationId).eq("user_id", user.id).order("created_at", { ascending: true }).limit(12);
    const assessmentMode = route === "/assessment" || route === "/architect-assessment";
    const input = [
      { role: "system" as const, content: `Current page: ${page.title}. Page purpose: ${page.purpose}. Assessment safeguard active: ${assessmentMode}. Permitted private member context: ${JSON.stringify(context)}. Journal entries are deliberately excluded unless a future explicit opt-in is implemented.` },
      ...(history ?? []).map((item) => ({ role: item.role as "user" | "assistant", content: item.content })),
      { role: "user" as const, content: message },
    ];
    const response = await openai.responses.create({ model: process.env.OPENAI_MODEL || "gpt-5-mini", instructions: KAI_SYSTEM_PROMPT, input, max_output_tokens: 500 });
    const answer = response.output_text.trim();
    if (!answer) throw new Error("Kai returned an empty response.");
    const { error: saveError } = await supabase.from("kai_messages").insert([{ conversation_id: conversationId, user_id: user.id, role: "user", content: message, route }, { conversation_id: conversationId, user_id: user.id, role: "assistant", content: answer, route }]);
    if (saveError) throw saveError;
    await supabase.from("kai_usage_events").insert({ user_id: user.id });
    return NextResponse.json({ answer, conversationId });
  } catch (error) {
    console.error("kai_request_failed", error);
    return NextResponse.json({ error: "Kai could not respond right now. Your question was not added to a conversation." }, { status: 500 });
  }
}
