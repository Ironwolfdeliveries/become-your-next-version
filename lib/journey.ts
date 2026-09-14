export type JourneyState = { signedIn: boolean; assessmentComplete: boolean | null; activeCycle: boolean };
export function nextJourneyAction(state: JourneyState) {
  if (!state.signedIn) return { href: "/assessment", label: "Free assessment", title: "Your next version starts with a clearer question.", copy: "Take the free Version Snapshot to see where you are now and choose a practical next step." };
  if (state.assessmentComplete === null) return { href: "/dashboard", label: "Dashboard", title: "Your BYNV, ready when you are.", copy: "Open your dashboard to continue your work." };
  if (!state.assessmentComplete) return { href: "/architect-assessment", label: "Continue assessment", title: "Pick up where you left off.", copy: "Continue your Architect Assessment. Your saved answers are waiting for you." };
  if (!state.activeCycle) return { href: "/architect-cycle", label: "Start my cycle", title: "Turn your Blueprint into momentum.", copy: "Choose your priority, begin a focused cycle, and take one practical action today." };
  return { href: "/daily-focus", label: "Today's focus", title: "Continue today's work.", copy: "Connect your current cycle to one action, then reflect on what changed." };
}
export function cycleProgress(startsOn: string, endsOn: string, today = new Date().toISOString().slice(0, 10)) {
  const total = Math.max(1, Math.round((Date.parse(endsOn) - Date.parse(startsOn)) / 86400000) + 1);
  const day = Math.min(total, Math.max(1, Math.floor((Date.parse(today) - Date.parse(startsOn)) / 86400000) + 1));
  return { total, day, percent: Math.round(day / total * 100), reviewDue: today > endsOn };
}
