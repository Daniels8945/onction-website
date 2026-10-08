"""Miniature energy-infrastructure models for the EcosystemStory map.

Builds three stylised, low-poly assets and exports them as a single GLB:

  Tower        - 330kV double-circuit lattice pylon (legs, bracing, three
                 crossarms a side, insulator strings, earth-wire peak and
                 conductor stubs running along local +/-Y - the line direction).
  Substation   - yard slab, two transformers with radiators and bushings,
                 busbar gantry, breakers and a small control building.
  PowerStation - turbine hall, heat-recovery boiler, exhaust stack and a
                 step-up transformer.

Each model's origin is the centre of its footprint at ground level, so the
web layer can drop it straight onto a map node. Meshes are joined per material
to keep draw calls low. Units are arbitrary: the tower is 1.0 tall and the
yards are ~1.0 across; the web layer scales them.

Run (from the repo root):
  /Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup \
    --python frontend/blender/eco_infrastructure.py -- /tmp/eco-raw.glb [preview_dir]
then weld + quantize into the served file (KHR_mesh_quantization; three.js
decodes it natively, no extra decoder):
  npx @gltf-transform/cli weld /tmp/eco-raw.glb /tmp/eco-w.glb
  npx @gltf-transform/cli quantize /tmp/eco-w.glb frontend/public/models/eco-infrastructure.glb
"""
import math
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "eco-infrastructure.glb")
PREVIEW_DIR = os.path.abspath(argv[1]) if len(argv) > 1 else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


# ── Materials (names are read by the web layer: "Accent*" glows on hover) ──
def material(name, hex_color, rough=0.6, emissive=None):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    c = tuple(int(hex_color[i:i + 2], 16) / 255 for i in (1, 3, 5))
    lin = tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
    bsdf.inputs["Base Color"].default_value = (*lin, 1)
    bsdf.inputs["Roughness"].default_value = rough
    bsdf.inputs["Metallic"].default_value = 0.0
    if emissive:
        bsdf.inputs["Emission Color"].default_value = (*lin, 1)
        bsdf.inputs["Emission Strength"].default_value = emissive
    return m


MAT = {
    "steel": material("Steel", "#d7dee6", 0.5),
    "concrete": material("Concrete", "#8e9aa7", 0.9),
    "building": material("Building", "#dde3e9", 0.7),
    "roof": material("Roof", "#4b5b6c", 0.8),
    "insulator": material("Insulator", "#9fe8df", 0.35),
    "conductor": material("Conductor", "#56636f", 0.5),
    "accent_teal": material("AccentTeal", "#2dd4bf", 0.4, emissive=0.25),
    "accent_amber": material("AccentAmber", "#f5a623", 0.4, emissive=0.25),
}

_parts = {}


def _add(obj, mat_key, group):
    obj.data.materials.append(MAT[mat_key])
    _parts.setdefault(group, []).append(obj)
    return obj


def box(group, mat_key, center, size):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    o = bpy.context.active_object
    o.scale = size
    return _add(o, mat_key, group)


def cyl(group, mat_key, center, radius, depth, verts=12, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=radius, depth=depth, location=center, rotation=rot)
    return _add(bpy.context.active_object, mat_key, group)


def beam(group, mat_key, a, b, r=0.006, verts=4):
    """A thin square-section member between two points."""
    a, b = Vector(a), Vector(b)
    d = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.active_object
    o.rotation_mode = "QUATERNION"
    o.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(d.normalized())
    return _add(o, mat_key, group)


