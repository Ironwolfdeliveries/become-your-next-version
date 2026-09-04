"use client";

export type AnalyticsEvent = "page_view" | "snapshot_start" | "snapshot_complete" | "signup_start" | "signup_complete" | "architect_assessment_start" | "architect_assessment_complete" | "blueprint_view" | "daily_active" | "membership_view" | "checkout_start" | "checkout_complete" | "cancellation" | "feedback_submit";

function anonymousId() {
  try {
    const key = "bynv-anonymous-id";
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const created = crypto.randomUUID();
    localStorage.setItem(key, created);
    return created;
  } catch { return null; }
}

export function trackAnalyticsEvent(eventType: AnalyticsEvent, metadata: Record<string, string | number | boolean | null> = {}) {
  if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") return;
  const body = JSON.stringify({ eventType, anonymousId: anonymousId(), route: window.location.pathname, metadata });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/analytics", new Blob([body], { type: "application/json" }));
  else void fetch("/api/analytics", { method: "POST", headers: { "content-type": "application/json" }, body, keepalive: true });
}
