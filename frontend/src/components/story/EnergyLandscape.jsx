// Line-art energy landscape for "How we trade" — Tata Power's illustrated
// value chain (hydro → wind → transmission → city) retold for a trader:
// generation on the left, Onction's desk at the centre, buyers on the right,
// and the WAPP interconnector running across the border.
//
// Each stage is a <g data-stage> whose strokes are drawn by scroll: the
// parent sets --p (0→1) and each group gets its own window (--s → --e), so
// stroke-dashoffset = clamp(0, (e − p) / (e − s), 1). Energy "particles" ride
// the lines with <animateMotion> once a stage is live.
const S = (props) => <path pathLength="1" className="ls" {...props} />;

export const STAGES = [
  { key: "generate", s: -0.2, e: -0.01 },
  { key: "desk", s: 0.12, e: 0.26 },
  { key: "transmit", s: 0.32, e: 0.46 },
  { key: "deliver", s: 0.52, e: 0.66 },
  { key: "border", s: 0.72, e: 0.86 },
];

function Stage({ index, active, children, label, labelX }) {
  const { s, e } = STAGES[index];
  return (
    <g data-stage={index} className={`stage ${active ? "stage-on" : ""}`} style={{ "--s": s, "--e": e }}>
      {children}
      <text x={labelX} y="535" textAnchor="middle" className="stage-label">
        {label}
      </text>
    </g>
  );
}

export default function EnergyLandscape({ activeStep = -1, showAll = false }) {
  const on = (i) => showAll || activeStep === i;
  return (
    <svg viewBox="0 0 1600 560" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-auto w-full" role="img" aria-label="Illustration: electricity flowing from power plants, through Onction's trading desk and the transmission grid, to utilities, industry and neighbouring countries.">
      {/* Ground */}
      <path d="M0 470 H1600" className="text-white/15" />

      {/* 1 — Generation: hydro, gas, wind, solar */}
      <Stage index={0} active={on(0)} label="GENERATION" labelX={290}>
        <S d="M30 470 L62 360 H176 L200 470" />
        <S d="M80 360 V470 M110 360 V470 M140 360 V470" />
        <S d="M0 392 H44 M0 414 H38 M0 436 H33" />
        <S d="M228 470 V398 H320 V470 M248 470 V430 H270 V470" />
        <S d="M296 398 V296 H312 V398" />
        <S d="M338 470 C346 430 346 404 336 372 H378 C368 404 368 430 376 470" />
        <S d="M420 470 L426 276 L432 470" />
        <g className="spin" style={{ transformOrigin: "426px 276px" }}>
          <S d="M426 276 L384 214 M426 276 L494 262 M426 276 L408 346" />
        </g>
        <S d="M460 470 L482 426 H572 L550 470 Z M490 470 L512 426 M520 470 L542 426 M470 450 H561" />
      </Stage>

      {/* 2 — Onction trading desk */}
      <Stage index={1} active={on(1)} label="ONCTION DESK" labelX={800}>
        {on(1) && <circle cx="800" cy="300" r="64" className="pulse-ring" />}
        <S d="M800 236 a64 64 0 1 0 0.1 0" />
        <S d="M800 262 a38 38 0 1 0 0.1 0" />
        <S d="M786 300 l10 -22 h16 l-10 16 h14 l-24 32 6 -26 z" />
        <S d="M800 364 V470 M770 470 H830" />
        {/* feeder from generation into the desk */}
        <S id="line-gen" d="M572 370 Q 640 420 700 356 Q 720 330 736 300" />
        <S d="M700 470 L715 328 L730 470 M704 440 H726 M708 400 H722 M692 350 H738" />
      </Stage>

      {/* 3 — Transmission grid */}
      <Stage index={2} active={on(2)} label="TRANSMISSION" labelX={1045}>
        <S id="line-out" d="M864 300 Q 900 330 930 336 Q 980 392 1030 336 Q 1080 392 1130 336" />
        <S d="M930 470 L945 322 L960 470 M934 440 H956 M938 400 H952 M920 344 H970" />
        <S d="M1030 470 L1045 322 L1060 470 M1034 440 H1056 M1038 400 H1052 M1020 344 H1070" />
        <S d="M1130 470 L1145 322 L1160 470 M1134 440 H1156 M1138 400 H1152 M1120 344 H1170" />
      </Stage>

      {/* 4 — Delivery: distribution companies & industry */}
      <Stage index={3} active={on(3)} label="BUYERS" labelX={1265}>
        <S d="M1170 470 V360 H1214 V470 M1182 380 H1202 M1182 400 H1202 M1182 420 H1202" />
        <S d="M1226 470 V300 H1276 V470 M1238 320 H1264 M1238 344 H1264 M1238 368 H1264 M1238 392 H1264" />
        <S d="M1288 470 V412 L1312 396 V412 L1336 396 V412 L1360 396 V470 Z M1340 396 V356 H1352 V398" />
        <S d="M1160 336 Q 1190 350 1196 360" />
      </Stage>

      {/* 5 — Across the border: WAPP interconnector */}
      <Stage index={4} active={on(4)} label="ACROSS BORDERS" labelX={1500}>
        <path d="M1420 150 V480" strokeDasharray="6 10" className="border-line" />
        <S id="line-x" d="M1160 336 Q 1300 250 1450 330 Q 1500 360 1530 336" />
        <S d="M1515 470 L1530 322 L1545 470 M1519 440 H1541 M1523 400 H1537 M1505 344 H1555" />
        <S d="M1566 470 V420 H1600 M1576 470 V440 H1590" />
        <S d="M1434 190 H1478 L1470 204 L1478 218 H1434" />
      </Stage>

      {/* Energy in motion along the lines (hidden for reduced motion) */}
      <g className="particles">
        {[
          { path: "#line-gen", live: showAll || activeStep >= 1, dur: "2.6s" },
          { path: "#line-out", live: showAll || activeStep >= 2, dur: "3.2s" },
          { path: "#line-x", live: showAll || activeStep >= 4, dur: "3.6s" },
        ].map((p) =>
          p.live
            ? [0, 1].map((k) => (
                <circle key={`${p.path}-${k}`} r="5" className="fill-teal-400 stroke-none">
                  <animateMotion dur={p.dur} begin={`${k * 1.3}s`} repeatCount="indefinite" rotate="auto">
                    <mpath href={p.path} />
                  </animateMotion>
                </circle>
              ))
            : null
        )}
      </g>
    </svg>
  );
}
