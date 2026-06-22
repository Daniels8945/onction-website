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
    // flex flex-col + items-center stacks and centers the mark above the
    // wordmark — "place-items-center" alone did nothing on a block element.
    <a href="#" className="flex flex-col items-center pl-0 md:pl-1 pt-1 sm:pt-3" aria-label="Onction Energy home">
      <OnctionMark size={30} className="object-contain w-[18px]" />

      <div className="mt-1 flex items-center gap-1 font-outfit md:text-[1vw] text-[0.45rem]">
        <span className="font-black tracking-tight text-white">ONCTION</span>
        <span className="font-light text-white">ENERGY</span>
      </div>
    </a>
  );
}
