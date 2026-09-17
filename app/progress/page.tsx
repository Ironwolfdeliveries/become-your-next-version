import { MomentumOverview } from "@/components/momentum-overview";
import { AreaHelp } from "@/components/area-help";
import Link from "next/link";
import { requireUser } from "@/lib/supabase/require-user";
import { createClient } from "@/lib/supabase/server";
import { getExperience } from "@/lib/experience-server";
import { entrySteps, entryStatus } from "@/lib/experience";
import "@/components/member-command-center.css";
import "./progress.css";
export const metadata = { title: "My Momentum", description: "Momentum, Blueprint milestones, and what changed between Architect Cycles." };
export const dynamic = "force-dynamic";
export default async function ProgressPage() {
  const user = await requireUser("/momentum"), supabase = await createClient();
  const [state, assessments, snapshots] = await Promise.all([
    getExperience(user.id),
    supabase.from("architect_assessments").select("id,version,version_score,section_results,completed_at").eq("user_id",user.id).eq("status","completed").order("version",{ascending:true}),
    supabase.from("version_snapshots").select("id,score,completed_at").eq("user_id",user.id).order("completed_at",{ascending:false}),
  ]);
  if (assessments.error || snapshots.error) throw new Error("Your saved progress could not be loaded. Please try again.");
  const history = assessments.data ?? [], first = history[0], latest = history[history.length-1];
  const firstAreas = (first?.section_results ?? []) as {key:string;label:string;score:number}[], latestAreas = (latest?.section_results ?? []) as {key:string;label:string;score:number}[];
  return <div className="container command-center progress-center">
    <header className="command-heading"><div><p className="eyebrow">My Momentum</p><h1>See what’s moving.</h1><p>Your actions, recovery, and real changes in one place.<br />Choose the next move that matters to you.</p></div><Link className="command-link" href="/daily-focus">Today’s Plan</Link></header>
    <MomentumOverview initial={state} /><section className="command-panel"><h2>Need to rethink your direction?</h2><p>Let Kai help you notice what feels stuck and choose one realistic next step.</p><Link className="command-link" href="/next-version-reset">Begin a Next Version Reset</Link></section>
    <section id="comparison" className="command-panel progress-comparison"><p className="eyebrow">Version Score · full assessment</p><h2>{latest ? `${latest.version_score}/100` : "Your baseline is waiting."}</h2>{first && latest && first.id!==latest.id ? <><p>Starting score: {first.version_score}/100. Latest: {latest.version_score}/100. Your original assessment is preserved.</p><div className="progress-table-wrap"><table><caption>Your seven areas, starting point and latest reassessment</caption><thead><tr><th>Area</th><th>Starting</th><th>Latest</th><th>Change</th></tr></thead><tbody>{latestAreas.map(area=>{const baseline=firstAreas.find(a=>a.key===area.key)?.score;const change=baseline==null?null:area.score-baseline;return <tr key={area.key}><th scope="row">{area.label}<AreaHelp areaKey={area.key} /></th><td>{baseline??"—"}</td><td>{area.score}</td><td>{change==null?"—":`${change>0?"+":""}${change}`}</td></tr>;})}</tbody></table></div></> : <p>{first ? "This is your saved starting point. A new assessment creates a separate record so you can compare what changed." : "Complete the Architect Assessment to establish your seven-area Blueprint."}</p>}<div className="button-row"><Link className="button secondary" href="/architect-assessment">{first?"Review or begin a new assessment":"Continue assessment"}</Link>{first&&<Link className="command-link" href="/blueprint">My Blueprint</Link>}</div>
      {history.length>1&&<details><summary>All completed assessments</summary>{history.map(a=><p key={a.id}>Assessment {a.version}: {a.version_score}/100 · {new Date(a.completed_at).toLocaleDateString("en-US",{timeZone:state.timezone})}</p>)}</details>}
    </section>
    <details className="command-panel"><summary>Architect Cycle history · What you set out to change</summary>{state.cycles.length?state.cycles.map(cycle=><article className="cycle-progress-record" key={cycle.id}><div><h3>{cycle.focus}</h3><p>{cycle.starts_on} — {cycle.ends_on} · {cycle.status}</p></div>{cycle.success_vision&&<p><strong>Your intention:</strong> {cycle.success_vision}</p>}{cycle.outcome&&<p><strong>Your review:</strong> {cycle.outcome}</p>}</article>):<p>Start a 14-day Cycle with Kai to turn your priority into a realistic plan.</p>}<Link className="command-link" href="/architect-cycle">{state.cycle?"Continue my Cycle":"Build my next Cycle"}</Link></details>
    <details className="command-panel"><summary>Recent actions and check-ins</summary>{state.recent.filter(e=>e.focus_date<=state.today).slice(0,30).map(entry=><article className="cycle-progress-record" key={entry.id}><h3>{entry.priority||"Daily action"}</h3><p>{entry.focus_date} · {entryStatus(entry)==="done"?"Got it done":entryStatus(entry)==="progress"?"Made progress":entryStatus(entry)==="missed"?"Didn’t happen":"Awaiting check-in"}</p><ul>{entrySteps(entry).map(step=><li key={step.id}>{step.done?"✓ ":""}{step.text}</li>)}</ul>{entry.reflection&&<p>{entry.reflection}</p>}{entry.recovery&&<p>Next step saved for {entry.recovery.next_date}: {entry.recovery.next_action}</p>}</article>)}</details>
    <details className="command-panel"><summary>Introductory Version Snapshot history</summary><p>The six-question Snapshot is separate from your full seven-area assessment.</p>{snapshots.data?.length?snapshots.data.map(s=><p key={s.id}>{s.score}/100 · {new Date(s.completed_at).toLocaleDateString("en-US",{timeZone:state.timezone})}</p>):<p>No introductory Snapshots saved.</p>}</details>
  </div>;
}
