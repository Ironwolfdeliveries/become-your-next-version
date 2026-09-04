import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
const routes=["","/mission","/framework","/membership","/resources","/early-access","/assessment","/version-score","/create-account","/sign-in","/kai","/about","/contact","/faq","/privacy","/terms","/disclaimer","/community-guidelines","/merchandise"];
export default function sitemap(): MetadataRoute.Sitemap {
  return routes.map((route): MetadataRoute.Sitemap[number] => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/assessment" ? 0.9 : 0.7,
  }));
}
