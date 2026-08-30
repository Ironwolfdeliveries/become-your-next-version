"use client";

import { useEffect, useState } from "react";
import { calculateScore, readAssessment } from "@/lib/services";
import { Button } from "./ui";

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
        <p className="eyebrow">Your result is ready</p>
        <h2 id="account-entry-heading">{score === null ? "Keep your BYNV journey moving." : `Version Score ${score} is ready to become your baseline.`}</h2>
        <p>Secure account creation and permanent result storage are not available yet. Your assessment result has not been uploaded or saved to a BYNV account.</p>
      </div>
      <div className="account-entry-actions">
        <p>Join the early-access list to receive account availability updates. No account or saved profile will be created by this step.</p>
        <div className="button-row">
          <Button href="/early-access">Request early access</Button>
          <Button href="/version-score" secondary>Return to my results</Button>
        </div>
      </div>
    </section>
  );
}
