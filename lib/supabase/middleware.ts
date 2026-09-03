import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "./config";

const protectedPrefixes = ["/welcome", "/architect-assessment", "/blueprint", "/dashboard", "/daily-focus", "/journal", "/goals", "/challenges", "/architect-cycle", "/progress", "/community", "/settings", "/admin"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!supabaseUrl || !supabasePublishableKey) return response;
  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data, error } = await supabase.auth.getClaims();
  if ((error || !data?.claims?.sub) && protectedPrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`))) {
    const signIn = request.nextUrl.clone();
    signIn.pathname = "/sign-in";
    signIn.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(signIn);
  }
  return response;
}
