import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getAccountAccess,
  isPlatformAdmin,
  type EntitlementTier,
  type PlatformRole,
} from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

const roles: PlatformRole[] = ["member", "admin", "owner"];
const tiers: EntitlementTier[] = [
  "foundation",
  "builder",
  "architect",
  "architect_coaching",
  "graduate",
];
const uuid =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const actorAccess = await getAccountAccess(user.id);
  if (!isPlatformAdmin(actorAccess))
    return NextResponse.json(
      { error: "Owner or admin access required." },
      { status: 403 },
    );

  const body = (await request.json()) as {
    userId?: string;
    platformRole?: PlatformRole;
    entitlementTier?: EntitlementTier | null;
    status?: "active" | "paused";
    kaiLiveBetaEnabled?: boolean;
    reason?: string;
  };
  if (
    !body.userId ||
    !uuid.test(body.userId) ||
    !body.platformRole ||
    !roles.includes(body.platformRole) ||
    (body.entitlementTier !== null &&
      body.entitlementTier !== undefined &&
      !tiers.includes(body.entitlementTier)) ||
    (body.status !== "active" && body.status !== "paused")
  ) {
    return NextResponse.json(
      { error: "Invalid access change." },
      { status: 400 },
    );
  }
  if (actorAccess?.platform_role !== "owner" && body.platformRole !== "member")
    return NextResponse.json(
      { error: "Only the owner can grant administrative authority." },
      { status: 403 },
    );
  if (
    body.userId === user.id &&
    body.platformRole !== actorAccess!.platform_role
  )
    return NextResponse.json(
      { error: "Your own administrative role cannot be changed here." },
      { status: 400 },
    );

  const reason =
    String(body.reason ?? "")
      .trim()
      .slice(0, 500) || null;
  const admin = createAdminClient();
  const currentAccess = await getAccountAccess(body.userId);
  const kaiLiveBetaEnabled =
    actorAccess?.platform_role === "owner"
      ? body.kaiLiveBetaEnabled === true
      : (currentAccess?.kai_live_beta_enabled ?? false);
  const { error } = await admin
    .from("account_access")
    .upsert(
      {
        user_id: body.userId,
        platform_role: body.platformRole,
        entitlement_tier: body.entitlementTier ?? null,
        entitlement_status: body.status,
        kai_live_beta_enabled: kaiLiveBetaEnabled,
        reason,
        granted_by: user.id,
      },
      { onConflict: "user_id" },
    );
  if (error) throw error;
  const communityAccess =
    body.entitlementTier === "architect" ||
    body.entitlementTier === "architect_coaching"
      ? "mastermind"
      : body.entitlementTier === "builder"
        ? "priority"
        : "community";
  const communityRole =
    body.platformRole === "owner" || body.platformRole === "admin"
      ? "admin"
      : "member";
  await admin
    .from("community_entitlements")
    .upsert(
      {
        user_id: body.userId,
        access_level: communityAccess,
        community_role: communityRole,
      },
      { onConflict: "user_id" },
    );
  await admin
    .from("admin_audit_events")
    .insert({
      actor_user_id: user.id,
      target_user_id: body.userId,
      action: "account_access_updated",
      details: {
        platform_role: body.platformRole,
        entitlement_tier: body.entitlementTier ?? null,
        entitlement_status: body.status,
        kai_live_beta_enabled: kaiLiveBetaEnabled,
        reason,
      },
    });
  return NextResponse.json({ updated: true });
}
