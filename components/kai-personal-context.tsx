"use client";
import { useEffect, useState } from "react";
import { useMemberJourney } from "./member-journey";
import { KaiPrompt } from "./kai-prompt";
type Context = { priority: string; firstAction: string; cycle: { focus: string } | null; daily: { action: string | null } | null; goal: string };
export function KaiPersonalContext() {
  const { signedIn } = useMemberJourney(); const [context, setContext] = useState<Context | null>(null);
  useEffect(() => { let active = true; setContext(null); if (signedIn) void fetch("/api/account/journey-context", { cache: "no-store" }).then(async response => { if (response.ok && active) setContext(await response.json() as Context); }).catch(() => {}); return () => { active = false; }; }, [signedIn]);
  if (!signedIn || !context || ![context.priority, context.cycle?.focus, context.daily?.action, context.goal].some(Boolean)) return null;
  return <section className="container journey-suggestion"><p className="eyebrow">Kai + My BYNV</p><h2>Your saved context gives us a starting point.</h2><dl className="personal-context">{[["Blueprint priority",context.priority],["Current cycle",context.cycle?.focus],["Today's action",context.daily?.action],["Active goal",context.goal]].filter(([,value]) => value).map(([label,value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><KaiPrompt prompt="Connect my current Blueprint, cycle, and daily action. What is one useful next step?">Ask Kai about my next step</KaiPrompt><p className="field-help">Only your own saved BYNV context appears here. Journal entries are excluded.</p></section>;
}
