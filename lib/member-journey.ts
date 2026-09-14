import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import type { JourneyState } from "@/lib/journey";

export const getMemberJourney = cache(async (): Promise<JourneyState> => {
  if (!hasSupabaseConfig) return { signedIn: false, assessmentComplete: false, activeCycle: false };
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (!user) return { signedIn: false, assessmentComplete: false, activeCycle: false };
  if (error) return { signedIn: true, assessmentComplete: null, activeCycle: false };
  const [assessment, cycle] = await Promise.all([
    supabase.from("architect_assessments").select("id").eq("user_id", user.id).eq("status", "completed").limit(1),
    supabase.from("architect_cycles").select("id").eq("user_id", user.id).eq("status", "active").limit(1),
  ]);
  return { signedIn: true, assessmentComplete: assessment.error || cycle.error ? null : Boolean(assessment.data?.length), activeCycle: Boolean(cycle.data?.length) };
});

export async function getJourneyContext(userId: string) {
  const supabase = await createClient();
  const [blueprint, cycle, daily, goal] = await Promise.all([
    supabase.from("architect_blueprints").select("priorities,first_actions").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("architect_cycles").select("id,focus,starts_on,ends_on").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("daily_focus_entries").select("priority,action,completed").eq("user_id", userId).eq("focus_date", new Date().toISOString().slice(0,10)).maybeSingle(),
    supabase.from("goals").select("title").eq("user_id", userId).eq("status", "active").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ]);
  for (const result of [blueprint, cycle, daily, goal]) if (result.error) throw new Error("Your journey could not be loaded. Please try again.");
  const priorities = blueprint.data?.priorities as { key: string; label: string }[] | undefined;
  const actions = blueprint.data?.first_actions as { key: string; action: string }[] | undefined;
  const priority = priorities?.[0];
  return { priority: priority?.label ?? "", firstAction: actions?.find(item => item.key === priority?.key)?.action ?? "", cycle: cycle.data, daily: daily.data, goal: goal.data?.title ?? "" };
}
