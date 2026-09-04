export type NavItem = { label: string; href: string };
export type Product = { name: string; category: string; price: string; description: string; variants: string[]; availability: string };

export const navigation: NavItem[] = [
  { label: "Mission", href: "/mission" }, { label: "Method", href: "/framework" },
  { label: "Membership", href: "/membership" }, { label: "Kai", href: "/kai" },
  { label: "Resources", href: "/resources" }, { label: "Shop", href: "/merchandise" }
];

export const pillars = [
  { number: "01", title: "See clearly", text: "Take an honest snapshot of where you are, without judgement or performance." },
  { number: "02", title: "Design deliberately", text: "Choose the version you are building and define a direction that feels like yours." },
  { number: "03", title: "Build consistently", text: "Translate intention into a small repeatable action, then learn from what happens." },
  { number: "04", title: "Evolve continually", text: "Review the signal, refine your system and begin the next meaningful iteration." }
];

export const resources = [
  { slug: "quiet-audit", tag: "Reflection", title: "The Quiet Audit", summary: "A ten-minute practice for separating your priorities from the noise around them.", read: "4 min", download: "/resources/bynv-quiet-audit.pdf" },
  { slug: "minimum-viable-momentum", tag: "Practice", title: "Minimum Viable Momentum", summary: "Turn one meaningful priority into an action small enough to repeat this week.", read: "5 min", download: "/resources/bynv-minimum-viable-momentum.pdf" },
  { slug: "personal-operating-system", tag: "Method", title: "Your Personal Operating System", summary: "Name the conditions, boundaries, and review rhythm that help you do your best work.", read: "7 min", download: "/resources/bynv-personal-operating-system.pdf" }
];

export const products: Product[] = [
  { name: "Architect Heavyweight Tee", category: "Apparel", price: "$48 planned retail", description: "Relaxed-fit black heavyweight tee led by the metallic-gold Architect emblem.", variants: ["XS", "S", "M", "L", "XL", "2XL"], availability: "Concept preview — not currently available for purchase" },
  { name: "Next Version Crew", category: "Apparel", price: "$88 planned retail", description: "Midweight charcoal crewneck with the Architect emblem as a quiet membership badge.", variants: ["XS", "S", "M", "L", "XL", "2XL"], availability: "Concept preview — not currently available for purchase" },
  { name: "Architect Field Notes", category: "Notebooks", price: "$24 planned retail", description: "Black hardbound dot-grid notebook carrying the Architect mark for decisions, reviews, and next actions.", variants: ["A5 dot grid"], availability: "Concept preview — not currently available for purchase" },
  { name: "Build Deliberately Bottle", category: "Bottles", price: "$36 planned retail", description: "Insulated matte-black bottle with the metallic-gold Architect emblem and a restrained BYNV detail.", variants: ["750 ml"], availability: "Concept preview — not currently available for purchase" },
  { name: "Version One Cap", category: "Accessories", price: "$32 planned retail", description: "Low-profile black cap with gold Architect embroidery and an adjustable closure.", variants: ["Adjustable"], availability: "Concept preview — not currently available for purchase" },
  { name: "Daily Systems Pouch", category: "Accessories", price: "$28 planned retail", description: "Compact zip organizer bearing the Architect emblem for the tools behind a repeatable daily system.", variants: ["One size"], availability: "Concept preview — not currently available for purchase" }
];

export const faqs = [
  ["What is BYNV?", "Become Your Next Version is a personal growth system that connects reflection, deliberate planning, daily action, and progress review."],
  ["Who are The Architects?", "The Architects is the name of the BYNV community: people choosing to design their next chapter with intention."],
  ["What is the Version Snapshot?", "The public six-question Version Snapshot is a preliminary signal. It is not the deeper Architect Assessment or your final BYNV baseline."],
  ["Is the Version Score a diagnosis?", "No. It is a self-reflection aid based on your own answers, not a clinical, medical or scientifically validated assessment."],
  ["What does membership include?", "Launch Access starts with 30 free days, continues at $19.99/month through day 90, then becomes Foundation at $29.99/month. Builder is $49.99/month, Architect is $99.99/month, Architect Coaching is a separate future $249/month human service, and eligible graduates can later continue at $9.99/month. Credential- or release-dependent benefits are identified on the Membership page."],
  ["What can Kai do at launch?", "Guided Kai can explain BYNV pages, use permitted account context to suggest a next action, explain Version Scores responsibly, summarize saved progress, support goals, and build portable prompts for an AI assistant you choose. It is not a fully generative chatbot."],
  ["Can Kai replace a therapist or professional adviser?", "No. Kai is a reflection and planning guide, not a substitute for medical, mental-health, legal, financial or other qualified professional support."],
  ["Can I buy merchandise now?", "Not yet. The storefront shows real visual mockups and planned retail details, but inventory, fulfillment and checkout are not connected, so BYNV does not accept merchandise payment."],
  ["What happens when I create an account?", "Your Version Snapshot can be saved, and your Architect Assessment, Blueprint, Daily Focus, goals, journal entries, and progress can persist securely to your account."],
  ["How is my assessment data used?", "Your responses calculate deterministic scores and organize your private BYNV experience. Guided Kai may use permitted account context to provide structured guidance. Journal entries are excluded." ]
];
