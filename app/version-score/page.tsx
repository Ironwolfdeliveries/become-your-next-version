import { Score } from "@/components/score"; import { PageHero } from "@/components/ui";
export const metadata={title:"Your Version Snapshot",description:"See your Version Score, area results, and BYNV starting point."};
export default function Results(){return <><PageHero eyebrow="Version Snapshot complete" title="Your Version Score." copy="Your six answers have created an introductory Version Snapshot—not your full Architect Assessment, a grade, diagnosis, or limit on what comes next."/><div className="container"><Score /></div></>}
