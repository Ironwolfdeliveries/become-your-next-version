"use client";

import Link from "next/link";
import { useMemberJourney } from "./member-journey";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function AccountControls({ onNavigate }: { onNavigate?: () => void }) {
  const { signedIn } = useMemberJourney();
  const [moderator, setModerator] = useState(false);
  const [admin, setAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      setModerator(false); setAdmin(false);
      if (data.user) {
        const [{ data: entitlement }, accessResponse] = await Promise.all([supabase.from("community_entitlements").select("community_role").eq("user_id", data.user.id).maybeSingle(), fetch("/api/account/access")]);
        setModerator(entitlement?.community_role === "moderator" || entitlement?.community_role === "admin");
        if (accessResponse.ok) setAdmin(Boolean((await accessResponse.json() as { admin?: boolean }).admin));
      }
    });
  }, [signedIn]);

  async function logout() {
    await createClient().auth.signOut();
    window.dispatchEvent(new Event("bynv:journey-changed"));
    onNavigate?.();
    router.replace("/");
    router.refresh();
  }

  if (signedIn) return <><Link aria-current={pathname === "/dashboard" ? "page" : undefined} href="/dashboard" onClick={onNavigate}>Dashboard</Link><Link aria-current={pathname === "/momentum" || pathname === "/progress" ? "page" : undefined} href="/momentum" onClick={onNavigate}>Momentum</Link><Link aria-current={pathname === "/account" ? "page" : undefined} href="/account" onClick={onNavigate}>Account</Link>{admin && <Link aria-current={pathname === "/admin" ? "page" : undefined} href="/admin" onClick={onNavigate}>Owner</Link>}{moderator && <Link aria-current={pathname.startsWith("/admin/community") ? "page" : undefined} href="/admin/community" onClick={onNavigate}>Moderate</Link>}<button className="nav-account" type="button" onClick={logout}>Log out</button></>;
  return <Link aria-current={pathname === "/sign-in" ? "page" : undefined} href="/sign-in" onClick={onNavigate}>Sign in</Link>;
}
