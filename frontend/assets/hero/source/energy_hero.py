# Onction Energy — 3D energy landscape hero loop (Blender 5.2, Eevee).
#
# Run:  Blender -b --python energy_hero.py -- <mode> <outdir>
#   mode = still:<frame>   single preview frame (PNG)
#          anim            full 240-frame loop as PNG frames
#
# The story matches /how-we-trade: generation (hydro, gas, wind, solar) →
# Onction's trading hub → transmission → city & industry. Brand palette:
# navy #06121F / #0A1F3C / #0F2A52, teal #13C2B6 / #2DD4BF, spark #F5A623.
#
# Seamless 10 s loop (240 f @ 24 fps): blades turn a whole number of times,
# the hub ring turns once, the camera drifts on a sine, pulses wrap along
# the cables and fade at each end.
import bpy, bmesh, math, sys, random
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else ["still:1", "/tmp"]
MODE, OUT = argv[0], argv[1]
DAY = "--day" in argv  # daylight variant: same geometry and motion, lit by the sun
FRAMES, FPS = 240, 24
random.seed(7)
TAU = math.tau

# ── reset ──────────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.frame_start, scene.frame_end = 1, FRAMES
scene.render.fps = FPS

def hex_rgb(h, a=1.0):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((x / 12.92) if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4) for x in c) + (a,)

NAVY_950, NAVY_900, NAVY_800, NAVY_700 = "#06121F", "#0A1F3C", "#0F2A52", "#163668"
TEAL, TEAL_LIGHT, SPARK = "#13C2B6", "#2DD4BF", "#F5A623"

