import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to manage billing." }, { status: 401 });
    const { data: membership } = await supabase.from("memberships").select("stripe_customer_id").eq("user_id", user.id).maybeSingle();
    if (!membership?.stripe_customer_id || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: "No active billing account was found." }, { status: 404 });
    const origin = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin;
    const session = await getStripe().billingPortal.sessions.create({ customer: membership.stripe_customer_id, return_url: `${origin}/membership` });
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("billing_portal_failed", error);
    return NextResponse.json({ error: "Billing management is temporarily unavailable." }, { status: 500 });
  }
}
