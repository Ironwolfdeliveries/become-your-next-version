import { Score } from "@/components/score"; import { PageHero } from "@/components/ui";
export const metadata={title:"Your Version Score",description:"View your indicative reflection score and personalised next-step plan."};
export default function Results(){return <><PageHero eyebrow="Your reflection" title="Your Version Score." copy="An indicative snapshot generated from your answers—not a grade, diagnosis or validated psychological measure."/><div className="container"><Score /></div></>}
