# Performance — milestone 05

Measured locally on macOS arm64 in the Codex in-app browser, 1280×800. Exact Apple chip/RAM were unavailable through permitted system queries; no specific hardware model is claimed. Browser samples are short three-second intervals, not sustained hardware qualification. Six rendering contexts share one machine and compete for resources. Dev server, browser and test processes introduce load variation.

## Rendering evidence

| World, six simultaneous browser renderers, MEDIUM | FPS | Mean ms | p95 ms | Draw calls | Triangles |
|---|---:|---:|---:|---:|---:|
| Shifting Manor | 42 | 24.1 | 37.3 | 65 | 43,523 |
| Astral Observatory | 37 | 26.8 | 48.8 | 76 | 46,777 |
| Sunken Sanctuary | 40 | 25.2 | 44.9 | 82 | 41,967 |
| Clockwork Library | 37 | 27.0 | 44.1 | 171 | 56,392 |
| Tempest Garden | 37 | 27.0 | 43.4 | 76 | 41,409 |
| Polarity Forge | 33 | 30.3 | 51.3 | 62 | 42,603 |

A LOW six-browser/six-avatar Atrium sample measured 38 FPS, 26 ms mean, 38.3 ms p95, 261 calls and 248,140 triangles. One active renderer with six connected participants in Observatory measured 60 FPS, 16.7 ms mean, 18.4 ms p95, 69 calls and 47,071 triangles. That is not a six-renderer Atrium measurement. Raw sample JSON and screenshots are in the milestone handoff.

45–60 FPS is not established for six concurrent renderers or sustained real-world sessions. Architectural/skinned-character draw calls, shadow passes, transparent hair and shader/asset startup remain plausible bottlenecks; no GPU profiler result is available. Measurement ignores dt≥200ms, so these samples exclude long stalls and are not a loading/jank guarantee.

## Networking and memory

Real private-admission socket matches used input commands, timed hiding, all opponent rounds, key collection, portal winner consensus and replay. Loopback only. Values are received application-frame byte counts, excluding TLS/TCP and uplink overhead; short matches are not production capacity limits. RSS is the local server process measurement during the test, not isolated room marginal cost. Test timing varies with local load.

| Players | Rival rounds | Match seconds | Idle B/s/client | Match B/s/client | Server RSS MiB |
|---:|---:|---:|---:|---:|---:|
| 2 | 1 | 8.62 | 7,486 | 10,764 | 104.9 |
| 3 | 2 | 12.90 | 9,651 | 14,076 | 103.3 |
| 4 | 3 | 23.92 | 11,728 | 17,798 | 104.3 |
| 5 | 4 | 22.01 | 13,894 | 22,304 | 105.5 |
| 6 | 5 | 35.64 | 16,049 | 26,895 | 107.2 |

The original four-player WAITING implementation at e651d07 measured 14,954 B/s/client over 5.001 seconds. Current four-player idle measured 11,728 B/s/client (21.6% lower). Simulation remains 20 Hz; personalized snapshots now run at 10 Hz with interpolation. Expanded payloads still repeat static data; schema/delta updates are future work. Six-player match aggregate was 161,368 B/s. Client test-process heap was 20.5 MiB, not browser JS heap. Network synchronization latency/RTT and browser heap were not measured and must not be inferred from loopback match duration.

## Payload and implemented controls

Runtime assets: 25 files, 17,203,689 bytes (16.4 MiB). Latest production main JS is about 1.40 MB / 402 KB gzip; Vite's >500 KB warning remains. Library lazy chunk about 5.37 KB /1.98 KB gzip, shared new-world scenery about 6.59 KB /2.10 KB gzip. Entry modules are lazy but bundling shares their geometry; six independent large scene chunks are not claimed. Actual cold/warm game load duration was not recorded.

Cached GLBs/textures, shared material palette, memoized existing architecture, frustum culling, bounded particles and LOW/MEDIUM/HIGH remain. New server simulation only advances connected loaded instances. Hidden/unfocused pages pause rendering where the browser reports those states; in-app multi-view focus semantics limit how much this helps. No general mesh-merging/instancing/LOD overhaul or next-world asset prefetch was completed. Broad prefetch could worsen this payload without measurement.

Next acceptance: documented hardware, cold/warm load timing, ten-minute six-avatar and multi-room runs, browser heap/GPU profiling, WAN latency and packet capture, then measured draw-call/asset changes. Keep the local-alpha verdict until browser completion and representative sustained runs pass.

## Milestone 06 source investigation

The avatar animation path traversed every cloned model node every frame just to find eyelid morphs. Each shipped GLB has 276 nodes; six avatars at 60 FPS meant about 99,360 node visits/second for this lookup alone, before Three.js adds wrapper objects. Morph target references are now cached once per clone; per-frame work updates the small eyelid list. Animation mixer and transform interpolation retain their original rate and visual behavior. This is a structural CPU-work reduction, not a measured GPU/FPS improvement.

Frame sampling now includes dt≥200ms stalls and can report slow software-renderer samples; earlier 05 numbers excluded those stalls and should not be compared as an equivalent new benchmark. Linux CI uses SwiftShader software WebGL to establish rendering/gameplay correctness. Those numbers are not Apple Silicon or discrete-GPU performance. Separate physical devices were unavailable. Full A/B/C performance records and any blocked metrics are recorded in the 06 handoff; no cross-device or sustained FPS gain is inferred from source optimization.
