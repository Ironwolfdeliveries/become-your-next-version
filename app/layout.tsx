import type { Metadata } from "next";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { JsonLd } from "@/components/ui";
const url = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
export const metadata: Metadata = { metadataBase: new URL(url), title: { default: "BYNV — Become Your Next Version", template: "%s | BYNV" }, description: "A deliberate system for becoming who your next chapter requires.", applicationName: "BYNV", openGraph: { type: "website", siteName: "BYNV", title: "Become Your Next Version", description: "See clearly. Design deliberately. Build consistently.", url }, twitter: { card: "summary_large_image" } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><JsonLd data={{ "@context": "https://schema.org", "@type": "Organization", name: "Become Your Next Version", alternateName: "BYNV", url, description: "A personal-growth platform for guided reflection and deliberate action." }} /><Navigation /><main id="content">{children}</main><Footer /></body></html> }
