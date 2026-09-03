import { AuthForm } from "@/components/auth-form";
import { PageHero } from "@/components/ui";

export const metadata = { title: "Sign In", description: "Sign in to your BYNV Architect account." };
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) { const { next } = await searchParams; return <><PageHero eyebrow="Welcome back" title="Continue building your next version." copy="Sign in to return to your Blueprint, assessment progress, and daily focus." /><div className="container auth-shell"><AuthForm mode="signin" redirectTo={next} /></div></>; }
