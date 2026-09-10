import type { MembershipTier } from "./membership";

export function subscriptionAccess(tier: MembershipTier, status: string) {
  if (status !== "active" && status !== "trialing") return "community";
  if (tier === "architect" || tier === "architect_coaching") return "mastermind";
  return tier === "builder" ? "priority" : "community";
}
