import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getExperience } from "@/lib/experience-server";
import { commitmentRules } from "@/lib/experience";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const areas = new Set(["clarity", "energy", "action", "resilience", "relationships", "environment", "growth"]);
class InputError extends Error {}
function text(value: unknown, name: string, maximum: number, required = false) {
  if (typeof value !== "string" || value.length > maximum || (required && !value.trim())) throw new InputError(`Please check ${name}.`);
  return value.trim();
}
function nullableId(value: unknown, name: string) { if (value == null) return null; if (typeof value !== "string" || !uuid.test(value)) throw new InputError(`Please check ${name}.`); return value; }
function date(value: unknown) { if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new InputError("Choose a valid date."); return value; }
function version(value: unknown) { if (value === null) return null; if (typeof value !== "string" || value.length > 40 || !/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value))) throw new InputError("Reload your saved plan before trying again."); return value; }
function rule(value: unknown) { if (value == null) return null; if (!commitmentRules.some(rule => rule.key === value)) throw new InputError("Choose one of the commitment rules."); return value; }
function validate(body: Record<string, unknown>): Record<string, unknown> {
  const action = body.action;
  if (action === "save-day") {
    if (!Array.isArray(body.steps) || body.steps.length < 1 || body.steps.length > 3) throw new InputError("Choose one to three realistic steps.");
    const steps = body.steps.map(step => {
      if (!step || typeof step !== "object" || Array.isArray(step) || typeof step.done !== "boolean") throw new InputError("Please check your steps.");
      return { id: text(step.id, "the step", 80, true), text: text(step.text, "your action", 1000, true), done: step.done };
    });
    if (new Set(steps.map(step => step.id)).size !== steps.length) throw new InputError("Each step needs its own identity. Reload your plan.");
    if (body.check_in !== null && !["done", "progress", "missed"].includes(String(body.check_in))) throw new InputError("Choose how today went.");
    return { action, date: date(body.date), priority: text(body.priority, "today’s priority", 200), steps, check_in: body.check_in, reflection: text(body.reflection, "your note", 2000), expected_updated_at: version(body.expected_updated_at), cycle_id: nullableId(body.cycle_id, "your cycle") };
  }
  if (action === "recover") {
    if (!["keep", "shrink", "reschedule", "replace"].includes(String(body.strategy))) throw new InputError("Choose how you want to adjust the action.");
    const entryId = nullableId(body.entry_id, "the original action"); if (!entryId) throw new InputError("Choose an action to recover.");
    return { action, entry_id: entryId, strategy: body.strategy, next_date: date(body.next_date), next_action: text(body.next_action, "your next action", 1000, true), blocker: body.blocker == null ? "" : text(body.blocker, "what got in the way", 1000), expected_updated_at: version(body.expected_updated_at) };
  }
  if (action === "start-cycle") {
    if (!Array.isArray(body.plan_steps) || body.plan_steps.length < 1 || body.plan_steps.length > 3) throw new InputError("Choose one to three steps for your cycle.");
    if (body.pillar_key != null && !areas.has(String(body.pillar_key))) throw new InputError("Choose an area of your life.");
    return { action, focus: text(body.focus, "what you want to improve", 240, true), success_vision: text(body.success_vision, "meaningful progress", 1000, true), plan_steps: body.plan_steps.map(step => text(step, "your plan", 1000, true)), commitment_rule: rule(body.commitment_rule), pillar_key: body.pillar_key ?? null, goal_id: nullableId(body.goal_id, "your goal") };
  }
  if (action === "review-cycle") {
    const cycleId = nullableId(body.cycle_id, "your cycle"); if (!cycleId) throw new InputError("Choose a cycle to review.");
    return { action, cycle_id: cycleId, outcome: text(body.outcome, "your review", 3000), expected_updated_at: version(body.expected_updated_at) };
  }
  if (action === "orientation") {
    const timezone = body.timezone == null ? "America/New_York" : text(body.timezone, "your timezone", 64, true);
    try { new Intl.DateTimeFormat("en", { timeZone: timezone }).format(); } catch { throw new InputError("Choose a valid timezone."); }
    return { action, timezone };
  }
  throw new InputError("That change is not supported.");
}

export async function GET() {
  try {
    const supabase = await createClient(); const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return NextResponse.json({ error: "Sign in to continue your plan." }, { status: 401, headers });
    return NextResponse.json(await getExperience(user.id), { headers });
  } catch { return NextResponse.json({ error: "Your saved journey could not be loaded. Please try again." }, { status: 503, headers }); }
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: "Open BYNV to save this change." }, { status: 403, headers });
    const supabase = await createClient(); const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Sign in to continue your plan." }, { status: 401, headers });
    const raw = await request.text(); if (raw.length > 16000) throw new InputError("This plan is too long. Keep the next steps small.");
    let parsed: unknown; try { parsed = JSON.parse(raw); } catch { throw new InputError("That change could not be read. Please try again."); }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new InputError("Please check your change.");
    const payload = validate(parsed as Record<string, unknown>);
    const { error } = await supabase.rpc("bynv_change_experience", { p_payload: payload });
    if (error) {
      if (["40001", "23505", "P0002"].includes(error.code)) return NextResponse.json({ error: error.code === "40001" ? error.message : "Your saved plan changed. Reload it before trying again." }, { status: 409, headers });
      if (["22023", "22P02", "22007", "22008", "23514"].includes(error.code)) return NextResponse.json({ error: error.code === "22023" ? error.message : "Please check your plan and try again." }, { status: 400, headers });
      if (error.code === "42501") return NextResponse.json({ error: "That saved item is not available to your account." }, { status: 403, headers });
      return NextResponse.json({ error: "Your change could not be saved. Your entries are still here; try again." }, { status: 503, headers });
    }
    return NextResponse.json({ ok: true }, { headers });
  } catch (error) { return NextResponse.json({ error: error instanceof InputError ? error.message : "Your change could not be saved. Please try again." }, { status: error instanceof InputError ? 400 : 503, headers }); }
}
