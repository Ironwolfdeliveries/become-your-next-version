import { MemberWelcome } from "@/components/member-welcome";
import { PageHero } from "@/components/ui";
import { requireUser } from "@/lib/supabase/require-user";
export const metadata = { title: "Welcome, Architect", description: "Begin your BYNV Architect onboarding." };
export const dynamic = "force-dynamic";
export default async function WelcomePage() { await requireUser("/welcome"); return <><PageHero eyebrow="Your BYNV starting point" title="Welcome, Architect." copy="Your Version Snapshot is saved. Now you can begin building a clearer plan for what comes next." /><div className="container"><MemberWelcome /></div></>; }