# ── 330kV transmission tower ───────────────────────────────────────────────
def build_tower():
    g = "Tower"
    # Body profile: (height, half-width) from base to peak.
    levels = [(0.0, 0.11), (0.28, 0.07), (0.55, 0.04), (0.62, 0.035), (0.86, 0.03), (0.97, 0.02)]
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1)]

    def pt(level, c):
        z, w = level
        return (c[0] * w, c[1] * w, z)

    # legs
    for c in corners:
        for l0, l1 in zip(levels, levels[1:]):
            beam(g, "steel", pt(l0, c), pt(l1, c), r=0.012)
    # X-bracing on every face, plus horizontal girts
    for i in range(4):
        c0, c1 = corners[i], corners[(i + 1) % 4]
        for l0, l1 in zip(levels[:4], levels[1:5]):
            beam(g, "steel", pt(l0, c0), pt(l1, c1), r=0.006)
            beam(g, "steel", pt(l0, c1), pt(l1, c0), r=0.006)
        for l in levels[1:]:
            beam(g, "steel", pt(l, c0), pt(l, c1), r=0.006)
    # earth-wire peak
    beam(g, "steel", (-0.02, 0, 0.97), (0, 0, 1.0), r=0.005)
    beam(g, "steel", (0.02, 0, 0.97), (0, 0, 1.0), r=0.005)

    # Three crossarms a side (double circuit, vertical phase arrangement).
    # Arms run along X; conductors run along Y (the line direction).
    arms = [(0.86, 0.22), (0.74, 0.27), (0.62, 0.22)]
    for z, reach in arms:
        for s in (-1, 1):
            tip = (s * reach, 0, z)
            beam(g, "steel", (s * 0.03, -0.022, z), tip, r=0.009)
            beam(g, "steel", (s * 0.03, 0.022, z), tip, r=0.009)
            beam(g, "steel", (s * 0.03, 0, z - 0.05), tip, r=0.0035)  # arm brace
            # insulator string
            cyl(g, "insulator", (s * reach, 0, z - 0.04), 0.016, 0.07, verts=8)
            # conductor stubs leaving the clamp in both line directions, sagging
            y0, zc = 0.0, z - 0.08
            for d in (-1, 1):
                beam(g, "conductor", (s * reach, y0, zc), (s * reach, d * 0.22, zc - 0.012), r=0.005, verts=6)
                beam(g, "conductor", (s * reach, d * 0.22, zc - 0.012), (s * reach, d * 0.42, zc - 0.006), r=0.005, verts=6)
    # earth wire
    for d in (-1, 1):
        beam(g, "conductor", (0, 0, 1.0), (0, d * 0.42, 0.985), r=0.0025, verts=6)
    # footings
    for c in corners:
        box(g, "concrete", (c[0] * 0.11, c[1] * 0.11, 0.008), (0.035, 0.035, 0.016))


# ── Transmission substation ───────────────────────────────────────────────
def build_substation():
    g = "Substation"
    box(g, "concrete", (0, 0, 0.012), (1.0, 0.72, 0.024))  # yard slab
    # perimeter fence: posts + top rail
    hw, hd, fz = 0.49, 0.35, 0.06
    for x0, y0, x1, y1 in [(-hw, -hd, hw, -hd), (hw, -hd, hw, hd), (hw, hd, -hw, hd), (-hw, hd, -hw, -hd)]:
        beam(g, "steel", (x0, y0, 0.024 + fz), (x1, y1, 0.024 + fz), r=0.003)
        n = 8
        for k in range(n):
            t = k / n
            x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
            beam(g, "steel", (x, y, 0.024), (x, y, 0.024 + fz), r=0.003)

    # two power transformers with radiator fins and three HV bushings each
    for ty in (-0.15, 0.15):
        tx = -0.24
        box(g, "accent_teal", (tx, ty, 0.024 + 0.065), (0.17, 0.12, 0.13))
        for k in range(5):
            box(g, "roof", (tx - 0.065 + k * 0.032, ty - 0.075, 0.024 + 0.055), (0.012, 0.03, 0.1))
        for k in (-1, 0, 1):
            cyl(g, "insulator", (tx + k * 0.05, ty + 0.02, 0.024 + 0.13 + 0.035), 0.009, 0.07, verts=8)

    # busbar gantry: two portal frames with three busbars between them
    gx0, gx1, gz = 0.02, 0.4, 0.24
    for gx in (gx0, gx1):
        for gy in (-0.24, 0.24):
            beam(g, "steel", (gx, gy, 0.024), (gx, gy, gz), r=0.007)
        beam(g, "steel", (gx, -0.24, gz), (gx, 0.24, gz), r=0.007)
    for py in (-0.12, 0, 0.12):
        beam(g, "conductor", (gx0, py, gz - 0.025), (gx1, py, gz - 0.025), r=0.005, verts=6)
        # breakers / disconnectors below each bus
        for bx in (0.11, 0.21, 0.31):
            cyl(g, "insulator", (bx, py, 0.024 + 0.05), 0.012, 0.1, verts=8)
            box(g, "steel", (bx, py, 0.024 + 0.105), (0.03, 0.03, 0.012))
    # incoming line drops from the gantry
    for py in (-0.12, 0, 0.12):
        beam(g, "conductor", (gx1, py, gz - 0.025), (0.5, py, gz + 0.02), r=0.004, verts=6)

    # control building
    box(g, "building", (-0.32, -0.0, 0.024 + 0.04), (0.12, 0.08, 0.08))
    box(g, "roof", (-0.32, -0.0, 0.024 + 0.085), (0.13, 0.09, 0.012))


