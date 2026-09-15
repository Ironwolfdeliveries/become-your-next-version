import type { LibraryTier } from "@/lib/architect-library";

const ranks: Record<LibraryTier, number> = { free: 0, foundation: 1, builder: 2, architect: 3 };
function libraryTier(tier: string | null | undefined): LibraryTier {
  if (tier === "architect" || tier === "architect_coaching") return "architect";
  if (tier === "builder") return "builder";
  if (tier === "foundation" || tier === "graduate") return "foundation";
  return "free";
}
export function effectiveLibraryTier(membership: { tier?: string | null; status?: string | null } | null, access: { entitlement_tier?: string | null; entitlement_status?: string | null } | null): LibraryTier {
  if (access?.entitlement_status === "active" && access.entitlement_tier) return libraryTier(access.entitlement_tier);
  if (membership?.status === "active" || membership?.status === "trialing") return libraryTier(membership.tier);
  return "free";
}
export function canReadLibraryResource(tier: LibraryTier, required: LibraryTier) {
  return ranks[tier] >= ranks[required];
}
