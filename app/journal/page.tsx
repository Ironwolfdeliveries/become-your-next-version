import { JournalWorkspace } from "@/components/journal-workspace";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Architect Journal", description: "Capture private BYNV reflections and evidence of progress." };
export const dynamic = "force-dynamic";
export default async function Journal() { await requireUser("/journal"); return <><PageHero eyebrow="Architect Journal" title="Notice what is changing." copy="Capture honest reflections, the friction you encountered, and the evidence you want your future self to remember." /><section className="container member-page"><JournalWorkspace /></section></>; }
