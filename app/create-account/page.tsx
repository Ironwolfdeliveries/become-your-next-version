import { AccountEntry } from "@/components/account-entry";
import { PageHero } from "@/components/ui";

export const metadata = {
  title: "Create Your BYNV Account",
  description: "Continue from your Version Score toward a secure personal BYNV account.",
};

export default function CreateAccountPage() {
  return (
    <>
      <PageHero
        eyebrow="Continue your journey"
        title="Make this your starting point."
        copy="A secure BYNV account will connect your Version Score to your personal Blueprint, Dashboard, progress tracking, and Kai coaching."
      />
      <div className="container"><AccountEntry /></div>
    </>
  );
}
