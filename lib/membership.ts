export const membershipTiers = {
  foundation: {
    name: "Launch Access / Foundation",
    price: "30 days free",
    cadence: "then introductory pricing",
    label: "Start here",
    description: "A structured entry into BYNV with a clear launch sequence—not a permanently free membership.",
    pricing: ["Days 1–30: $0", "Days 31–90: $19.99/month", "Day 91 onward: $29.99/month"],
    benefits: ["BYNV platform access", "Version Snapshot and Architect Assessment", "Version Score and personal Blueprint", "Daily OS, goals, journal, cycles, and progress", "AI Delegation Audit with transferable handoff templates", "Core Community, challenges, and progression", "Essential Kai access when live Kai is activated", "Core downloadable resources as released"],
    availability: "Launch billing remains disabled until secure Stripe products are connected.",
  },
  builder: {
    name: "Builder",
    price: "$49.99",
    cadence: "/month",
    label: "Expanded practice",
    description: "For members ready for deeper tools, guidance, and a more connected progression experience.",
    pricing: [],
    benefits: ["Everything in Foundation", "Expanded Kai and AI-workflow guidance when live Kai is activated", "Priority Community", "Expanded challenges and guided workflows", "Advanced progress views as released", "Expanded PDF and resource library", "Member merchandise and event discounts when operational", "Priority product support"],
    availability: "Paid activation awaits secure Stripe configuration.",
  },
  architect: {
    name: "Architect",
    price: "$99.99",
    cadence: "/month",
    label: "Advanced membership",
    description: "The advanced BYNV membership for members building with deeper context, resources, and community access.",
    pricing: [],
    benefits: ["Everything in Builder", "Advanced Kai context when live Kai is activated", "Advanced Blueprint and progression features as released", "Private Architect community experiences when operational", "Expanded resource library", "Higher member merchandise and event discounts when operational", "Priority access to new BYNV tools"],
    availability: "Paid activation awaits secure Stripe configuration; capacity-dependent experiences are not promised as live today.",
  },
  architect_coaching: {
    name: "Architect Coaching",
    price: "$249",
    cadence: "/month",
    label: "Human coaching",
    description: "A separate premium service for members seeking a legitimate human-coaching relationship—not the standard Architect membership.",
    pricing: [],
    benefits: ["Architect membership benefits", "Human coaching only when qualified coaching capacity and delivery are operational", "Higher-touch review and accountability within the published service scope", "Private support boundaries and scheduling terms before enrollment"],
    availability: "Enrollment is not open. BYNV will publish the coach scope, capacity, and service terms before accepting payment.",
  },
  graduate: {
    name: "Graduate / Lifetime Architect",
    price: "$9.99",
    cadence: "/month",
    label: "Alumni continuity",
    description: "Ongoing core access for members who complete the primary BYNV journey and want to stay connected as Lifetime Architects.",
    pricing: [],
    benefits: ["Graduate alumni identity", "Core platform and progress continuity", "Core Community access", "Selected challenges and resources", "Future referral credits capable of reducing or waiving the Graduate fee"],
    availability: "Available only after BYNV graduation criteria are operational and met; referral credits are architecture-ready but not active.",
  },
} as const;

export type MembershipTier = keyof typeof membershipTiers;
export type CheckoutTier = "foundation" | "builder" | "architect";
export type MembershipStatus = "free" | "trialing" | "active" | "past_due" | "canceled" | "incomplete" | "paused";

export function stripePriceForTier(tier: CheckoutTier) {
  if (tier === "foundation") return process.env.STRIPE_FOUNDATION_INTRO_PRICE_ID;
  if (tier === "builder") return process.env.STRIPE_BUILDER_PRICE_ID;
  return process.env.STRIPE_ARCHITECT_PRICE_ID;
}

export function hasBillingConfig(tier: CheckoutTier = "builder") {
  const tierPrices = tier === "foundation"
    ? stripePriceForTier(tier) && process.env.STRIPE_FOUNDATION_PRICE_ID
    : stripePriceForTier(tier);
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET && tierPrices);
}
