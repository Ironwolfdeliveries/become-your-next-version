import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type PlatformRole = "member" | "admin" | "owner";
export type EntitlementTier =
  "foundation" | "builder" | "architect" | "architect_coaching" | "graduate";

export type AccountAccess = {
  user_id: string;
  platform_role: PlatformRole;
  entitlement_tier: EntitlementTier | null;
  entitlement_status: "active" | "paused";
  kai_live_beta_enabled: boolean;
  reason: string | null;
};

export async function getAccountAccess(
  userId: string,
): Promise<AccountAccess | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data, error } = await createAdminClient()
    .from("account_access")
    .select(
      "user_id,platform_role,entitlement_tier,entitlement_status,kai_live_beta_enabled,reason",
    )
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data as AccountAccess | null;
}

export function isPlatformAdmin(access: AccountAccess | null) {
  return access?.platform_role === "admin" || access?.platform_role === "owner";
}
