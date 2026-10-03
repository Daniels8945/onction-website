import InnerHero from "../components/page/InnerHero.jsx";
import { usePageMeta } from "../hooks/usePageMeta.js";
import { openConsentBanner, useConsent } from "../lib/consent.js";

// Plain statement of what the site stores and why. Kept in step with the
// code: every key listed here is one the frontend actually reads or writes.
const ROWS = [
  ["Analytics (only with your consent)", [
    ["onction_sid", "Session storage", "Anonymous id for this browser tab, so pageviews can be grouped into a visit. Cleared when the tab closes."],
    ["Pageview record", "Our server", "Page path, referrer, campaign tags, browser/OS and the country derived from your IP address. The IP address itself is not stored."],
  ]],
  ["Your preferences (always on — stored only on your device)", [
    ["onction:consent", "Local storage", "Remembers your analytics choice for 12 months."],
    ["onction:text-size", "Local storage", "Text size chosen in the accessibility panel."],
    ["onction:reduce-motion", "Local storage", "Whether you turned animations off."],
    ["onction:scene", "Local storage", "Day or night for the homepage visuals."],
    ["onction:hero-view", "Local storage", "Photo, both or animation for the homepage banner."],
    ["onction:reloaded-for-update", "Session storage", "Prevents repeated reloads if the site is updated while you browse."],
  ]],
  ["Signing in (staff and vendors only)", [
    ["onction_admin_token", "Local storage", "Keeps Onction staff signed in to the dashboard."],
    ["onction_vendor_token", "Local storage", "Keeps vendors signed in to the vendor portal."],
  ]],
];

export default function CookiesPage() {
  usePageMeta("Cookies & storage", "What the Onction Energy website stores on your device, and why.");
  const { consent } = useConsent();
  return (
    <main>
      <InnerHero crumb="Cookies & storage" title="Cookies and storage" accent="storage" compact intro="This site sets no advertising or third-party tracking cookies. Here is everything it stores, and why." />
      <section className="bg-white">
        <div className="wrap max-w-4xl py-14 sm:py-16">
          <div className="mb-10 flex flex-col gap-4 border border-black/10 bg-mist p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-navy-900">
              Analytics are currently <strong>{consent === "granted" ? "on" : consent === "denied" ? "off" : "off (you haven't chosen yet)"}</strong>.
            </p>
            <button type="button" onClick={openConsentBanner} className="btn-primary rounded-none !py-2.5">
              Change my choice
            </button>
          </div>
          {ROWS.map(([heading, rows]) => (
            <div key={heading} className="mb-10">
              <h2 className="mb-4 font-syne text-xl font-medium text-navy-900">{heading}</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-black/10 text-xs uppercase tracking-wide text-slatey">
                      <th className="py-2 pr-4 font-medium">Name</th>
                      <th className="py-2 pr-4 font-medium">Where</th>
                      <th className="py-2 font-medium">Purpose</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5">
                    {rows.map(([name, where, why]) => (
                      <tr key={name}>
                        <td className="py-3 pr-4 font-mono text-xs text-navy-900">{name}</td>
                        <td className="whitespace-nowrap py-3 pr-4 text-slatey">{where}</td>
                        <td className="py-3 text-ink/80">{why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="text-sm leading-relaxed text-slatey">
            The site's fonts are loaded from Google Fonts, which means your browser requests them from Google's servers. Questions about your data:{" "}
            <a href="mailto:info@onctionenergy.com" className="text-teal-700 underline">info@onctionenergy.com</a>.
          </p>
        </div>
      </section>
    </main>
  );
}
