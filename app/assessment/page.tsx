import { Assessment } from "@/components/assessment"; import { PageHero } from "@/components/ui";
export const metadata={title:"Version Snapshot",description:"Reflect across six areas and discover your current Version Score."};
export default function AssessmentPage(){return <><PageHero eyebrow="Free Version Snapshot" title="Meet your current version." copy="Six prompts. About three minutes. This Snapshot gives you a useful starting point before the deeper Architect Assessment."/><div className="container"><Assessment /></div></>}
