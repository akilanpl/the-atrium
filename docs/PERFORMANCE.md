# Rendering and performance

Presets are functional and persist locally. The settings panel also provides master/effects volume and mute. FPS shown in the HUD is sampled from active-tab frame callbacks; it is not a GPU timer or a hardware guarantee.

| Setting         | LOW |   MEDIUM |     HIGH |
| --------------- | --: | -------: | -------: |
| Pixel ratio     |   1 |     1.25 |     1.75 |
| Shadows         | Off | 1024 map | 2048 map |
| Dust points     |  45 |      110 |      220 |
| Fog/draw range  |  55 |       75 |      100 |
| HDR environment | Off |       On |       On |

One directional light casts shadows. Other practical sources use no real-time shadow maps. The renderer uses ACES filmic tone mapping, moderate exposure and native antialiasing. Heavy AO, bloom, motion blur, SSR and true volumetrics are not implemented. Renderer antialias context creation follows the initial quality; changing presets live adjusts the other settings without recreating the whole game.

## Implemented optimizations

- Instanced floor accents and shelf books; shared material palette.
- Memoized architectural decoration avoids rebuilding scene materials on 20 Hz position snapshots.
- Cached local GLBs and HDR; skeleton clones share cached geometry/textures and own materials/mixers.
- Character source morphs baked down to two eyelid targets, with covered skin triangles removed.
- Prop textures resized to 512; surfaces/HDR are 1K. All prepared assets total about 18 MB on disk; character GLBs are approximately 4 MB each.
- Library code is lazy-loaded; loader progress and explicit missing-asset fallbacks are present.
- Remote interpolation, bounded simulation delta, teleport correction and local animation derivation.
- Camera blocker scans are cached briefly; only blocker geometry is raycast, excluding name sprites.
- Motes/FOV motion respect reduced-motion preferences. No external font download is required.

## Actual samples

In-app browser, controlled **1280×800 CSS-pixel** viewport, during development. GPU/hardware identity was not established. These are short active-tab samples, not a sustained benchmark; other tabs and concurrent builds sometimes competed for resources.

| Scene/preset                                                  | Mean FPS | Mean frame | 95th-percentile frame | Main render calls / triangles |
| ------------------------------------------------------------- | -------: | ---------: | --------------------: | ----------------------------: |
| Landing, MEDIUM, portrait preview                             |       60 |    16.6 ms |               25.1 ms |                  453 / 82,498 |
| Landing, LOW                                                  |       60 |    16.6 ms |               20.5 ms |                  453 / 82,498 |
| Landing, HIGH, concurrent development work                    |       43 |    23.3 ms |               27.7 ms |                  453 / 82,498 |
| Two-player atrium, MEDIUM, early sample                       |       49 |    20.6 ms |               40.9 ms |                 188 / 102,804 |
| Final library, MEDIUM, one visible human / two-player session |       60 |    16.7 ms |               17.1 ms |                  146 / 54,630 |

Later medium playtest HUD samples ranged around 50–60 FPS in the atrium and 60 FPS in the library. Portal/material and scene-load transitions can temporarily reduce frame rate. These observations do not establish 45–60 FPS across Apple Silicon models, four-player games or long sessions. A dedicated hardware/latency matrix is still required.

Remaining bottlenecks include architectural draw calls, skinned-character draw calls, transparent hair, shadow passes, shader compilation and large loader/vendor code. Production build still reports a large main-chunk advisory (~404 KB gzip before assets); the separate library chunk is about 2 KB gzip. Further work should prioritize mesh merging/LOD and a repeatable performance run before adding postprocessing.
