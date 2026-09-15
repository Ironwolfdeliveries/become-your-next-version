import Link from "next/link";
import { PageHero } from "@/components/ui";
import { ArchitectLibrary } from "@/components/architect-library";
import { resources } from "@/lib/data";
import { getLibraryAccess } from "@/lib/architect-library-access";
import { tierLabels } from "@/lib/architect-library";
import "@/components/architect-library.css";

export const metadata = { title: "Architect Library", description: "Original BYNV guides and free worksheets to help you focus, act, recover, and build your next version." };
export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const access = await getLibraryAccess();
  return <>
    <PageHero eyebrow="Architect Library" title="A useful tool. A clearer next step." copy="Choose a short guide for what you need today. Try the exercise, then bring one useful action back into your plan." />
    <section className="container architect-library-shell" aria-label="Architect Library guides">
      <div className="library-intro"><div><h2>Find what helps you move.</h2><p>12 original guides, plus our three free downloadable worksheets.</p></div><span className="library-current-access">Your access: {tierLabels[access.tier]}</span></div>
      {access.unavailable && <p className="form-error" role="alert">We couldn’t verify membership access right now. Free resources remain available. Refresh to try again.</p>}
      <ArchitectLibrary tier={access.tier} />
      <section className="library-downloads" aria-label="Free BYNV PDF downloads"><header><p className="eyebrow">Always free · No account needed</p><h2>Take a worksheet with you.</h2></header><div className="library-pdf-grid">{resources.map(resource => <article id={resource.slug} key={resource.slug}><p className="eyebrow">{resource.tag} · PDF</p><h3>{resource.title}</h3><p>{resource.summary}</p><a className="button secondary" href={resource.download} download>Download PDF <span aria-hidden="true">↓</span></a></article>)}</div></section>
      <div className="library-return"><div><h2>Let one idea become action.</h2><p>{access.signedIn ? "Your plan is where you put it to work." : "Start with any free guide or download above."}</p></div>{access.signedIn && <Link className="button" href="/daily-focus">Open Today’s Plan <span aria-hidden="true">→</span></Link>}</div>
    </section>
  </>;
}
