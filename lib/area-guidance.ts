/** Plain-language help only. Area keys, saved labels and assessment scoring stay unchanged. */
export const areaGuidance = {
  clarity: {
    label: "Clarity & Direction", name: "Knowing what matters next",
    meaning: "Knowing what matters to you and deciding what to focus on next.",
    examples: ["choosing between priorities", "planning your next few months", "saying no to a task that can wait"],
    tip: "Think about a decision you keep putting off. Choose what deserves your attention first.",
    kai: "You don’t need your whole future figured out. Start with one thing you want to change and decide why it matters to you.",
    actions: ["Take 5 minutes to choose one priority and write down why it matters today.", "Choose one task that can wait so you have time for your main priority.", "Set aside 10 minutes in your calendar for the priority you chose."],
  },
  energy: {
    label: "Energy & Wellbeing", name: "Having energy for your day",
    meaning: "How your rest, habits, and daily demands affect how you feel and what you can manage.",
    examples: ["sleep and rest", "taking breaks", "balancing busy days with recovery"],
    tip: "Notice what leaves you worn out. Choose one small way to give yourself a break today.",
    kai: "This is about making your day manageable, not pushing harder. A short break or a calmer evening can be a useful first step.",
    actions: ["Take a 5-minute break away from screens and work today.", "Choose a realistic time to begin winding down tonight.", "Move one non-urgent task off an already full day."],
  },
  action: {
    label: "Action & Consistency", name: "Starting and following through",
    meaning: "Starting the things that matter and finding ways to keep doing them.",
    examples: ["starting a task you put off", "keeping a small promise", "repeating a useful habit"],
    tip: "Think of something you mean to do but rarely start. Make the first step small enough for today.",
    kai: "You don’t need a perfect streak. Pick a small action with a clear finish, do what you can, and tell us how it went.",
    actions: ["Set a 10-minute timer and start one important task you have been putting off.", "Choose a time and place to repeat one small action tomorrow.", "Put a reminder where you will see it before your next planned action."],
  },
  resilience: {
    label: "Resilience & Adaptability", name: "Finding your way after a setback",
    meaning: "Adjusting when things change and finding a next step after something goes wrong.",
    examples: ["a plan falling through", "learning from a mistake", "starting again after a difficult week"],
    tip: "Think about one thing that did not go to plan. Choose a smaller or different step you can take now.",
    kai: "A setback doesn’t erase your progress. Look at what is still possible and choose one step you can control today.",
    actions: ["Name one recent obstacle and choose a next step you can control.", "Spend 10 minutes trying a smaller version of a step that stalled.", "Write down one thing you will do differently after your last attempt."],
  },
  relationships: {
    label: "Relationships & Support", name: "Connecting with people and getting support",
    meaning: "How you connect with people, communicate your needs, and give or receive support.",
    examples: ["checking in with someone", "asking for help", "setting a clear limit"],
    tip: "Think of a connection that needs attention. Choose one kind, clear conversation or request.",
    kai: "This is the area about people. You might reach out, ask for support, listen without distractions, or explain a limit you need.",
    actions: ["Send a thoughtful check-in to one person you want to stay connected with.", "Ask someone you trust for one specific kind of help.", "Make time for a 10-minute conversation without checking your phone."],
  },
  environment: {
    label: "Environment & Systems", name: "Your surroundings and routines",
    meaning: "The spaces, tools, routines, and everyday setups around you that either make life easier or create friction.",
    examples: ["home or workspace clutter", "phone or computer setup", "calendar and reminders", "morning or evening routines", "paperwork and bills", "chores and recurring responsibilities"],
    tip: "Think about what repeatedly wastes your time, creates stress, or makes everyday life harder. Pick one small thing you could improve today.",
    kai: "This is about your spaces, tools, and routines—not mainly the people around you. Try clearing a workspace, setting a missed reminder, or making a daily chore easier. We only need one small improvement today.",
    actions: ["Spend 10 minutes fixing one recurring source of friction in your space or routine.", "Put the things you regularly need in one easy-to-find place.", "Set one reminder for a bill, appointment, or chore you tend to forget."],
  },
  growth: {
    label: "Reflection & Growth", name: "Learning from what you try",
    meaning: "Looking at what is working, learning something useful, and deciding what to change.",
    examples: ["reviewing your week", "asking for feedback", "practicing a useful skill"],
    tip: "Think about something you tried recently. Choose one lesson or skill to use next.",
    kai: "This doesn’t need to be a long journal entry. Notice one thing that helped, one thing that didn’t, and one adjustment to try.",
    actions: ["Take 5 minutes to name one thing that worked this week and one thing to change.", "Practice a skill tied to your current priority for 10 minutes.", "Ask someone you trust for one specific suggestion about something you are learning."],
  },
} as const;

export type AreaKey = keyof typeof areaGuidance;
export function getAreaGuidance(key?: string | null) {
  return key && Object.hasOwn(areaGuidance, key) ? areaGuidance[key as AreaKey] : null;
}
/** Exact matches support old Cycles with no area key, without guessing from personal text. */
export function resolveAreaKey(key?: string | null, label?: string | null): AreaKey | null {
  if (getAreaGuidance(key)) return key as AreaKey;
  const normalized = label?.trim().toLowerCase();
  return (Object.keys(areaGuidance) as AreaKey[]).find(candidate =>
    [areaGuidance[candidate].label, areaGuidance[candidate].name].some(value => value.toLowerCase() === normalized)) ?? null;
}
