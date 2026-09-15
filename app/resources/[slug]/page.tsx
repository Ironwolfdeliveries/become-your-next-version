import Link from "next/link";
import { notFound } from "next/navigation";
import { architectLibrary, libraryCategories, tierLabels } from "@/lib/architect-library";
import { getLibraryAccess } from "@/lib/architect-library-access";
import { canReadLibraryResource } from "@/lib/library-entitlement";
import { isPublicPaidEnrollmentAuthorized } from "@/lib/membership";
import { LibraryPrintButton } from "@/components/library-print-button";
import "@/components/architect-library.css";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = architectLibrary.find(item => item.slug === slug);
  return resource ? { title: resource.title, description: resource.summary, robots: resource.tier !== "free" ? { index: false, follow: true } : undefined } : { title: "Guide not found" };
}

export default async function ResourcePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const resource = architectLibrary.find(item => item.slug === slug);
  if (!resource) notFound();
  const access = await getLibraryAccess();
  const category = libraryCategories.find(item => item.key === resource.category)?.label;
  if (!canReadLibraryResource(access.tier, resource.tier)) {
    return <div className="container library-guide-shell"><Link className="library-back" href="/resources">← Architect Library</Link><section className="library-locked"><p className="eyebrow">{category} · {tierLabels[resource.tier]}</p><h1>{resource.title}</h1><p className="lede">{resource.summary}</p>{access.unavailable ? <p className="form-error" role="alert">We couldn’t verify your membership access. Refresh to try again. This guide will open once your access is confirmed.</p> : <p>This guide is included with {tierLabels[resource.tier]}{resource.tier !== "architect" ? " and higher memberships" : " membership"}.</p>}
      <div className="button-row">{!access.signedIn && <Link className="button secondary" href={`/sign-in?next=${encodeURIComponent(`/resources/${slug}`)}`}>Sign in with an existing account</Link>}<Link className="button secondary" href="/resources">Explore free guides</Link>{access.signedIn && isPublicPaidEnrollmentAuthorized() && <Link className="button secondary" href="/membership">Review membership</Link>}</div>
      {!isPublicPaidEnrollmentAuthorized() && <p className="field-help library-enrollment-note">New paid enrollment is currently paused. Existing members keep access according to their membership.</p>}
    </section></div>;
  }
  // Load protected material only after server-side entitlement verification.
  const { getLibraryContent } = await import("@/lib/architect-library-content");
  const content = getLibraryContent(slug);
  if (!content) notFound();
  return <article className="container library-guide-shell">
    <div className="library-guide-toolbar"><Link className="library-back" href="/resources">← Architect Library</Link><LibraryPrintButton /></div>
    <header className="library-guide-header"><p className="eyebrow">{category} · About {resource.minutes} minutes · {tierLabels[resource.tier]}</p><h1>{resource.title}</h1><p className="lede">{content.intro}</p><p className="library-guide-hint">Open one step at a time. Pause to try it before moving on.</p></header>
    <div className="library-guide-steps">{content.steps.map((step, index) => <details key={step.title} open={index === 0} className="library-guide-step" data-library-step><summary><span className="library-step-number">{String(index + 1).padStart(2, "0")}</span><h2>{step.title}</h2><span className="library-step-toggle" aria-hidden="true">+</span></summary><div className="library-step-content"><p>{step.body}</p>{step.example && <aside><span>Try this</span><p>{step.example}</p></aside>}</div></details>)}</div>
    <section className="library-guide-takeaway"><p className="eyebrow">Take it into your day</p><h2>{content.takeaway}</h2>{content.nextHref && access.signedIn && <Link className="button" href={content.nextHref}>{content.nextAction} <span aria-hidden="true">→</span></Link>}{!access.signedIn && <p>Choose one useful action from this guide and give it a place in your day.</p>}<Link className="library-back" href="/resources">Find another useful guide →</Link></section>
  </article>;
}
