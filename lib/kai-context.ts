export const KAI_QUICK_ACTIONS = [
  "Explain this",
  "What should I do next?",
  "How does this affect my Version Score?",
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
  "/membership": { title: "Membership", purpose: "The planned Architects membership experience and its boundaries.", recommendation: { href: "/early-access", label: "Review early access" } },
  "/early-access": { title: "Early access", purpose: "The early-access interest form and what joining the list means.", recommendation: { href: "/membership", label: "Review membership" } },
  "/assessment": { title: "Kai Assessment", purpose: "A six-question reflection used to calculate an indicative Version Score.", recommendation: { href: "/framework", label: "Review the Architect Method" } },
  "/version-score": { title: "Version Score", purpose: "An indicative reflection snapshot based on the assessment responses.", recommendation: { href: "/dashboard", label: "See the dashboard preview" } },
  "/create-account": { title: "Create your BYNV account", purpose: "The next step from a Version Score toward secure account access and saved progress.", recommendation: { href: "/early-access", label: "Request early access" } },
  "/dashboard": { title: "Dashboard", purpose: "A preview of the tools that organize progress and next actions.", recommendation: { href: "/journal", label: "Open the journal" } },
  "/kai": { title: "Kai", purpose: "The current guided demo and the boundaries for the planned AI companion.", recommendation: { href: "/assessment", label: "Take the assessment" } },
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
  return pageContexts[normalizedPath] ?? fallbackContext;
}

export function createKaiRequest(message: string, pathname: string, quickAction: KaiQuickAction | null) {
  const page = getKaiPageContext(pathname);
  const isAssessment = pathname === "/assessment";

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
