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

async function handleAccessUpdate(request: Request) {
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

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid access change." },
      { status: 400 },
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return NextResponse.json(
      { error: "Invalid access change." },
      { status: 400 },
    );

  const body = value as {
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
    (body.status !== "active" && body.status !== "paused") ||
    typeof body.kaiLiveBetaEnabled !== "boolean" ||
    (body.reason !== undefined && typeof body.reason !== "string")
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
  if (
    actorAccess?.platform_role !== "owner" &&
    currentAccess &&
    currentAccess?.platform_role !== "member"
  )
    return NextResponse.json(
      { error: "Only the owner can change an elevated account." },
      { status: 403 },
    );
  const kaiLiveBetaEnabled =
    actorAccess?.platform_role === "owner"
      ? body.kaiLiveBetaEnabled === true
      : (currentAccess?.kai_live_beta_enabled ?? false);
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
  const { error } = await admin.rpc("admin_update_account_access", {
    p_actor_user_id: user.id,
    p_target_user_id: body.userId,
    p_platform_role: body.platformRole,
    p_entitlement_tier: body.entitlementTier ?? null,
    p_entitlement_status: body.status,
    p_kai_live_beta_enabled: kaiLiveBetaEnabled,
    p_reason: reason,
    p_community_access_level: communityAccess,
    p_community_role: communityRole,
  });
  if (error) throw error;
  return NextResponse.json({ updated: true });
}

export async function POST(request: Request) {
  try {
    return await handleAccessUpdate(request);
  } catch (error) {
    console.error("admin_access_update_failed", error);
    return NextResponse.json(
      { error: "Access could not be updated or audited." },
      { status: 500 },
    );
  }
}
