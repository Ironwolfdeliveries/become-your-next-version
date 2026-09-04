"use client";

import { FormEvent, useState } from "react";

export function KaiBetaControls({
  enabled,
  shutoff,
  ownerMode,
}: {
  enabled: boolean;
  shutoff: boolean;
  ownerMode: boolean;
}) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("Saving…");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/kai-beta", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        liveBetaEnabled: form.get("liveBetaEnabled") === "on",
        emergencyShutoff: form.get("emergencyShutoff") === "on",
      }),
    });
    const result = (await response.json()) as {
      updated?: boolean;
      error?: string;
    };
    setMessage(
      result.updated
        ? "Kai Beta controls updated immediately."
        : (result.error ?? "Controls could not be updated."),
    );
    setPending(false);
  }

  return (
    <form className="admin-access-editor" onSubmit={submit}>
      <label className="check-row">
        <input
          name="liveBetaEnabled"
          type="checkbox"
          defaultChecked={enabled}
          disabled={!ownerMode}
        />{" "}
        Global Live Kai Beta switch
      </label>
      <label className="check-row">
        <input
          name="emergencyShutoff"
          type="checkbox"
          defaultChecked={shutoff}
          disabled={!ownerMode}
        />{" "}
        Emergency shutoff
      </label>
      <button className="button secondary" disabled={pending || !ownerMode}>
        {pending ? "Saving…" : "Save Kai controls"}
      </button>
      <span className="form-message" role="status">
        {message}
      </span>
    </form>
  );
}
