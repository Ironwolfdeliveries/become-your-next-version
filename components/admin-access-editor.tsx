"use client";

import { FormEvent, useState } from "react";
import type { EntitlementTier, PlatformRole } from "@/lib/admin";

export function AdminAccessEditor({
  userId,
  role,
  tier,
  status,
  kaiLiveBetaEnabled,
  ownerMode,
}: {
  userId: string;
  role: PlatformRole;
  tier: EntitlementTier | null;
  status: "active" | "paused";
  kaiLiveBetaEnabled: boolean;
  ownerMode: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("Saving…");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        userId,
        platformRole: form.get("platformRole"),
        entitlementTier: form.get("entitlementTier") || null,
        status: form.get("status"),
        kaiLiveBetaEnabled: form.get("kaiLiveBetaEnabled") === "on",
        reason: form.get("reason"),
      }),
    });
    const result = (await response.json()) as {
      updated?: boolean;
      error?: string;
    };
    setMessage(
      result.updated
        ? "Access saved and recorded in the audit log."
        : (result.error ?? "Access could not be saved."),
    );
    setPending(false);
  }
  return (
    <form className="admin-access-editor" onSubmit={submit}>
      <label>
        Authority
        <select name="platformRole" defaultValue={role} disabled={!ownerMode}>
          <option value="member">Member</option>
          <option value="admin">Admin</option>
          <option value="owner">Owner</option>
        </select>
      </label>
      <label>
        Product entitlement
        <select name="entitlementTier" defaultValue={tier ?? ""}>
          <option value="">Stripe-controlled</option>
          <option value="foundation">Foundation</option>
          <option value="builder">Builder</option>
          <option value="architect">Architect</option>
          <option value="architect_coaching">Architect Coaching</option>
          <option value="graduate">Graduate</option>
        </select>
      </label>
      <label>
        Status
        <select name="status" defaultValue={status}>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
      </label>
      <label className="check-row">
        <input
          name="kaiLiveBetaEnabled"
          type="checkbox"
          defaultChecked={kaiLiveBetaEnabled}
          disabled={!ownerMode}
        />{" "}
        Live Kai Beta access
      </label>
      <label>
        Reason
        <input
          name="reason"
          maxLength={500}
          placeholder="Why this override is appropriate"
        />
      </label>
      <button className="button secondary" disabled={pending}>
        {pending ? "Saving…" : "Save access"}
      </button>
      <span className="form-message" role="status">
        {message}
      </span>
    </form>
  );
}
