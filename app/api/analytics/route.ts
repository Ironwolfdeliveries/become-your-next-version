import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AnalyticsEvent } from "@/lib/analytics-client";

const allowed = new Set<AnalyticsEvent>(["page_view","snapshot_start","snapshot_complete","signup_start","signup_complete","architect_assessment_start","architect_assessment_complete","blueprint_view","daily_active","membership_view","checkout_start","checkout_complete","cancellation","feedback_submit"]);

export async function POST(request: Request) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 });
  try {
    const body = await request.json() as { eventType?: AnalyticsEvent; anonymousId?: string | null; route?: string; metadata?: Record<string, unknown> };
    if (!body.eventType || !allowed.has(body.eventType) || !body.route?.startsWith("/") || body.route.length > 300) return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    const anonymousId = typeof body.anonymousId === "string" && body.anonymousId.length >= 10 && body.anonymousId.length <= 80 ? body.anonymousId : null;
    const metadata = body.metadata && JSON.stringify(body.metadata).length <= 3500 ? body.metadata : {};
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await createAdminClient().from("analytics_events").insert({ event_type: body.eventType, anonymous_id: anonymousId, user_id: user?.id ?? null, route: body.route, metadata });
    if (error) throw error;
    return new NextResponse(null, { status: 202 });
  } catch (error) {
    console.error("analytics_event_failed", error);
    return new NextResponse(null, { status: 204 });
  }
}
