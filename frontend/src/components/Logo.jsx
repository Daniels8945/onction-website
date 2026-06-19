import logoSrc from "../../assets/Onction-logo.png";

// Standalone mark — use wherever just the icon is needed without the wordmark.
export function OnctionMark({ size = 20, className = "", paddingBottom = 0 }) {
  return (
    <img
      src={logoSrc}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${className}`}
      aria-hidden="true"
      style={{ paddingBottom: `${paddingBottom}px` }}
    />
  );
}

export default function Logo() {
  return (
    <a href="#" className="block place-items-center pl-1 pt-3" aria-label="Onction Energy home font-outfit">
      <OnctionMark size={30} />

      <div className="display md:text-[1vw] gap-1 flex font-outfit pt-1">
        <span className="block font-black tracking-tight text-white">ONCTION</span>
        <span className="block font-light text-white">ENERGY</span>
      </div>

    </a>
  );
}
