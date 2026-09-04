import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/ui";
import { AskKai } from "@/components/ask-kai";
import { SITE_URL } from "@/lib/site";
import { AnalyticsTracker } from "@/components/analytics-tracker";
const socialImage = "/images/architect-collection-mockups.webp";
export const metadata: Metadata = { metadataBase: new URL(SITE_URL), title: { default: "BYNV — Become Your Next Version", template: "%s | BYNV" }, description: "A deliberate system for becoming who your next chapter requires.", applicationName: "BYNV", openGraph: { type: "website", siteName: "BYNV", title: "Become Your Next Version", description: "See clearly. Design deliberately. Build consistently.", url: SITE_URL, images: [{ url: socialImage, alt: "Become Your Next Version — The Architect Collection" }] }, twitter: { card: "summary_large_image", title: "Become Your Next Version", description: "See clearly. Design deliberately. Build consistently.", images: [socialImage] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: "Become Your Next Version", alternateName: "BYNV", url: SITE_URL, email: "becomeyournextversion@gmail.com", logo: `${SITE_URL}/images/kai-approved-face.webp`, description: "A personal-growth platform for guided reflection and deliberate action." }} /><AnalyticsTracker /><Navigation /><main id="content">{children}</main><Footer /><AskKai /></body></html> }
