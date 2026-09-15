import "server-only";
import { createClient } from "@/lib/supabase/server";
import { memberDate, needsRecovery, type BlueprintArea, type Cycle, type DailyEntry, type Experience, type Goal } from "@/lib/experience";

const dailyColumns = "id,focus_date,priority,action,completed,reflection,steps,check_in,recovery,cycle_id,updated_at";
const cycleColumns = "id,focus,starts_on,ends_on,status,outcome,success_vision,plan_steps,commitment_rule,pillar_key,goal_id,completed_at,updated_at";

export async function getExperience(userId: string): Promise<Experience> {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user || user.id !== userId) throw new Error("Sign in to continue your plan.");
  const [profile, assessment, cycles, goals] = await Promise.all([
    supabase.from("profiles").select("display_name,onboarding_completed,timezone").eq("id", userId).single(),
    supabase.from("architect_assessments").select("id,version_score,section_results").eq("user_id", userId).eq("status", "completed").order("completed_at", { ascending: false }).order("version", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("architect_cycles").select(cycleColumns).eq("user_id", userId).order("created_at", { ascending: false }),
    supabase.from("goals").select("id,title,pillar_key,status,target_date,success_vision,commitment_rule,advanced_at").eq("user_id", userId).neq("status", "archived").order("created_at", { ascending: false }),
  ]);
  if ([profile, assessment, cycles, goals].some(result => result.error)) throw new Error("Your saved journey could not be loaded. Please try again.");
  const blueprint = assessment.data
    ? await supabase.from("architect_blueprints").select("strengths,priorities,first_actions").eq("user_id", userId).eq("assessment_id", assessment.data.id).maybeSingle()
    : { data: null, error: null };
  if (blueprint.error) throw new Error("Your saved Blueprint could not be loaded. Please try again.");
  // Page through the entire history: a database response limit must not silently
  // reset momentum totals or hide an older unresolved commitment.
  const recent: DailyEntry[] = [];
  let total = Infinity;
  while (recent.length < total) {
    const { data, count, error } = await supabase.from("daily_focus_entries").select(dailyColumns, { count: "exact" }).eq("user_id", userId).order("focus_date", { ascending: false }).range(recent.length, recent.length + 999);
    if (error) throw new Error("Your action history could not be loaded. Please try again.");
    total = count ?? recent.length + (data?.length ?? 0);
    if (!data?.length) break;
    recent.push(...data as DailyEntry[]);
  }
  let timezone = profile.data?.timezone || "America/New_York";
  try { memberDate(timezone); } catch { timezone = "America/New_York"; }
  const today = memberDate(timezone);
  const savedCycles = (cycles.data ?? []) as Cycle[];
  return {
    today, timezone, name: profile.data?.display_name?.trim().split(/\s+/)[0] || "Architect",
    orientationComplete: Boolean(profile.data?.onboarding_completed),
    assessmentComplete: Boolean(assessment.data), score: assessment.data?.version_score ?? null,
    strengths: (blueprint.data?.strengths ?? []) as BlueprintArea[],
    priorities: (blueprint.data?.priorities ?? []) as BlueprintArea[],
    firstActions: (blueprint.data?.first_actions ?? []) as Experience["firstActions"],
    cycle: savedCycles.find(cycle => cycle.status === "active") ?? null, cycles: savedCycles,
    daily: recent.find(entry => entry.focus_date === today) ?? null, recent,
    unresolved: recent.filter(entry => needsRecovery(entry, today)), goals: (goals.data ?? []) as Goal[],
  };
}
