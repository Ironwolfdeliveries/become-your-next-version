export const coachingSteps = ["Overview", "Request", "Scheduling", "Preparation", "Session review", "Follow-up"] as const;
export function canUseCoachingQA(access: { platform_role: string; entitlement_tier: string | null; entitlement_status: string } | null) {
  return Boolean(access && ["owner", "admin"].includes(access.platform_role) && access.entitlement_tier === "architect_coaching" && access.entitlement_status === "active");
}
export function canAdvanceCoachingQA(step: number, request: string, preparation: string, commitment: string) {
  if (step === 1) return Boolean(request.trim());
  if (step === 3) return Boolean(preparation.trim());
  if (step === 4) return Boolean(commitment.trim());
  return step >= 0 && step < coachingSteps.length - 1;
}
