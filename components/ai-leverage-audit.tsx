"use client";

import { useMemo, useState } from "react";
import { aiLeverageTasks, buildKaiAILeveragePrompt, buildPortableAIHandoff } from "@/lib/ai-leverage";

export function AILeverageAudit({ priority, action }: { priority: string; action: string }) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [showHandoff, setShowHandoff] = useState(false);
  const selectedTask = aiLeverageTasks.find((task) => task.id === selectedIds[0]) ?? null;
  const handoff = useMemo(() => selectedTask ? buildPortableAIHandoff(selectedTask, priority, action) : "", [selectedTask, priority, action]);

  function toggleTask(id: string) {
    setMessage("");
    setShowHandoff(false);
    if (!selectedIds.includes(id) && selectedIds.length >= 3) {
      setMessage("Choose up to three. Start with the first task you can clearly verify.");
      return;
    }
    setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  }

  function openKai() {
    if (!selectedTask) return;
    window.dispatchEvent(new CustomEvent("bynv:ask-kai", { detail: { prompt: buildKaiAILeveragePrompt(selectedTask, priority, action) } }));
  }

  async function copyHandoff() {
    if (!handoff) return;
    try { await navigator.clipboard.writeText(handoff); setMessage("Handoff copied. Add your context, then review it before sharing with any AI."); }
    catch { setMessage("Copy was blocked by this browser. Select the handoff text and copy it manually."); }
  }

  return <section className="ai-leverage" aria-labelledby="ai-leverage-title">
    <div className="ai-leverage-head"><div><p className="eyebrow">AI Leverage</p><h2 id="ai-leverage-title">What should AI take off my plate?</h2><p>Choose recurring work—not responsibility. BYNV will help you define a useful handoff and the checks that remain yours.</p></div><span>{selectedIds.length}/3 selected</span></div>
    <fieldset className="ai-leverage-options"><legend className="sr-only">Choose recurring tasks AI could help with</legend>{aiLeverageTasks.map((task) => <label key={task.id} className={selectedIds.includes(task.id) ? "selected" : ""}><input type="checkbox" checked={selectedIds.includes(task.id)} onChange={() => toggleTask(task.id)} /><span><strong>{task.title}</strong><small>{task.signal}</small></span></label>)}</fieldset>
    {selectedTask ? <div className="ai-leverage-result"><p className="eyebrow">Start here</p><h3>{selectedTask.title}</h3><dl><div><dt>AI can help</dt><dd>{selectedTask.aiRole}</dd></div><div><dt>Your judgment stays in charge</dt><dd>{selectedTask.humanCheck}</dd></div></dl><div className="button-row"><button className="button" type="button" onClick={openKai}>Use Guided Kai</button><button className="button secondary" type="button" onClick={() => setShowHandoff((shown) => !shown)}>{showHandoff ? "Hide my AI handoff" : "Teach me to use my AI"}</button></div><p className="field-help">Guided Kai can refine the handoff without calling a paid model. You can then use the prompt with the AI assistant you prefer.</p>{showHandoff ? <div className="ai-handoff"><label htmlFor="ai-handoff-text">Portable AI handoff</label><textarea id="ai-handoff-text" readOnly rows={16} value={handoff} /><button className="text-button" type="button" onClick={() => void copyHandoff()}>Copy handoff</button><p className="field-help">Review the text, add only necessary context, and never paste passwords, private credentials, journal entries, or information you are not allowed to share.</p></div> : null}</div> : <p className="ai-leverage-empty">Select one to three areas. Your first selection becomes the recommended starting workflow.</p>}
    <p className="form-message" role="status" aria-live="polite">{message}</p><p className="fine-print">This audit stays in this page until you choose to copy a handoff or open Kai. BYNV does not promise a specific amount of time saved.</p>
  </section>;
}
