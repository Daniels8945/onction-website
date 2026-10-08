import { useEffect, useRef } from "react";
import {
  AmbientLight,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshBasicMaterial,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  AdditiveBlending,
  NormalBlending,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Miniature infrastructure for the EcosystemStory network layer: Blender-built
// models (frontend/blender/eco_infrastructure.py → /models/eco-infrastructure.glb)
// rendered on a transparent canvas that sits directly beneath the network SVG,
// so the SVG's lines, particles, hub and labels still draw on top and lines run
// into each model's base.
//
// The orthographic camera reproduces the SVG's viewBox + "xMidYMid slice"
// mapping, so instances are placed in the same view-box units as the SVG nodes
// and follow the mobile crop for free. Interaction stays in the SVG (hit areas,
// keyboard, explore card); this layer only reflects `hovered` / `activeKind`.
// Renders on demand: only while an entrance or hover transition is running.

const MODEL_URL = "/models/eco-infrastructure.glb";
const TILT = 0.45; // how far each model leans toward the viewer (3/4 view)
const YAW = -0.62; // fixed quarter turn for the yards
const SIZE = { station: 31, substation: 31, tower: 44 }; // view-box units
const ROOT = { station: "PowerStation", substation: "Substation", tower: "Tower" };
const ACCENT = { station: "#f5a623", substation: "#2dd4bf", tower: "#7ff5e8" };
const ENTER_MS = 700;
const HOVER_MS = 260;

// Darken the light-grey materials on the day background so they keep contrast.
const DAY_TINT = { Steel: 0.55, Building: 0.72, Concrete: 0.78, Insulator: 0.7 };

const easeOut = (t) => 1 - (1 - t) ** 3;

function haloTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,0.9)");
  grd.addColorStop(0.45, "rgba(255,255,255,0.25)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  return t;
}

