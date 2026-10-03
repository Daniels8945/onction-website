import { Link } from "react-router-dom";
import { setConsent, useConsent } from "../../lib/consent.js";

// Consent bar in the spirit of Tata Power's (bottom bar, Accept / Decline).
// Only analytics depend on it — see /cookies for everything the site stores.
export default function CookieBanner() {
  const { consent, showBanner } = useConsent();
  if (!showBanner) return null;
  return (
    <div role="region" aria-label="Cookie and analytics preferences" className="consent-bar fixed inset-x-0 bottom-0 z-[55] border-t border-teal-500/40 bg-navy-900/95 text-white shadow-[0_-12px_30px_rgba(6,18,31,0.35)] backdrop-blur">
      <div className="wrap flex flex-col gap-4 py-4 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
        <p className="max-w-3xl text-sm leading-relaxed text-white/80">
          We don't use advertising cookies. With your permission we collect anonymous analytics — which pages are viewed and how visitors
          found us — to improve the site. Your display preferences are always remembered on your device.{" "}
          <Link to="/cookies" className="whitespace-nowrap text-teal-400 underline underline-offset-4 hover:text-teal-300">
            Cookies & storage
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          <button type="button" onClick={() => setConsent(true)} className="btn-primary rounded-none !py-2.5">
            Accept analytics
          </button>
          <button type="button" onClick={() => setConsent(false)} className="btn-ghost rounded-none !py-2.5">
            {consent === "granted" ? "Turn off analytics" : "Decline"}
          </button>
        </div>
      </div>
    </div>
  );
}
