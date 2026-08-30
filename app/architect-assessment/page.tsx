import { ArchitectAssessment } from "@/components/architect-assessment";
import { PageHero } from "@/components/ui";
export const metadata = { title: "Architect Assessment", description: "Build your fuller BYNV baseline across seven life domains." };
export default function ArchitectAssessmentPage() { return <><PageHero eyebrow="Your deeper baseline" title="Architect Assessment." copy="Move through seven focused sections. Your responses autosave securely, and you can leave and resume at any time." /><div className="container"><ArchitectAssessment /></div></>; }
