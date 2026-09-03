import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const requestedNext = url.searchParams.get("next") ?? "/welcome";
  const next = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "/welcome";
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) void sendWelcomeEmail(user).catch((sendError) => console.error("welcome_email_failed", sendError));
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }
  return NextResponse.redirect(new URL("/sign-in?error=confirmation", url.origin));
}
