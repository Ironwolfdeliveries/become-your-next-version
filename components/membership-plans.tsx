"use client";

import { useState } from "react";
import { membershipTiers, type CheckoutTier, type MembershipTier } from "@/lib/membership";

type CurrentMembership = { tier: MembershipTier; status: string; cancel_at_period_end: boolean; stripe_customer_id: string | null; stripe_subscription_id: string | null } | null;

export function MembershipPlans({ signedIn, membership, foundationReady, billingReady, architectReady }: { signedIn: boolean; membership: CurrentMembership; foundationReady: boolean; billingReady: boolean; architectReady: boolean }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function checkout(tier: CheckoutTier) {
    if (!signedIn) { window.location.href = "/sign-in?next=/membership"; return; }
    setPending(true); setMessage("Opening secure checkout…");
    const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ tier }) });
    const result = await response.json() as { url?: string; error?: string };
    if (result.url) window.location.href = result.url; else { setMessage(result.error ?? "Checkout could not be started."); setPending(false); }
  }
  async function portal() {
    setPending(true); setMessage("Opening billing management…");
    const response = await fetch("/api/billing/portal", { method: "POST" });
    const result = await response.json() as { url?: string; error?: string };
    if (result.url) window.location.href = result.url; else { setMessage(result.error ?? "Billing management is unavailable."); setPending(false); }
  }
  return <>
    <div className="membership-grid">
      {(Object.entries(membershipTiers) as [MembershipTier, (typeof membershipTiers)[MembershipTier]][]).map(([key, tier]) => <article className={`membership-plan membership-plan-${key} ${key === "builder" ? "featured" : ""}`} key={key}>
        <p className="eyebrow">{tier.label}</p>
        <h2>{tier.name}</h2><p className="membership-price"><strong>{tier.price}</strong><span>{tier.cadence}</span></p><p>{tier.description}</p>
        {tier.pricing.length > 0 && <ol className="membership-sequence">{tier.pricing.map((step) => <li key={step}>{step}</li>)}</ol>}
        <ul className="tick-list compact">{tier.benefits.map((benefit) => <li key={benefit}>{benefit}</li>)}</ul>
        <p className="membership-availability">{tier.availability}</p>
        {membership?.tier === key && (membership.status === "active" || membership.status === "trialing") ? <button className="button secondary" type="button" disabled>Current membership</button> : key === "foundation" ? signedIn ? <button className="button secondary" type="button" disabled={pending || !foundationReady || Boolean(membership?.stripe_subscription_id)} onClick={() => void checkout("foundation")}>{foundationReady ? "Start my first 30 days" : "Billing activation pending"}</button> : <a className="button secondary" href="/create-account">Create account to begin</a> : key === "builder" ? <button className="button" type="button" disabled={pending || !billingReady} onClick={() => void checkout("builder")}>{billingReady ? "Choose Builder" : "Billing activation pending"}</button> : key === "architect" ? <button className="button" type="button" disabled={pending || !architectReady} onClick={() => void checkout("architect")}>{architectReady ? "Choose Architect" : "Billing activation pending"}</button> : <button className="button secondary" type="button" disabled>{key === "architect_coaching" ? "Coaching enrollment not open" : "Available after graduation"}</button>}
      </article>)}
    </div>
    {signedIn && membership?.stripe_customer_id && <button className="button secondary billing-manage" type="button" disabled={pending} onClick={() => void portal()}>Manage payment method or cancellation</button>}
    <p className="form-message" role="status" aria-live="polite">{message}</p>
  </>;
}
