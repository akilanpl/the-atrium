# THE ATRIUM

A procedural 3D multiplayer mystery for 2–4 people. Hide a key in your Clockwork Library, read rivals’ clues, search their universes, and unlock the central portal.

## Run

Requires Node 22.12+ and npm.

```sh
npm ci
npm run dev
```

Open http://localhost:5173. The Colyseus server runs on port 2567. Create a lobby with a nickname, copy the invite, and join from another tab/browser with a different nickname. The host starts with 2–4 players. Development listeners are local only. For staging, use HTTPS/WSS through the reviewed reverse proxy configuration; do not expose either dev port publicly.

Choose Soren or Mara before entering a lobby; Portrait previews the modeled face. Selection is saved locally. WASD moves, Shift runs, the mouse wheel zooms, and R recenters. Hold right mouse and drag to orbit the camera. E inspects the nearest object; in the finale it enters a nearby rival door or unlocks the central portal. The on-screen interaction button also works. Each library has a clock, desk, hollow book, statue, and secret compartment. Interact with the peculiar book along the back wall to slide the shelf aside. In the finale, return using the HUD button.

Preparation lasts 120 seconds or until all rooms are ready. Each exploration round lasts 90 seconds, visiting every rival exactly once. The finale lasts 90 seconds, with explicit hiding-place hints in its second half. All keys are required at the portal. At timeout, keys collected, time of collecting all keys, and original join order break ties. Disconnected players retain their room and count in the match; their secrets remain searchable. The host role transfers. Replay removes disconnected players and clears secrets and keys.

## Checks and short mode

```sh
npm run typecheck
npm test
npm run lint
npm run build
FAST_MODE=1 npm run dev
```

Export variables in your shell; the server does not load `.env` automatically. FAST_MODE is rejected in production.

Short mode uses 1.5s preparation, 2.5s exploration rounds, and a 5s finale. For normal play omit FAST_MODE. `npm run build` outputs the Vite client under `apps/client/dist` and compiled server under `apps/server/dist`. `npm run start -w apps/server` runs the source server with tsx.

Manual browser check: use two tabs, verify names and motion, set different clues, mark both ready, inspect the wrong object, open the hidden shelf, collect one key twice (inventory must remain one), wait for finale, approach center and press E, then replay. In three/four tabs check each round changes owner and never visits your own room.

## Limitations

In-memory sessions disappear on restart. Guest credential admission and a 20-second recovery grace are implemented; persistent accounts and mobile controls are absent. Local synthesized ambience/effects start after a user gesture; Settings controls graphics, volume and mute. Procedural collision uses axis-aligned major furniture and room boundaries; no rigid-body physics. Snapshots are personalized JSON at 20 Hz rather than schema deltas. Production hosting validation, representative load testing and accessibility beyond the HUD remain future work.

The current Colyseus 0.17 dependency audit reports zero known vulnerabilities. Invites, admission grants, seat identities and recovery tokens use cryptographically random 256-bit values; server-only authority gates seat creation.

## Art and assets

The game ships local, licensed human GLBs, PBR surfaces/HDR, scanned library props and original audio. Normal startup does not require Blender, asset accounts or asset downloads. See `docs/ART_DIRECTION.md`, `docs/CHARACTER_PIPELINE.md`, `docs/ASSET_CREDITS.md` and `docs/PERFORMANCE.md` for provenance, rebuilding and measured limits.

## Master Prompt 03 — private admission and release controls

Invites are now server-issued high-entropy links with `#invite=…` fragments, replacing the old six-character query code flow. Create → copy invitation → friend opens or pastes the token → join. Hosts can replace invites, lock joins and kick; kick also replaces the invite. Invites expire after 30 minutes, rooms after one hour. Unexpected disconnects retain the original seat for 20 seconds; refresh uses tab-scoped sessionStorage recovery. Explicit leave/kick/flood ends the session. Preferences remain in localStorage; bearer credentials do not.

Colyseus server/SDK are migrated together to 0.17 with exact versions. Run `npm run release:check` before release. Current audit supersedes earlier dependency notes: zero known npm vulnerabilities at the latest check. See `docs/SECURITY_AUDIT.md`, `SECURITY_ARCHITECTURE.md`, `PRIVACY.md`, `DEPLOYMENT_SECURITY.md`, `INCIDENT_RESPONSE.md` and `PUBLIC_RELEASE_CHECKLIST.md`. Existing historical handoffs describe previous versions. No public hosting is authorized or configured by this change.