# ── materials ──────────────────────────────────────────────────────────────
def mat_basic(name, color, rough=0.55, metal=0.0, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hex_rgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit:
        b.inputs["Emission Color"].default_value = hex_rgb(emit)
        b.inputs["Emission Strength"].default_value = emit_strength
    return m

def mat_emit(name, color, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    e = nt.nodes.new("ShaderNodeEmission")
    e.inputs["Color"].default_value = hex_rgb(color)
    e.inputs["Strength"].default_value = strength
    o = nt.nodes.new("ShaderNodeOutputMaterial")
    nt.links.new(e.outputs[0], o.inputs[0])
    return m

M_STRUCT = mat_basic("struct", NAVY_700, rough=0.5, metal=0.2)
M_DARK = mat_basic("dark", NAVY_800, rough=0.7)
M_METAL = mat_basic("metal", "#a9bfd6", rough=0.35, metal=0.6)
M_BLADE = mat_basic("blade", "#dfe9f2", rough=0.4, emit=TEAL_LIGHT, emit_strength=0.15)
M_TEAL = mat_emit("teal_glow", TEAL, 6.0)
M_TEAL_SOFT = mat_emit("teal_soft", TEAL, 2.2)
M_CABLE = mat_emit("cable", TEAL_LIGHT, 0.9)
M_SPARK = mat_emit("spark", SPARK, 5.0)
M_PULSE = mat_emit("pulse", "#c8fff9", 22.0)
M_WATER = mat_basic("water", "#071a2e", rough=0.12, metal=0.0, emit=TEAL, emit_strength=0.08)
M_PANEL = mat_basic("panel", "#12325f", rough=0.1, metal=0.6, emit=TEAL, emit_strength=0.22)

def mat_ground():
    # Dark navy ground with a faint teal survey grid.
    m = bpy.data.materials.new("ground")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hex_rgb("#081a30")
    b.inputs["Roughness"].default_value = 0.9
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    lines = []
    for axis in ("X", "Y"):
        d = nt.nodes.new("ShaderNodeMath"); d.operation = "DIVIDE"; d.inputs[1].default_value = 4.0
        f = nt.nodes.new("ShaderNodeMath"); f.operation = "FRACT"
        c = nt.nodes.new("ShaderNodeMath"); c.operation = "LESS_THAN"; c.inputs[1].default_value = 0.008
        nt.links.new(sep.outputs[axis], d.inputs[0]); nt.links.new(d.outputs[0], f.inputs[0]); nt.links.new(f.outputs[0], c.inputs[0])
        lines.append(c)
    mx = nt.nodes.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
    nt.links.new(lines[0].outputs[0], mx.inputs[0]); nt.links.new(lines[1].outputs[0], mx.inputs[1])
    s = nt.nodes.new("ShaderNodeMath"); s.operation = "MULTIPLY"; s.inputs[1].default_value = 0.18
    nt.links.new(mx.outputs[0], s.inputs[0])
    b.inputs["Emission Color"].default_value = hex_rgb(TEAL)
    nt.links.new(s.outputs[0], b.inputs["Emission Strength"])
    return m

def mat_windows(name, lit_color, seed):
    # Building façade: navy with a brick-texture grid of lit windows.
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = hex_rgb(NAVY_800)
    b.inputs["Roughness"].default_value = 0.4
    tc = nt.nodes.new("ShaderNodeTexCoord")
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.09
    br.inputs["Brick Width"].default_value = 0.42
    br.inputs["Row Height"].default_value = 0.5
    br.inputs["Bias"].default_value = 0.5
    br.offset = 0.0
    br.inputs["Color1"].default_value = (1, 1, 1, 1)
    br.inputs["Color2"].default_value = (0.04, 0.04, 0.04, 1)
    br.inputs["Mortar"].default_value = (0, 0, 0, 1)
    sx = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(tc.outputs["Object"], sx.inputs[0])
    ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "ADD"
    nt.links.new(sx.outputs["X"], ad.inputs[0]); nt.links.new(sx.outputs["Y"], ad.inputs[1])
    cb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(ad.outputs[0], cb.inputs["X"]); nt.links.new(sx.outputs["Z"], cb.inputs["Y"])
    mp = nt.nodes.new("ShaderNodeMapping")
    mp.inputs["Location"].default_value = (seed * 3.1, seed * 1.7, 0)
    nt.links.new(cb.outputs[0], mp.inputs["Vector"])
    nt.links.new(mp.outputs[0], br.inputs["Vector"])
    s = nt.nodes.new("ShaderNodeMath"); s.operation = "MULTIPLY"; s.inputs[1].default_value = 2.6
    nt.links.new(br.outputs["Color"], s.inputs[0])
    b.inputs["Emission Color"].default_value = hex_rgb(lit_color)
    nt.links.new(s.outputs[0], b.inputs["Emission Strength"])
    return m

M_GROUND = mat_ground()
M_WIN_T = mat_windows("win_teal", TEAL_LIGHT, 1)
M_WIN_S = mat_windows("win_spark", "#ffd08a", 2)

def mat_ground_day():
    # Soft sage-grey ground; the survey grid becomes faint painted lines.
    m = bpy.data.materials.new("ground_day")
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.95
    geo = nt.nodes.new("ShaderNodeNewGeometry")
    sep = nt.nodes.new("ShaderNodeSeparateXYZ")
    nt.links.new(geo.outputs["Position"], sep.inputs[0])
    lines = []
    for axis in ("X", "Y"):
        d = nt.nodes.new("ShaderNodeMath"); d.operation = "DIVIDE"; d.inputs[1].default_value = 4.0
        f = nt.nodes.new("ShaderNodeMath"); f.operation = "FRACT"
        c = nt.nodes.new("ShaderNodeMath"); c.operation = "LESS_THAN"; c.inputs[1].default_value = 0.01
        nt.links.new(sep.outputs[axis], d.inputs[0]); nt.links.new(d.outputs[0], f.inputs[0]); nt.links.new(f.outputs[0], c.inputs[0])
        lines.append(c)
    mx = nt.nodes.new("ShaderNodeMath"); mx.operation = "MAXIMUM"
    nt.links.new(lines[0].outputs[0], mx.inputs[0]); nt.links.new(lines[1].outputs[0], mx.inputs[1])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = hex_rgb("#a9c4b6")
    mix.inputs[7].default_value = hex_rgb("#6fae9f")
    nt.links.new(mx.outputs[0], mix.inputs[0])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    return m

def mat_windows_day(name, seed):
    # Pale façade with dark glass windows (brick texture picks window cells).
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.3
    b.inputs["Metallic"].default_value = 0.2
    tc = nt.nodes.new("ShaderNodeTexCoord")
    sx = nt.nodes.new("ShaderNodeSeparateXYZ"); nt.links.new(tc.outputs["Object"], sx.inputs[0])
    ad = nt.nodes.new("ShaderNodeMath"); ad.operation = "ADD"
    nt.links.new(sx.outputs["X"], ad.inputs[0]); nt.links.new(sx.outputs["Y"], ad.inputs[1])
    cb = nt.nodes.new("ShaderNodeCombineXYZ")
    nt.links.new(ad.outputs[0], cb.inputs["X"]); nt.links.new(sx.outputs["Z"], cb.inputs["Y"])
    mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Location"].default_value = (seed * 3.1, seed * 1.7, 0)
    nt.links.new(cb.outputs[0], mp.inputs["Vector"])
    br = nt.nodes.new("ShaderNodeTexBrick")
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.16
    br.inputs["Brick Width"].default_value = 2.0
    br.inputs["Row Height"].default_value = 0.55
    br.inputs["Color1"].default_value = (1, 1, 1, 1)
    br.inputs["Color2"].default_value = (1, 1, 1, 1)
    br.inputs["Mortar"].default_value = (0, 0, 0, 1)
    nt.links.new(mp.outputs[0], br.inputs["Vector"])
    mix = nt.nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
    mix.inputs[6].default_value = hex_rgb("#e9eef2")
    mix.inputs[7].default_value = hex_rgb("#6b8ea8" if seed % 2 else "#6f9a9f")
    nt.links.new(br.outputs["Color"], mix.inputs[0])
    nt.links.new(mix.outputs[2], b.inputs["Base Color"])
    return m

if DAY:
    M_STRUCT = mat_basic("struct_d", "#e4eaef", rough=0.55, metal=0.05)
    M_DARK = mat_basic("dark_d", "#7fa293", rough=0.9)
    M_METAL = mat_basic("metal_d", "#8a9bab", rough=0.35, metal=0.7)
    M_BLADE = mat_basic("blade_d", "#ffffff", rough=0.35)
    M_TEAL = mat_emit("teal_glow_d", TEAL, 2.2)
    M_TEAL_SOFT = mat_basic("teal_soft_d", TEAL, rough=0.4, emit=TEAL, emit_strength=0.6)
    M_CABLE = mat_basic("cable_d", "#3f566b", rough=0.5, metal=0.4)
    M_PULSE = mat_emit("pulse_d", "#13f2df", 9.0)
    M_WATER = mat_basic("water_d", "#4f9fc4", rough=0.06, metal=0.1)
    M_PANEL = mat_basic("panel_d", "#1c4a86", rough=0.08, metal=0.7)
    M_GROUND = mat_ground_day()
    M_WIN_T = mat_windows_day("win_d1", 1)
    M_WIN_S = mat_windows_day("win_d2", 2)

# ── helpers ────────────────────────────────────────────────────────────────
COL = bpy.data.collections.new("Landscape")
scene.collection.children.link(COL)

def link(obj):
    COL.objects.link(obj)
    return obj

def box(name, loc, size, mat, rot=(0, 0, 0), bevel=0.0):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me))
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(mat)
    if bevel:
        mod = ob.modifiers.new("bevel", "BEVEL"); mod.width = bevel; mod.segments = 2
    return ob

