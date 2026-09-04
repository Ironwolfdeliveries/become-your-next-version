import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const access = await getAccountAccess(user.id);
  if (access?.platform_role !== "owner")
    return NextResponse.json(
      { error: "Owner access required." },
      { status: 403 },
    );

  const body = (await request.json()) as {
    liveBetaEnabled?: boolean;
    emergencyShutoff?: boolean;
  };
  if (
    typeof body.liveBetaEnabled !== "boolean" ||
    typeof body.emergencyShutoff !== "boolean"
  )
    return NextResponse.json(
      { error: "Invalid Kai Beta controls." },
      { status: 400 },
    );
  const admin = createAdminClient();
  const { error } = await admin
    .from("kai_operational_settings")
    .update({
      live_beta_enabled: body.liveBetaEnabled,
      emergency_shutoff: body.emergencyShutoff,
      updated_by: user.id,
    })
    .eq("singleton", true);
  if (error) throw error;
  await admin
    .from("admin_audit_events")
    .insert({
      actor_user_id: user.id,
      action: "kai_beta_controls_updated",
      details: {
        live_beta_enabled: body.liveBetaEnabled,
        emergency_shutoff: body.emergencyShutoff,
      },
    });
  return NextResponse.json({ updated: true });
}
