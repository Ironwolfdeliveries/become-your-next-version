import { FirstCircleFeedback } from "@/components/first-circle-feedback";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";

export const metadata = { title: "First Circle Feedback", description: "Private early-member feedback for improving BYNV.", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function FeedbackPage() { await requireUser("/feedback"); return <><PageHero eyebrow="The First Circle" title="Help shape what BYNV becomes." copy="Use BYNV first. Then tell us what was clear, useful, confusing, or worth changing. Your response is private to the BYNV team." /><div className="container member-page"><FirstCircleFeedback /></div></>; }