def cyl(name, loc, r1, r2, h, mat, verts=24, rot=(0, 0, 0)):
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=r1, radius2=r2, depth=h)
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me))
    ob.location, ob.rotation_euler = loc, rot
    ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def lathe(name, loc, profile, mat, segs=32):
    # Revolve (radius, z) profile points around Z.
    me = bpy.data.meshes.new(name)
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        rings.append([bm.verts.new((r * math.cos(TAU * i / segs), r * math.sin(TAU * i / segs), z)) for i in range(segs)])
    for a, b2 in zip(rings, rings[1:]):
        for i in range(segs):
            bm.faces.new((a[i], a[(i + 1) % segs], b2[(i + 1) % segs], b2[i]))
    bm.to_mesh(me); bm.free()
    ob = link(bpy.data.objects.new(name, me))
    ob.location = loc
    ob.data.materials.append(mat)
    for p in ob.data.polygons: p.use_smooth = True
    return ob

def polyline(name, pts, radius, mat):
    cu = bpy.data.curves.new(name, "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = radius
    cu.bevel_resolution = 2
    sp = cu.splines.new("POLY")
    sp.points.add(len(pts) - 1)
    for p, v in zip(sp.points, pts):
        p.co = (v.x, v.y, v.z, 1)
    ob = link(bpy.data.objects.new(name, cu))
    ob.data.materials.append(mat)
    return ob

def catenary(a, b, sag, n=28):
    return [a.lerp(b, i / (n - 1)) - Vector((0, 0, sag * 4 * (i / (n - 1)) * (1 - i / (n - 1)))) for i in range(n)]

def keyframe_linear(ob):
    ad = ob.animation_data
    if not ad or not ad.action: return
    # Blender 5 layered actions: walk every F-curve in every channelbag.
    for layer in ad.action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    for k in fc.keyframe_points: k.interpolation = "LINEAR"

# ── ground & water ─────────────────────────────────────────────────────────
bpy.ops.mesh.primitive_plane_add(size=1)
g = bpy.context.active_object; bpy.context.scene.collection.objects.unlink(g); link(g)
g.name = "ground"; g.scale = (220, 140, 1); g.location = (0, 30, 0)
g.data.materials.append(M_GROUND)

# River from the dam, winding toward the viewer
river = box("river", (-33, -4, 0.02), (4.5, 34, 0.04), M_WATER)
reservoir = box("reservoir", (-33, 24, 1.6), (26, 14, 0.05), M_WATER)
hill = box("hill_l", (-46, 22, 2), (14, 22, 6), M_DARK, rot=(0, 0, 0.1), bevel=1.5)
hill2 = box("hill_r", (-20, 26, 1.6), (12, 14, 4.2), M_DARK, rot=(0, 0, -0.08), bevel=1.2)

for i in range(9):
    box(f"ridge{i}", (-90 + i * 24, 110 + (i % 3) * 8, 0), (40, 14, 10 + (i * 7) % 13), M_DARK, rot=(0, 0, 0.3 * ((i % 2) - 0.5)), bevel=3)

# ── generation: hydro dam ───────────────────────────────────────────────────
dam = box("dam", (-33, 14, 1.9), (13, 2.4, 3.8), M_STRUCT, bevel=0.15)
for i in range(4):
    box(f"gate{i}", (-37.5 + i * 3, 12.7, 1.6), (0.9, 0.4, 3.0), M_TEAL_SOFT)

# ── generation: gas-fired plant ─────────────────────────────────────────────
box("gas_hall", (-22, 8, 1.6), (7, 4.5, 3.2), M_STRUCT, bevel=0.1)
box("gas_hall2", (-18, 9.5, 1.1), (3, 3, 2.2), M_STRUCT, bevel=0.1)
stack = cyl("stack", (-24.5, 10.5, 5.5), 0.55, 0.45, 11, M_STRUCT)
cyl("stack_light", (-24.5, 10.5, 10.9), 0.62, 0.62, 0.25, M_SPARK)
tower_prof = [(3.2 * math.sqrt(1 + ((z - 5.5) / 3.2) ** 2) * 0.55, z) for z in [i * 0.5 for i in range(0, 17)]]
lathe("cooling", (-17, 14, 0), tower_prof, M_DARK)
lathe("cooling_rim", (-17, 14, 8.0), [(r * 1.0, z - 8.0) for r, z in tower_prof[-2:]], M_TEAL_SOFT)

# ── generation: wind turbines (blades turn a whole number of times) ─────────
def turbine(x, y, h, turns, phase):
    cyl(f"tw_tower{x}", (x, y, h / 2), 0.32, 0.16, h, M_METAL)
    box(f"tw_nac{x}", (x, y - 0.3, h), (0.5, 1.4, 0.5), M_METAL)
    hub = cyl(f"tw_hub{x}", (x, y - 1.05, h), 0.28, 0.2, 0.4, M_TEAL, rot=(math.radians(90), 0, 0))
    rotor = bpy.data.objects.new(f"rotor{x}", None); link(rotor)
    rotor.location = (x, y - 1.1, h)
    for k in range(3):
        bl = box(f"blade{x}_{k}", (0, 0, 3.1), (0.42, 0.1, 6.2), M_BLADE)
        piv = bpy.data.objects.new(f"bp{x}_{k}", None); link(piv)
        piv.parent = rotor
        piv.rotation_euler = (0, TAU * k / 3, 0)
        bl.parent = piv
    rotor.rotation_euler = (0, phase, 0)
    rotor.keyframe_insert("rotation_euler", index=1, frame=1)
    rotor.rotation_euler = (0, phase + TAU * turns, 0)
    rotor.keyframe_insert("rotation_euler", index=1, frame=FRAMES + 1)
    keyframe_linear(rotor)

for i, (x, y, h) in enumerate([(-12, 12, 10), (-7.5, 16, 11), (-3, 13, 9.5), (-26, 20, 10.5)]):
    turbine(x, y, h, turns=2, phase=i * 0.7)

# ── generation: solar field ─────────────────────────────────────────────────
for r in range(5):
    for c in range(8):
        box(f"pv{r}_{c}", (-15 + c * 2.2, -2 - r * 2.3, 0.8), (1.9, 1.2, 0.06), M_PANEL, rot=(math.radians(32), 0, 0))
        box(f"pvleg{r}_{c}", (-15 + c * 2.2, -2 - r * 2.3 + 0.2, 0.4), (0.06, 0.06, 0.8), M_METAL)

# ── Onction trading hub ─────────────────────────────────────────────────────
HUB = Vector((4, 6, 0))
cyl("hub_base", HUB + Vector((0, 0, 0.6)), 4.2, 3.8, 1.2, M_STRUCT, verts=6)
cyl("hub_edge", HUB + Vector((0, 0, 1.25)), 3.85, 3.85, 0.08, M_TEAL, verts=6)
cyl("hub_core_col", HUB + Vector((0, 0, 3.5)), 0.9, 0.7, 4.6, M_STRUCT, verts=6)
core = bpy.data.objects.new("hub_core", bpy.data.meshes.new("hub_core_m")); link(core)
bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=3, radius=1.15); bm.to_mesh(core.data); bm.free()
core.location = HUB + Vector((0, 0, 7.2)); core.data.materials.append(M_TEAL)
for p in core.data.polygons: p.use_smooth = True
ring = bpy.data.objects.new("hub_ring", bpy.data.meshes.new("hub_ring_m")); link(ring)
bm = bmesh.new()
# torus built by revolving a small circle
segs, tube = 64, 12
R, r = 2.6, 0.09
rings_v = []
for i in range(segs):
    a = TAU * i / segs
    rings_v.append([bm.verts.new(((R + r * math.cos(TAU * j / tube)) * math.cos(a), (R + r * math.cos(TAU * j / tube)) * math.sin(a), r * math.sin(TAU * j / tube))) for j in range(tube)])
