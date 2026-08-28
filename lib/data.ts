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
  ["What is BYNV?", "Become Your Next Version is a personal-growth platform in development. It combines guided reflection, practical planning, community and a future AI coaching experience."],
  ["Who are The Architects?", "The Architects is the name of the BYNV community: people choosing to design their next chapter with intention."],
  ["Is the Version Score a diagnosis?", "No. It is an indicative self-reflection aid, not a clinical, medical or scientifically validated assessment."],
  ["What does membership include?", "The planned membership includes guided cycles, community sessions, resources, progress reviews and access to Kai. Final benefits and pricing will be confirmed before purchase."],
  ["Can Kai replace a therapist or professional adviser?", "No. Kai is planned as a reflection and planning companion, not a substitute for medical, mental-health, legal, financial or other qualified professional support."],
  ["Can I buy merchandise now?", "Not in Stage 1. The storefront is a catalogue preview; checkout, inventory, shipping and returns will be connected before launch."],
  ["What happens when I join early access?", "This demo confirms your interest locally. A production release will use explicit consent, verified email and a clear unsubscribe path."],
  ["How is my assessment data used?", "In this demo, answers remain in your browser session. See the Privacy page for planned production practices." ]
];
