import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  try {
    const result = await sendWelcomeEmail(user);
    return NextResponse.json(result);
  } catch (error) {
    console.error("welcome_email_failed", error);
    return NextResponse.json({ error: "Welcome email could not be sent." }, { status: 500 });
  }
}
