import { getAreaGuidance } from "@/lib/area-guidance";
import "./area-help.css";

/** Native disclosure works with keyboard/touch and needs no chat, API call or saved state. */
export function AreaHelp({ areaKey, actionable = false }: { areaKey?: string | null; actionable?: boolean }) {
  const area = getAreaGuidance(areaKey);
  if (!area) return null;
  return <div className="area-help">
    <p className="area-help-meaning"><strong>{area.name}.</strong> {area.meaning}</p>
    {actionable && <p className="area-help-tip">{area.tip}</p>}
    <details key={areaKey} className="area-help-kai">
      <summary>What does this mean? <span>Ask Kai</span><span className="sr-only"> about {area.label}</span></summary>
      <p><strong>Kai:</strong> {area.kai}</p>
      <p className="area-help-examples"><strong>For example:</strong> {area.examples.join("; ")}.</p>
    </details>
  </div>;
}
