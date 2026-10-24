# Milestone 05 test matrix and manual reproduction

Baseline: npm ci and npm run release:check passed with 19 tests before implementation. Updated release gate includes gameplay, admission, transport, presentation, physics and multi-player integration. Final counts are recorded in the handoff. Browser tests are a separate unpassed gate.

| Players | Unique assignments | Opponent rounds | Keys/portal/replay over real sockets | Browser complete-match suite |
|---|---|---|---|---|
| 2 | passed | 1 | passed | implemented; launch blocked |
| 3 | passed | 2 | passed | implemented; not executed |
| 4 | passed | 3 | passed | implemented; not executed |
| 5 | passed | 4 | passed | implemented; not executed |
| 6 | passed | 5 | passed | implemented; not executed |

The multi-player integration uses real private HTTP admission/Colyseus connections, bounded input, server-timed hiding, ready clues, all rival rounds and physical portal proximity. It does not teleport clients or directly award keys. Physics tests independently exercise all six worlds and 30 anchors under actual solver input. Protocol checks include seventh-seat denial, invalid/expired/revoked invitations, bad Origin, cross-room recovery, host handoff, oversized/flood traffic, stale input epoch/sequence, forged position/winner and duplicate-key behavior. Recovery coverage is local protocol testing, not an exhaustive browser refresh in every phase.

## Browser evidence

Six in-app browser clients created/joined a private lobby, displayed six identities/avatars, started a match, received unique universes, loaded all six scenes, reached tied zero-key results and replayed. Screenshots and three-second frame samples were saved. That exercise did not prove browser key collection or portal completion. A subsequent two-client complete-playthrough attempt stopped when local browser control became disabled in Work settings.

Playwright tests/browser/matches.spec.ts has five UI scenarios for 2–6 players: avatar/admission, preparation, targeted hiding, mechanism/config/prop confirmation, clues/sealing, every rotation, keys and duplicate attempts, portal winner and replay. Browser TypeScript and discovery are checked. Chromium downloaded successfully but launch failed before test actions with macOS bootstrap_check_in Mach-port Permission denied (1100)/SIGTRAP. Do not interpret this as a gameplay pass or a known application failure.

## Run on an authorized machine

```sh
npm ci
npm run release:check
npm run typecheck:browser
npm run browser:install
npm run test:browser
```

Linux runners may need `PLAYWRIGHT_BROWSERS_PATH=./work/playwright-browsers npx playwright install --with-deps chromium`. Tests own localhost 5174/2572 and use non-production timers, no application state injection. Inspect work/05-playwright-results.json and work/browser-artifacts; resolve actual failures before treating the suite as an acceptance gate. No CI browser result is claimed.

## Reproducible manual acceptance

1. Open 2 independent browser profiles/tabs at localhost:5173; select distinct names/avatars and join with the host invitation. Repeat with 3, 4, 5 and 6; verify seventh denial and sealed inactive doors.
2. Start. Note unique world IDs. In each world test its guide mechanic, move/jump/swim to each anchor and return safely. Aim the reticle, hold E, confirm selected anchor, change a prop with preview/confirm/cancel/undo/reset, set variant/decoys/clue and seal. Try editing after seal: reject.
3. Seek each rival in every round. Verify no self/repeat, actual clue, blocked LOS/range rejection, final-anchor mechanism requirement, one key maximum per rival, and three-second solved-round countdown.
4. In finale, deliberately leave one missing key, revisit its door and collect. Return, approach portal and activate. All clients must show the same winner; empty/tied timeout must draw. Replay must clear all old data.
5. Refresh/drop a client in each phase within 20 seconds, then after expiry; check original seat/no duplicate keys. Disconnect host and verify transfer. Test separate private rooms and invite rotation/lock/kick.
6. Repeat LOW/MEDIUM/HIGH and sustained ten-minute six-avatar rendering on documented hardware. Record loading time, frame p95, memory, websocket bandwidth and end-to-end latency. Capture console errors and screenshots.

Until those full-browser checks pass, release verdict is LOCAL PLAYABLE ALPHA.
