export type LibraryTier = 'free' | 'foundation' | 'builder' | 'architect';

export const tierLabels: Record<LibraryTier, string> = {
  free: 'Free',
  foundation: 'Foundation',
  builder: 'Builder',
  architect: 'Architect',
};

export const libraryCategories = [
  { key: 'focus', label: 'Focus & Productivity' },
  { key: 'goals', label: 'Goals & Habits' },
  { key: 'confidence', label: 'Confidence & Motivation' },
  { key: 'career', label: 'Career / Job Search' },
  { key: 'money', label: 'Money Organization' },
  { key: 'wellbeing', label: 'Health & Wellness Planning' },
  { key: 'relationships', label: 'Relationships & Communication' },
  { key: 'ai', label: 'AI Prompt Packs' },
  { key: 'reflection', label: 'Guided Reflection' },
  { key: 'audio', label: 'Audio / Focus' },
  { key: 'challenges', label: 'Challenges' },
  { key: 'templates', label: 'Worksheets & Templates' },
] as const;

export type LibraryCategory = (typeof libraryCategories)[number]['key'];

export type ArchitectLibraryResource = {
  slug: string;
  title: string;
  summary: string;
  category: LibraryCategory;
  minutes: number;
  tier: LibraryTier;
};

// Public discovery metadata only. Full exercises live in the server-only content module.
export const architectLibrary: ArchitectLibraryResource[] = [
  {
    slug: 'ten-minute-focus-reset',
    title: 'The 10-Minute Focus Reset',
    summary: 'Clear one distraction and turn a crowded day into one useful next move.',
    category: 'focus',
    minutes: 10,
    tier: 'free',
  },
  {
    slug: 'smallest-useful-step',
    title: 'Find Your Smallest Useful Step',
    summary: 'Make a goal specific enough to begin, even when time or energy is limited.',
    category: 'goals',
    minutes: 8,
    tier: 'free',
  },
  {
    slug: 'weekly-progress-review',
    title: 'A Weekly Review You Can Finish',
    summary: 'Notice what moved, learn from what stalled, and choose one adjustment.',
    category: 'reflection',
    minutes: 10,
    tier: 'free',
  },
  {
    slug: 'five-minute-arrival-script',
    title: 'Arrive and Begin: A Written Focus Script',
    summary: 'A five-minute script to read at your own pace before starting an action. Written exercise; no audio recording.',
    category: 'audio',
    minutes: 5,
    tier: 'free',
  },
  {
    slug: 'confidence-evidence-bank',
    title: 'Build a Confidence Evidence Bank',
    summary: 'Collect specific examples of follow-through and use them to choose your next stretch.',
    category: 'confidence',
    minutes: 15,
    tier: 'foundation',
  },
  {
    slug: 'career-opportunity-sprint',
    title: 'Your Next Career Opportunity Sprint',
    summary: 'Turn an unfocused job search into a short, realistic plan with reusable examples.',
    category: 'career',
    minutes: 20,
    tier: 'foundation',
  },
  {
    slug: 'weekly-money-map',
    title: 'The Weekly Money Map',
    summary: 'Organize upcoming dates, known amounts, and unanswered questions in one view.',
    category: 'money',
    minutes: 15,
    tier: 'foundation',
  },
  {
    slug: 'realistic-energy-plan',
    title: 'Plan Around Your Actual Energy',
    summary: 'Match the week’s demands with realistic capacity and a smaller backup action.',
    category: 'wellbeing',
    minutes: 15,
    tier: 'foundation',
  },
  {
    slug: 'clear-conversation-plan',
    title: 'Prepare for a Clearer Conversation',
    summary: 'Prepare a specific request, make room to listen, and agree on a practical next step.',
    category: 'relationships',
    minutes: 20,
    tier: 'builder',
  },
  {
    slug: 'seven-day-follow-through',
    title: 'The 7-Day Follow-Through Challenge',
    summary: 'Practice starting, checking in, and recovering with one small daily commitment.',
    category: 'challenges',
    minutes: 15,
    tier: 'builder',
  },
  {
    slug: 'kai-planning-prompt-pack',
    title: 'The Architect Planning Prompt Pack',
    summary: 'Four reusable prompts for choosing a priority, testing a plan, recovering, and reviewing.',
    category: 'ai',
    minutes: 20,
    tier: 'architect',
  },
  {
    slug: 'cycle-review-and-renewal',
    title: 'Your Cycle Review & Renewal Kit',
    summary: 'Compare your starting point with what changed and build a next Cycle from the evidence.',
    category: 'templates',
    minutes: 25,
    tier: 'architect',
  },
];
