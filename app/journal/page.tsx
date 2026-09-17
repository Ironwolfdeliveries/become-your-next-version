import { JournalWorkspace } from "@/components/journal-workspace";
import { MemberHeader as PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Architect Journal", description: "Capture private BYNV reflections and evidence of progress." };
export const dynamic = "force-dynamic";
export default async function Journal() { await requireUser("/journal"); return <><PageHero eyebrow="Architect Journal" title="Notice what is changing." copy="Keep a thought you want to remember. It can help you notice change. Choose a prompt or write a short note." /><section className="container member-page"><JournalWorkspace /></section></>; }