for i in range(segs):
    for j in range(tube):
        bm.faces.new((rings_v[i][j], rings_v[(i + 1) % segs][j], rings_v[(i + 1) % segs][(j + 1) % tube], rings_v[i][(j + 1) % tube]))
bm.to_mesh(ring.data); bm.free()
ring.data.materials.append(M_TEAL)
ring.location = HUB + Vector((0, 0, 7.2))
ring.rotation_euler = (math.radians(70), 0, 0)
ring.keyframe_insert("rotation_euler", index=2, frame=1)
ring.rotation_euler = (math.radians(70), 0, TAU)
ring.keyframe_insert("rotation_euler", index=2, frame=FRAMES + 1)
keyframe_linear(ring)
ring2 = ring.copy(); ring2.data = ring.data; link(ring2)
ring2.scale = (1.35, 1.35, 1.35); ring2.rotation_euler = (math.radians(100), math.radians(25), 0)
# light beam from the core
beam = cyl("beam", HUB + Vector((0, 0, 14)), 0.05, 0.05, 12, M_TEAL_SOFT)
hub_light = bpy.data.lights.new("hub_light", "POINT"); hub_light.energy = 600 if DAY else 2500; hub_light.color = hex_rgb(TEAL)[:3]; hub_light.shadow_soft_size = 1.0
hl = link(bpy.data.objects.new("hub_light", hub_light)); hl.location = HUB + Vector((0, 0, 7.2))

