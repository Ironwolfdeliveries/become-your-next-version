"use client";
import Link from "next/link";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseConfig } from "@/lib/supabase/config";
import { nextJourneyAction, type JourneyState } from "@/lib/journey";

const Context = createContext<JourneyState>({ signedIn: false, assessmentComplete: false, activeCycle: false });
export const useMemberJourney = () => useContext(Context);
export function MemberJourneyProvider({ initial, children }: { initial: JourneyState; children: ReactNode }) {
  const [state, setState] = useState(initial);
  const pathname = usePathname();
  useEffect(() => {
    let current = true;
    let generation = 0;
    const refresh = () => { const request = ++generation; void fetch("/api/account/journey", { cache: "no-store" }).then(async response => { if (response.ok) { const data = await response.json() as JourneyState; if (current && request === generation) setState(data); } }).catch(() => {}); };
    refresh();
    const subscription = hasSupabaseConfig ? createClient().auth.onAuthStateChange((_event, session) => {
      setState({ signedIn: Boolean(session?.user), assessmentComplete: session?.user ? null : false, activeCycle: false });
      refresh();
    }).data.subscription : null;
    window.addEventListener("bynv:journey-changed", refresh);
    return () => { current = false; subscription?.unsubscribe(); window.removeEventListener("bynv:journey-changed", refresh); };
  }, [pathname]);
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function JourneyLink({ anonymousLabel = "Take your Version Snapshot", className = "button", onNavigate }: { anonymousLabel?: string; className?: string; onNavigate?: () => void }) {
  const state = useMemberJourney();
  const next = nextJourneyAction(state);
  return <Link className={className} href={next.href} onClick={onNavigate}>{state.signedIn ? next.label : anonymousLabel}</Link>;
}
export function JourneyCTA({ title, copy }: { title?: string; copy?: string }) {
  const state = useMemberJourney(); const next = nextJourneyAction(state);
  return <section className="cta container"><div><p className="eyebrow">{state.signedIn ? "My BYNV · Next step" : "Start here"}</p><h2>{!state.signedIn && title ? title : next.title}</h2><p>{!state.signedIn && copy ? copy : next.copy}</p></div><JourneyLink /></section>;
}
export function JourneyIntro() {
  const state = useMemberJourney(); const next = nextJourneyAction(state);
  return <p className="micro">{state.signedIn ? next.copy : "Free · 3 minutes · No account required"}</p>;
}
