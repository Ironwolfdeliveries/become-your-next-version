"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
const questions = [
  ["clarity", "I can name what matters most in this season."], ["energy", "My routines protect enough energy for what matters."],
  ["action", "My weekly actions reflect my stated priorities."], ["resilience", "I can adapt without losing my direction."],
  ["support", "I have people or systems that support my growth."], ["reflection", "I regularly review what is and is not working."]
] as const;
export function Assessment() {
  const [step, setStep] = useState(0); const [answers, setAnswers] = useState<Record<string, number>>({}); const router = useRouter();
  const [key, prompt] = questions[step]; const answer = answers[key];
  function next() {
    if (step < questions.length - 1) {
      setStep(step + 1);
      return;
    }

    try {
      sessionStorage.setItem("bynv-assessment", JSON.stringify(answers));
    } catch {
      // Results still provide a clearly labelled demo fallback when storage is unavailable.
    }
    router.push("/version-score");
  }
  return <div className="assessment-card"><div className="progress"><span style={{ width: `${((step + 1) / questions.length) * 100}%` }} /></div><p className="eyebrow">Question {step + 1} of {questions.length}</p><fieldset><legend>{prompt}</legend><div className="scale">{[1,2,3,4,5].map((n) => <button type="button" className={answer === n ? "selected" : ""} aria-pressed={answer === n} key={n} onClick={() => setAnswers({ ...answers, [key]: n })}><b>{n}</b><small>{n === 1 ? "Not yet" : n === 5 ? "Consistently" : ""}</small></button>)}</div></fieldset><div className="assessment-actions"><button className="text-button" disabled={step === 0} onClick={() => setStep(step - 1)}>← Back</button><button className="button" disabled={!answer} onClick={next}>{step === questions.length - 1 ? "See my score" : "Continue →"}</button></div><p className="fine-print">Your answers stay in this browser session and are not sent to a server.</p></div>;
}