# ── transmission towers & cables ────────────────────────────────────────────
def pylon(p, h=9.0, name="py"):
    legs = [(-1, -1), (1, -1), (1, 1), (-1, 1)]
    for i, (sx, sy) in enumerate(legs):
        a = p + Vector((sx * 1.1, sy * 1.1, 0)); b = p + Vector((sx * 0.25, sy * 0.25, h))
        mid, d = (a + b) / 2, b - a
        leg = cyl(f"{name}_leg{i}", mid, 0.07, 0.07, d.length, M_METAL, verts=6)
        leg.rotation_mode = "QUATERNION"; leg.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d)
    for k, z in enumerate([h * 0.45, h * 0.72, h * 0.95]):
        w = 1.1 - 0.85 * z / h
        box(f"{name}_ring{k}", p + Vector((0, 0, z)), (2 * w + 0.1, 0.08, 0.08), M_METAL)
        box(f"{name}_ringb{k}", p + Vector((0, 0, z)), (0.08, 2 * w + 0.1, 0.08), M_METAL)
    arms = []
    for k, (z, span) in enumerate([(h * 0.78, 3.4), (h * 0.95, 2.4)]):
        box(f"{name}_arm{k}", p + Vector((0, 0, z)), (span * 2, 0.16, 0.16), M_METAL)
        arms += [p + Vector((-span, 0, z - 0.35)), p + Vector((span, 0, z - 0.35))]
        for side in (-1, 1):
            cyl(f"{name}_ins{k}{side}", p + Vector((side * span, 0, z - 0.2)), 0.1, 0.1, 0.35, M_TEAL_SOFT, verts=8)
    return arms

route_left = [Vector((-24, 2, 0)), Vector((-12, 4, 0)), Vector((-3, 3, 0))]
route_right = [Vector((13, 3, 0)), Vector((22, 1, 0)), Vector((31, 3, 0))]
arms_by = {}
for i, p in enumerate(route_left + route_right):
    arms_by[i] = pylon(p, name=f"py{i}")

cable_paths = []
def span(a_arms, b_arms, sag=1.1):
    for ai, bi in [(0, 0), (1, 1), (2, 2), (3, 3)]:
        pts = catenary(a_arms[ai], b_arms[bi], sag)
        polyline(f"cable{len(cable_paths)}", pts, 0.035, M_CABLE)
        cable_paths.append(pts)

hub_top = HUB + Vector((0, 0, 1.3))
hub_ports = [hub_top + Vector((-3.4, 0, 5.4)), hub_top + Vector((-2.4, 0, 7.4)), hub_top + Vector((3.4, 0, 5.4)), hub_top + Vector((2.4, 0, 7.4))]
span(arms_by[0], arms_by[1]); span(arms_by[1], arms_by[2])
# into the hub and out again
for i, port in enumerate(hub_ports[:2]):
    pts = catenary(arms_by[2][1 + 2 * i], port, 0.8); polyline(f"hubin{i}", pts, 0.035, M_CABLE); cable_paths.append(pts)
for i, port in enumerate(hub_ports[2:]):
    pts = catenary(port, arms_by[3][2 * i], 0.8); polyline(f"hubout{i}", pts, 0.035, M_CABLE); cable_paths.append(pts)
span(arms_by[3], arms_by[4]); span(arms_by[4], arms_by[5])
# feeders from generation to the first pylon
for src in [Vector((-24.5, 10.5, 9)), Vector((-33, 13, 3.8)), Vector((-12, 11, 2))]:
    pts = catenary(src, arms_by[0][0] if src.x < -20 else arms_by[1][0], 1.0); polyline("feeder", pts, 0.03, M_CABLE); cable_paths.append(pts)

