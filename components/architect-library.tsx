"use client";

import Link from "next/link";
import { useState } from "react";
import { architectLibrary, libraryCategories, tierLabels, type LibraryTier } from "@/lib/architect-library";
import { canReadLibraryResource } from "@/lib/library-entitlement";

export function ArchitectLibrary({ tier }: { tier: LibraryTier }) {
  const [category, setCategory] = useState("all");
  const [availableOnly, setAvailableOnly] = useState(false);
  const visible = architectLibrary.filter(resource => (category === "all" || resource.category === category) && (!availableOnly || canReadLibraryResource(tier, resource.tier)));
  return <>
    <div className="library-filters">
      <label>What would help today?<select value={category} onChange={event => setCategory(event.target.value)}><option value="all">All areas</option>{libraryCategories.filter(item => architectLibrary.some(resource => resource.category === item.key)).map(item => <option key={item.key} value={item.key}>{item.label}</option>)}</select></label>
      <button className={`library-filter-toggle${availableOnly ? " selected" : ""}`} type="button" aria-pressed={availableOnly} onClick={() => setAvailableOnly(value => !value)}>Available with my access</button>
    </div>
    <p className="library-result-count" role="status">{visible.length} {visible.length === 1 ? "guide" : "guides"}</p>
    <div className="architect-library-grid">
      {visible.map(resource => {
        const available = canReadLibraryResource(tier, resource.tier);
        return <article className="architect-library-card" key={resource.slug}>
          <div className="library-card-meta"><p className="eyebrow">{libraryCategories.find(item => item.key === resource.category)?.label}</p><span className={available ? "library-access available" : "library-access"}>{resource.tier === "free" ? "Free" : `${tierLabels[resource.tier]}${available ? " · Included" : "+"}`}</span></div>
          <h3>{resource.title}</h3><p>{resource.summary}</p>
          <footer><span>About {resource.minutes} min</span><Link href={`/resources/${resource.slug}`}>{available ? "Open guide" : "View access"}<span aria-hidden="true"> →</span></Link></footer>
        </article>;
      })}
    </div>
    {!visible.length && <div className="library-empty"><p>No guides in this area are included with your current access.</p><button className="button secondary" type="button" onClick={() => { setCategory("all"); setAvailableOnly(true); }}>Show available guides</button></div>}
  </>;
}
