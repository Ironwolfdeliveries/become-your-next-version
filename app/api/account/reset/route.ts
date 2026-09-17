import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resetSummary, validateReset } from "@/lib/next-version-reset";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: Request) {
  const reply = (body: object, status: number) => NextResponse.json(body, { status, headers });
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return reply({ error: "Open BYNV to save this Reset." }, 403);
    const client = await createClient(); const { data: { user }, error: authError } = await client.auth.getUser();
    if (authError || !user) return reply({ error: "Sign in to save your Reset." }, 401);
    const raw = await request.text(); if (raw.length > 10000) return reply({ error: "Keep your Reset brief." }, 400);
    let body, answers;
    try { body = JSON.parse(raw); answers = validateReset(body?.answers); } catch { return reply({ error: "Please review your direction and next action." }, 400); }
    if (!["journal", "goal"].includes(body.kind) || typeof body.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)) return reply({ error: "Please reload your Reset." }, 400);
    const journal = body.kind === "journal", table = journal ? "journal_entries" : "goals";
    const values = journal ? { title: "Next Version Reset", content: resetSummary(answers) } : { title: answers.direction, success_vision: answers.change || null };
    const { error } = await client.from(table).insert({ id: body.id, user_id: user.id, ...values });
    if (error?.code === "23505") {
      // A retry can confirm an identical, owned record; it can never overwrite one.
      const { data, error: readError } = await client.from(table).select(journal ? "title,content" : "title,success_vision").eq("id", body.id).eq("user_id", user.id).single();
      const row = data as unknown as Record<string, unknown> | null;
      if (readError || !row || !Object.entries(values).every(([key, value]) => row[key] === value)) return reply({ error: "This saved Reset changed. Start a new Reset to save a different direction." }, 409);
    } else if (error) return reply({ error: "Your Reset could not be saved. Your answers are still here; try again." }, 503);
    return reply({ ok: true, id: body.id }, 200);
  } catch { return reply({ error: "Your Reset could not be saved. Please try again." }, 503); }
}
