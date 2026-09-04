"use client";

import { useEffect, useState } from "react";
import { calculateScore, readAssessment } from "@/lib/services";
import { AuthForm } from "./auth-form";

export function AccountEntry() {
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    try {
      const answers = readAssessment(sessionStorage.getItem("bynv-assessment"));
      if (Object.keys(answers).length === 6) setScore(calculateScore(answers).score);
    } catch {
      // The page remains useful when browser session storage is unavailable.
    }
  }, []);

  return (
    <section className="account-entry" aria-labelledby="account-entry-heading">
      <div className="account-entry-summary">
        <p className="eyebrow">Your Version Snapshot is ready</p>
        <h2 id="account-entry-heading">{score === null ? "Create your Architect account." : `Your ${score}/100 Snapshot is ready to save.`}</h2>
        <p>Create a secure account to save this result, begin the deeper Architect Assessment, and build your personal Blueprint.</p>
        <ul className="tick-list compact">
          <li>Save the six area responses and score to your account</li>
          <li>Resume the Architect Assessment across sessions</li>
          <li>Turn deeper results into your first Blueprint</li>
        </ul>
      </div>
      <div className="account-entry-actions">
        <AuthForm mode="signup" />
      </div>
    </section>
  );
}
