# Human character pipeline

Runtime assets: `apps/client/public/assets/characters/soren.glb` and `mara.glb`. Both are self-contained glTF 2.0 binaries with PBR textures, 53 ordered joints, fitted shirt/jeans/boots, hair, modeled face/eyes, and two eyelid targets. They share an underlying body and skeleton; baked facial morphs and different hair provide distinct presets. Selection persists locally and the server validates/replicates the preset ID.

## Rebuild

Prepared assets ship with the project; normal installation needs no asset downloads or Blender. Optional regeneration uses Python 3, the installed development dependencies, and network access:

```sh
python3 scripts/fetch-assets.py
node scripts/prepare-characters.mjs
node scripts/prepare-props.mjs
python3 scripts/make-audio.py
npm test
```

`assets-manifest.json` pins character source commit `852e48f316b90a0937234886630e4fb4cdfd1f78` and SHA-256 hashes for every fetched file. Fetching stops when a source hash differs. Original character sources are staged in ignored `work/character-source/`. The character preparation script uses glTF Transform to dequantize/bake chosen facial targets, retain eyelids, mask body triangles covered by garments, merge assets, and bind every garment/hair mesh to the exact same ordered skeleton. It rejects mismatched joint orders; it does not silently retarget an incompatible rig. No upstream generator/runtime code is included.

## Animation contract

Included upstream procedural clips: `idle`, `idle_breathe`, `idle_look`, `walk`, `run`. Additional project-authored skeletal clips: `interact`, `turn`, `celebrate`. Authored one-shots retain the full idle pose on unaffected joints so limbs do not return to a bind pose. `celebrate` is bundled for future use; the results screen currently supplies victory presentation rather than triggering that clip.

`Character.tsx` clones skeletons through Three.js SkeletonUtils, owns an AnimationMixer per visible human, cross-fades actions, turns toward movement, derives remote locomotion from replicated speed/position, and plays interaction one-shots from server-issued action sequence numbers. Idle/start/walk/run/stop/turn/interact states are selected locally. Start/stop use speed ramps and walk/idle blending rather than dedicated motion-capture clips. The walk/run playback baselines (1.59 / 2.11 metres per second) were estimated from each source foot’s forward travel and cycle duration at the rendered scale. Walk/run controller speeds are 1.65 / 3.8 m/s. This reduces sliding but does not provide foot locking or IK.

The authoritative protocol adds `avatar`, derived `motion`, derived `speed`, and an interaction `action` counter. Clients still request positions, facing and interactions; they cannot grant keys or claim victory. Cosmetic facial motion remains local. Missing models show an explicit unavailable label; asset failures do not replace the human with a disguised primitive.

## Lifecycle and future presets

Cached geometry/textures are shared. Instance materials, mixers and skeleton resources are released on unmount; shared loader-cache geometry is preserved. Blink target names are `blink_left` and `blink_right`. Add a preset to shared `AVATARS`, validate its license, produce a compatible GLB, and run rig/animation/lifecycle tests. New skeleton families require an explicit offline retarget step and visual verification of hand/foot contact; no general-purpose runtime retargeter is implemented.
