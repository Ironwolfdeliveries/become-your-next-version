import { ContactForm } from "@/components/forms"; import { PageHero } from "@/components/ui";
export const metadata={title:"Contact",description:"Contact the BYNV team."};
export default function Contact(){return <><PageHero eyebrow="Contact" title="Start a conversation." copy="Questions about BYNV, membership, partnerships or privacy? Send a message to the BYNV team."/><div className="content container"><ContactForm /></div></>}
