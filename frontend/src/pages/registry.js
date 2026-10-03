// Lazy loaders for the public pages, keyed by path. main.jsx builds its
// lazy() routes from these, and PageTransition uses them to fetch the next
// page's chunk while the curtain is covering (and on link hover), so a page
// never appears half-loaded.
export const pageLoaders = {
  "/about": () => import("./AboutPage.jsx"),
  "/solutions": () => import("./SolutionsPage.jsx"),
  "/how-we-trade": () => import("./HowWeTradePage.jsx"),
  "/market": () => import("./MarketPage.jsx"),
  "/sustainability": () => import("./SustainabilityPage.jsx"),
  "/case-studies": () => import("./CaseStudiesPage.jsx"),
  "/partners": () => import("./PartnersPage.jsx"),
  "/contact": () => import("./ContactPage.jsx"),
  "/sitemap": () => import("./SitemapPage.jsx"),
  "/cookies": () => import("./CookiesPage.jsx"),
  "/news": () => import("../public/NewsList.jsx"),
  "/events": () => import("../public/EventsList.jsx"),
};

export function prefetchPage(pathname) {
  const load = pageLoaders[pathname];
  return load ? load().catch(() => {}) : Promise.resolve();
}
