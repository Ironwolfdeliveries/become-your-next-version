"use client";
import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import { calculateScore, readAssessment, type ScoreResult } from "@/lib/services";
import { Button } from "./ui";
export function Score() {
  const [result, setResult] = useState<ScoreResult | "missing" | null>(null);
  useEffect(() => {
    let answers = {};
    try {
      answers = readAssessment(sessionStorage.getItem("bynv-assessment"));
    } catch {
      // Browsers can disable session storage. The fallback still renders a demo result.
    }
    setResult(Object.keys(answers).length ? calculateScore(answers) : "missing");
  }, []);
  if (!result) return <div className="score-card" aria-live="polite">Calculating your reflection…</div>;
  if (result === "missing") return <div className="score-card"><h2>Your assessment answers are not available.</h2><p className="lede-small">Complete the six prompts in this browser to create your indicative Version Score.</p><Button href="/assessment">Take the assessment</Button></div>;
  const scoreStyle: CSSProperties & { "--score": string } = { "--score": `${result.score * 3.6}deg` };
  return <div className="score-layout"><div className="score-ring" style={scoreStyle}><div><strong>{result.score}</strong><span>/100</span></div></div><div><p className="eyebrow">Current focus · {result.focus}</p><h2>A signal, not a verdict.</h2><p className="lede-small">{result.insight}</p><ol className="steps">{result.nextSteps.map((step, i) => <li key={step}><span>0{i+1}</span>{step}</li>)}</ol><div className="button-row"><Button href="/dashboard">Open my demo plan</Button><Button href="/assessment" secondary>Retake</Button></div></div></div>;
}
