import { ContactForm } from "@/components/forms"; import { PageHero } from "@/components/ui";
export const metadata={title:"Contact",description:"Contact the BYNV team."};
export default function Contact(){return <><PageHero eyebrow="Contact" title="Start a conversation." copy="Questions about BYNV, future membership, partnerships or privacy? Use the demonstration form below."/><div className="content container"><ContactForm /></div></>}
