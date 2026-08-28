import { Assessment } from "@/components/assessment"; import { PageHero } from "@/components/ui";
export const metadata={title:"Free Assessment",description:"Reflect across six areas and discover your indicative Version Score."};
export default function AssessmentPage(){return <><PageHero eyebrow="Free assessment" title="Meet your current version." copy="Six prompts. About three minutes. Answer from where you are—not where you think you should be."/><div className="container"><Assessment /></div></>}
