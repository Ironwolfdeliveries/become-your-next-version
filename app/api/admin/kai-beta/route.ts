import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAccountAccess } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

type KaiSettingsRow = {
  live_beta_enabled: boolean;
  emergency_shutoff: boolean;
  updated_at: string;
};

function publicSettings(settings: KaiSettingsRow) {
  return {
    liveBetaEnabled: settings.live_beta_enabled,
    emergencyShutoff: settings.emergency_shutoff,
    updatedAt: settings.updated_at,
  };
}

async function requireOwner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return {
      response: NextResponse.json(
        { error: "Sign in required." },
        { status: 401 },
      ),
    };

  const access = await getAccountAccess(user.id);
  if (access?.platform_role !== "owner")
    return {
      response: NextResponse.json(
        { error: "Owner access required." },
        { status: 403 },
      ),
    };

  return { userId: user.id };
}

async function readSettings() {
  const { data, error } = await createAdminClient()
    .from("kai_operational_settings")
    .select("live_beta_enabled,emergency_shutoff,updated_at")
    .eq("singleton", true)
    .maybeSingle();
  if (error) throw error;
  return data as KaiSettingsRow | null;
}

export async function GET() {
  try {
    const owner = await requireOwner();
    if ("response" in owner) return owner.response;

    const settings = await readSettings();
    if (!settings)
      return NextResponse.json(
        { error: "Kai Beta control record is unavailable." },
        { status: 503 },
      );

    return NextResponse.json(
      { settings: publicSettings(settings) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    console.error("kai_beta_control_read_failed", error);
    return NextResponse.json(
      { error: "Kai Beta controls could not be loaded." },
      { status: 500 },
    );
  }
}

async function handleKaiBetaUpdate(request: Request) {
  const owner = await requireOwner();
  if ("response" in owner) return owner.response;

  let value: unknown;
  try {
    value = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid Kai Beta controls." },
      { status: 400 },
    );
  }
  if (!value || typeof value !== "object" || Array.isArray(value))
    return NextResponse.json(
      { error: "Invalid Kai Beta controls." },
      { status: 400 },
    );

  const body = value as {
    liveBetaEnabled?: unknown;
    emergencyShutoff?: unknown;
    expectedUpdatedAt?: unknown;
  };
  if (
    typeof body.liveBetaEnabled !== "boolean" ||
    typeof body.emergencyShutoff !== "boolean" ||
    typeof body.expectedUpdatedAt !== "string" ||
    body.expectedUpdatedAt.length > 64 ||
    Number.isNaN(Date.parse(body.expectedUpdatedAt))
  )
    return NextResponse.json(
      { error: "Invalid Kai Beta controls." },
      { status: 400 },
    );

  const admin = createAdminClient();
  const { data, error } = await admin.rpc(
    "admin_update_kai_operational_settings",
    {
      p_actor_user_id: owner.userId,
      p_live_beta_enabled: body.liveBetaEnabled,
      p_emergency_shutoff: body.emergencyShutoff,
      p_expected_updated_at: body.expectedUpdatedAt,
    },
  );
  if (error) throw error;

  const updated = (data?.[0] ?? null) as KaiSettingsRow | null;
  if (!updated) {
    const latest = await readSettings();
    if (!latest)
      return NextResponse.json(
        { error: "Kai Beta control record is unavailable." },
        { status: 503 },
      );
    return NextResponse.json(
      {
        error:
          "Kai Beta controls changed in another session. Review the latest settings before saving again.",
        settings: publicSettings(latest),
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    updated: true,
    settings: publicSettings(updated),
  });
}

export async function POST(request: Request) {
  try {
    return await handleKaiBetaUpdate(request);
  } catch (error) {
    console.error("kai_beta_control_update_failed", error);
    return NextResponse.json(
      { error: "Kai Beta controls could not be updated." },
      { status: 500 },
    );
  }
}
