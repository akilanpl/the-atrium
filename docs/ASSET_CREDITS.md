# Asset credits and usage rights

All shipped game assets load from local `/assets/` paths. No model or texture depends on a third-party runtime hotlink. Library meshes/code and project-authored architecture are separate from third-party asset licenses.

## Human models, clothing, hair and source animations — CC0-1.0

Source: [CharacterCreator output assets by Kasper Olesen](https://github.com/kblood/CharacterCreator/tree/852e48f316b90a0937234886630e4fb4cdfd1f78/output), derived from the MakeHuman/MPFB system asset pack. Original MakeHuman data credits include Data Collection AB, Joel Palmius, Jonas Hauquier and the MakeHuman contributors.

Integrated source files: `base_body_anim.glb`, `clothing_shirt.glb`, `clothing_jeans.glb`, `clothing_boots.glb`, `hair_short02.glb`, `hair_bob02.glb`. The body includes skin, eyes, eyebrows, eyelashes, teeth and tongue. Runtime derivatives are `soren.glb` and `mara.glb`.

The upstream [generated-file license statement](https://github.com/kblood/CharacterCreator/blob/852e48f316b90a0937234886630e4fb4cdfd1f78/LICENSE-NOTES.md#generated-files-owner-decision-2026-10-03) explicitly dedicates these generated GLBs, their morphs/textures, and procedural animation data to CC0. The generator’s GPL code is **not** copied or loaded. A source-license snapshot and per-asset catalog are retained under `docs/licenses/`. Model processing and the turn/reach/celebration animation additions were authored for this project.

## Poly Haven models — CC0-1.0

Verified under [Poly Haven’s asset license](https://polyhaven.com/license), which permits commercial use, modification and redistribution. Models were fetched at 1K texture resolution, packaged as self-contained GLBs and resized to 512-pixel textures for runtime.

| Local file             | Asset/source                                                                         | Artist                                                  |
| ---------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `props/clock.glb`      | [Vintage Grandfather Clock 01](https://polyhaven.com/a/vintage_grandfather_clock_01) | James Ray Cock (model/textures), Yann Kervran (rigging) |
| `props/bust.glb`       | [Marble Bust 01](https://polyhaven.com/a/marble_bust_01)                             | Rico Cilliers                                           |
| `props/chandelier.glb` | [Lantern Chandelier 01](https://polyhaven.com/a/lantern_chandelier_01)               | Kirill Sannikov                                         |

The clock source binary initially arrived from a stale CDN cache; the hash-checked source URL includes a cache query. No truncated geometry is shipped.

## Poly Haven surfaces and HDR — CC0-1.0

| Local files                                 | Source                                                               |
| ------------------------------------------- | -------------------------------------------------------------------- |
| `materials/marble-{color,normal,rough}.jpg` | [Marble 01](https://polyhaven.com/a/marble_01)                       |
| `materials/wood-{color,normal,rough}.jpg`   | [Wood Table Worn](https://polyhaven.com/a/wood_table_worn)           |
| `materials/stone-{color,normal,rough}.jpg`  | [Stone Wall 02](https://polyhaven.com/a/stone_wall_02)               |
| `materials/palace.hdr`                      | [Brown Photostudio 02](https://polyhaven.com/a/brown_photostudio_02) |

Source/publisher: Poly Haven and its contributing artists. Individual author names for these four items were not exposed by the retrieved metadata; the linked asset pages retain current attribution. Surface maps and HDR are 1K. Color maps use sRGB; normal and roughness maps remain linear. No displacement maps are included.

## Original audio

`audio/{stone,wood,key,mechanism,portal,tick,victory,hall,library,door}.wav` were synthesized specifically for this project by `scripts/make-audio.py`, using deterministic wave/noise synthesis and no third-party recordings. The script dedicates these generated WAV files to CC0. There is no licensed music or franchise audio.

## Tooling

Three.js and its loaders/SkeletonUtils: MIT. React, Drei/R3F and glTF Transform retain their package licenses. `sharp` is an offline development dependency used for prop-texture resizing. Asset license verification is distinct from software-library licensing; no Mixamo/marketplace/celebrity model is bundled.
