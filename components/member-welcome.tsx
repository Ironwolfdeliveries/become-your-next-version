"use client";

import { useEffect, useState } from "react";
import { Button } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { persistPendingVersionSnapshot } from "@/lib/supabase/snapshot";
import { KaiAvatar } from "./kai-avatar";

export function MemberWelcome() {
  const [snapshotScore, setSnapshotScore] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("Securing your account and checking for a Version Snapshot…");

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError ?? new Error("Your session could not be verified.");
        if (!active) return;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .maybeSingle();
        const preferredName = String(
          profile?.display_name ?? user.user_metadata?.display_name ?? "",
        ).trim();
        setName(preferredName.split(/\s+/)[0] ?? "");
        const pending = await persistPendingVersionSnapshot(user.id);
        const { data } = await supabase.from("version_snapshots").select("score").order("completed_at", { ascending: false }).limit(1).maybeSingle();
        if (!active) return;
        setSnapshotScore(data?.score ?? (pending.saved ? pending.score : null));
        setStatus(data || pending.saved ? "Your Version Snapshot is securely saved to this account." : "Your account is ready. Begin the Architect Assessment when you are ready.");
      } catch (error) {
        if (active) setStatus(error instanceof Error ? error.message : "Your account is ready, but the Snapshot could not be checked.");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  return (
    <section className="welcome-card" aria-labelledby="welcome-heading">
      <div className="welcome-copy">
        <p className="eyebrow">The Architects</p>
        <h2 id="welcome-heading">Welcome, Architect.</h2>
        <p className="lede-small">
          <strong>
            {name ? `${name}, this` : "This"} is where you begin building your next version.
          </strong>
        </p>
        <p>The six-question Snapshot gave you a starting point{snapshotScore === null ? "." : ` of ${snapshotScore}/100.`} The deeper Architect Assessment helps you look more closely at your priorities, strengths, obstacles, goals, and available time and energy.</p>
        <p className="save-status" role="status">{status}</p>
        <div className="button-row">
          <Button href="/architect-assessment">Begin my Architect Assessment</Button>
          <Button href="/dashboard" secondary>I&apos;ll do this later</Button>
        </div>
      </div>
      <aside className="welcome-aside">
        <KaiAvatar className="kai-result-mark" />
        <p className="eyebrow">What comes next</p>
        <p>Your answers will shape your personal Blueprint. You can leave at any point; your progress saves as you go.</p>
      </aside>
    </section>
  );
}
