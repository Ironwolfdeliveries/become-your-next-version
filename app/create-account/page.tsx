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
        eyebrow="Save your Version Snapshot"
        title="Create your Architect account."
        copy="Securely save your preliminary Snapshot, then begin the deeper assessment that will shape your BYNV baseline and Blueprint."
      />
      <div className="container"><AccountEntry /></div>
    </>
  );
}
