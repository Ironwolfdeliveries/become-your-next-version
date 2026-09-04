export const SITE_URL = "https://www.becomeyournextversion.com";

export function siteUrl(path = "") {
  return `${SITE_URL}${path.startsWith("/") || path === "" ? path : `/${path}`}`;
}
