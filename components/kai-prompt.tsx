"use client";
export function KaiPrompt({ prompt, children }: { prompt: string; children: React.ReactNode }) {
  return <button className="button secondary" type="button" onClick={() => window.dispatchEvent(new CustomEvent("bynv:ask-kai", { detail: { prompt } }))}>{children}</button>;
}
