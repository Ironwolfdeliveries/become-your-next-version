import { NextResponse } from "next/server";
import { buildGuidedKaiResponse } from "@/lib/kai-guided";
import type { KaiLiveConfig } from "@/lib/kai-mode";
import { getKaiLiveConfig } from "@/lib/kai-mode";
import { getKaiMemberContext, KAI_SYSTEM_PROMPT } from "@/lib/kai-server";
import { getKaiPageContext } from "@/lib/kai-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type KaiPayload = { message?: string; route?: string; intent?: string; conversationId?: string | null };
type AuthenticatedUser = { id: string };

function monthStart() {
  const date = new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)).toISOString();
}

function dayStart() {
  const date = new Date();
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())).toISOString();
}

async function saveConversation(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  conversationId: string | null,
  message: string,
  answer: string,
  route: string,
) {
  let id = conversationId;
  if (id) {
    const { data } = await supabase.from("kai_conversations").select("id").eq("id", id).eq("user_id", userId).maybeSingle();
    if (!data) id = null;
  }
  if (!id) {
    const { data } = await supabase.from("kai_conversations").insert({ user_id: userId, title: message.slice(0, 80) }).select("id").single();
    id = data?.id ?? null;
  }
  if (id) {
    await supabase.from("kai_messages").insert([
      { conversation_id: id, user_id: userId, role: "user", content: message, route },
      { conversation_id: id, user_id: userId, role: "assistant", content: answer, route },
    ]);
  }
  return id;
}

async function liveEligibility(
  config: KaiLiveConfig,
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: AuthenticatedUser,
) {
  const { data: membership } = await supabase.from("memberships").select("tier,status").eq("user_id", user.id).maybeSingle();
  const paidActive = membership?.status === "active" || membership?.status === "trialing";
  if (!paidActive || !membership?.tier || !config.eligibleTiers.has(membership.tier)) return null;
  const [{ count: dailyCount }, { count: monthlyCount }] = await Promise.all([
    supabase.from("kai_usage_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("mode", "live").gte("created_at", dayStart()),
    supabase.from("kai_usage_events").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("mode", "live").gte("created_at", monthStart()),
  ]);
  if ((dailyCount ?? 0) >= config.dailyAllowance || (monthlyCount ?? 0) >= config.monthlyAllowance) return null;
  const { data: spendRows, error } = await createAdminClient().from("kai_usage_events").select("estimated_cost_micro_usd").eq("mode", "live").gte("created_at", monthStart());
  if (error) return null;
  const spend = (spendRows ?? []).reduce((sum, row) => sum + Number(row.estimated_cost_micro_usd ?? 0), 0);
  if (spend + config.maxRequestCostMicroUsd > config.monthlyBudgetMicroUsd) return null;
  return membership;
}

async function runLiveKai(args: {
  config: KaiLiveConfig;
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: AuthenticatedUser;
  message: string;
  route: string;
  conversationId: string | null;
}) {
  const { config, supabase, user, message, route } = args;
  const eligible = await liveEligibility(config, supabase, user);
  if (!eligible || message.length > config.maxInputChars) return null;
  const [{ default: OpenAI }, context] = await Promise.all([import("openai"), getKaiMemberContext(supabase, user.id)]);
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const moderation = await openai.moderations.create({ model: "omni-moderation-latest", input: message });
  if (moderation.results[0]?.flagged) return { blocked: true as const };
  const page = getKaiPageContext(route);
  let conversationId = args.conversationId;
  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (conversationId) {
    const { data: valid } = await supabase.from("kai_conversations").select("id").eq("id", conversationId).eq("user_id", user.id).maybeSingle();
    if (valid) {
      const { data } = await supabase.from("kai_messages").select("role,content").eq("conversation_id", conversationId).eq("user_id", user.id).order("created_at", { ascending: true }).limit(12);
      history = (data ?? []) as Array<{ role: "user" | "assistant"; content: string }>;
    } else conversationId = null;
  }
  const assessmentMode = route === "/assessment" || route === "/architect-assessment";
  const input = [
    { role: "system" as const, content: `Current page: ${page.title}. Page purpose: ${page.purpose}. Assessment safeguard active: ${assessmentMode}. Permitted private member context: ${JSON.stringify(context)}. Journal entries are deliberately excluded.` },
    ...history,
    { role: "user" as const, content: message },
  ];
  const response = await openai.responses.create({ model: process.env.OPENAI_MODEL || "gpt-5-mini", instructions: KAI_SYSTEM_PROMPT, input, max_output_tokens: config.maxOutputTokens });
  const answer = response.output_text.trim();
  if (!answer) return null;
  conversationId = await saveConversation(supabase, user.id, conversationId, message, answer, route);
  const inputTokens = response.usage?.input_tokens ?? 0;
  const outputTokens = response.usage?.output_tokens ?? 0;
  const estimatedCost = Math.ceil((inputTokens * config.inputMicroUsdPerMillionTokens + outputTokens * config.outputMicroUsdPerMillionTokens) / 1_000_000);
  await createAdminClient().from("kai_usage_events").insert({ user_id: user.id, mode: "live", input_tokens: inputTokens, output_tokens: outputTokens, estimated_cost_micro_usd: estimatedCost });
  return { answer, conversationId, mode: "LIVE" as const };
}

export async function POST(request: Request) {
  const payload = await request.json() as KaiPayload;
  const message = payload.message?.trim() ?? "";
  const route = payload.route?.startsWith("/") ? payload.route.slice(0, 300) : "/";
  if (!message || message.length > 1000) return NextResponse.json({ error: "Enter a question of 1,000 characters or fewer." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const liveConfig = getKaiLiveConfig();
  if (liveConfig && user) {
    try {
      const live = await runLiveKai({ config: liveConfig, supabase, user, message, route, conversationId: payload.conversationId ?? null });
      if (live?.blocked) return NextResponse.json({ error: "Kai cannot help with that request. If this involves immediate danger, contact local emergency services." }, { status: 400 });
      if (live) return NextResponse.json(live);
    } catch (error) {
      console.error("kai_live_request_failed_falling_back_to_guided", error);
    }
  }

  const page = getKaiPageContext(route);
  const assessmentMode = route === "/assessment" || route === "/architect-assessment";
  const context = user ? await getKaiMemberContext(supabase, user.id).catch(() => null) : null;
  const guided = buildGuidedKaiResponse({ message, intent: payload.intent, page, context, assessmentMode });
  let conversationId = payload.conversationId ?? null;
  if (user) conversationId = await saveConversation(supabase, user.id, conversationId, message, guided.answer, route).catch(() => conversationId);
  return NextResponse.json({ ...guided, conversationId, mode: "GUIDED" as const });
}
