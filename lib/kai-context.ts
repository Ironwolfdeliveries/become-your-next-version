export const KAI_QUICK_ACTIONS = [
  "Explain this page",
  "What should I do next?",
  "Explain my Version Score",
  "Help with a goal",
  "Daily guidance",
  "Review my progress",
  "Use AI for this",
] as const;

export type KaiQuickAction = (typeof KAI_QUICK_ACTIONS)[number];

type KaiPageContext = {
  title: string;
  purpose: string;
  recommendation: { href: string; label: string };
};

const pageContexts: Record<string, KaiPageContext> = {
  "/": { title: "BYNV home", purpose: "An introduction to Become Your Next Version and the Architect Method.", recommendation: { href: "/assessment", label: "Begin the free assessment" } },
  "/mission": { title: "Mission", purpose: "The purpose and principles behind BYNV.", recommendation: { href: "/framework", label: "Explore the Architect Method" } },
  "/framework": { title: "Architect Method", purpose: "The BYNV framework for reflection, direction, action and review.", recommendation: { href: "/assessment", label: "Apply it in the assessment" } },
  "/membership": { title: "Membership", purpose: "Launch Access, Foundation, Builder, Architect, separate Architect Coaching, and Graduate access, benefits, and billing status.", recommendation: { href: "/create-account", label: "Start Launch Access" } },
  "/resources": { title: "Architect resources", purpose: "Free practical BYNV worksheets for clearer reflection, smaller action, and repeatable review.", recommendation: { href: "/assessment", label: "Take your Version Snapshot" } },
  "/early-access": { title: "Early access", purpose: "The early-access interest form and what joining the list means.", recommendation: { href: "/membership", label: "Review membership" } },
  "/assessment": { title: "Version Snapshot", purpose: "A six-question introductory reflection used to calculate a preliminary Version Score.", recommendation: { href: "/framework", label: "Review the Architect Method" } },
  "/version-score": { title: "Version Snapshot results", purpose: "A preliminary reflection signal based on six Snapshot responses.", recommendation: { href: "/create-account", label: "Save your Version Snapshot" } },
  "/create-account": { title: "Create your BYNV account", purpose: "Secure account creation and Version Snapshot continuation.", recommendation: { href: "/sign-in", label: "Sign in instead" } },
  "/sign-in": { title: "Sign in", purpose: "Secure access for returning BYNV Architects.", recommendation: { href: "/create-account", label: "Create an account" } },
  "/welcome": { title: "Architect welcome", purpose: "The start of secure member onboarding after account creation.", recommendation: { href: "/architect-assessment", label: "Begin the Architect Assessment" } },
  "/architect-assessment": { title: "Architect Assessment", purpose: "A deeper seven-section baseline that autosaves to the member account.", recommendation: { href: "/dashboard", label: "Save and return later" } },
  "/blueprint": { title: "Architect Blueprint", purpose: "A deterministic starting plan derived from the completed Architect Assessment.", recommendation: { href: "/daily-focus", label: "Set today’s focus" } },
  "/dashboard": { title: "Architect Dashboard", purpose: "The member’s saved assessment, Blueprint, daily focus, and progress hub.", recommendation: { href: "/daily-focus", label: "Open Daily Focus" } },
  "/account": { title: "BYNV account", purpose: "The member’s account identity, membership, security, privacy, and support options.", recommendation: { href: "/dashboard", label: "Return to dashboard" } },
  "/daily-focus": { title: "Daily Focus + AI Leverage", purpose: "One saved priority and action, plus a practical audit of recurring work AI can help carry.", recommendation: { href: "/journal", label: "Open the journal" } },
  "/goals": { title: "Architect Goals", purpose: "Saved outcomes connected to the seven assessment domains.", recommendation: { href: "/architect-cycle", label: "Begin an Architect Cycle" } },
  "/challenges": { title: "Architect Challenges", purpose: "Focused, saved practices with transparent progress instead of artificial points.", recommendation: { href: "/daily-focus", label: "Set today’s focus" } },
  "/community": { title: "Architect Community", purpose: "Private member Rooms for accountability, challenges, milestones, and domain conversations.", recommendation: { href: "/community/rooms/general", label: "Open the General Room" } },
  "/community/profile": { title: "Community profile", purpose: "Member-controlled display identity and privacy settings for the Architect Community.", recommendation: { href: "/community", label: "Return to Community" } },
  "/architect-cycle": { title: "Architect Cycle", purpose: "A defined period for building and reviewing one focus.", recommendation: { href: "/daily-focus", label: "Set today’s action" } },
  "/progress": { title: "Progress", purpose: "Saved Snapshot, full-score, daily-action, and Architect Cycle history.", recommendation: { href: "/dashboard", label: "Return to dashboard" } },
  "/kai": { title: "Kai", purpose: "The BYNV coaching guide, permitted private context, and responsible boundaries.", recommendation: { href: "/dashboard", label: "Open your dashboard" } },
  "/journal": { title: "Journal", purpose: "Reflection prompts and practices for deliberate personal growth.", recommendation: { href: "/dashboard", label: "Return to the dashboard" } },
  "/merchandise": { title: "Shop", purpose: "The current BYNV merchandise preview.", recommendation: { href: "/about", label: "Learn about BYNV" } },
  "/about": { title: "About BYNV", purpose: "The language, standards and current stage of the BYNV platform.", recommendation: { href: "/mission", label: "Read the mission" } },
  "/contact": { title: "Contact", purpose: "The BYNV contact form and communication expectations.", recommendation: { href: "/faq", label: "Check common questions" } },
  "/faq": { title: "Frequently asked questions", purpose: "Answers about BYNV, Kai, membership, privacy and the Version Score.", recommendation: { href: "/contact", label: "Contact BYNV" } },
  "/privacy": { title: "Privacy", purpose: "How BYNV currently handles information and planned data features.", recommendation: { href: "/disclaimer", label: "Read the disclaimer" } },
  "/terms": { title: "Terms", purpose: "The current terms governing use of the BYNV website.", recommendation: { href: "/privacy", label: "Review privacy" } },
  "/disclaimer": { title: "Disclaimer", purpose: "Important limitations for BYNV, Kai and the Version Score.", recommendation: { href: "/faq", label: "Read common questions" } },
};

const fallbackContext: KaiPageContext = {
  title: "BYNV",
  purpose: "A page within the Become Your Next Version experience.",
  recommendation: { href: "/", label: "Return to BYNV home" },
};

export function getKaiPageContext(pathname: string) {
  const normalizedPath = pathname !== "/" ? pathname.replace(/\/$/, "") : pathname;
  if (normalizedPath.startsWith("/community/rooms/")) return pageContexts["/community"];
  return pageContexts[normalizedPath] ?? fallbackContext;
}

export function createKaiRequest(message: string, pathname: string, quickAction: KaiQuickAction | null) {
  const page = getKaiPageContext(pathname);
  const isAssessment = pathname === "/assessment" || pathname === "/architect-assessment";

  return {
    message: message.trim(),
    intent: quickAction ?? "custom-question",
    context: { route: pathname, pageTitle: page.title, pagePurpose: page.purpose },
    safeguards: {
      mode: isAssessment ? "assessment-explanation-only" : "page-guidance",
      mayExplainAssessmentQuestion: isAssessment,
      mustNotRecommendAssessmentAnswer: isAssessment,
      mustNotInfluenceVersionScore: isAssessment,
    },
  };
}
