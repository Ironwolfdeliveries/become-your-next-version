"use client";

import { FormEvent, useEffect, useState } from "react";

type KaiSettings = {
  liveBetaEnabled: boolean;
  emergencyShutoff: boolean;
  updatedAt: string;
};

type KaiSettingsResult = {
  updated?: boolean;
  error?: string;
  settings?: KaiSettings;
};

export function KaiBetaControls({
  enabled,
  shutoff,
  ownerMode,
}: {
  enabled: boolean;
  shutoff: boolean;
  ownerMode: boolean;
}) {
  const [liveBetaEnabled, setLiveBetaEnabled] = useState(enabled);
  const [emergencyShutoff, setEmergencyShutoff] = useState(shutoff);
  const [expectedUpdatedAt, setExpectedUpdatedAt] = useState<string | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(ownerMode);

  useEffect(() => {
    if (!ownerMode) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    async function loadCurrentSettings() {
      try {
        const response = await fetch("/api/admin/kai-beta", {
          cache: "no-store",
          signal: controller.signal,
        });
        let result: KaiSettingsResult;
        try {
          result = (await response.json()) as KaiSettingsResult;
        } catch {
          throw new Error(
            "Kai Beta controls could not be confirmed. Reload the page.",
          );
        }
        if (!response.ok || !result.settings)
          throw new Error(
            result.error ?? "Kai Beta controls could not be loaded.",
          );
        setLiveBetaEnabled(result.settings.liveBetaEnabled);
        setEmergencyShutoff(result.settings.emergencyShutoff);
        setExpectedUpdatedAt(result.settings.updatedAt);
      } catch (error) {
        if (controller.signal.aborted) return;
        setMessage(
          error instanceof Error
            ? error.message
            : "Kai Beta controls could not be loaded.",
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadCurrentSettings();
    return () => controller.abort();
  }, [ownerMode]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!expectedUpdatedAt) {
      setMessage("Reload the latest Kai Beta controls before saving.");
      return;
    }

    setPending(true);
    setMessage("Saving…");
    try {
      const response = await fetch("/api/admin/kai-beta", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          liveBetaEnabled,
          emergencyShutoff,
          expectedUpdatedAt,
        }),
      });
      let result: KaiSettingsResult;
      try {
        result = (await response.json()) as KaiSettingsResult;
      } catch {
        throw new Error("Kai Beta controls could not be confirmed. Try again.");
      }

      if (result.settings) {
        setLiveBetaEnabled(result.settings.liveBetaEnabled);
        setEmergencyShutoff(result.settings.emergencyShutoff);
        setExpectedUpdatedAt(result.settings.updatedAt);
      }
      if (!response.ok || !result.updated)
        throw new Error(
          result.error ?? "Kai Beta controls could not be updated.",
        );
      setMessage("Kai Beta controls updated immediately and audited.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Kai Beta controls could not be updated.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-access-editor" onSubmit={submit}>
      <label className="check-row">
        <input
          name="liveBetaEnabled"
          type="checkbox"
          checked={liveBetaEnabled}
          onChange={(event) => setLiveBetaEnabled(event.target.checked)}
          disabled={!ownerMode || loading}
        />{" "}
        Global Live Kai Beta switch
      </label>
      <label className="check-row">
        <input
          name="emergencyShutoff"
          type="checkbox"
          checked={emergencyShutoff}
          onChange={(event) => setEmergencyShutoff(event.target.checked)}
          disabled={!ownerMode || loading}
        />{" "}
        Emergency shutoff
      </label>
      <button
        className="button secondary"
        disabled={pending || loading || !ownerMode || !expectedUpdatedAt}
      >
        {loading ? "Loading…" : pending ? "Saving…" : "Save Kai controls"}
      </button>
      <span className="form-message" role="status">
        {message}
      </span>
    </form>
  );
}
