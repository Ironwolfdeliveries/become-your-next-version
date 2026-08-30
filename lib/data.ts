export type NavItem = { label: string; href: string };
export type Product = { name: string; category: string; price: string; description: string };

export const navigation: NavItem[] = [
  { label: "Mission", href: "/mission" }, { label: "Method", href: "/framework" },
  { label: "Membership", href: "/membership" }, { label: "Kai", href: "/kai" },
  { label: "Journal", href: "/journal" }, { label: "Shop", href: "/merchandise" }
];

export const pillars = [
  { number: "01", title: "See clearly", text: "Take an honest snapshot of where you are, without judgement or performance." },
  { number: "02", title: "Design deliberately", text: "Choose the version you are building and define a direction that feels like yours." },
  { number: "03", title: "Build consistently", text: "Translate intention into a small repeatable action, then learn from what happens." },
  { number: "04", title: "Evolve continually", text: "Review the signal, refine your system and begin the next meaningful iteration." }
];

export const resources = [
  { slug: "quiet-audit", tag: "Reflection", title: "The quiet audit: notice before you optimise", summary: "A ten-minute practice for separating your priorities from the noise around them.", read: "4 min" },
  { slug: "minimum-viable-momentum", tag: "Practice", title: "Minimum viable momentum", summary: "Why your smallest repeatable action can be more useful than a dramatic reset.", read: "5 min" },
  { slug: "personal-operating-system", tag: "Method", title: "Draft your personal operating system", summary: "A simple prompt set for naming the conditions that help you do your best work.", read: "7 min" }
];

export const products: Product[] = [
  { name: "Architect Heavyweight Tee", category: "Apparel", price: "$48", description: "Relaxed-fit black tee with understated metallic-gold mark." },
  { name: "Next Version Crew", category: "Apparel", price: "$88", description: "Midweight charcoal crewneck designed for daily rituals." },
  { name: "Architect Field Notes", category: "Notebooks", price: "$24", description: "Warm-white dot-grid pages for decisions, reviews and next steps." },
  { name: "Build Deliberately Bottle", category: "Bottles", price: "$36", description: "Insulated matte-black bottle with minimal gold lettering." },
  { name: "Version One Cap", category: "Accessories", price: "$32", description: "Low-profile cap with tonal embroidery and adjustable closure." },
  { name: "Daily Systems Pouch", category: "Accessories", price: "$28", description: "Compact organiser for the tools behind your daily practice." }
];

export const faqs = [
  ["What is BYNV?", "Become Your Next Version is a personal growth system that connects reflection, deliberate planning, daily action, and progress review."],
  ["Who are The Architects?", "The Architects is the name of the BYNV community: people choosing to design their next chapter with intention."],
  ["What is the Version Snapshot?", "The public six-question Version Snapshot is a preliminary signal. It is not the deeper Architect Assessment or your final BYNV baseline."],
  ["Is the Version Score a diagnosis?", "No. It is a self-reflection aid based on your own answers, not a clinical, medical or scientifically validated assessment."],
  ["What does membership include?", "The planned membership includes guided cycles, community sessions, resources, progress reviews and access to Kai. Final benefits and pricing will be confirmed before purchase."],
  ["Can Kai replace a therapist or professional adviser?", "No. Kai is planned as a reflection and planning companion, not a substitute for medical, mental-health, legal, financial or other qualified professional support."],
  ["Can I buy merchandise now?", "Not yet. The storefront is a catalogue preview; checkout, inventory, shipping and returns are not connected."],
  ["What happens when I create an account?", "Your Version Snapshot can be saved, and your Architect Assessment, Blueprint, Daily Focus, goals, journal entries, and progress can persist securely to your account."],
  ["How is my assessment data used?", "Your responses calculate deterministic scores and organize your private BYNV experience. Live Kai AI is not connected and does not receive this data." ]
];
