"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function AccountControls({ onNavigate }: { onNavigate?: () => void }) {
  const [signedIn, setSignedIn] = useState(false);
  const [moderator, setModerator] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(async ({ data }) => {
      setSignedIn(Boolean(data.user));
      if (data.user) {
        const { data: entitlement } = await supabase.from("community_entitlements").select("community_role").eq("user_id", data.user.id).maybeSingle();
        setModerator(entitlement?.community_role === "moderator" || entitlement?.community_role === "admin");
      }
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(Boolean(session?.user)));
    return () => data.subscription.unsubscribe();
  }, []);

  async function logout() {
    await createClient().auth.signOut();
    setSignedIn(false);
    onNavigate?.();
    router.replace("/");
    router.refresh();
  }

  if (signedIn) return <><Link aria-current={pathname === "/dashboard" ? "page" : undefined} href="/dashboard" onClick={onNavigate}>Dashboard</Link><Link aria-current={pathname === "/account" ? "page" : undefined} href="/account" onClick={onNavigate}>Account</Link>{moderator && <Link aria-current={pathname.startsWith("/admin/community") ? "page" : undefined} href="/admin/community" onClick={onNavigate}>Moderate</Link>}<button className="nav-account" type="button" onClick={logout}>Log out</button></>;
  return <Link aria-current={pathname === "/sign-in" ? "page" : undefined} href="/sign-in" onClick={onNavigate}>Sign in</Link>;
}
