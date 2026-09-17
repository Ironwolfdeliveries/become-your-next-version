"use client";
import { commitmentRules, type CommitmentRule } from "@/lib/experience";
import { safePersonalChoice } from "@/lib/momentum";

export function PersonalCommitment({ rule, customRule, reward, onChange, disabled = false }: { rule: CommitmentRule | null; customRule: string; reward: string; disabled?: boolean; onChange: (values: { rule: CommitmentRule | null; customRule: string; reward: string }) => void }) {
  return <details className="cycle-guide-details"><summary>How BYNV can support you · optional</summary>
    <label className="cycle-guide-field">If you miss this commitment, how do you want BYNV to help you respond?<select disabled={disabled} value={customRule ? "custom" : rule ?? ""} onChange={e => onChange({rule: e.target.value === "custom" || !e.target.value ? null : e.target.value as CommitmentRule, customRule: e.target.value === "custom" ? " " : "",reward})}><option value="">Decide with Kai if it happens</option>{commitmentRules.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}<option value="custom">Choose my own constructive response</option></select></label>
    {customRule !== "" && <label className="cycle-guide-field">My supportive response<input maxLength={240} value={customRule} disabled={disabled} onChange={e => onChange({rule:null,customRule:e.target.value || " ",reward})} /><span>Choose something kind and doable. No punishment, deprivation, humiliation, or financial penalties.</span></label>}
    <label className="cycle-guide-field">If you follow through, how will you recognize the win?<input maxLength={240} value={reward} disabled={disabled} onChange={e => onChange({rule,customRule,reward:e.target.value})} /><span>Optional. The reward belongs to you.</span></label>
    <details><summary>I’d like reward ideas</summary><p>A night off, a small treat within your budget, a place you enjoy, time for a movie, or something personal to you.</p></details>
    {(!safePersonalChoice(customRule) || !safePersonalChoice(reward)) && <p role="alert">Choose a supportive response or reward that does not cause harm. You can use one of the suggestions above.</p>}
  </details>;
}
