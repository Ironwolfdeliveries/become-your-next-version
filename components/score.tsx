"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { calculateScore, readAssessment, type ScoreResult } from "@/lib/services";
import { KaiInterpretation } from "./kai-interpretation";
import { Button } from "./ui";

const continuingValue = [
  "Personal Architect Blueprint",
  "Version Score tracking",
  "Seven Pillar progress",
  "Guided Kai support",
  "Daily focus and actions",
  "Journaling and reflection",
  "Challenges and guided Architect cycles",
  "Progress over time",
];

function areaNames(areas: ScoreResult["areas"], balancedLabel: string) {
  if (areas.length === 6) return balancedLabel;
  if (areas.length === 1) return areas[0].label;
  return areas.map((area) => area.label).join(" + ");
}

export function Score() {
  const [result, setResult] = useState<ScoreResult | "missing" | null>(null);
  useEffect(() => {
    let answers = {};
    try {
      answers = readAssessment(sessionStorage.getItem("bynv-assessment"));
    } catch {
      // Browsers can disable session storage. The fallback still renders a demo result.
    }
    setResult(Object.keys(answers).length === 6 ? calculateScore(answers) : "missing");
  }, []);
  if (!result) return <div className="score-card" aria-live="polite">Calculating your reflection…</div>;
  if (result === "missing") return <div className="score-card"><h2>Your assessment answers are not available.</h2><p className="lede-small">Complete the six prompts in this browser to create your indicative Version Score.</p><Button href="/assessment">Take the assessment</Button></div>;
  const scoreStyle: CSSProperties & { "--score": string } = { "--score": `${result.score * 3.6}deg` };
  return (
    <div className="results-experience">
      <section className="score-layout" aria-labelledby="version-score-heading">
        <div className="score-ring" style={scoreStyle} aria-label={`Version Score ${result.score} out of 100`}>
          <div><strong>{result.score}</strong><span>/100</span></div>
        </div>
        <div>
          <p className="eyebrow">Your Version Snapshot · Current focus: {result.focus}</p>
          <h2 id="version-score-heading">A starting signal for what comes next.</h2>
          <p className="lede-small">This preliminary Version Score is a 0–100 Snapshot of how you rated six areas of your life today. It is calculated directly from your answers and helps reveal an initial strength and opportunity before the deeper Architect Assessment.</p>
          <p className="lede-small">{result.insight}</p>
        </div>
      </section>

      <section className="result-section" aria-labelledby="area-results-heading">
        <div className="result-section-heading">
          <p className="eyebrow">Your assessment areas</p>
          <h2 id="area-results-heading">See the pattern behind your score.</h2>
          <p>These are the six areas this introductory Snapshot measures. Each result comes directly from your selected 1–5 response.</p>
        </div>
        <div className="area-results">
          {result.areas.map((area) => (
            <article className="area-result" key={area.key}>
              <div><h3>{area.label}</h3><strong>{area.value}<span>/5</span></strong></div>
              <div className="area-meter" aria-label={`${area.label}: ${area.value} out of 5`}><span style={{ width: `${area.percent}%` }} /></div>
              <p>{area.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="result-signals" aria-label="Your strongest area and largest opportunity">
        <article>
          <p className="eyebrow">Strongest area</p>
          <h2>{areaNames(result.strongestAreas, "Balanced across all six areas")}</h2>
          <p>This is where your answers show the strongest current foundation.</p>
        </article>
        <article>
          <p className="eyebrow">Largest opportunity</p>
          <h2>{areaNames(result.opportunityAreas, "No single lowest area")}</h2>
          <p>This is the clearest place to focus first—not a weakness or a judgement.</p>
        </article>
      </section>

      <KaiInterpretation interpretation={result.kaiInterpretation} />

      <section className="result-section next-step-plan" aria-labelledby="next-steps-heading">
        <div className="result-section-heading">
          <p className="eyebrow">Your first move</p>
          <h2 id="next-steps-heading">Turn the signal into a small next step.</h2>
        </div>
        <ol className="steps">{result.nextSteps.map((step, i) => <li key={step}><span>0{i + 1}</span>{step}</li>)}</ol>
      </section>

      <section className="result-journey" aria-labelledby="journey-heading">
        <div>
          <p className="eyebrow">Your BYNV starting point</p>
          <h2 id="journey-heading">This Snapshot becomes the first signal in your personal system.</h2>
          <p>Save it to a secure BYNV account, then complete the deeper Architect Assessment to establish the fuller baseline that will shape your Blueprint, Dashboard, progress tracking, and Guided Kai recommendations.</p>
          <div className="button-row">
            <Button href="/create-account">Save my results &amp; continue</Button>
            <Button href="/assessment" secondary>Retake assessment</Button>
          </div>
          <small>Your answers remain in this browser until you create or sign in to a secure account.</small>
        </div>
        <div className="result-unlocks">
          <p className="eyebrow">Continuing with BYNV unlocks</p>
          <ul>{continuingValue.map((item) => <li key={item}>{item}</li>)}</ul>
        </div>
      </section>
    </div>
  );
}
