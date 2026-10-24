# THE ATRIUM

A local playable alpha for 2–6 guests: six private fantasy universes, server-simulated movement and mechanisms, hidden keys, rival rotation and a central portal race. The six worlds have working mechanics and original procedural architecture; the newer scenes are not finished photorealistic artwork.

## Run

Requires Node 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. Backend: localhost:2567. Choose Soren or Mara, create a private lobby, copy its invitation, and join from another tab/browser with a different nickname. The host starts with 2–6 people. Listeners remain local; do not expose development ports publicly.

WASD moves, Shift runs, Space jumps/ascends, C descends underwater, E interacts with the reticle target. Hold E for at least 0.6 seconds at an approved anchor to hide your key. Hold right mouse and drag to orbit; arrow keys also aim the camera. Wheel zooms, R recenters, Escape opens settings. Text fields suspend movement shortcuts. Optional navigation aids show coordinates and heading.

Preparation lasts 120 seconds or until everyone seals. Explore your assigned world, test its mechanism, hide a key, optionally change three snapped decorative props/two decoys, write a clue and seal. Each 90-second exploration round visits one different rival. Six players receive five rounds. Finale is 90 seconds: revisit rivals using their doors, collect all N−1 keys, then physically approach and interact with the central portal. The first valid portal activation wins. After a capped 45-second overtime, a unique connected positive-key leader can win by progress; tied/empty inventories draw. No join-order winner. Replay clears match state and reshuffles assignments.

See [gameplay and six-world guide](docs/GAMEPLAY.md), [registry](docs/UNIVERSES.md), [physics](docs/PHYSICS.md), [architecture](docs/ARCHITECTURE.md), [test matrix](docs/TEST_MATRIX.md), [performance](docs/PERFORMANCE.md), [security audit](docs/SECURITY_AUDIT.md), [asset credits](docs/ASSET_CREDITS.md), and [deployment requirements](docs/DEPLOYMENT_SECURITY.md).

## Validation

```sh
npm run release:check
npm run typecheck:browser
npm run browser:install
npm run test:browser
```

Release check runs frontend/backend TypeScript, ESLint, both production builds, server/game/physics/real-socket tests, bounded secret scanning and dependency audit. Playwright is a separate explicit gate, not silently counted as passing by release:check. Its five tests cover player counts 2–6 using real UI input. This machine could not launch Chromium (macOS Mach-port permission denial); the full browser match matrix remains unverified. The in-app browser loaded all six worlds with six clients and observed draw/replay, but did not complete a key-to-portal human match.

Export server variables in the shell; `.env` is not automatically loaded. `FAST_MODE=1 npm run dev` is a very short non-production smoke mode. Non-production `PREPARATION_MS`, `EXPLORATION_MS`, `FINALE_MS` accept 1000–300000 ms. Normal play should use defaults. Production disallows test timing configuration.

## Release limits

In-memory rooms disappear on restart; no accounts/database/mobile controls. Recovery retains a seat for 20 seconds. Personalized JSON snapshots run at 10 Hz, simulation at 20 Hz, with client interpolation and no prediction. Physics uses swept axis-aligned collision and constrained mechanisms, not general rigid bodies. All approved anchors pass bounded simulation/controller tests; balance and complete browser playability still require human testing. Six simultaneous browser renderers measured 33–42 FPS in short samples; sustained target-hardware 45–60 FPS is not established. No staging/public deployment has been validated or authorized.

Source was previously pushed to the private GitHub repository on `development` at `e651d07e3d9670109121d6c95083c797015ff5de`. Milestones 05/06 are preserved on feature branch feat/six-player-browser-readiness in draft PR #1; consult current CI before release. Invitations are server-issued 256-bit fragment links, expiring/revocable and subject to host lock/kick. Credentials stay in tab-scoped sessionStorage, not localStorage. No analytics or external AI service is added.
