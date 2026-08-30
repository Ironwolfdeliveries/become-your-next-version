"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { createKaiRequest, getKaiPageContext, KAI_QUICK_ACTIONS } from "@/lib/kai-context";
import type { KaiQuickAction } from "@/lib/kai-context";

export function AskKai() {
  const pathname = usePathname() || "/";
  const page = getKaiPageContext(pathname);
  const isAssessment = pathname === "/assessment" || pathname === "/architect-assessment";
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [quickAction, setQuickAction] = useState<KaiQuickAction | null>(null);
  const [preparedRequest, setPreparedRequest] = useState<ReturnType<typeof createKaiRequest> | null>(null);
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
  }, [pathname]);

  function selectQuickAction(action: KaiQuickAction) {
    setPrompt(action);
    setQuickAction(action);
    setPreparedRequest(null);
    inputRef.current?.focus();
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!prompt.trim()) return;

    const request = createKaiRequest(prompt, pathname, quickAction);
    // Keep the prepared payload local until an authenticated Kai backend adapter is connected.
    setPreparedRequest(request);
  }

  return (
    <aside className="ask-kai-root" data-route={pathname} data-assessment={isAssessment} aria-label="Ask Kai page help">
      {isOpen ? (
        <section className="ask-kai-panel" id="ask-kai-panel" role="dialog" aria-label="Ask Kai">
          <header className="ask-kai-panel-head">
            <span className="kai-mark ask-kai-mark" aria-hidden="true">K</span>
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
              <button type="submit" disabled={!prompt.trim()}>Ask</button>
            </form>

            <p className="ask-kai-status" aria-live="polite">
              {preparedRequest
                ? `Your question is ready with ${preparedRequest.context.pageTitle} context. Live Kai answers require the secure backend connection.`
                : "Live AI replies are not connected yet. Do not share sensitive information."}
            </p>

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
        <span className="kai-mark ask-kai-toggle-mark" aria-hidden="true">K</span>
        <span className="ask-kai-label">Ask Kai</span>
        <span className="sr-only">{isOpen ? "Close Ask Kai" : "Open Ask Kai"}</span>
      </button>
    </aside>
  );
}
