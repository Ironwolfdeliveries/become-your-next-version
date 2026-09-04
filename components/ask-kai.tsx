"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  createKaiRequest,
  getKaiPageContext,
  KAI_QUICK_ACTIONS,
} from "@/lib/kai-context";
import type { KaiQuickAction } from "@/lib/kai-context";
import { KaiAvatar } from "./kai-avatar";

export function AskKai() {
  const pathname = usePathname() || "/";
  const page = getKaiPageContext(pathname);
  const isAssessment =
    pathname === "/assessment" || pathname === "/architect-assessment";
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [quickAction, setQuickAction] = useState<KaiQuickAction | null>(null);
  const [preparedRequest, setPreparedRequest] = useState<ReturnType<
    typeof createKaiRequest
  > | null>(null);
  const [answer, setAnswer] = useState("");
  const [responseMode, setResponseMode] = useState<"GUIDED" | "LIVE_BETA">(
    "GUIDED",
  );
  const [aiHandoff, setAiHandoff] = useState<{
    prompt: string;
    customize: string;
  } | null>(null);
  const [nextAction, setNextAction] = useState(page.recommendation);
  const [copyStatus, setCopyStatus] = useState("");
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
    setAiHandoff(null);
    setNextAction(page.recommendation);
    setCopyStatus("");
    setConversationId(null);
    setError("");
  }, [page.recommendation, pathname]);

  useEffect(() => {
    function openWithPrompt(event: Event) {
      const detail = (event as CustomEvent<{ prompt?: string }>).detail;
      if (!detail?.prompt) return;
      setIsOpen(true);
      setPrompt(detail.prompt);
      setQuickAction(null);
      setPreparedRequest(null);
      setAnswer("");
      setAiHandoff(null);
      setCopyStatus("");
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
    setPending(true);
    setAnswer("");
    setError("");
    try {
      const response = await fetch("/api/kai", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          message: request.message,
          route: pathname,
          intent: request.intent,
          conversationId,
        }),
      });
      const result = (await response.json()) as {
        answer?: string;
        conversationId?: string;
        error?: string;
        mode?: "GUIDED" | "LIVE_BETA";
        aiHandoff?: { prompt: string; customize: string };
        nextAction?: { href: string; label: string };
      };
      if (!response.ok || !result.answer)
        throw new Error(result.error ?? "Kai could not respond.");
      setAnswer(result.answer);
      setConversationId(result.conversationId ?? conversationId);
      setResponseMode(result.mode ?? "GUIDED");
      setAiHandoff(result.aiHandoff ?? null);
      setNextAction(result.nextAction ?? page.recommendation);
      setCopyStatus("");
      setPrompt("");
      setQuickAction(null);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Kai could not respond.",
      );
    } finally {
      setPending(false);
    }
  }

  async function copyPrompt() {
    if (!aiHandoff) return;
    try {
      await navigator.clipboard.writeText(aiHandoff.prompt);
      setCopyStatus("Prompt copied. Review and customize it before sharing.");
    } catch {
      setCopyStatus(
        "Copy was blocked. Select the prompt and copy it manually.",
      );
    }
  }

  return (
    <aside
      className="ask-kai-root"
      data-route={pathname}
      data-assessment={isAssessment}
      aria-label="Ask Kai page help"
    >
      {isOpen ? (
        <section
          className="ask-kai-panel"
          id="ask-kai-panel"
          role="dialog"
          aria-label="Ask Kai"
        >
          <header className="ask-kai-panel-head">
            <KaiAvatar className="ask-kai-mark" />
            <div>
              <strong>Ask Kai</strong>
              <small>Kai · page-aware BYNV guidance</small>
            </div>
            <button
              className="ask-kai-close"
              type="button"
              aria-label="Close Ask Kai"
              onClick={() => setIsOpen(false)}
            >
              ×
            </button>
          </header>

          <div className="ask-kai-body">
            <p className="ask-kai-context">
              <span>Current page</span>
              <strong>{page.title}</strong>
            </p>
            <p className="ask-kai-intro">{page.purpose}</p>

            {isAssessment ? (
              <p className="ask-kai-safeguard" role="note">
                Kai may explain a question&apos;s wording or purpose, but will
                never choose or suggest a 1–5 response.
              </p>
            ) : null}

            <div className="ask-kai-actions" aria-label="Suggested questions">
              {KAI_QUICK_ACTIONS.map((action) => (
                <button
                  key={action}
                  type="button"
                  onClick={() => selectQuickAction(action)}
                >
                  {action}
                </button>
              ))}
            </div>

            <form className="ask-kai-form" onSubmit={submitQuestion}>
              <label className="sr-only" htmlFor="ask-kai-input">
                Ask Kai a question
              </label>
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
                placeholder="Ask for BYNV guidance or an AI prompt…"
                autoComplete="off"
              />
              <button type="submit" disabled={!prompt.trim() || pending}>
                {pending ? "Thinking…" : "Ask"}
              </button>
            </form>

            <p className="ask-kai-status" aria-live="polite">
              {error ||
                (preparedRequest
                  ? `${responseMode === "GUIDED" ? "Guided Kai" : "Live Kai Beta"} used ${preparedRequest.context.pageTitle} context.`
                  : "Guided Kai is always available. Approved beta members may also receive personalized Live Kai responses.")}
            </p>
            {answer && (
              <div className="ask-kai-answer" aria-live="polite">
                <small>Kai</small>
                <p>{answer}</p>
              </div>
            )}

            {aiHandoff ? (
              <div className="ask-kai-handoff">
                <div>
                  <small>Use AI for this</small>
                  <strong>Portable prompt</strong>
                </div>
                <textarea
                  readOnly
                  rows={12}
                  value={aiHandoff.prompt}
                  aria-label="Portable AI prompt"
                />
                <button
                  className="text-button"
                  type="button"
                  onClick={() => void copyPrompt()}
                >
                  Copy prompt
                </button>
                <p>{aiHandoff.customize}</p>
                <p className="form-message" role="status" aria-live="polite">
                  {copyStatus}
                </p>
              </div>
            ) : null}

            <Link className="ask-kai-next" href={nextAction.href}>
              <span>Suggested next section</span>
              {nextAction.label} <span aria-hidden="true">→</span>
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
        <span className="sr-only">
          {isOpen ? "Close Ask Kai" : "Open Ask Kai"}
        </span>
      </button>
    </aside>
  );
}
