"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { architectQuestionCount, architectScoredQuestionCount, architectSections, calculateArchitectResults, type ArchitectAnswers } from "@/lib/architect-assessment";
import { createClient } from "@/lib/supabase/client";

type SaveState = "loading" | "saved" | "saving" | "error";

export function ArchitectAssessment() {
  const router = useRouter();
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [answers, setAnswers] = useState<ArchitectAnswers>({});
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [error, setError] = useState("");
  const hydrated = useRef(false);
  const section = architectSections[sectionIndex];

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const supabase = createClient();
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) throw userError ?? new Error("Please sign in again.");
        const { data, error: readError } = await supabase.from("architect_assessments").select("id,answers,current_section,status").eq("user_id", user.id).eq("version", 1).maybeSingle();
        if (readError) throw readError;
        if (!active) return;
        setUserId(user.id);
        if (data) {
          setAssessmentId(data.id);
          setAnswers((data.answers as ArchitectAnswers) ?? {});
          setSectionIndex(Math.min(Number(data.current_section) || 0, architectSections.length - 1));
          if (data.status === "completed") setSaveState("saved");
        } else {
          const { data: created, error: createError } = await supabase.from("architect_assessments").insert({ user_id: user.id, version: 1 }).select("id").single();
          if (createError) throw createError;
          setAssessmentId(created.id);
        }
        hydrated.current = true;
        setSaveState("saved");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Your assessment could not be loaded.");
        setSaveState("error");
      }
    }
    void load();
    return () => { active = false; };
  }, []);

  const persist = useCallback(async (nextAnswers: ArchitectAnswers, nextSection: number, complete = false) => {
    if (!assessmentId || !userId) return false;
    setSaveState("saving");
    try {
      const result = calculateArchitectResults(nextAnswers);
      const changes = {
        answers: nextAnswers,
        current_section: nextSection,
        section_results: result.sections,
        ...(complete ? { version_score: result.score, status: "completed", completed_at: new Date().toISOString() } : {}),
      };
      const { error: updateError } = await createClient().from("architect_assessments").update(changes).eq("id", assessmentId).eq("user_id", userId);
      if (updateError) throw updateError;
      setSaveState("saved");
      setError("");
      return true;
    } catch (saveError) {
      setSaveState("error");
      setError(saveError instanceof Error ? saveError.message : "Progress could not be saved.");
      return false;
    }
  }, [assessmentId, userId]);

  useEffect(() => {
    if (!hydrated.current || !assessmentId) return;
    const timer = window.setTimeout(() => { void persist(answers, sectionIndex); }, 700);
    return () => window.clearTimeout(timer);
  }, [answers, assessmentId, persist, sectionIndex]);

  const answeredCount = useMemo(() => Object.values(answers).filter((value) => typeof value === "number").length, [answers]);
  const currentComplete = section.questions.every((question) => question.type === "text" || typeof answers[question.id] === "number");
  const progress = Math.round((answeredCount / architectScoredQuestionCount) * 100);

  async function continueAssessment() {
    if (!currentComplete) return setError("Answer each scored question in this section before continuing. The written reflection is optional.");
    if (sectionIndex < architectSections.length - 1) {
      const next = sectionIndex + 1;
      if (await persist(answers, next)) { setSectionIndex(next); window.scrollTo({ top: 0, behavior: "smooth" }); }
      return;
    }
    if (await persist(answers, sectionIndex, true)) router.push("/blueprint");
  }

  if (saveState === "loading") return <div className="assessment-card" aria-live="polite">Loading your saved assessment…</div>;
  return (
    <section className="architect-assessment-card" aria-labelledby="architect-section-title">
      <header className="architect-assessment-head">
        <div>
          <p className="eyebrow">Section {sectionIndex + 1} of {architectSections.length} · {architectQuestionCount} questions</p>
          <h2 id="architect-section-title">{section.label}</h2>
          <p>{section.description}</p>
        </div>
        <div className={`save-indicator ${saveState}`} role="status">{saveState === "saving" ? "Saving…" : saveState === "error" ? "Not saved" : "Saved"}</div>
      </header>
      <div className="architect-progress" aria-label={`${progress}% of assessment answered`}><span style={{ width: `${progress}%` }} /></div>
      <p className="progress-copy">{answeredCount} of {architectScoredQuestionCount} scored prompts answered · {progress}%</p>
      <div className="architect-questions">
        {section.questions.map((question, questionIndex) => (
          <fieldset className="architect-question" key={question.id}>
            <legend><span>{String(sectionIndex * 6 + questionIndex + 1).padStart(2, "0")}</span>{question.prompt}</legend>
            {question.help && <p className="field-help">{question.help}</p>}
            {question.type === "scale" ? (
              <div className="architect-scale">
                {[1, 2, 3, 4, 5].map((value) => <button type="button" key={value} aria-pressed={answers[question.id] === value} className={answers[question.id] === value ? "selected" : ""} onClick={() => setAnswers((current) => ({ ...current, [question.id]: value }))}><strong>{value}</strong><small>{value === 1 ? "Not true yet" : value === 5 ? "Consistently true" : ""}</small></button>)}
              </div>
            ) : <textarea value={String(answers[question.id] ?? "")} maxLength={2000} rows={5} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Add context in your own words (optional)…" />}
          </fieldset>
        ))}
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <footer className="architect-actions">
        <button type="button" className="text-button" disabled={sectionIndex === 0 || saveState === "saving"} onClick={async () => { const next = sectionIndex - 1; if (await persist(answers, next)) setSectionIndex(next); }}>← Back</button>
        <button type="button" className="text-button" onClick={async () => { if (await persist(answers, sectionIndex)) router.push("/dashboard"); }}>Save &amp; finish later</button>
        <button type="button" className="button" disabled={saveState === "saving"} onClick={continueAssessment}>{sectionIndex === architectSections.length - 1 ? "Complete assessment" : "Continue"}</button>
      </footer>
    </section>
  );
}
