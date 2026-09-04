import { Button, PageHero } from "@/components/ui";
import { resources } from "@/lib/data";

export const metadata = {
  title: "Free Architect Resources",
  description: "Download practical BYNV reflection, momentum, and personal operating-system worksheets.",
};

export default function ResourcesPage() {
  return <>
    <PageHero eyebrow="Free Architect resources" title="Tools you can use before you feel ready." copy="Each resource turns a broad intention into a clearer decision, a smaller action, or a repeatable review. Download them free—no account required." />
    <section className="container resource-library" aria-label="Free BYNV downloads">
      {resources.map((resource, index) => <article id={resource.slug} className="resource-download" key={resource.slug}>
        <div className="resource-number" aria-hidden="true">0{index + 1}</div>
        <div>
          <p className="eyebrow">{resource.tag} · {resource.read}</p>
          <h2>{resource.title}</h2>
          <p>{resource.summary}</p>
          <a className="button secondary" href={resource.download} download>Download the PDF <span aria-hidden="true">↓</span></a>
        </div>
      </article>)}
    </section>
    <section className="container resource-next panel">
      <div><p className="eyebrow">Start with where you are</p><h2>Make the next resource personal.</h2><p>The free Version Snapshot identifies one current strength and one area to focus on, then gives you practical next steps based on your six answers.</p></div>
      <Button href="/assessment">Take your Version Snapshot</Button>
    </section>
  </>;
}
