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

export const KAI_URGENT_SAFETY_KIND = "urgent-safety" as const;
export type KaiResponseMode = "GUIDED" | "LIVE_BETA";

type KaiPageContext = {
  title: string;
  purpose: string;
  recommendation: { href: string; label: string };
};

const pageContexts: Record<string, KaiPageContext> = {
  "/": { title: "BYNV home", purpose: "An introduction to Become Your Next Version and the Architect Method.", recommendation: { href: "/assessment", label: "Begin the free assessment" } },
  "/mission": { title: "Mission", purpose: "The purpose and principles behind BYNV.", recommendation: { href: "/framework", label: "Explore the Architect Method" } },
  "/framework": { title: "Architect Method", purpose: "The BYNV system for seeing clearly, choosing a direction, taking action, and reviewing progress.", recommendation: { href: "/assessment", label: "Apply it in the assessment" } },
  "/membership": { title: "Membership", purpose: "Launch Access, Foundation, Builder, Architect, separate Architect Coaching, and Graduate access, benefits, and billing status.", recommendation: { href: "/create-account", label: "Start Launch Access" } },
  "/resources": { title: "Architect resources", purpose: "Free practical BYNV worksheets for clearer reflection, smaller action, and repeatable review.", recommendation: { href: "/assessment", label: "Take your Version Snapshot" } },
  "/early-access": { title: "Early access", purpose: "The early-access interest form and what joining the list means.", recommendation: { href: "/membership", label: "Review membership" } },
  "/assessment": { title: "Version Snapshot", purpose: "A six-question reflection that gives you a quick view of where you are today.", recommendation: { href: "/framework", label: "Review the Architect Method" } },
  "/version-score": { title: "Version Snapshot results", purpose: "A starting point based on your six Snapshot answers.", recommendation: { href: "/create-account", label: "Save your Version Snapshot" } },
  "/create-account": { title: "Create your BYNV account", purpose: "Secure account creation and Version Snapshot continuation.", recommendation: { href: "/sign-in", label: "Sign in instead" } },
  "/sign-in": { title: "Sign in", purpose: "Secure access for returning BYNV Architects.", recommendation: { href: "/create-account", label: "Create an account" } },
  "/welcome": { title: "Architect welcome", purpose: "The start of secure member onboarding after account creation.", recommendation: { href: "/architect-assessment", label: "Begin the Architect Assessment" } },
  "/architect-assessment": { title: "Architect Assessment", purpose: "A deeper seven-section reflection that saves to your account as you go.", recommendation: { href: "/dashboard", label: "Save and return later" } },
  "/blueprint": { title: "Architect Blueprint", purpose: "A practical starting plan built from your completed Architect Assessment.", recommendation: { href: "/daily-focus", label: "Set today’s focus" } },
  "/dashboard": { title: "Architect Dashboard", purpose: "The member’s saved assessment, Blueprint, daily focus, and progress hub.", recommendation: { href: "/daily-focus", label: "Open Daily Focus" } },
  "/account": { title: "BYNV account", purpose: "The member’s account identity, membership, security, privacy, and support options.", recommendation: { href: "/dashboard", label: "Return to dashboard" } },
  "/daily-focus": { title: "Daily Focus + AI Leverage", purpose: "One saved priority and action, plus a practical look at tasks where AI may help.", recommendation: { href: "/journal", label: "Open the journal" } },
  "/goals": { title: "Architect Goals", purpose: "Saved outcomes connected to the seven assessment domains.", recommendation: { href: "/architect-cycle", label: "Begin an Architect Cycle" } },
  "/challenges": { title: "Architect Challenges", purpose: "Focused, saved practices with transparent progress instead of artificial points.", recommendation: { href: "/daily-focus", label: "Set today’s focus" } },
  "/community": { title: "Architect Community", purpose: "Private member Rooms for accountability, challenges, milestones, and domain conversations.", recommendation: { href: "/community/rooms/general", label: "Open the General Room" } },
  "/community/profile": { title: "Community profile", purpose: "Member-controlled display identity and privacy settings for the Architect Community.", recommendation: { href: "/community", label: "Return to Community" } },
  "/architect-cycle": { title: "Architect Cycle", purpose: "A defined period for building and reviewing one focus.", recommendation: { href: "/daily-focus", label: "Set today’s action" } },
  "/progress": { title: "Progress", purpose: "Saved Snapshot, full-score, daily-action, and Architect Cycle history.", recommendation: { href: "/dashboard", label: "Return to dashboard" } },
  "/kai": { title: "Kai", purpose: "Your personal BYNV guide for understanding your progress and choosing what to do next.", recommendation: { href: "/dashboard", label: "Open your dashboard" } },
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

export function normalizeKaiPath(pathname: string) {
  if (!pathname.startsWith("/")) return "/";
  const pathOnly = pathname.split(/[?#]/, 1)[0] ?? "/";
  return pathOnly === "/" ? pathOnly : pathOnly.replace(/\/+$/, "") || "/";
}

export function isKaiAssessmentRequest(
  pathname: string,
  message = "",
  recentMessages: string[] = [],
) {
  const route = normalizeKaiPath(pathname);
  if (route === "/assessment" || route === "/architect-assessment")
    return true;
  const text = message.toLowerCase();

  function seeksAssessmentAnswer(value: string) {
    const namesAssessment = /\b(?:assessment|snapshot)\b/.test(value);
    if (!namesAssessment) return false;
    const strongResponseReference =
      /\b(?:answer|response|number|score|rate|rating|option|choice|[1-5])\b/.test(
        value,
      ) || /\b1\s*(?:-|–|to)\s*5\b/.test(value);
    const selectionLanguage =
      /\b(?:choose|pick|select|recommend|suggest|answer|respond|mark|rate)\b/.test(
        value,
      ) ||
      /\b(?:fill|complete)\s+(?:out\s+)?(?:the\s+|my\s+)?(?:assessment|snapshot)\s+for\s+me\b/.test(
        value,
      ) ||
      /\b(?:ideal|best|right)\s+(?:answers?|responses?|choices?|options?)\b/.test(
        value,
      );
    const asksForFit =
      strongResponseReference &&
      /\bdo\s+you\s+think\b|\b(?:fits?|matches?|right|best)\s+(?:for\s+)?me\b/.test(
        value,
      );
    const directAnswerRequest =
      /\b(?:which|what)\s+(?:answer|response|number|score|rating|option)\s+(?:should|do)\s+i\s+(?:choose|pick|select|use|mark)\b/.test(
        value,
      );
    const selectsDifferentObject =
      /\b(?:choose|pick|select|recommend|suggest)\b[\s\S]{0,30}\b(?:goal|plan|priority|focus|membership|tier|email|task|habit|action)\b|\b(?:goal|plan|priority|focus|membership|tier|email|task|habit|action)\b[\s\S]{0,30}\b(?:choose|pick|select|recommend|suggest)\b/.test(
        value,
      );
    const explicitAssessmentItem =
      /\b(?:assessment|snapshot)\b[\s\S]{0,30}\b(?:answer|response|question|item|choice|option|1\s*(?:-|–|to)\s*5)\b|\b(?:answer|response|question|item|choice|option|1\s*(?:-|–|to)\s*5)\b[\s\S]{0,30}\b(?:assessment|snapshot)\b/.test(
        value,
      );
    if (selectsDifferentObject && !explicitAssessmentItem) return false;
    return selectionLanguage || asksForFit || directAnswerRequest;
  }

  if (text.split(/[.!?;\n]+/).some(seeksAssessmentAnswer)) return true;
  const activeAssessmentContext = recentMessages.slice(-1).some((item) => {
    const prior = item.toLowerCase();
    return (
      /\b(?:doing|taking|working on|filling out|answering|in the middle of)\b[\s\S]{0,60}\b(?:assessment|snapshot)\b/.test(
        prior,
      ) ||
      /\b(?:assessment|snapshot)\b[\s\S]{0,60}\b(?:question|item|right now|currently)\b/.test(
        prior,
      )
    );
  });
  const followUpAnswerRequest =
    (/\bdo\s+you\s+think\b|\b(?:fits?|matches?|right|best)\s+(?:for\s+)?me\b/.test(
      text,
    ) && /\b(?:answer|response|number|score|rate|rating|[1-5])\b/.test(text)) ||
    (/\b(?:choose|pick|select|answer|respond|mark|rate)\b/.test(text) &&
      /\b(?:answer|response|number|score|rate|rating|[1-5])\b/.test(text));
  const genericSelectionFollowUp =
    /\b(?:what|which\s+(?:one|option|choice))\s+(?:should|would|do)\s+i\s+(?:choose|pick|select|put|mark|answer)\b|\b(?:choose|pick|select|answer|fill\s+(?:it\s+)?out)\s+(?:it\s+)?for\s+me\b|\btell\s+me\s+what\s+to\s+(?:choose|pick|select|put|mark|answer)\b/.test(
      text,
    );
  const selectsDifferentObject =
    /\b(?:choose|pick|select|recommend|suggest)\b[\s\S]{0,30}\b(?:goal|plan|priority|focus|membership|tier|email|task|habit|action)\b|\b(?:goal|plan|priority|focus|membership|tier|email|task|habit|action)\b[\s\S]{0,30}\b(?:choose|pick|select|recommend|suggest)\b/.test(
      text,
    );
  return (
    activeAssessmentContext &&
    !selectsDifferentObject &&
    (followUpAnswerRequest || genericSelectionFollowUp)
  );
}

export function getKaiPageContext(pathname: string) {
  const normalizedPath = normalizeKaiPath(pathname);
  if (normalizedPath.startsWith("/community/rooms/")) return pageContexts["/community"];
  return pageContexts[normalizedPath] ?? fallbackContext;
}

export function createKaiRequest(message: string, pathname: string, quickAction: KaiQuickAction | null) {
  const page = getKaiPageContext(pathname);
  const isAssessment = isKaiAssessmentRequest(pathname, message);

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
