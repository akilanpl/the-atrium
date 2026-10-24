# THE ATRIUM — Master Prompt 07 implementation handoff

Date: 24 October 2026. Release verdict: **development review build; full cinematic milestone NOT accepted**.

This delivery changes the playable game. It is an incremental presentation overhaul, not an AAA-equivalent result. Authored environment art, full cinematic event direction, and complete browser acceptance remain outstanding.

## Baseline and preservation

The current game was found at `/Users/akilan/Documents/Codex/2026-10-23/files-pasted-by-the-user-master`, HEAD `943d5d6`. Its working tree was clean when inspected. It already contained six-world physics, reconnection, security, browser tests and a separate promotional scroll journey. The actual baseline was **46 automated tests**, rather than the older reported 41. An older game copy had only the Library and was not used.

Source was copied into this chat's `work/game` before editing because the source chat was active. The original checkout and its local work were not changed. No push, deployment, visibility change, or external asset download was performed. The complete source archive excludes dependencies, credentials, build products and scratch work. It retains existing asset licenses and source documentation.

## A. Visual architecture before / after

Before: largely shared lighting, a flat portal disk, duplicate door decoration, bare colored physics blocks, snapshot-driven world mechanisms, and walking clips used during non-ground movement.

After: per-world lighting/fog palettes; frame-driven ornamental motion; bounded particles; original procedural portal shader; distinct colored door crests with proximity response; stone/wood/metal physics-object surfaces and edge trim. Gameplay solids and network state remain unchanged. `LivingWorld`, `DoorCrest`, `PortalVeil`, `Rewards`, `presentation`, and `Cinematic` separate visual behavior from authority.

The existing scroll journey source is preserved but no longer appears on first launch. The actual 3D game menu is the entry point.

## B. Character animation

Retained the two existing skinned GLBs and clip crossfades. Remote locomotion follows observed rendered displacement, preventing stale replicated speed from inventing running. Teleports suppress computed displacement speed. Added smoothed speed, airborne body tilt, a brief landing compression, swimming tilt, and bounded additive arm/leg poses layered after the mixer. Prior overlays are removed before the next mixer update. Avatar changes reset the active animation reference; missing clips use the first available action rather than blindly dereferencing an absent action. Preview camera has a slow turntable arc, with reduced-motion support.

These are procedural fallback poses, **not new authored swim/jump/landing clips**. There is no foot IK, cloth simulation, root-motion retargeting, or validated anatomical swim stroke. Animation direction and foot sliding still need sustained visual review.

## C. Grand Atrium

Retained its existing dome, arcade, six doors, columns, floor and chandelier. Added a moving portal veil, gradual inventory-based energy intensity, finished-state portal response, original per-world crests and proximity highlights. Corrected the dome's interior-facing material and disposed its locally created tile material on unmount. Doors still share most structural geometry; six independently authored physical door designs are unfinished.

## D. Six-universe matrix

| Universe | Added presentation | Retained authoritative behavior | Remaining art gap |
|---|---|---|---|
| Clockwork Library | Warm world palette, ambient overlay | Shelves, clocks and library puzzle | Most geometry predates this delivery |
| Astral Observatory | Celestial arcades, oscillating brass rings, point star field, stone platform finishes | Low gravity / moving platforms | Telescope/instrument assets and authored landing clips |
| Sunken Sanctuary | Aquatic lighting/fog, drift, subtle floor shimmer, perimeter architecture, swim pose | Buoyancy, drag and currents | Coral remains primitive; shimmer is not true caustics |
| Polarity Forge | Metal arcade supports, trim, world ambience and warmer lighting | Attraction/repulsion and carriage | Heavy machinery still visibly simplified |
| Shifting Manor | Wooden/brass wall paneling, architectural frame and surface treatment | Moving walls use original solids | Furniture, paintings and ceiling detail |
| Tempest Garden | Swaying hanging ornaments, stone arcade and atmospheric palette | Gusts, vane, turbine and platforms | Trees remain low-detail; no authored cloudscape |

New ornaments sit outside or beside the established play space and do not authorize movement or change collision solids. Existing registry-driven physics meshes retain their dimensions. Surface trim is cosmetic.

## E. Cinematic sequences

Added a six-second eased in-engine menu camera reveal, title caption, Escape/button skip, session-based introduction suppression, and brief phase/world captions for gathering, preparation, exploration, finale and victory. Reduced motion shortens caption duration and freezes optional ambient motion. The server never waits for these sequences.

World/round/replay identity includes epoch, owner, phase and round, ensuring camera/motor reset at boundaries. The existing asynchronous scene-loading fallback remains.

Missing: dedicated door opening choreography, a preloaded fade-through-black world transition, per-world establishing camera shots, puzzle/key event framing, a fully directed synchronized victory sequence and replay cinematic. Captions do not substitute for these requirements.

## F. Effects

Original radial portal shader with charge-dependent color/opacity, independently animated door sigils, and a short bounded ring burst after an authoritative local key-count increase. Replay epoch changes suppress stale key bursts. No per-particle networking or client victory messages were added. Full key-rise/reveal choreography, portal energy streams, and mechanism-specific effect design remain unfinished.

## G. Camera

Smooth camera recentering replaces an abrupt recenter angle assignment. Collision probe offsets now follow the camera's horizontal right vector. World/epoch changes place the camera at its resolved destination immediately rather than interpolating through the previous room. Existing server-driven motor position, pitch limits, orbit, distance and FOV behavior remain intact.

