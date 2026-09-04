export const membershipTiers = {
  foundation: {
    name: "Launch Access / Foundation",
    price: "30 days free",
    cadence: "then introductory pricing",
    label: "Start here",
    description: "Start building your next version with the complete BYNV foundation.",
    pricing: ["Days 1–30: $0", "Days 31–90: $19.99/month", "Day 91 onward: $29.99/month"],
    benefits: ["BYNV platform access", "Version Snapshot and Architect Assessment", "Version Score and personal Blueprint", "Daily OS, goals, journal, cycles, and progress", "Kai guidance based on your saved BYNV progress", "AI prompt builder for ChatGPT, Claude, Gemini, and other tools", "Core Community and challenges", "Core downloadable resources"],
    availability: "Secure monthly checkout is provided through Stripe.",
  },
  builder: {
    name: "Builder",
    price: "$49.99",
    cadence: "/month",
    label: "Build deeper",
    description: "For members who want more guidance, stronger accountability, and more ways to keep moving.",
    pricing: [],
    benefits: ["Everything in Foundation", "Expanded Kai and AI-guidance tools", "Priority Community", "More challenges and guided action plans", "Deeper progress reviews", "Expanded PDF and resource library", "Member merchandise and event discounts when available", "Priority product support"],
    availability: "Secure monthly checkout is provided through Stripe.",
  },
  architect: {
    name: "Architect",
    price: "$99.99",
    cadence: "/month",
    label: "Advanced membership",
    description: "The highest BYNV membership for people ready for deeper guidance, resources, and community access.",
    pricing: [],
    benefits: ["Everything in Builder", "Advanced Kai and Blueprint guidance", "Deeper Blueprint and progress tools", "Private Architect community experiences when available", "Expanded resource library", "Higher member merchandise and event discounts when available", "Priority access to new BYNV tools"],
    availability: "Secure monthly checkout is provided through Stripe. Limited-capacity experiences are clearly identified before enrollment.",
  },
  architect_coaching: {
    name: "Architect Coaching",
    price: "$249",
    cadence: "/month",
    label: "Human coaching",
    description: "A separate service for members who want direct support and accountability from a qualified human coach.",
    pricing: [],
    benefits: ["Architect membership benefits", "Human coaching when qualified coaches are available", "Personal review and accountability", "Clear support boundaries and scheduling terms before enrollment"],
    availability: "Enrollment is not open. BYNV will publish the coach scope, capacity, and service terms before accepting payment.",
  },
  graduate: {
    name: "Graduate / Lifetime Architect",
    price: "$9.99",
    cadence: "/month",
    label: "Stay connected",
    description: "Ongoing core access for members who complete the primary BYNV journey and want to stay connected as Lifetime Architects.",
    pricing: [],
    benefits: ["Lifetime Architect identity", "Continued access to your core progress tools", "Core Community access", "Selected challenges and resources", "Future referral credits that may reduce or cover the Graduate fee"],
    availability: "Available after a member completes BYNV graduation requirements. Referral credits are planned but not active yet.",
  },
} as const;

export type MembershipTier = keyof typeof membershipTiers;
export type CheckoutTier = "foundation" | "builder" | "architect";
export type MembershipStatus = "free" | "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "paused";

export function isBillingLaunchEnabled() {
  return process.env.BILLING_LIVE_ENABLED === "true";
}

export function stripePriceForTier(tier: CheckoutTier) {
  if (tier === "foundation") return process.env.STRIPE_FOUNDATION_INTRO_PRICE_ID;
  if (tier === "builder") return process.env.STRIPE_BUILDER_PRICE_ID;
  return process.env.STRIPE_ARCHITECT_PRICE_ID;
}

export function hasBillingConfig(tier: CheckoutTier = "builder") {
  const tierPrices = tier === "foundation"
    ? stripePriceForTier(tier) && process.env.STRIPE_FOUNDATION_PRICE_ID
    : stripePriceForTier(tier);
  return Boolean(isBillingLaunchEnabled() && process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && tierPrices);
}
