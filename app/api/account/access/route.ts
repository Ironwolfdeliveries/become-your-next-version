import { NextResponse } from "next/server";
import { getAccountAccess, isPlatformAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false }, { status: 401 });
  const access = await getAccountAccess(user.id);
  return NextResponse.json({
    signedIn: true,
    platformRole: access?.platform_role ?? "member",
    entitlementTier: access?.entitlement_status === "active" ? access.entitlement_tier : null,
    admin: isPlatformAdmin(access),
  });
}
