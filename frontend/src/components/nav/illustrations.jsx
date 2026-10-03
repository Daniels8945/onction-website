// Thin-stroke line illustrations for the mega-menu tiles, echoing Tata
// Power's illustrated menu tiles. Every stroke carries pathLength="1" and the
// .dr class so it draws itself in when the tile's section opens (see
// "Motion system" in index.css). Drawn on a 120×80 canvas with a shared
// ground curve so the tiles read as one landscape.
const P = (props) => <path pathLength="1" className="dr" {...props} />;

const drawings = {
  story: (
    <>
      <P d="M30 62V38h60v24M24 38l36-18 36 18M24 62h72" />
      <P d="M40 42v18M52 42v18M68 42v18M80 42v18" />
      <P d="M60 26a3 3 0 1 0 0.1 0" />
    </>
  ),
  licence: (
    <>
      <P d="M38 16h32l12 12v36H38z" />
      <P d="M70 16v12h12M46 34h26M46 42h26M46 50h14" />
      <P d="M78 54a8 8 0 1 0 0.1 0M74 61l-3 9 7-4 7 4-3-9" />
    </>
  ),
  presence: (
    <>
      <P d="M60 58s-16-14-16-26a16 16 0 0 1 32 0c0 12-16 26-16 26z" />
      <P d="M60 26a6 6 0 1 0 0.1 0" />
      <P d="M28 62c10-4 22-4 32 0s22 4 32 0" />
    </>
  ),
  why: (
    <>
      <P d="M60 14l6 14 15 1-12 9 4 15-13-8-13 8 4-15-12-9 15-1z" />
      <P d="M38 60h44" />
    </>
  ),
  solutions: (
    <>
      <P d="M28 62V40h18v22M50 62V28h18v34M72 62V46h18v16" />
      <P d="M55 34h8M55 42h8M55 50h8" />
    </>
  ),
  trading: (
    <>
      <P d="M60 14l-10 50M60 14l10 50M53 34h14M51 46h18M48 60h24" />
      <P d="M22 30h22l-5-5M44 30l-5 5M98 44H76l5-5M76 44l5 5" />
    </>
  ),
  renewables: (
    <>
      <P d="M40 62V30M40 30l-12-8M40 30l12-6M40 30l2 14" />
      <P d="M66 50l30-6 6 14-32 4z M74 48l4 12M84 46l4 12" />
    </>
  ),
  advisory: (
    <>
      <P d="M26 60h68M30 60V22" />
      <P d="M32 52l14-10 12 6 16-18 14-6" />
      <P d="M82 24h6v6" />
    </>
  ),
  flow: (
    <>
      <P d="M24 62l8-40 8 40M28 40h8M84 62l8-40 8 40M88 40h8" />
      <P d="M32 26c16 14 40 14 56 0M32 32c16 14 40 14 56 0" />
      <P d="M60 36a3 3 0 1 0 0.1 0" />
    </>
  ),
  cases: (
    <>
      <P d="M30 28h22l6 6h32v28H30z" />
      <P d="M34 22h20l6 6" />
      <P d="M42 46h36M42 54h22" />
    </>
  ),
  map: (
    <>
      <P d="M30 30a3 3 0 1 0 0.1 0M52 22a3 3 0 1 0 0.1 0M70 40a3 3 0 1 0 0.1 0M92 30a3 3 0 1 0 0.1 0M48 54a3 3 0 1 0 0.1 0M84 56a3 3 0 1 0 0.1 0" />
      <P d="M32 31l18-7M54 24l14 14M72 41l18-10M50 53l18-11M72 43l10 11M34 33l12 19" />
    </>
  ),
  corridors: (
    <>
      <P d="M22 62l7-36 7 36M26 42h6M60 62l7-36 7 36M64 42h6M96 62l6-32 6 32" />
      <P d="M29 28c10 10 21 10 31 0M67 28c10 10 20 10 31 4" />
    </>
  ),
  participants: (
    <>
      <P d="M26 62V36h16v26M48 62V24h24v38M78 62V42h16v20" />
      <P d="M54 32h12M54 40h12M54 48h12" />
    </>
  ),
  grow: (
    <>
      <P d="M60 62V34" />
      <P d="M60 44c-14 0-20-8-20-18 12 0 20 6 20 18zM60 38c0-12 8-20 22-20 0 12-8 20-22 20z" />
    </>
  ),
  sdg: (
    <>
      <P d="M60 16a22 22 0 1 0 0.1 0" />
      <P d="M60 26a12 12 0 1 0 0.1 0M60 16v10M82 38H72M60 60V50M38 38h10" />
    </>
  ),
  netzero: (
    <>
      <P d="M60 16a22 22 0 1 0 0.1 0" />
      <P d="M48 50c0-14 8-22 24-24-2 16-10 24-24 24zM48 50l12-12" />
    </>
  ),
  news: (
    <>
      <P d="M28 20h52v42H34a6 6 0 0 1-6-6z" />
      <P d="M80 30h12v26a6 6 0 0 1-6 6h-6M36 30h36M36 38h36M36 46h22" />
    </>
  ),
  events: (
    <>
      <P d="M32 22h56v40H32zM32 32h56M44 16v10M76 16v10" />
      <P d="M44 42h6M58 42h6M72 42h6M44 52h6M58 52h6" />
    </>
  ),
  partners: (
    <>
      <P d="M50 38a16 16 0 1 0 0.1 0M70 38a16 16 0 1 0 0.1 0" />
      <P d="M56 40h8" />
    </>
  ),
  quote: (
    <>
      <P d="M32 52V38c0-10 6-16 16-18M36 52h12V40H36M64 52V38c0-10 6-16 16-18M68 52h12V40H68" />
    </>
  ),
  portal: (
    <>
      <P d="M30 22h60v34H30zM22 62h76" />
      <P d="M40 44l8-8 8 6 12-12 12 8" />
    </>
  ),
  enquire: (
    <>
      <P d="M28 20h64v32H56l-14 12V52H28z" />
      <P d="M40 32h40M40 40h26" />
    </>
  ),
};

export default function MenuIllustration({ name, className = "" }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      {drawings[name] || drawings.solutions}
      <path pathLength="1" className="dr" d="M0 72c30-6 50-6 72-2s36 4 48 0" opacity="0.5" />
    </svg>
  );
}
