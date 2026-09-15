import { addDays, entryStatus, entrySteps, momentum, type Experience } from "./experience.ts";
export function nextExperienceStep(state: Experience) {
  const name = state.name.split(/\s+/)[0] || "Architect", stats = momentum(state.recent, state.today);
  if (!state.assessmentComplete) return { greeting: `Welcome, ${name}. Let’s find your starting point.`, message: "Your saved assessment is ready to continue. We’ll use it to build a plan that fits you.", href: "/architect-assessment", label: "Continue my assessment" };
  if (state.cycle && state.cycle.ends_on < state.today) return { greeting: `${name}, your Cycle is ready for a review.`, message: `You worked on “${state.cycle.focus}”. Let’s look at what changed and choose what to carry into the next two weeks.`, href: "/architect-cycle", label: "Review my Cycle" };
  if (state.unresolved.length) {
    const entry = state.unresolved[0], inactive = entry.focus_date < addDays(state.today, -2);
    return { greeting: inactive ? `Welcome back, ${name}. One small move is enough to restart.` : `${name}, let’s pick up the action still waiting.`, message: `${entryStatus(entry) === "missed" ? "You said it didn’t happen" : "There’s an unfinished action"} from ${entry.focus_date}: “${entrySteps(entry).find(s => !s.done)?.text}” Keep it, make it smaller, move it, or choose a different approach.`, href: "/daily-focus#recovery", label: "Choose my next move" };
  }
  if (entryStatus(state.daily) === "done") return { greeting: `You followed through, ${name}.`, message: `${stats.thisWeek} ${stats.thisWeek === 1 ? "action" : "actions"} completed in the last seven days. You can call today complete. We’ll pick up your next step when you return.`, href: "/progress", label: "See my momentum" };
  if (state.daily?.check_in === "missed" || state.daily?.check_in === "progress") return { greeting: `${name}, let’s work with what happened.`, message: state.daily.check_in === "progress" ? "The progress you made counts. Choose what will make the remaining step realistic tomorrow." : "A missed action is information. Let’s decide what to keep, shrink, move, or replace.", href: "/daily-focus#recovery", label: "Adjust my next step" };
  const pendingStep = entrySteps(state.daily).find(step => !step.done);
  if (pendingStep) return { greeting: `${name}, here’s your next useful move.`, message: pendingStep.text, href: "/daily-focus", label: "Continue Today’s Plan" };
  if (state.cycle) return { greeting: `${name}, here’s your next useful move.`, message: entrySteps(state.daily)[0]?.text || state.cycle.plan_steps[0] || `Choose a small action that moves “${state.cycle.focus}” forward today.`, href: "/daily-focus", label: entrySteps(state.daily).length ? "Continue Today’s Plan" : "Choose today’s steps" };
  const completed = state.cycles.find(c => c.status === "completed");
  if (completed) return { greeting: `${name}, you finished an Architect Cycle.`, message: `You worked on “${completed.focus}”. Keep what helped, adjust what didn’t, and choose what you want to build next.`, href: "/architect-cycle", label: "Build my next Cycle" };
  return { greeting: `${name}, your Blueprint is ready.`, message: `Your strongest area is ${state.strengths[0]?.label || "shown in your Blueprint"}. ${state.priorities[0]?.label || "Your Blueprint priority"} has room to grow. Start there, or choose something more important to you.`, href: state.orientationComplete ? "/architect-cycle" : "/orientation", label: state.orientationComplete ? "Choose my first priority" : "Show me how BYNV works" };
}
