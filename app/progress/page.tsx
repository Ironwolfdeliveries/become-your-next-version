import { AreaHelp } from "@/components/area-help";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { getExperience } from "@/lib/experience-server";
import { entrySteps, entryStatus, momentum } from "@/lib/experience";
import { KaiAvatar } from "@/components/kai-avatar";
import "@/components/member-command-center.css";
import "./progress.css";
export const metadata = { title: "My Progress", description: "Momentum, Blueprint milestones, and what changed between Architect Cycles." };
export const dynamic = "force-dynamic";
export default async function ProgressPage() {
  const user = await requireUser("/progress"), supabase = await createClient();
  const [state, assessments, snapshots] = await Promise.all([
    getExperience(user.id),
    supabase.from("architect_assessments").select("id,version,version_score,section_results,completed_at").eq("user_id",user.id).eq("status","completed").order("version",{ascending:true}),
    supabase.from("version_snapshots").select("id,score,completed_at").eq("user_id",user.id).order("completed_at",{ascending:false}),
  ]);
  if (assessments.error || snapshots.error) throw new Error("Your saved progress could not be loaded. Please try again.");
  const stats = momentum(state.recent,state.today), history = assessments.data ?? [], first = history[0], latest = history[history.length-1];
  const completedCycles = state.cycles.filter(c=>c.status==="completed"), completedGoals = state.goals.filter(g=>g.status==="completed");
  const milestones = [
    ["Blueprint established", Boolean(first)], ["First action completed",stats.actions>=1], ["Seven useful actions",stats.actions>=7],
    ["First Cycle reviewed",completedCycles.length>=1], ["First goal completed",completedGoals.length>=1], ["First reassessment",history.length>=2],
  ] as const;
  const firstAreas = (first?.section_results ?? []) as {key:string;label:string;score:number}[], latestAreas = (latest?.section_results ?? []) as {key:string;label:string;score:number}[];
  return <div className="container command-center progress-center">
    <header className="command-heading"><div><p className="eyebrow">Next Version Progress</p><h1>See what you’re building.</h1></div><Link className="command-link" href="/daily-focus">Today’s Plan</Link></header>
    <section className="command-kai"><KaiAvatar/><div><p className="eyebrow">Kai · Your progress</p><h2>{stats.actions ? "Your actions are becoming a record of change." : "Your starting point counts, too."}</h2><p>{stats.actions ? `You’ve completed ${stats.actions} actions and reviewed ${completedCycles.length} Architect Cycles. ${stats.progressDays ? `${stats.progressDays} days also recorded partial progress.` : ""}` : "Choose one doable action in Today’s Plan. When you check in, your progress will show here."}</p><p>Scores describe your own reflection at a point in time. They are separate from the actions you take.</p></div></section>
    <section className="command-momentum" aria-label="Momentum totals"><div><strong>{stats.actions}</strong><span>actions completed</span></div><div><strong>{stats.streak}</strong><span>day Build Streak</span></div><div><strong>{completedCycles.length}</strong><span>Cycles completed</span></div><div><strong>{completedGoals.length}</strong><span>goals completed</span></div></section>
    <p className="command-small muted">A Build Streak counts consecutive days with at least one completed step. Today remains open until the day ends in {state.timezone.replaceAll("_"," ")}.</p>
    <section className="command-panel"><p className="eyebrow">Blueprint Milestones</p><h2>Useful moments along the way.</h2><ul className="milestone-list">{milestones.map(([label,earned])=><li key={label} className={earned?"earned":""}><span>{earned?"✓":"○"}</span><strong>{label}</strong><span>{earned?"Reached":"Ahead"}</span></li>)}</ul></section>
    <section className="command-panel progress-comparison"><p className="eyebrow">Version Score · full assessment</p><h2>{latest ? `${latest.version_score}/100` : "Your baseline is waiting."}</h2>{first && latest && first.id!==latest.id ? <><p>Starting score: {first.version_score}/100. Latest: {latest.version_score}/100. Your original assessment is preserved.</p><div className="progress-table-wrap"><table><caption>Your seven areas, starting point and latest reassessment</caption><thead><tr><th>Area</th><th>Starting</th><th>Latest</th><th>Change</th></tr></thead><tbody>{latestAreas.map(area=>{const baseline=firstAreas.find(a=>a.key===area.key)?.score;const change=baseline==null?null:area.score-baseline;return <tr key={area.key}><th scope="row">{area.label}<AreaHelp areaKey={area.key} /></th><td>{baseline??"—"}</td><td>{area.score}</td><td>{change==null?"—":`${change>0?"+":""}${change}`}</td></tr>;})}</tbody></table></div></> : <p>{first ? "This is your saved starting point. A new assessment creates a separate record so you can compare what changed." : "Complete the Architect Assessment to establish your seven-area Blueprint."}</p>}<div className="button-row"><Link className="button secondary" href="/architect-assessment">{first?"Review or begin a new assessment":"Continue assessment"}</Link>{first&&<Link className="command-link" href="/blueprint">My Blueprint</Link>}</div>
      {history.length>1&&<details><summary>All completed assessments</summary>{history.map(a=><p key={a.id}>Assessment {a.version}: {a.version_score}/100 · {new Date(a.completed_at).toLocaleDateString("en-US",{timeZone:state.timezone})}</p>)}</details>}
    </section>
    <section className="command-panel"><p className="eyebrow">Architect Cycle history</p><h2>What you set out to change.</h2>{state.cycles.length?state.cycles.map(cycle=><article className="cycle-progress-record" key={cycle.id}><div><h3>{cycle.focus}</h3><p>{cycle.starts_on} — {cycle.ends_on} · {cycle.status}</p></div>{cycle.success_vision&&<p><strong>Your intention:</strong> {cycle.success_vision}</p>}{cycle.outcome&&<p><strong>Your review:</strong> {cycle.outcome}</p>}</article>):<p>Start a 14-day Cycle with Kai to turn your priority into a realistic plan.</p>}<Link className="command-link" href="/architect-cycle">{state.cycle?"Continue my Cycle":"Build my next Cycle"}</Link></section>
    <details className="command-panel"><summary>Recent actions and check-ins</summary>{state.recent.filter(e=>e.focus_date<=state.today).slice(0,30).map(entry=><article className="cycle-progress-record" key={entry.id}><h3>{entry.priority||"Daily action"}</h3><p>{entry.focus_date} · {entryStatus(entry)==="done"?"Got it done":entryStatus(entry)==="progress"?"Made progress":entryStatus(entry)==="missed"?"Didn’t happen":"Awaiting check-in"}</p><ul>{entrySteps(entry).map(step=><li key={step.id}>{step.done?"✓ ":""}{step.text}</li>)}</ul>{entry.reflection&&<p>{entry.reflection}</p>}{entry.recovery&&<p>Next step saved for {entry.recovery.next_date}: {entry.recovery.next_action}</p>}</article>)}</details>
    <details className="command-panel"><summary>Introductory Version Snapshot history</summary><p>The six-question Snapshot is separate from your full seven-area assessment.</p>{snapshots.data?.length?snapshots.data.map(s=><p key={s.id}>{s.score}/100 · {new Date(s.completed_at).toLocaleDateString("en-US",{timeZone:state.timezone})}</p>):<p>No introductory Snapshots saved.</p>}</details>
  </div>;
}
