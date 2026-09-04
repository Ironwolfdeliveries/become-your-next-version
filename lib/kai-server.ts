import type { SupabaseClient } from "@supabase/supabase-js";
import type { KaiMemberContext } from "./kai-guided";

export const KAI_SYSTEM_PROMPT = `You are Kai, the BYNV guide. Your voice is calm, direct, practical, warm, and concise. You help a member understand BYNV, see the next useful action, and connect their choices to their own saved context. Never use inflated promises, shame, dependency language, or generic motivational filler.

Safety and boundaries:
- You are not a therapist, clinician, crisis service, doctor, lawyer, or financial adviser. Do not diagnose or claim professional authority. Encourage qualified or emergency support when appropriate.
- Treat all member context as private. Never suggest posting assessment answers, scores, Blueprint details, journal content, or Kai conversations publicly.
- During the Version Snapshot or Architect Assessment, you may explain wording or purpose, but you must never recommend, imply, or narrow toward a specific answer, score, or 1–5 response.
- Never claim a BYNV feature, entitlement, payment, or human service exists unless the supplied context says it does.
- Help members identify repeatable work AI can assist with, including what not to delegate, what context to provide, and how to verify the result. Never invent time-savings estimates.
- Do not create artificial lock-in. When useful, teach a member how to structure the same responsible handoff for another AI assistant they choose.
- Prefer one clear explanation and one realistic next step. Ask a short clarifying question only when needed.`;

export async function getKaiMemberContext(supabase: SupabaseClient, userId: string): Promise<KaiMemberContext> {
  const today = new Date().toISOString().slice(0, 10);
  const [snapshot, assessment, blueprint, goals, focus, cycles, challenges, completedFocus, completedGoals, completedCycles, snapshotHistory] = await Promise.all([
    supabase.from("version_snapshots").select("score,focus,area_results,strongest_areas,opportunity_areas,completed_at").eq("user_id", userId).order("completed_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("architect_assessments").select("status,version_score,section_results,completed_at").eq("user_id", userId).eq("version", 1).maybeSingle(),
    supabase.from("architect_blueprints").select("priorities,strengths,first_actions,status").eq("user_id", userId).eq("status", "active").order("updated_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("goals").select("title,pillar_key,status,target_date").eq("user_id", userId).in("status", ["active", "completed"]).limit(20),
    supabase.from("daily_focus_entries").select("priority,action,completed,reflection").eq("user_id", userId).eq("focus_date", today).maybeSingle(),
    supabase.from("architect_cycles").select("focus,outcome,status,starts_on,ends_on").eq("user_id", userId).order("created_at", { ascending: false }).limit(5),
    supabase.from("challenge_enrollments").select("challenge_key,status,progress,started_at").eq("user_id", userId).order("updated_at", { ascending: false }).limit(10),
    supabase.from("daily_focus_entries").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("completed", true),
    supabase.from("goals").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("architect_cycles").select("id", { count: "exact", head: true }).eq("user_id", userId).eq("status", "completed"),
    supabase.from("version_snapshots").select("id", { count: "exact", head: true }).eq("user_id", userId),
  ]);
  return {
    versionSnapshot: snapshot.data,
    architectAssessment: assessment.data,
    blueprint: blueprint.data,
    goals: goals.data ?? [],
    dailyFocus: focus.data,
    architectCycles: cycles.data ?? [],
    challenges: challenges.data ?? [],
    progress: {
      completedDailyFocusCount: completedFocus.count ?? 0,
      completedGoalCount: completedGoals.count ?? 0,
      completedCycleCount: completedCycles.count ?? 0,
      snapshotCount: snapshotHistory.count ?? 0,
    },
  };
}
