"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/client";

export function AccountControls({ onNavigate }: { onNavigate?: () => void }) {
  const [signedIn, setSignedIn] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!hasSupabaseConfig) return;
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => setSignedIn(Boolean(data.user)));
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

  if (signedIn) return <><Link aria-current={pathname === "/dashboard" ? "page" : undefined} href="/dashboard" onClick={onNavigate}>Dashboard</Link><button className="nav-account" type="button" onClick={logout}>Log out</button></>;
  return <Link aria-current={pathname === "/sign-in" ? "page" : undefined} href="/sign-in" onClick={onNavigate}>Sign in</Link>;
}
