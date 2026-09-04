import type { KaiInterpretationResult } from "@/lib/services";
import { KaiAvatar } from "./kai-avatar";

export function KaiInterpretation({ interpretation }: { interpretation: KaiInterpretationResult }) {
  return (
    <section className="kai-result" aria-labelledby="kai-result-title">
      <div className="kai-result-head">
        <KaiAvatar className="kai-result-mark" />
        <div>
          <p className="eyebrow">Kai interpretation</p>
          <h2 id="kai-result-title">{interpretation.headline}</h2>
        </div>
      </div>
      <p>{interpretation.summary}</p>
      <p className="kai-result-focus"><strong>Focus first:</strong> {interpretation.focus}</p>
      <small>Guidance based directly on your six Version Snapshot answers.</small>
    </section>
  );
}
