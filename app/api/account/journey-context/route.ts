import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getJourneyContext } from "@/lib/member-journey";
export async function GET() {
  const supabase = await createClient(); const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try { return NextResponse.json(await getJourneyContext(user.id), { headers: { "Cache-Control": "private, no-store" } }); }
  catch { return NextResponse.json({ error: "Context is temporarily unavailable." }, { status: 503 }); }
}
