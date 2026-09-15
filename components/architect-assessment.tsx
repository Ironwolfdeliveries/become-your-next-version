"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { architectQuestionCount, architectScoredQuestionCount, architectSections, type ArchitectAnswers } from "@/lib/architect-assessment";
import { createClient } from "@/lib/supabase/client";
import { trackAnalyticsEvent } from "@/lib/analytics-client";

type SaveState = "loading" | "saved" | "pending" | "saving" | "error";
type Assessment = { id: string; version: number; revision: number; status: "in_progress" | "completed"; answers: ArchitectAnswers; current_section: number; version_score: number | null; completed_at: string | null };

export function ArchitectAssessment({ reassess = false, reviewVersion }: { reassess?: boolean; reviewVersion?: number }) {
  const router = useRouter();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const assessmentRef = useRef<Assessment | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<ArchitectAnswers>({});
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [error, setError] = useState("");
  const [conflict, setConflict] = useState(false);
  const conflictRef = useRef(false);
  const hydrated = useRef(false);
  const lastSaved = useRef("");
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const section = architectSections[sectionIndex];
  const readOnly = assessment?.status === "completed";

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        let loaded: Assessment;
        if (reviewVersion) {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) throw new Error("Please sign in again.");
          const { data, error: readError } = await supabase.from("architect_assessments").select("id,version,revision,status,answers,current_section,version_score,completed_at").eq("user_id", user.id).eq("version", reviewVersion).eq("status", "completed").single();
          if (readError || !data) throw new Error("That completed assessment could not be loaded.");
          loaded = data as Assessment;
        } else {
          // The database serializes new versions and resumes an existing draft.
          const { data, error: loadError } = await supabase.rpc("begin_architect_assessment", { p_reassess: reassess });
          if (loadError || !data) throw new Error(loadError?.message || "Your assessment could not be loaded.");
          loaded = data as Assessment;
        }
        if (!active) return;
        assessmentRef.current = loaded;
        setAssessment(loaded);
        setAnswers(loaded.answers ?? {});
        const savedSection = Math.max(0, Math.min(Number(loaded.current_section) || 0, architectSections.length - 1));
        setSectionIndex(savedSection);
        lastSaved.current = JSON.stringify([loaded.answers ?? {}, savedSection]);
        hydrated.current = true;
        setSaveState("saved");
        if (loaded.status === "in_progress" && Object.keys(loaded.answers ?? {}).length === 0) trackAnalyticsEvent("architect_assessment_start");
      } catch (loadError) {
        if (!active) return;
        setError(loadError instanceof Error ? loadError.message : "Your assessment could not be loaded.");
        setSaveState("error");
      }
    }
    void load();
    return () => { active = false; };
  }, [reassess, reviewVersion]);

  const persist = useCallback((nextAnswers: ArchitectAnswers, nextSection: number, complete = false): Promise<boolean> => {
    const work = async () => {
      const current = assessmentRef.current;
      if (!current || current.status === "completed" || conflictRef.current) return false;
      const signature = JSON.stringify([nextAnswers, nextSection]);
      if (!complete && signature === lastSaved.current) { setSaveState("saved"); return true; }
      setSaveState("saving");
      try {
        // Scores and the associated Blueprint are created in one transaction.
        const { data, error: saveError } = await createClient().rpc("save_architect_assessment", {
          p_id: current.id, p_revision: current.revision, p_answers: nextAnswers, p_section: nextSection, p_complete: complete,
        });
        if (saveError) {
          if (saveError.code === "40001") { conflictRef.current = true; setConflict(true); }
          throw new Error(saveError.message);
        }
        if (!data) throw new Error("Your progress was not saved. Please try again.");
        const saved = data as Assessment;
        assessmentRef.current = saved;
        setAssessment(saved);
        lastSaved.current = signature;
        setSaveState("saved");
        setError("");
        if (complete) window.dispatchEvent(new Event("bynv:journey-changed"));
        return true;
      } catch (saveError) {
        setSaveState("error");
        setError(saveError instanceof Error ? saveError.message : "Progress could not be saved.");
        return false;
      }
    };
    // Serialize autosave, section changes, and completion in this browser.
    const next = saveQueue.current.then(work, work);
    saveQueue.current = next;
    return next;
  }, []);

  const assessmentId = assessment?.id;
  useEffect(() => {
    if (!hydrated.current || !assessmentId || readOnly || conflict) return;
    const timer = window.setTimeout(() => { void persist(answers, sectionIndex); }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, assessmentId, conflict, persist, readOnly, sectionIndex]);

  useEffect(() => {
    const warnUnsaved = (event: BeforeUnloadEvent) => {
      if (!readOnly && hydrated.current && JSON.stringify([answers, sectionIndex]) !== lastSaved.current) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", warnUnsaved);
    return () => window.removeEventListener("beforeunload", warnUnsaved);
  }, [answers, readOnly, sectionIndex]);

  const answeredCount = useMemo(() => architectSections.flatMap((item) => item.questions).filter((question) => question.type === "scale" && Number.isInteger(answers[question.id]) && Number(answers[question.id]) >= 1 && Number(answers[question.id]) <= 5).length, [answers]);
  const currentComplete = section.questions.every((question) => question.type === "text" || typeof answers[question.id] === "number");
  const progress = Math.round((answeredCount / architectScoredQuestionCount) * 100);

  async function continueAssessment() {
    if (!currentComplete) return setError("Answer each scored question in this section before continuing. The written reflection is optional.");
    if (sectionIndex < architectSections.length - 1) {
      const next = sectionIndex + 1;
      if (await persist(answers, next)) { setSectionIndex(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
      return;
    }
    if (answeredCount !== architectScoredQuestionCount) return setError("Answer all 35 scored questions before completing your assessment. Use Back to review earlier sections.");
    if (await persist(answers, sectionIndex, true)) { trackAnalyticsEvent("architect_assessment_complete"); router.push("/orientation"); }
  }

  if (saveState === "loading") return <div className="assessment-card" aria-live="polite">Loading your saved assessment…</div>;
  if (!assessment) return <section className="assessment-card"><p className="form-error" role="alert">{error}</p><button className="button" onClick={() => window.location.reload()}>Try again</button></section>;
  if (readOnly) return (
    <section className="architect-assessment-card" aria-labelledby="completed-assessment-title">
      <p className="eyebrow">Completed assessment · Version {assessment.version}</p>
      <h2 id="completed-assessment-title">Your starting point is saved.</h2>
      <p>Your saved Version Score is <strong>{assessment.version_score ?? "—"}/100</strong>{assessment.completed_at ? `, completed ${new Date(assessment.completed_at).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", day: "numeric", year: "numeric" })}` : ""}. Review your answers below or keep building your plan.</p>
      <div className="button-row">
        <Link className="button" href="/blueprint">See my Blueprint</Link>
        <Link className="button secondary" href="/dashboard">Continue my plan</Link>
        <Link className="button secondary" href="/architect-assessment?reassess=1">Start a new assessment</Link>
      </div>
      <p className="field-help">A new assessment creates a separate record so you can compare change over time. These completed answers stay intact.</p>
      <div className="architect-questions">
        {architectSections.map((item) => <details className="architect-question" key={item.key}><summary>{item.label}</summary><dl>{item.questions.map((question) => <div key={question.id}><dt>{question.prompt}</dt><dd>{question.type === "scale" ? `${answers[question.id] ?? "Not answered"}${typeof answers[question.id] === "number" ? ` / 5 — ${question.scaleLabels?.[Number(answers[question.id]) - 1] ?? ""}` : ""}` : String(answers[question.id] || "No optional reflection added.")}</dd></div>)}</dl></details>)}
      </div>
    </section>
  );
  return (
    <section className="architect-assessment-card" aria-labelledby="architect-section-title">
      <header className="architect-assessment-head">
        <div>
          <p className="eyebrow">Section {sectionIndex + 1} of {architectSections.length} · {architectQuestionCount} questions{assessment.version > 1 ? ` · Assessment ${assessment.version}` : ""}</p>
          <h2 id="architect-section-title">{section.label}</h2>
          <p>{section.description}</p>
        </div>
        <div className={`save-indicator ${saveState}`} role="status">{saveState === "saving" || saveState === "pending" ? "Saving…" : saveState === "error" ? "Not saved" : "Saved"}</div>
      </header>
      {assessment.version > 1 && <p className="field-help">This is a fresh check-in. Your previous assessment and Blueprint are safely saved.</p>}
      <div className="architect-progress" aria-label={`${progress}% of assessment answered`}><span style={{ width: `${progress}%` }} /></div>
      <p className="progress-copy">{answeredCount} of {architectScoredQuestionCount} scored prompts answered · {progress}%</p>
      <div className="architect-questions">
        {section.questions.map((question, questionIndex) => (
          <fieldset className="architect-question" key={question.id} disabled={conflict}>
            <legend><span>{String(sectionIndex * 6 + questionIndex + 1).padStart(2, "0")}</span>{question.prompt}</legend>
            {question.help && <p className="field-help">{question.help}</p>}
            {question.type === "scale" ? (
              <div className="architect-scale">
                {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-label={`${value} — ${question.scaleLabels?.[value - 1] ?? value}`} aria-pressed={answers[question.id] === value} className={answers[question.id] === value ? "selected" : ""} onClick={() => { setAnswers((current) => ({ ...current, [question.id]: value })); setSaveState("pending"); }}><strong>{value}</strong><small>{question.scaleLabels?.[value - 1] ?? ""}</small></button>)}
              </div>
            ) : <textarea value={String(answers[question.id] ?? "")} maxLength={2000} rows={3} onChange={(event) => { setAnswers((current) => ({ ...current, [question.id]: event.target.value })); setSaveState("pending"); }} placeholder="Add context in your own words (optional)…" />}
          </fieldset>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      {conflict && <p>Your answers on this screen are still visible. Another tab changed this assessment; reload to continue from the latest saved version. <button type="button" className="text-button" onClick={() => window.location.reload()}>Reload saved assessment</button></p>}
      <footer className="architect-actions">
        <button type="button" className="text-button" disabled={sectionIndex === 0 || saveState === "saving" || conflict} onClick={async () => { const next = sectionIndex - 1; if (await persist(answers, next)) setSectionIndex(next); }}>← Back</button>
        <button type="button" className="text-button" disabled={saveState === "saving" || conflict} onClick={async () => { if (await persist(answers, sectionIndex)) router.push("/dashboard"); }}>Save &amp; finish later</button>
        <button type="button" className="button" disabled={saveState === "saving" || conflict} onClick={continueAssessment}>{sectionIndex === architectSections.length - 1 ? "Build my Blueprint" : "Continue"}</button>
      </footer>
    </section>
  );
}
