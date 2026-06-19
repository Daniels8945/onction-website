// Minimal stroke icon set (no external icon dependency).
const base = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export const Bolt = (p) => (
  <svg {...base} {...p}>
    <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" />
  </svg>
);
export const Handshake = (p) => (
  <svg {...base} {...p}>
    <path d="m11 17 2 2a1 1 0 0 0 3-3" />
    <path d="m14 14 2.5 2.5a1 1 0 0 0 3-3l-3.9-3.9a2 2 0 0 0-2.8 0l-1.6 1.6a2 2 0 0 1-2.8 0l-.6-.6a2 2 0 0 1 0-2.8l2.4-2.4a4 4 0 0 1 3-1.2L17 4" />
    <path d="m21 4-3 3" />
    <path d="m3 7 3-3 4 4" />
  </svg>
);
export const Globe = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18M12 3a14 14 0 0 1 0 18 14 14 0 0 1 0-18Z" />
  </svg>
);
export const Exchange = (p) => (
  <svg {...base} {...p}>
    <path d="M7 4 3 8l4 4" />
    <path d="M3 8h14" />
    <path d="m17 20 4-4-4-4" />
    <path d="M21 16H7" />
  </svg>
);
export const Leaf = (p) => (
  <svg {...base} {...p}>
    <path d="M11 20A7 7 0 0 1 9.8 6.1C13 3 18 3 21 3c0 3 0 8-3.1 11.2A7 7 0 0 1 11 20Z" />
    <path d="M2 22c1.5-2.5 4-5 8-7" />
  </svg>
);
export const Gauge = (p) => (
  <svg {...base} {...p}>
    <path d="M12 13 16 9" />
    <circle cx="12" cy="14" r="8" />
    <path d="M12 6V4M5 14H3M21 14h-2" />
  </svg>
);
export const Layers = (p) => (
  <svg {...base} {...p}>
    <path d="m12 2 9 5-9 5-9-5 9-5Z" />
    <path d="m3 12 9 5 9-5" />
    <path d="m3 17 9 5 9-5" />
  </svg>
);
export const Chat = (p) => (
  <svg {...base} {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
  </svg>
);
export const Coins = (p) => (
  <svg {...base} {...p}>
    <ellipse cx="9" cy="6" rx="6" ry="3" />
    <path d="M3 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3" />
    <path d="M3 12v6c0 1.7 2.7 3 6 3" />
    <ellipse cx="17" cy="14" rx="4" ry="2" />
    <path d="M13 14v4c0 1.1 1.8 2 4 2s4-.9 4-2v-4" />
  </svg>
);
export const Sun = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);
export const Flame = (p) => (
  <svg {...base} {...p}>
    <path d="M12 2c1 3 4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 1-2.5C9 9 9 7 12 2Z" />
    <path d="M10 16a2 2 0 0 0 4 0" />
  </svg>
);
export const Target = (p) => (
  <svg {...base} {...p}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="12" cy="12" r="1" />
  </svg>
);
export const Check = (p) => (
  <svg {...base} {...p}>
    <path d="m20 6-11 11-5-5" />
  </svg>
);
export const Arrow = (p) => (
  <svg {...base} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
export const Phone = (p) => (
  <svg {...base} {...p}>
    <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2Z" />
  </svg>
);
export const Pin = (p) => (
  <svg {...base} {...p}>
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
);
export const Mail = (p) => (
  <svg {...base} {...p}>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </svg>
);