export default function EcoModels({ instances, view, mode, scale = 1, inView, reduced, live, hovered, activeKind, onReady }) {
  const canvasRef = useRef(null);
  const api = useRef(null);

  // One-time setup: renderer, scene, model load, per-instance objects.
  useEffect(() => {
    const canvas = canvasRef.current;
    // Only with hardware-accelerated WebGL: on a software rasteriser the
    // entrance would drop frames, so the original SVG dots stay instead.
    if (!hasFastWebGL()) return;
    let renderer;
    try {
      renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "low-power", failIfMajorPerformanceCaveat: true });
    } catch {
      return; // no WebGL: the SVG dots stay as they are
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = SRGBColorSpace;

    const scene = new Scene();
    const camera = new OrthographicCamera(0, 1, 0, -1, 1, 4000);
    camera.position.set(0, 0, 2000);
    const hemi = new HemisphereLight("#dcecff", "#0b1a2b", 1.5);
    const sun = new DirectionalLight("#ffffff", 2.4);
    sun.position.set(-0.6, 1, 0.9);
    const fill = new AmbientLight("#ffffff", 0.35);
    scene.add(hemi, sun, fill);

    const halo = haloTexture();
    const state = { renderer, scene, camera, items: [], frame: 0, disposed: false, baseMats: [], inViewAt: null, loadedAt: null };
    api.current = state;

    new GLTFLoader().load(
      MODEL_URL,
      (gltf) => {
        if (state.disposed) return;
        const sources = {};
        Object.entries(ROOT).forEach(([kind, name]) => {
          const src = gltf.scene.getObjectByName(name);
          if (!src) return;
          src.position.set(0, 0, 0);
          sources[kind] = src;
        });
        gltf.scene.traverse((o) => {
          if (o.isMesh) {
            o.material.userData.base = o.material.color.clone();
            state.baseMats.push(o.material);
          }
        });

        state.items = instances.map((inst) => {
          const src = sources[inst.kind];
          const model = src.clone(true);
          // Accent materials are cloned per instance so hover glow stays local.
          const accents = [];
          model.traverse((o) => {
            if (o.isMesh && o.material.name.startsWith("Accent")) {
              o.material = o.material.clone();
              o.material.userData.baseEmissive = o.material.emissiveIntensity;
              accents.push(o.material);
            }
          });
          const tilt = new Group(); // tilt toward the viewer, then yaw in-plane
          tilt.rotation.set(TILT, inst.yaw ?? YAW, 0, "XYZ");
          tilt.add(model);

          const glow = new Mesh(
            new PlaneGeometry(1, 1),
            new MeshBasicMaterial({ map: halo, color: new Color(ACCENT[inst.kind]), transparent: true, opacity: 0, depthWrite: false }),
          );
          glow.renderOrder = -1;

          const root = new Group();
          root.add(glow, tilt);
          root.position.set(inst.x, -inst.y, 0);
          scene.add(root);
          return { ...inst, root, tilt, glow, accents, enter: 0, hover: 0, hoverTarget: 0 };
        });

        state.loadedAt = performance.now();
        applyHover(state);
        applyMode(state, state.mode);
        applyScale(state, state.scale);
        resize();
        kick();
        onReady?.();
      },
      undefined,
      () => {
        /* asset failed to load: leave the SVG dots in place */
      },
    );

    function resize() {
      const parent = canvas.parentElement;
      const w = parent.clientWidth, h = parent.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      const [vx, vy, vw, vh] = (state.view || "0 0 1600 740").split(/\s+/).map(Number);
      const s = Math.max(w / vw, h / vh); // "slice": cover, centred
      const hw = w / (2 * s), hh = h / (2 * s);
      const cx = vx + vw / 2, cy = vy + vh / 2;
      Object.assign(camera, { left: cx - hw, right: cx + hw, top: -(cy - hh), bottom: -(cy + hh) });
      camera.updateProjectionMatrix();
      render();
    }
    state.resize = resize;
    const ro = new ResizeObserver(resize);
    ro.observe(canvas.parentElement);

    function render() {
      renderer.render(scene, camera);
    }

    // Advance entrance + hover easing; keep looping only while something moves.
    function tick() {
      state.frame = 0;
      const now = performance.now();
      let moving = false;
      for (const it of state.items) {
        let e = 1;
        if (!state.reduced) {
          if (state.inViewAt == null) e = 0;
          else {
            const start = Math.max(state.inViewAt + it.delay, state.loadedAt);
            e = Math.min(1, Math.max(0, (now - start) / ENTER_MS));
            if (e < 1) moving = true; // still waiting for, or playing, its entrance
          }
        }
        it.enter = e;

        const target = it.hoverTarget;
        if (it.hover !== target) {
          const step = state.reduced ? 1 : 16 / HOVER_MS;
          it.hover = target > it.hover ? Math.min(target, it.hover + step) : Math.max(target, it.hover - step);
          moving = true;
        }
        const k = easeOut(it.enter);
        const h = easeOut(it.hover);
        it.tilt.scale.setScalar(Math.max(0.0001, (0.3 + 0.7 * k) * (1 + 0.12 * h)));
        it.tilt.visible = k > 0;
        it.tilt.position.y = 0.09 * h; // slight lift (~3 view-box units)
        it.accents.forEach((m) => (m.emissiveIntensity = m.userData.baseEmissive + 1.6 * h));
        it.glow.material.opacity = 0.55 * h * k;
      }
      render();
      if (moving && !state.disposed) state.frame = requestAnimationFrame(tick);
    }
    function kick() {
      if (!state.frame && !state.disposed) state.frame = requestAnimationFrame(tick);
    }
    state.kick = kick;

    return () => {
      state.disposed = true;
      cancelAnimationFrame(state.frame);
      ro.disconnect();
      halo.dispose();
      scene.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          o.material.dispose();
        }
      });
      renderer.dispose();
    };
    // Instances are derived from static constants; set up once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const s = api.current;
    if (!s) return;
    s.view = view;
    s.resize?.();
  }, [view]);

  useEffect(() => {
    const s = api.current;
    if (!s) return;
    s.mode = mode;
    applyMode(s, mode);
    s.kick?.();
  }, [mode]);

  useEffect(() => {
    const s = api.current;
    if (!s) return;
    s.scale = scale;
    applyScale(s, scale);
    s.kick?.();
  }, [scale]);

  useEffect(() => {
    const s = api.current;
    if (!s) return;
    s.reduced = reduced;
    if (inView && s.inViewAt == null) s.inViewAt = performance.now();
    s.kick?.();
  }, [inView, reduced]);

  useEffect(() => {
    const s = api.current;
    if (!s) return;
    s.hovered = hovered;
    s.activeKind = activeKind;
    applyHover(s);
    if (live) s.kick?.();
  }, [hovered, activeKind, live]);

  return <canvas ref={canvasRef} className="eco-models pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true" />;
}

// Probe on a throwaway canvas so a refusal doesn't log a three.js error.
// Chrome doesn't always flag its SwiftShader fallback as a performance caveat,
// so software rasterisers are also recognised by name.
function hasFastWebGL() {
  try {
    const gl = document.createElement("canvas").getContext("webgl2", { failIfMajorPerformanceCaveat: true });
    if (!gl) return false;
    const info = gl.getExtension("WEBGL_debug_renderer_info");
    const name = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return !/swiftshader|llvmpipe|softpipe|software|basic render driver/i.test(name);
  } catch {
    return false;
  }
}

// The hovered model gets full emphasis; its siblings a lighter lift when their
// kind is active in the explore card (mirrors the SVG's .eco-kind-on).
function applyHover(state) {
  state.items.forEach((it) => {
    it.hoverTarget = state.hovered === it.id ? 1 : state.activeKind === it.group ? 0.45 : 0;
  });
}

function applyMode(state, mode) {
  const day = mode === "day";
  state.baseMats.forEach((m) => {
    const f = day ? DAY_TINT[m.name] ?? 1 : 1;
    m.color.copy(m.userData.base).multiplyScalar(f);
  });
  state.items.forEach((it) => {
    it.glow.material.blending = day ? NormalBlending : AdditiveBlending;
    it.glow.material.needsUpdate = true;
  });
}

function applyScale(state, scale) {
  state.items.forEach((it) => {
    const s = SIZE[it.kind] * scale * (it.size ?? 1);
    it.root.scale.setScalar(s);
    it.glow.scale.set(1.7, 1.1, 1);
    it.glow.position.y = it.kind === "tower" ? 0.35 : 0.08;
  });
}
