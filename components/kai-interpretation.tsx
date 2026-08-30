import type { KaiInterpretationResult } from "@/lib/services";

export function KaiInterpretation({ interpretation }: { interpretation: KaiInterpretationResult }) {
  return (
    <section className="kai-result" aria-labelledby="kai-result-title">
      <div className="kai-result-head">
        <span className="kai-mark kai-result-mark" aria-hidden="true">K</span>
        <div>
          <p className="eyebrow">Kai interpretation</p>
          <h2 id="kai-result-title">{interpretation.headline}</h2>
        </div>
      </div>
      <p>{interpretation.summary}</p>
      <p className="kai-result-focus"><strong>Focus first:</strong> {interpretation.focus}</p>
      <small>Based directly on your assessment responses.</small>
    </section>
  );
}
