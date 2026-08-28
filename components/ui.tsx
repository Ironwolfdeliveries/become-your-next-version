import Link from "next/link";
import type { ReactNode } from "react";

export function Eyebrow({ children }: { children: ReactNode }) { return <p className="eyebrow">{children}</p>; }
export function Button({ href, children, secondary = false }: { href: string; children: ReactNode; secondary?: boolean }) { return <Link className={secondary ? "button secondary" : "button"} href={href}>{children}<span aria-hidden="true">→</span></Link>; }
export function SectionTitle({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) { return <div className="section-title"><Eyebrow>{eyebrow}</Eyebrow><h2>{title}</h2>{copy && <p>{copy}</p>}</div>; }
export function PageHero({ eyebrow, title, copy, children }: { eyebrow: string; title: string; copy: string; children?: ReactNode }) { return <section className="page-hero container"><Eyebrow>{eyebrow}</Eyebrow><h1>{title}</h1><p className="lede">{copy}</p>{children}</section>; }
export function CTA({ title = "Your next version starts with a clearer question.", copy = "Take the free assessment and leave with an indicative score and a practical next-step plan." }: { title?: string; copy?: string }) { return <section className="cta container"><div><Eyebrow>Start here</Eyebrow><h2>{title}</h2><p>{copy}</p></div><Button href="/assessment">Take the free assessment</Button></section>; }
export function JsonLd({ data }: { data: object }) { return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />; }