# ── delivery: city & industry ───────────────────────────────────────────────
for i in range(22):
    x = 16 + (i % 6) * 3.3 + random.uniform(-0.6, 0.6)
    y = 10 + (i // 6) * 4.2 + random.uniform(-0.8, 0.8)
    h = random.choice([4, 6, 7, 9, 11, 14, 17])
    box(f"bld{i}", (x, y, h / 2), (2.4, 2.4, h), M_WIN_S if i % 5 == 0 else M_WIN_T, bevel=0.05)
    box(f"bld_cap{i}", (x, y, h + 0.05), (2.5, 2.5, 0.1), M_TEAL_SOFT if i % 4 == 0 else M_STRUCT)
for k in range(4):
    box(f"factory{k}", (35 + k * 2.4, -3, 1.2), (2.3, 6, 2.4), M_STRUCT, bevel=0.05)
    box(f"saw{k}", (35 + k * 2.4 + 0.5, -3, 2.9), (1.2, 6, 1.4), M_DARK, rot=(0, math.radians(35), 0))
cyl("fac_stack", (43, -1, 4.5), 0.4, 0.3, 9, M_STRUCT)
cyl("fac_light", (43, -1, 9.0), 0.45, 0.45, 0.2, M_SPARK)
pts = catenary(arms_by[5][2], Vector((35, -3, 2.6)), 0.8); polyline("to_factory", pts, 0.03, M_CABLE); cable_paths.append(pts)
pts = catenary(arms_by[5][0], Vector((18, 10, 5)), 0.8); polyline("to_city", pts, 0.03, M_CABLE); cable_paths.append(pts)

# ── community: homes receiving power, a road with traffic ──────────────────
# Finishing touches — the last mile. A local substation steps power down to a
# distribution line on wooden poles, with service drops into each house.
if DAY:
    M_WALL = mat_basic("wall_d", "#f1ede4", rough=0.8)
    M_ROOF_A = mat_basic("roof_a_d", "#b5563c", rough=0.7)
    M_ROOF_B = mat_basic("roof_b_d", "#5b6b80", rough=0.7)
    M_WINDOW = mat_basic("window_d", "#35607e", rough=0.05, metal=0.3)
    M_ROAD = mat_basic("road_d", "#5a636c", rough=0.9)
    M_LINE = mat_basic("line_d", "#f2f2f2", rough=0.6)
    M_POLE = mat_basic("pole_d", "#6b4f3a", rough=0.8)
    M_HEAD = mat_basic("head_d", "#e9eef2", rough=0.3)
    M_TAIL = mat_basic("tail_d", "#b83a2e", rough=0.3)
    M_LAMP = mat_basic("lamp_d", "#cfd6dc", rough=0.3)
    CAR_COLORS = ["#d64541", "#2a78d6", "#f5f5f5", "#13C2B6", "#333b44", "#f5a623"]
else:
    M_WALL = mat_basic("wall", "#1b3556", rough=0.8)
    M_ROOF_A = mat_basic("roof_a", "#0f2a52", rough=0.7)
    M_ROOF_B = mat_basic("roof_b", "#163668", rough=0.7)
    M_WINDOW = mat_emit("window", "#ffc978", 4.5)
    M_ROAD = mat_basic("road", "#0b1a2b", rough=0.9)
    M_LINE = mat_emit("line", SPARK, 0.7)
    M_POLE = mat_basic("pole", "#2a3c52", rough=0.8)
    M_HEAD = mat_emit("head", "#fff4d6", 14.0)
    M_TAIL = mat_emit("tail", "#ff3b30", 7.0)
    M_LAMP = mat_emit("lamp", "#ffd08a", 9.0)
    CAR_COLORS = ["#2b4a6f", "#1f3a5c", "#3a5f7d", "#0e6f68", "#24364d", "#4a5d73"]
M_CARS = [mat_basic(f"car{i}", c, rough=0.25, metal=0.6) for i, c in enumerate(CAR_COLORS)]

def house(x, y, rot, roof_mat, w=2.4, d=2.0, h=1.5):
    root = bpy.data.objects.new(f"house{x:.0f}_{y:.0f}", None); link(root)
    root.location = (x, y, 0); root.rotation_euler = (0, 0, rot)
    parts = [box(f"hw{x}{y}", (0, 0, h / 2), (w, d, h), M_WALL)]
    # gabled roof: triangular prism
    me = bpy.data.meshes.new("roof"); bm = bmesh.new()
    hw, hd, rh = w / 2 + 0.15, d / 2 + 0.15, 0.9
    v = [bm.verts.new(c) for c in [(-hw, -hd, h), (hw, -hd, h), (hw, hd, h), (-hw, hd, h), (-hw, 0, h + rh), (hw, 0, h + rh)]]
    for f in [(0, 1, 5, 4), (3, 4, 5, 2), (0, 4, 3), (1, 2, 5), (0, 3, 2, 1)]:
        bm.faces.new([v[i] for i in f])
    bm.to_mesh(me); bm.free()
    roof = link(bpy.data.objects.new("roof", me)); roof.data.materials.append(roof_mat); parts.append(roof)
    for wx in (-0.55, 0.55):
        parts.append(box("win", (wx, -d / 2 - 0.02, h * 0.55), (0.42, 0.05, 0.42), M_WINDOW))
    parts.append(box("door", (0, d / 2 + 0.02, h * 0.38), (0.36, 0.05, 0.76), M_WINDOW if not DAY else M_ROOF_B))
    for o in parts:
        o.parent = root
    return root

HOUSE_ROWS = [(-4.8, [10.5, 14.0, 17.5, 21.0, 24.5, 28.0, 31.5]), (-11.2, [9.0, 12.5, 16.0, 19.5, 23.0, 26.5, 30.0])]
house_tops = []
for ry, xs in HOUSE_ROWS:
    for k, hx in enumerate(xs):
        jitter = random.uniform(-0.4, 0.4)
        house(hx + jitter, ry, random.uniform(-0.12, 0.12), M_ROOF_A if (k + int(ry)) % 2 else M_ROOF_B)
        house_tops.append(Vector((hx + jitter, ry, 2.1)))

# local substation
box("sub_pad", (7.5, -1.2, 0.1), (4.2, 2.6, 0.2), M_DARK)
for k in range(3):
    box(f"xfmr{k}", (6.3 + k * 1.2, -1.2, 0.8), (0.8, 1.2, 1.2), M_METAL)
    cyl(f"bush{k}", (6.3 + k * 1.2, -1.2, 1.6), 0.08, 0.08, 0.5, M_TEAL_SOFT, verts=8)

# distribution poles between the two rows of houses
POLES = [Vector((x, -8.0, 0)) for x in (8.0, 11.8, 15.6, 19.4, 23.2, 27.0, 30.8, 33.6)]
tops = []
for i, pp in enumerate(POLES):
    cyl(f"dpole{i}", pp + Vector((0, 0, 2.2)), 0.09, 0.07, 4.4, M_POLE, verts=8)
    box(f"dx{i}", pp + Vector((0, 0, 4.2)), (1.2, 0.08, 0.08), M_POLE)
    tops.append(pp + Vector((0, 0, 4.15)))
# feed: transmission pylon → substation → first pole
pts = catenary(arms_by[3][0], Vector((7.5, -1.2, 2.0)), 0.9); polyline("to_sub", pts, 0.03, M_CABLE); cable_paths.append(pts)
pts = catenary(Vector((7.5, -1.2, 2.0)), tops[0], 0.5); polyline("sub_feed", pts, 0.022, M_CABLE); cable_paths.append(pts)
for a, b in zip(tops, tops[1:]):
    for off in (-0.5, 0.5):
        pts = catenary(a + Vector((0, 0, 0)) + Vector((off, 0, 0)), b + Vector((off, 0, 0)), 0.35)
        polyline("dline", pts, 0.018, M_CABLE)
        if off < 0:
            cable_paths.append(pts)
# service drops into every house
for ht in house_tops:
    near = min(tops, key=lambda t: (t - ht).length)
    pts = catenary(near, ht, 0.25, n=16); polyline("drop", pts, 0.012, M_CABLE); cable_paths.append(pts)

# road with lane markings, streetlights and traffic
ROAD_Y, ROAD_X0, ROAD_X1 = -15.6, -110.0, 120.0
ROAD_LEN = ROAD_X1 - ROAD_X0
box("road", ((ROAD_X0 + ROAD_X1) / 2, ROAD_Y, 0.03), (ROAD_LEN, 4.2, 0.06), M_ROAD)
for k in range(int(ROAD_LEN // 3)):
    box(f"dash{k}", (ROAD_X0 + 1.5 + k * 3, ROAD_Y, 0.07), (1.4, 0.12, 0.02), M_LINE)
for k, lx in enumerate(range(-40, 60, 11)):
    cyl(f"lamp_post{k}", (lx, ROAD_Y + 2.6, 1.6), 0.06, 0.05, 3.2, M_POLE, verts=8)
    box(f"lamp_arm{k}", (lx, ROAD_Y + 2.1, 3.15), (0.08, 1.0, 0.06), M_POLE)
    box(f"lamp_head{k}", (lx, ROAD_Y + 1.65, 3.08), (0.28, 0.4, 0.1), M_LAMP)

def keyframe_constant(ob):
    for layer in ob.animation_data.action.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves:
                    for kp in fc.keyframe_points: kp.interpolation = "CONSTANT"

def car(i, lane, direction, phase, laps, mat):
    root = bpy.data.objects.new(f"car{i}", None); link(root)
    parts = [box("body", (0, 0, 0.42), (1.9, 0.9, 0.42), mat, bevel=0.08),
             box("cabin", (-0.1, 0, 0.8), (1.0, 0.8, 0.36), M_WINDOW if not DAY else mat_basic("glass", "#2c4d66", rough=0.05, metal=0.4), bevel=0.06)]
    for sy in (-0.3, 0.3):
        parts.append(box("hl", (0.96, sy, 0.45), (0.05, 0.2, 0.1), M_HEAD))
        parts.append(box("tl", (-0.96, sy, 0.45), (0.05, 0.2, 0.1), M_TAIL))
    for o in parts:
        o.parent = root
    root.rotation_euler = (0, 0, 0 if direction > 0 else math.pi)
    y = ROAD_Y + lane
    # one key per frame with CONSTANT interpolation: the wrap from the far
    # end back to the start happens off-screen in a single frame, no streak
    for f in range(1, FRAMES + 2):
        t = (phase + laps * (f - 1) / FRAMES) % 1.0
        x = ROAD_X0 + t * ROAD_LEN if direction > 0 else ROAD_X1 - t * ROAD_LEN
        root.location = (x, y, 0)
        root.keyframe_insert("location", frame=f)
    keyframe_constant(root)

for i, (lane, direction, phase, laps) in enumerate([(-1.0, 1, 0.05, 1), (-1.0, 1, 0.3, 1), (-1.0, 1, 0.52, 1), (-1.0, 1, 0.76, 1), (1.0, -1, 0.12, 1), (1.0, -1, 0.37, 1), (1.0, -1, 0.61, 1), (1.0, -1, 0.88, 1)]):
    car(i, lane, direction, phase, laps, M_CARS[i % len(M_CARS)])

# ── energy pulses (per-frame keyed, wrap + fade at the ends) ────────────────
def sample(pts, t):
    seg = t * (len(pts) - 1)
    i = min(int(seg), len(pts) - 2)
    return pts[i].lerp(pts[i + 1], seg - i)

pulse_mesh = bpy.data.meshes.new("pulse_m")
bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.13); bm.to_mesh(pulse_mesh); bm.free()
pn = 0
for ci, pts in enumerate(cable_paths):
    if ci % 4 not in (0, 3):
        continue  # pulse on a subset of conductors, not every wire
    for k in range(1):
        ob = link(bpy.data.objects.new(f"pulse{pn}", pulse_mesh)); pn += 1
        ob.data.materials.append(M_PULSE) if not ob.data.materials else None
        phase = (ci * 0.37 + k * 0.5) % 1.0
        speed = 2 if ci % 3 else 1  # whole passes per loop keep it seamless
        for f in range(1, FRAMES + 2, 2):
            t = (phase + speed * (f - 1) / FRAMES) % 1.0
            ob.location = sample(pts, t)
            s = min(1.0, t / 0.08, (1 - t) / 0.08)
            ob.scale = (s, s, s)
            ob.keyframe_insert("location", frame=f)
            ob.keyframe_insert("scale", frame=f)
        keyframe_linear(ob)

# ── world, lights, camera ───────────────────────────────────────────────────
world = bpy.data.worlds.new("World"); scene.world = world
world.use_nodes = True
wnt = world.node_tree
bg = wnt.nodes["Background"]
bg.inputs["Strength"].default_value = 1.1 if DAY else 0.7
wtc = wnt.nodes.new("ShaderNodeTexCoord")
wsep = wnt.nodes.new("ShaderNodeSeparateXYZ")
wnt.links.new(wtc.outputs["Generated"], wsep.inputs[0])
wramp = wnt.nodes.new("ShaderNodeValToRGB")
wramp.color_ramp.elements[0].position = 0.5
wramp.color_ramp.elements[0].color = hex_rgb("#e3f0f7" if DAY else "#12385a")
wramp.color_ramp.elements[1].position = 0.62
wramp.color_ramp.elements[1].color = hex_rgb("#3f86c4" if DAY else "#050f1c")
wnt.links.new(wsep.outputs["Z"], wramp.inputs["Fac"])
wnt.links.new(wramp.outputs["Color"], bg.inputs["Color"])

def light(name, kind, loc, rot, energy, color, size=None):
    ld = bpy.data.lights.new(name, kind); ld.energy = energy; ld.color = hex_rgb(color)[:3]
    if size is not None and kind == "AREA": ld.size = size
    ob = link(bpy.data.objects.new(name, ld)); ob.location = loc; ob.rotation_euler = rot
    return ob

if DAY:
    sun = light("sun", "SUN", (0, 0, 30), (math.radians(52), math.radians(-12), math.radians(-40)), 5.5, "#ffeccc")
    sun.data.angle = math.radians(2.5)
    light("sky_fill", "SUN", (0, 0, 30), (math.radians(20), 0, math.radians(150)), 0.9, "#bcd9ee")
else:
    light("moon", "SUN", (0, 0, 30), (math.radians(55), math.radians(-10), math.radians(-35)), 1.6, "#9fc4ff")
    light("rim", "SUN", (0, 0, 30), (math.radians(75), 0, math.radians(160)), 2.4, TEAL_LIGHT)
    light("fill", "AREA", (10, -30, 22), (math.radians(55), 0, 0), 9000, "#3a6ea8", size=40)

cam_data = bpy.data.cameras.new("cam"); cam_data.lens = 30
cam_data.dof.use_dof = True; cam_data.dof.aperture_fstop = 4.0; cam_data.dof.focus_distance = 70
cam = link(bpy.data.objects.new("cam", cam_data)); scene.camera = cam
target = link(bpy.data.objects.new("target", None)); target.location = (0, 8, 4.5)
tr = cam.constraints.new("TRACK_TO"); tr.target = target; tr.track_axis = "TRACK_NEGATIVE_Z"; tr.up_axis = "UP_Y"
for f in range(1, FRAMES + 2, 4):
    ph = TAU * (f - 1) / FRAMES
    cam.location = (14 + 5.0 * math.sin(ph), -52 + 2.0 * math.cos(ph), 20 + 1.0 * math.sin(ph * 2))
    cam.keyframe_insert("location", frame=f)
for layer in (cam.animation_data.action.layers if cam.animation_data else []):
    for strip in layer.strips:
        for cb in strip.channelbags:
            for fc in cb.fcurves:
                for kp in fc.keyframe_points: kp.interpolation = "BEZIER"

# ── render settings + compositor (depth haze + bloom) ───────────────────────
scene.render.engine = "BLENDER_EEVEE"
scene.eevee.taa_render_samples = 48
scene.eevee.use_raytracing = False
scene.render.resolution_x, scene.render.resolution_y = 1920, 1080
scene.render.resolution_percentage = 100 if MODE == "anim" else 50
scene.view_settings.view_transform = "AgX"
scene.view_settings.look = "AgX - Punchy"
scene.view_settings.exposure = -0.35 if DAY else 0.2
vl = scene.view_layers[0]; vl.use_pass_mist = True
world.mist_settings.start = 30; world.mist_settings.depth = 90; world.mist_settings.falloff = "QUADRATIC"

ng = bpy.data.node_groups.new("Comp", "CompositorNodeTree")
ng.interface.new_socket("Image", in_out="OUTPUT", socket_type="NodeSocketColor")
rl = ng.nodes.new("CompositorNodeRLayers")
haze = ng.nodes.new("ShaderNodeMix"); haze.data_type = "RGBA"; haze.blend_type = "MIX"
haze.inputs[7].default_value = hex_rgb("#c9e0ee" if DAY else "#0e2744")
mf = ng.nodes.new("ShaderNodeMath"); mf.operation = "MULTIPLY"; mf.inputs[1].default_value = 0.4 if DAY else 0.75
ng.links.new(rl.outputs["Mist"], mf.inputs[0])
ng.links.new(mf.outputs[0], haze.inputs[0])
ng.links.new(rl.outputs["Image"], haze.inputs[6])
gl = ng.nodes.new("CompositorNodeGlare")
try:
    gl.inputs["Type"].default_value = "Bloom"
except Exception:
    pass
gl.inputs["Threshold"].default_value = 1.4 if DAY else 0.8
gl.inputs["Strength"].default_value = 0.6
ng.links.new(haze.outputs[2], gl.inputs["Image"])
out = ng.nodes.new("NodeGroupOutput")
ng.links.new(gl.outputs["Image"], out.inputs[0])
scene.compositing_node_group = ng
scene.render.use_compositing = True

scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_depth = "8"

if MODE.startswith("still"):
    f = int(MODE.split(":")[1]) if ":" in MODE else 1
    scene.frame_set(f)
    scene.render.filepath = f"{OUT}/still_{f:03d}.png"
    bpy.ops.render.render(write_still=True)
    print("WROTE", scene.render.filepath)
else:
    scene.render.filepath = f"{OUT}/frame_"
    bpy.ops.render.render(animation=True)
    print("WROTE frames")
bpy.ops.wm.save_as_mainfile(filepath=f"{OUT}/onction_energy_hero{'_day' if DAY else ''}.blend")