## H. Audio

Five original, low-volume synthesized looping ambience files were added, with a reproducible generator. Existing user-gesture unlock, mute and volume controls remain. Ambience now follows the actual world. Ground footsteps are suppressed during airborne and underwater movement. No new third-party audio license is needed. Audio output was not auditioned; positional zones and distinct door-proximity ambience are unfinished.

## I. Performance and evidence limits

The earlier user-reported 33–42 FPS measurements are not comparable to the following samples. No matched before/after hardware benchmark was completed.

Observed in the in-app browser, short windows:

| Scenario | Quality | FPS | Average frame | P95 | Draw calls | Triangles |
|---|---|---:|---:|---:|---:|---:|
| Live Atrium, one browser renderer, six connected players (five socket guests) | MEDIUM | 60 | 16.7 ms | 17.2 ms | 199 | 247,040 |
| Authoring Observatory, no live match | MEDIUM | 59 | 16.9 ms | 18.2 ms | 91 | 21,044 |
| Authoring Atrium | HIGH | 59 | 16.9 ms | 20.5 ms | 219 | 33,264 |

Preview measurements are authoring fixtures, not multiplayer performance. Other observed world-preview samples ranged roughly 42–60 FPS and included scene-loading changes; they are not stable benchmarks. Multiple simultaneous browser tabs caused a stall and a transient 4 FPS sample. That attempt did not complete six-browser acceptance. No supported-hardware 45–60 FPS guarantee is made. Texture/heap memory, long sessions, animation/physics cost breakdown and a complete per-quality/world network benchmark remain unmeasured.

Optimization: replaced 60 separate Observatory star meshes with a bounded point field; quality scales the new particle count; overlays reuse existing rigs/mixers; event particles stay client-local. Added arcades and trim increase geometry/draw calls; further profiling is required. The build still reports a large main chunk warning.

## J. Multiplayer and security

No server, shared physics, admission, invite, origin-check, key validation, movement authority, inventory, replay, or victory implementation was modified. Real socket tests and privacy/security tests passed. Six connected clients were observed in the host's actual game UI. A two-browser lobby, join and preparation transition were manually verified. A six-browser match and complete visual victory/replay were not verified.

## K. Actual validation

- Baseline: 46/46 automated tests passed after resolving the local sandbox network restriction and workspace dependency links.
- Final: **50/50 automated tests passed**, including real socket matches, security, navigation/physics and four new presentation tests.
- Client/server typecheck, browser-test typecheck, ESLint, and production build passed.
- Bounded security source/build scan passed.
- Dependency audit reported **0 vulnerabilities**.
- Standalone Playwright Chromium aborted on macOS (`SIGABRT`); its browser test is failed, not passed. See `browser-results.txt`.
- The in-app browser successfully rendered the actual game menu, Atrium, two-player preparation and Sanctuary. No captured warning/error console entries in those checks.
- Reviewed actual component renders for all six environments in the explicitly labeled development authoring viewer. Saved previews are not gameplay-completion evidence.
- Updated existing Linux CI browser matrix for direct game entry and added `art-review` screenshots at LOW/MEDIUM/HIGH. These new CI jobs are **configured, not executed**; no source was pushed.

Three reviewed weaknesses prompted improvements: a flat portal became an animated veil; identical crests gained world-specific geometry/color/proximity response; bright untextured mechanism blocks gained material surfaces and edge trim. Subsequent review still found low-detail vegetation, coral and furniture; these remain art-production work.

## L. Remaining limitations and acceptance gates

The full requested definition of done is **not met**. Outstanding work includes authored architectural/prop assets for five worlds, six distinct physical doors, high-quality swim/jump/landing clips, complete camera collision acceptance, true scene transition choreography, mechanism/reveal effects, a synchronized directed finale, audio audition, full six-browser match completion, all-world physics interactions checked visually, key/victory screenshots, long-session cleanup and supported-device performance profiling. No missing reference image was fabricated or substituted for the supplied atmospheric reference.

## M. Exact startup

Extract `the-atrium-cinematic-source.zip`, enter its `the-atrium/` directory, and use Node 24:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173`. The server uses port 2567 and the default exact development origins. Two to six players can join through private invitations. Do not reuse the old local test invite shown in transient screenshots; those review clients were disposable.

For development art inspection only, open `http://127.0.0.1:5173/?visual-audit`. The query path is gated behind `import.meta.env.DEV` and does not replace multiplayer snapshots or authorize gameplay.

Validation:

```sh
npm run typecheck
npm run typecheck:browser
npm run lint
npm run build
npm test
npm run security:scan
npm audit --audit-level=high
npm run browser:install
npm run test:browser
```

On Linux with Mesa, use the included CI workflow's Xvfb command and browser environment. macOS standalone Chromium remains blocked here. If the `tsx` CLI cannot create its IPC pipe in a sandbox, the equivalent successful local test command was `node --import tsx --test apps/server/src/*.test.ts`.

## N. Release verdict

Suitable for development review and continuation. **Not ready to claim the requested AAA-inspired cinematic milestone or public release acceptance.** The source preserves the six-player authoritative foundation while adding reusable presentation infrastructure and visible improvements. Release requires the outstanding asset, cinematic, browser and performance gates above.
