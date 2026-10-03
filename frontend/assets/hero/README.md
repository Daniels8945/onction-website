# Homepage hero — 3D energy landscape

A seamless 10-second loop (240 frames, 24 fps) rendered in Blender 5.2 (Eevee)
from `source/energy_hero.py`. The scene tells the same story as `/how-we-trade`:
hydro, gas, wind and solar generation → Onction's trading hub → transmission
lines carrying energy pulses → city and industry → a local substation and a
distribution line on wooden poles feeding a small residential community, with
streetlights and cars on the road in front. Brand navy/teal.

The loop is seamless by construction: turbine blades turn a whole number of
times, the hub ring turns once, the camera drifts on a sine, the pulses wrap
along the cables, and each car completes exactly one lap of a road that runs
well past both edges of the frame (so the wrap happens off-screen).

| File | Use |
| --- | --- |
| `energy-landscape-1920.{webm,mp4}` | Desktop (`>900px`) |
| `energy-landscape-1280.{webm,mp4}` | Phones and small tablets |
| `energy-landscape-poster.jpg` | First frame: shown before playback, and as the only image for reduced motion or Save-Data |
| `energy-landscape-day-*` | The same set, lit as daytime (`--day`) |

In the hero these sit **over** the approved slide photography, not instead of
it: the loop is feathered in from the right (from below on phones), screen-
blended at night so only its light rides over the photo. Day vs night follows
the visitor's local time (06:00–18:00 = day) unless they pick one with the
toggle in the hero; the choice is remembered (`src/motion/sceneMode.js`).

## Re-rendering

```sh
# preview a single frame at half resolution
/Applications/Blender.app/Contents/MacOS/Blender -b --python source/energy_hero.py -- still:1 /tmp/hero
# full loop → PNG frames (≈ 8 min on an M2 Pro); add --day for the daytime set
/Applications/Blender.app/Contents/MacOS/Blender -b --python source/energy_hero.py -- anim /tmp/hero/frames
/Applications/Blender.app/Contents/MacOS/Blender -b --python source/energy_hero.py -- anim /tmp/hero/frames_day --day
```

Encode the frames with ffmpeg (H.264 CRF 27 `+faststart`, VP9 CRF 38) at 1920
and 1280 widths, and export frame 1 as the poster JPEG.
