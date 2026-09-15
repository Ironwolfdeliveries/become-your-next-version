import "server-only";
import { getAccountAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import { effectiveLibraryTier } from "@/lib/library-entitlement";
import type { LibraryTier } from "@/lib/architect-library";

export type LibraryAccess = { signedIn: boolean; tier: LibraryTier; unavailable: boolean };
export async function getLibraryAccess(): Promise<LibraryAccess> {
  let signedIn = false;
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user) return { signedIn: false, tier: "free", unavailable: Boolean(authError && authError.name !== "AuthSessionMissingError") };
    signedIn = true;
    const [{ data: membership, error }, access] = await Promise.all([
      supabase.from("memberships").select("tier,status").eq("user_id", user.id).maybeSingle(),
      getAccountAccess(user.id),
    ]);
    if (error) throw error;
    return { signedIn: true, tier: effectiveLibraryTier(membership, access), unavailable: false };
  } catch {
    return { signedIn, tier: "free", unavailable: true };
  }
}
