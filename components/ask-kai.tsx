"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createKaiRequest, getKaiPageContext, KAI_QUICK_ACTIONS } from "@/lib/kai-context";
import type { KaiQuickAction } from "@/lib/kai-context";
import { KaiAvatar } from "./kai-avatar";

export function AskKai() {
  const pathname = usePathname() || "/";
  const page = getKaiPageContext(pathname);
  const isAssessment = pathname === "/assessment" || pathname === "/architect-assessment";
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [quickAction, setQuickAction] = useState<KaiQuickAction | null>(null);
  const [preparedRequest, setPreparedRequest] = useState<ReturnType<typeof createKaiRequest> | null>(null);
  const [answer, setAnswer] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    inputRef.current?.focus();

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setIsOpen(false);
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [isOpen]);

  useEffect(() => {
    setPreparedRequest(null);
    setQuickAction(null);
    setAnswer("");
    setConversationId(null);
    setError("");
  }, [pathname]);

  useEffect(() => {
    function openWithPrompt(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      if (!detail?.prompt) return;
      setIsOpen(true);
      setPrompt(detail.prompt);
      setQuickAction(null);
      setPreparedRequest(null);
      setAnswer("");
      setError("");
    }
    window.addEventListener("bynv:ask-kai", openWithPrompt);
    return () => window.removeEventListener("bynv:ask-kai", openWithPrompt);
  }, []);

  function selectQuickAction(action: KaiQuickAction) {
    setPrompt(action);
    setQuickAction(action);
    setPreparedRequest(null);
    inputRef.current?.focus();
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;

    const request = createKaiRequest(prompt, pathname, quickAction);
    setPreparedRequest(request);
    setPending(true); setAnswer(""); setError("");
    try {
      const response = await fetch("/api/kai", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message: request.message, route: pathname, conversationId }) });
      const result = await response.json() as { answer?: string; conversationId?: string; error?: string };
      if (!response.ok || !result.answer) throw new Error(result.error ?? "Kai could not respond.");
      setAnswer(result.answer); setConversationId(result.conversationId ?? conversationId); setPrompt(""); setQuickAction(null);
    } catch (submitError) { setError(submitError instanceof Error ? submitError.message : "Kai could not respond."); }
    finally { setPending(false); }
  }

  return (
    <aside className="ask-kai-root" data-route={pathname} data-assessment={isAssessment} aria-label="Ask Kai page help">
      {isOpen ? (
        <section className="ask-kai-panel" id="ask-kai-panel" role="dialog" aria-label="Ask Kai">
          <header className="ask-kai-panel-head">
            <KaiAvatar className="ask-kai-mark" />
            <div>
              <strong>Ask Kai</strong>
              <small>Page-aware BYNV guidance</small>
            </div>
            <button className="ask-kai-close" type="button" aria-label="Close Ask Kai" onClick={() => setIsOpen(false)}>×</button>
          </header>

          <div className="ask-kai-body">
            <p className="ask-kai-context"><span>Current page</span><strong>{page.title}</strong></p>
            <p className="ask-kai-intro">{page.purpose}</p>

            {isAssessment ? (
              <p className="ask-kai-safeguard" role="note">
                Kai may explain a question&apos;s wording or purpose, but will never choose or suggest a 1–5 response.
              </p>
            ) : null}

            <div className="ask-kai-actions" aria-label="Suggested questions">
              {KAI_QUICK_ACTIONS.map((action) => (
                <button key={action} type="button" onClick={() => selectQuickAction(action)}>{action}</button>
              ))}
            </div>

            <form className="ask-kai-form" onSubmit={submitQuestion}>
              <label className="sr-only" htmlFor="ask-kai-input">Ask Kai a question</label>
              <input
                ref={inputRef}
                id="ask-kai-input"
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value);
                  setQuickAction(null);
                  setPreparedRequest(null);
                }}
                maxLength={500}
                placeholder="Ask Kai anything about this page…"
                autoComplete="off"
              />
              <button type="submit" disabled={!prompt.trim() || pending}>{pending ? "Thinking…" : "Ask"}</button>
            </form>

            <p className="ask-kai-status" aria-live="polite">
              {error || (preparedRequest ? `Kai received ${preparedRequest.context.pageTitle} context.` : "Kai uses the current page and permitted private account context. Avoid highly sensitive information.")}
            </p>
            {answer && <div className="ask-kai-answer" aria-live="polite"><small>Kai</small><p>{answer}</p></div>}

            <Link className="ask-kai-next" href={page.recommendation.href}>
              <span>Suggested next section</span>
              {page.recommendation.label} <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      ) : null}

      <button
        className="ask-kai-toggle"
        type="button"
        aria-expanded={isOpen}
        aria-controls="ask-kai-panel"
        onClick={() => setIsOpen((open) => !open)}
      >
        <KaiAvatar className="ask-kai-toggle-mark" />
        <span className="ask-kai-label">Ask Kai</span>
        <span className="sr-only">{isOpen ? "Close Ask Kai" : "Open Ask Kai"}</span>
      </button>
    </aside>
  );
}