# ── Power station (gas-fired combined cycle) ─────────────────────────────
def build_power_station():
    g = "PowerStation"
    box(g, "concrete", (0, 0, 0.012), (1.0, 0.72, 0.024))
    # turbine hall
    box(g, "building", (-0.15, 0.08, 0.024 + 0.1), (0.42, 0.26, 0.2))
    box(g, "roof", (-0.15, 0.08, 0.024 + 0.205), (0.44, 0.28, 0.014))
    # heat-recovery steam generator
    box(g, "building", (0.2, 0.08, 0.024 + 0.14), (0.2, 0.2, 0.28))
    box(g, "roof", (0.2, 0.08, 0.024 + 0.285), (0.21, 0.21, 0.012))
    # exhaust stack with an amber band
    sx, sy = 0.36, 0.08
    cyl(g, "building", (sx, sy, 0.024 + 0.3), 0.05, 0.6, verts=20)
    cyl(g, "accent_amber", (sx, sy, 0.024 + 0.53), 0.053, 0.06, verts=20)
    cyl(g, "roof", (sx, sy, 0.024 + 0.605), 0.054, 0.012, verts=20)
    # step-up transformer + gantry out to the grid
    box(g, "accent_amber", (-0.25, -0.22, 0.024 + 0.05), (0.13, 0.09, 0.1))
    for k in (-1, 0, 1):
        cyl(g, "insulator", (-0.25 + k * 0.04, -0.22, 0.024 + 0.1 + 0.025), 0.007, 0.05, verts=8)
    for gx in (-0.05, 0.25):
        beam(g, "steel", (gx, -0.24, 0.024), (gx, -0.24, 0.2), r=0.006)
    beam(g, "steel", (-0.05, -0.24, 0.2), (0.25, -0.24, 0.2), r=0.006)
    # fuel/pipe rack
    beam(g, "roof", (0.05, -0.08, 0.06), (0.45, -0.08, 0.06), r=0.01, verts=8)


build_tower()
build_substation()
build_power_station()

# Join each model's parts per material and parent them under one empty.
roots = []
for group, parts in _parts.items():
    root = bpy.data.objects.new(group, None)
    scene.collection.objects.link(root)
    by_mat = {}
    for o in parts:
        by_mat.setdefault(o.data.materials[0].name, []).append(o)
    for mat_name, objs in by_mat.items():
        bpy.ops.object.select_all(action="DESELECT")
        for o in objs:
            o.select_set(True)
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
        if len(objs) > 1:
            bpy.ops.object.join()
        joined = bpy.context.active_object
        joined.name = f"{group}_{mat_name}"
        joined.parent = root
    roots.append(root)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    use_selection=True,
    export_apply=True,
    export_yup=True,
    export_texcoords=False,
    export_normals=False,  # shaded flat in the browser (flatShading), so normals are dead weight
    export_cameras=False,
    export_lights=False,
)
print(f"Exported {OUT} ({os.path.getsize(OUT) / 1024:.1f} KB)")

# Optional: a quick 3/4-view preview render of each model for review.
if PREVIEW_DIR:
    os.makedirs(PREVIEW_DIR, exist_ok=True)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.film_transparent = True
    scene.render.resolution_x = scene.render.resolution_y = 512
    world = bpy.data.worlds.new("W")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.05, 0.09, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    scene.world = world
    sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
    sun.data.energy = 3.5
    sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    scene.collection.objects.link(sun)
    cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
    cam.data.type = "ORTHO"
    scene.collection.objects.link(cam)
    scene.camera = cam
    for i, root in enumerate(roots):
        for j, r in enumerate(roots):
            r.location = (0, 0, 0) if j == i else (100, 100, 0)
        cam.data.ortho_scale = 1.3 if root.name == "Tower" else 1.25
        target = Vector((0, 0, 0.5 if root.name == "Tower" else 0.12))
        cam.location = target + Vector((2.2, -2.6, 1.6))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(PREVIEW_DIR, f"{root.name}.png")
        bpy.ops.render.render(write_still=True)
    print("Previews written to", PREVIEW_DIR)
