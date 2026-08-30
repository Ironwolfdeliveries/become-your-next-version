import { Score } from "@/components/score"; import { PageHero } from "@/components/ui";
export const metadata={title:"Your Version Score",description:"See your Version Score, assessment-area results and personalised BYNV starting point."};
export default function Results(){return <><PageHero eyebrow="Assessment complete" title="Your Version Score." copy="Your answers have created a personal starting snapshot—not a grade, diagnosis, or limit on what comes next."/><div className="container"><Score /></div></>}
