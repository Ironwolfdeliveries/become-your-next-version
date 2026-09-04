import { KaiDemo } from "@/components/kai-demo";
import { PageHero } from "@/components/ui";
export const metadata = {
  title: "Kai — BYNV Guide",
  description:
    "Understand how Kai uses approved BYNV context to support reflection and action.",
};
export default function Kai() {
  return (
    <>
      <PageHero
        eyebrow="Meet Kai"
        title="Your guide through the BYNV system."
        copy="Guided Kai is always available. Owner-approved beta members can also use personalized Live Kai, with controlled access and automatic Guided fallback."
      />
      <div className="container">
        <KaiDemo />
      </div>
      <div className="content container">
        <h2>Use Kai—or take the method anywhere.</h2>
        <p>
          Guided Kai can explain a page, interpret a Version Score responsibly,
          surface the next useful action, summarize saved progress, and help
          structure goals. It uses BYNV rules and context—not a paid generative
          model.
        </p>
        <p>
          When a task benefits from open-ended AI, Kai builds a portable prompt
          for ChatGPT, Claude, Gemini, or another assistant you prefer. Review
          and customize the prompt before using it. Your judgment remains
          responsible for the goal, context, verification, and final decision.
        </p>
        <p>
          Live Kai Beta is available only to owner-approved accounts. It uses
          permitted BYNV context for a more conversational response and falls
          back to Guided Kai whenever access, safety, or budget controls prevent
          a model request.
        </p>
        <h2>Private context with clear boundaries.</h2>
        <p>
          Kai can use your Snapshot, Architect Assessment, Blueprint, Daily
          Focus, goals, cycles and challenges. Journal entries are excluded.
          In Live Kai Beta, your question and only the permitted context needed
          to answer it are sent to BYNV&apos;s model provider. Portable prompts
          leave BYNV only if you choose to copy them into another service.
        </p>
        <p>
          Kai does not replace a therapist, clinician, crisis service or
          qualified professional adviser. During either assessment, Kai may
          clarify a question but will never recommend an answer.
        </p>
      </div>
    </>
  );
}
