import { useEffect, useRef, useState } from "react";
import { useCarousel } from "../hooks/useCarousel.js";
import { heroSlides } from "../data/content.js";
import { Arrow } from "./icons.jsx";
import { useReducedMotion } from "../motion/motionPreference.js";
import { setScenePreference, useSceneMode } from "../motion/sceneMode.js";
import { setHeroView, useHeroView } from "../motion/heroView.js";
import Parallax from "../motion/Parallax.jsx";

// Approved hero photography — one per slide, in the same order as heroSlides.
import powerLineImg from "../../assets/fre-sonneveld-q6n8nIrDQHE-unsplash.jpg";
import damImg from "../../assets/tahamie-farooqui-kMHBf1h4pU8-unsplash.jpg";
import solarImg from "../../assets/harisankar-hp6Xj7LyZ1E-unsplash.jpg";
import pipelineImg from "../../assets/wolfgang-weiser-n60sfcqBzE0-unsplash.jpg";

// 3D energy landscape (rendered in Blender — see assets/hero/README.md):
// generation → Onction's trading hub → transmission → city, as a seamless
// 10 s loop, in a night and a day variant. Phones get the 1280px encodes.
import nightPoster from "../../assets/hero/energy-landscape-poster.jpg";
import night1920Webm from "../../assets/hero/energy-landscape-1920.webm";
import night1920Mp4 from "../../assets/hero/energy-landscape-1920.mp4";
import night1280Webm from "../../assets/hero/energy-landscape-1280.webm";
import night1280Mp4 from "../../assets/hero/energy-landscape-1280.mp4";
import dayPoster from "../../assets/hero/energy-landscape-day-poster.jpg";
import day1920Webm from "../../assets/hero/energy-landscape-day-1920.webm";
import day1920Mp4 from "../../assets/hero/energy-landscape-day-1920.mp4";
import day1280Webm from "../../assets/hero/energy-landscape-day-1280.webm";
import day1280Mp4 from "../../assets/hero/energy-landscape-day-1280.mp4";

const SLIDE_IMAGES = [powerLineImg, damImg, solarImg, pipelineImg];
const LOOPS = {
  night: { poster: nightPoster, webm: [night1920Webm, night1280Webm], mp4: [night1920Mp4, night1280Mp4] },
  day: { poster: dayPoster, webm: [day1920Webm, day1280Webm], mp4: [day1920Mp4, day1280Mp4] },
};

// The 3D loop as a second layer over the photography. It's masked to the
// right-hand side (the lower half on phones) so the slide photo stays
// recognisable; at night it's screen-blended, so only its glowing network
// rides over the photo. Poster only for reduced motion / Save-Data; pauses
// whenever the hero is off-screen.
function HeroLoop({ mode, dim, full }) {
  const reduced = useReducedMotion();
  const ref = useRef(null);
  const [small] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 900px)").matches);
  const saveData = typeof navigator !== "undefined" && navigator.connection?.saveData;
  const still = reduced || saveData;
  const loop = LOOPS[mode];
  const size = small ? 1 : 0;

  // Play only while on screen. Two phone cases need a nudge beyond the
  // observer: iOS Low Power Mode (and some Android data savers) refuse
  // autoplay until the visitor first touches the page, and iOS leaves the
  // video paused after switching apps, which never re-fires the observer.
  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    let onScreen = false;
    const play = () => onScreen && !document.hidden && v.play().catch(() => {});
    const io = new IntersectionObserver(([e]) => {
      onScreen = e.isIntersecting;
      onScreen ? play() : v.pause();
    });
    io.observe(v);
    const gesture = { passive: true, capture: true };
    const onGesture = () => v.paused && play();
    document.addEventListener("visibilitychange", play);
    window.addEventListener("pageshow", play);
    document.addEventListener("touchend", onGesture, gesture);
    document.addEventListener("click", onGesture, gesture);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", play);
      window.removeEventListener("pageshow", play);
      document.removeEventListener("touchend", onGesture, gesture);
      document.removeEventListener("click", onGesture, gesture);
    };
  }, [still, mode]);

  const cls = "absolute inset-0 h-full w-full object-cover object-[48%_center] md:object-[62%_center]";
  return (
    <div className={`${full ? "" : `hero-loop hero-loop-${mode}`} absolute inset-0 transition-opacity duration-[1200ms] ease-in-out-quart ${dim ? "opacity-40" : ""}`}>
      {still ? (
        <img src={loop.poster} alt="" className={cls} />
      ) : (
        // key: switching Day/Night swaps the sources cleanly
        <video key={mode} ref={ref} className={cls} poster={loop.poster} autoPlay muted loop playsInline preload="auto" disablePictureInPicture>
          {/* codecs: iPhones without a VP9 decoder skip straight to the MP4
              instead of downloading the WebM first and failing on it */}
          <source src={loop.webm[size]} type='video/webm; codecs="vp9"' />
          <source src={loop.mp4[size]} type="video/mp4" />
        </video>
      )}
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

function PhotoIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <circle cx="9" cy="10" r="1.6" />
      <path d="m21 16-5-5-9 9" />
    </svg>
  );
}

function LayersIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 13 9 5 9-5" />
    </svg>
  );
}

function CubeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 2 9 5v10l-9 5-9-5V7l9-5Z" />
      <path d="m3 7 9 5 9-5M12 12v10" />
    </svg>
  );
}

// Shared look for the hero's small segmented controls.
function Segmented({ label, value, options, onChange }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex border border-[#f8f5ec]/50 bg-navy-950/40 backdrop-blur-sm">
      {options.map(({ key, label: text, Icon }) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          title={text}
          onClick={() => onChange(key)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 font-outfit text-xs tracking-wide transition-colors duration-400 sm:px-3 ${
            value === key ? "bg-[#f8f5ec] text-navy-950" : "text-[#f8f5ec]/80 hover:text-teal-400"
          }`}
        >
          <Icon />
          <span className="hidden sm:inline">{text}</span>
          <span className="sr-only sm:hidden">{text}</span>
        </button>
      ))}
    </div>
  );
}

// What the hero shows behind the slides: photos, the 3D loop, or both.
function ViewToggle({ view }) {
  return (
    <Segmented
      label="Hero background"
      value={view}
      onChange={setHeroView}
      options={[
        { key: "photo", label: "Photo", Icon: PhotoIcon },
        { key: "both", label: "Both", Icon: LayersIcon },
        { key: "animation", label: "Animation", Icon: CubeIcon },
      ]}
    />
  );
}

// Day / night switch for the homepage visuals (defaults to local time).
function SceneToggle({ mode }) {
  return (
    <Segmented
      label="Scene lighting"
      value={mode}
      onChange={setScenePreference}
      options={[
        { key: "day", label: "Day", Icon: SunIcon },
        { key: "night", label: "Night", Icon: MoonIcon },
      ]}
    />
  );
}

// ─── Chevron helper (avoids importing svg separately) ───────────────────────
function Chevron({ dir }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d={dir === "left" ? "M15 18 9 12l6-6" : "M9 18 15 12 9 6"} />
    </svg>
  );
}

// ─── Main Hero ───────────────────────────────────────────────────────────────
export default function Hero() {
  const total = heroSlides.length;
  const { index: i, setIndex, prev, next, pauseHandlers } = useCarousel(total, 7000, { pauseOnHover: false });
  const slide = heroSlides[i];
  const mode = useSceneMode();
  const view = useHeroView();
  const showPhoto = view !== "animation";
  const showLoop = view !== "photo";

  // Controlled transition between visual states: as the slide photo
  // crossfades, the 3D layer eases back and then returns over it.
  const [dim, setDim] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (view !== "both") return; // only needed when a photo swaps under the loop
    setDim(true);
    const t = setTimeout(() => setDim(false), 900);
    return () => clearTimeout(t);
  }, [i, view]);

  return (
    <section
      id="top"
      className="relative isolate overflow-hidden bg-navy-950 text-white"
      {...pauseHandlers}
    >
      {/* ── Background layers: approved photography → 3D energy landscape ── */}
      <div className="absolute inset-0" aria-hidden="true">
        {/* Layer 1 — slide photos crossfade (approved), each drifting slowly
            while it's on screen, and moving with the scroll for depth */}
        <Parallax speed={0.18} className={`absolute -inset-y-[6%] inset-x-0 transition-opacity duration-700 ${showPhoto ? "opacity-100" : "opacity-0"}`}>
          {SLIDE_IMAGES.map((src, idx) => (
            <img
              key={src}
              src={src}
              alt=""
              fetchpriority={idx === 0 ? "high" : undefined}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${
                idx === i ? "hero-drift opacity-100" : "opacity-0"
              }`}
            />
          ))}
        </Parallax>
        {/* Layer 2 — the 3D landscape loop (not loaded at all in Photo view) */}
        {showLoop && (
          <Parallax speed={0.08} className="absolute inset-0">
            <HeroLoop mode={mode} dim={dim} full={view === "animation"} />
          </Parallax>
        )}
        {/* Dark overlay: left-to-right for text legibility, top/bottom to blend with header & next section.
            By day the right side opens up so the daylight scene reads as daylight;
            the text side keeps the full scrim either way. */}
        <div className={`absolute inset-0 bg-gradient-to-r from-navy-950 transition-colors duration-700 ${mode === "day" ? "via-navy-950/60 to-transparent" : "via-navy-950/70 to-navy-950/20"}`} />
        <div className={`absolute inset-0 bg-gradient-to-t transition-opacity duration-700 from-navy-950/70 via-transparent to-navy-950/40 ${mode === "day" ? "opacity-60" : ""}`} />
        {/* Brand signature current lines, kept subtle over the photo */}
        <div className="absolute left-0 top-1/3 h-px w-full overflow-hidden">
          <div className="h-px w-1/3 animate-current bg-gradient-to-r from-transparent via-teal-400 to-transparent" />
        </div>
        <div className="absolute left-0 top-2/3 h-px w-full overflow-hidden">
          <div
            className="h-px w-1/4 animate-current bg-gradient-to-r from-transparent via-spark-400/60 to-transparent"
            style={{ animationDelay: "3s" }}
          />
        </div>
      </div>

      <div className="wrap relative pb-16 pt-28 sm:pt-18">
        {/* Breadcrumb — TATA style */}
        <a href="#" className="text-[clamp(14px,1.5vw,14px)] text-[#f8f5ec] font-outfit font-medium tracking-wide">
          <span className="mx-1.5 cursor-pointer font-light">Home</span><span className="mx-1.5">/</span> Bulk Electricity Trading
        </a>

        {/* Hero display controls — what the background shows, and day / night
            for the 3D visuals. Top-right, level with the breadcrumb, from sm
            up; on phones that corner overlapped the breadcrumb and headline,
            so they sit in one row beneath the breadcrumb instead. */}
        <div className="mt-4 flex items-center gap-2 sm:absolute sm:right-[clamp(1.25rem,3vw,4rem)] sm:top-[6.35rem] sm:mt-0">
          <ViewToggle view={view} />
          <SceneToggle mode={mode} />
        </div>

        {/* ── Slide content — left-aligned over the full-bleed photo ── */}
        <div className="flex min-h-[58vh] items-center">
          <div key={i} className="animate-fadeUp max-w-xl">
            <h1 className="font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-[3.4rem]">
              {slide.title}
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/70 sm:text-[17px]">
              {slide.body}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a href={slide.cta.href} className="btn-primary rounded-none">
                {slide.cta.label} <Arrow width={18} height={18} />
              </a>
              <a href="#enquire" className="btn-ghost rounded-none">
                Talk to our desk
              </a>
            </div>
          </div>
        </div>

        {/* ── Navigation row: counter + dots + square arrows ──
            Mobile: stacked vertically (counter, then dots, then buttons),
            matching the reference. From sm up: spreads out horizontally. */}
        <div className="mt-14 flex flex-col items-start gap-12 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 md:gap-24">
          <div className="flex flex-col gap-8 sm:gap-4">
            <span className="flex items-baseline whitespace-nowrap font-outfit text-lg text-[#f8f5ec]">
              <span>{String(i + 1).padStart(2, "0")}</span>
              <span className="text-3xl"> /  </span>
              <span>{String(total).padStart(2, "0")}</span>
            </span>

            {/* Dot indicators */}
            <div className="flex items-center gap-2">
              {heroSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setIndex(idx)}
                  aria-label={`Slide ${idx + 1}`}
                  aria-current={idx === i}
                >
                  <span
                    className={`block h-1 rounded-full transition-all duration-300 ${
                      idx === i
                        ? "w-8 bg-teal-400"
                        : "w-4 bg-white/20 hover:bg-white/45"
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Square prev/next buttons — compact on phones, full size from sm up */}
          <div className="flex gap-2 sm:gap-4">
            <button
              onClick={prev}
              aria-label="Previous slide"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-none border border-[#f8f5ec] text-white/60 transition hover:border-teal-400 hover:text-teal-400 sm:h-12 sm:w-12 md:h-14 md:w-14"
            >
              <Chevron dir="left" />
            </button>
            <button
              onClick={next}
              aria-label="Next slide"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-none border border-[#f8f5ec] text-white/60 transition hover:border-teal-400 hover:text-teal-400 sm:h-12 sm:w-12 md:h-14 md:w-14"
            >
              <Chevron dir="right" />
            </button>
          </div>
        </div>

        {/* Bottom-right wordmark watermark — TATA reference equivalent.
            Visible on mobile too (just smaller), not hidden below sm. */}
        <div className="pointer-events-none absolute bottom-4 right-0 flex items-center gap-1 pr-[clamp(1.25rem,3vw,4rem)] text-xs uppercase tracking-[0.18em] text-white/40 sm:bottom-6 sm:gap-1.5">
          <span className="font-outfit text-sm font-bold text-[#f8f5ec] sm:text-lg">Onction</span>
          <span className="font-outfit text-sm text-white/70 sm:text-lg">Power Trading</span>
        </div>
      </div>
    </section>
  );
}
