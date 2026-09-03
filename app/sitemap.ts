import type { MetadataRoute } from "next";
const routes=["","/mission","/framework","/membership","/resources","/early-access","/assessment","/version-score","/create-account","/sign-in","/kai","/about","/contact","/faq","/privacy","/terms","/disclaimer","/community-guidelines","/merchandise"];
export default function sitemap(): MetadataRoute.Sitemap {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  return routes.map((route): MetadataRoute.Sitemap[number] => ({
    url: `${base}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/assessment" ? 0.9 : 0.7,
  }));
}
