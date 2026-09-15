import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { getExperience } from "@/lib/experience-server";
import { memberDate } from "@/lib/experience";
import type { JourneyState } from "@/lib/journey";

export const getMemberJourney = cache(async (): Promise<JourneyState> => {
  if (!hasSupabaseConfig) return { signedIn: false, assessmentComplete: false, activeCycle: false };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, assessmentComplete: false, activeCycle: false };
  if (error) return { signedIn: true, assessmentComplete: null, activeCycle: false };
  const [assessment, cycle, profile] = await Promise.all([
    supabase.from("architect_assessments").select("id").eq("user_id", user.id).eq("status", "completed").limit(1),
    supabase.from("architect_cycles").select("id,ends_on").eq("user_id", user.id).eq("status", "active").order("created_at", { ascending: false }).limit(1),
    supabase.from("profiles").select("onboarding_completed,timezone").eq("id", user.id).maybeSingle(),
  ]);
  return { signedIn: true, assessmentComplete: assessment.error || cycle.error ? null : Boolean(assessment.data?.length), activeCycle: Boolean(cycle.data?.length), orientationComplete: Boolean(profile.data?.onboarding_completed), cycleReviewDue: Boolean(cycle.data?.[0]?.ends_on && cycle.data[0].ends_on < memberDate(profile.data?.timezone || "America/New_York")) };
});

export async function getJourneyContext(userId: string) {
  const state = await getExperience(userId);
  const priority = state.priorities[0];
  return { priority: priority?.label ?? "", firstAction: state.cycle?.plan_steps[0] || (!state.cycle ? state.firstActions.find(item=>item.key===priority?.key)?.action : "") || "", cycle: state.cycle, daily: state.daily, goal: state.goals.find(goal=>goal.status==="active")?.title ?? "" };
}
