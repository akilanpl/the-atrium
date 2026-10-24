# Security audit — 24 October 2026

Initial audit, recorded before security changes. Scope: Express HTTP ingress, Colyseus matchmaking and upgrade transport, all seven gameplay messages, Game state, React admission/rendering, shared collision rules, npm lockfile and local assets. No database, accounts, analytics or external runtime asset service exists.

## Existing protections
Server controls phases, rotations, proximity, key deduplication and victory. Snapshots select a recipient clue and omit secret anchors. React renders text nodes. Static geometry collision samples movement segments. Assets are local. These are useful controls, not proof of security.

## Boundaries and surfaces
Browser input is untrusted, including player identity fields, invites, all messages and positions. Express and WebSocket upgrade are separate ingress boundaries. Colyseus matchmaking is publicly reachable unless separately denied. Session IDs and internal room IDs are identifiers, not credentials. Socket admission must authorize the actual room. Local process memory contains clues, participant state and credentials. Reverse proxy, TLS, access logs and build hosting remain operator boundaries.

## Confirmed initial findings
| Severity | Finding | Priority |
|---|---|---|
| High | Client-generated six-character codes and public matchmaking allow discovery and unauthorized entry | P0 |
| High | No origin restriction on HTTP or WebSocket upgrades; wildcard CORS | P0 |
| High | No payload/message/room/rate bounds permits memory and CPU abuse | P0 |
| High | No expiring, revocable invite or session authorization | P0 |
| Medium | No strict runtime message schemas; nickname/clue coercion and silent truncation | P1 |
| Medium | Movement allowed after finish and overly permissive speed allowance | P1 |
| Medium | No reconnection lifecycle, TTL policy, moderation or incident procedures | P1 |
| Medium | Missing production headers/configuration validation and release gates | P1 |

Dependency audit and real transport tests must determine final residual severity. Suspected risks requiring deployment validation: proxy origin forwarding, TLS termination, access-log credential retention, public listener exposure, distributed operation and volumetric denial of service. No staging or production has been inspected. This audit is bounded source review, not independent penetration testing or ASVS certification.

## Implemented remediation and residual findings
Admission is now server-issued and private; HTTP matchmaking is denied; exact upgrade origins, limits, schemas, grants, invite replacement/lock/kick and recipient secrets are enforced. Text input is normalized and rejected rather than silently truncated. Recovery uses the supported 0.17 lifecycle. The dependency chain was migrated from 0.16 and the vulnerable nanoid 2 chain was removed; current npm audit reports zero known vulnerabilities. Final source/build/transport evidence is in the packaged handoff.

Residual Medium: Colyseus protocol puts transient seat/reconnect identifiers in upgrade query strings; every infrastructure log/trace layer must be verified to redact these. Recovery storage is script-readable sessionStorage, bounded by server expiry, not HttpOnly. Optional host approval, verified accounts, central moderation and persistent bans are absent by design. Guest identity means proof of a temporary credential, not proof of a person. Reports are host notifications, not staffed review. Proxy/TLS/CSP and production retention/alerts remain unvalidated infrastructure work. Load coverage is bounded local regression, not internet-scale stress evidence. Privacy operator/contact/age/jurisdiction review is pending. Backend IP limits aggregate behind the proxy, so peak legitimate capacity needs measurement. Low: large 3D client chunk remains a build warning. No independent security assessment was performed. These constraints prevent a public-beta-candidate claim.

## Milestone 05 delta

Six-seat capacity retains admission and resource bounds. Physics accepts normalized inputs rather than client transforms; fixed-step speed/force bounds, epoch/sequence validation and deadman release prevent coordinate/force injection. Mechanism actions validate phase, instance, target, 3D range, line of sight and gate state. Builder actions are finite snapped noncolliding edits with bounded undo, two variants and two decoys; seal locks configuration. Server hold timing protects placement. Recipient snapshots hide anchor configuration after preparation and redact rival private transforms. Tests exercise stale/forged input, invalid edits, duplicate keys, atomic portal victory, independent copies, seven-seat denial and real 2–6 participant matches.

Local pattern scanning and npm audit are required at final release; they are not an independent penetration test or complete history scanner. No new external runtime asset/API/service was added. Source is already in a private GitHub repository; this local milestone has not been verified as remotely pushed. No staging TLS/CSP/proxy/load/security validation was performed. Full browser match acceptance remains blocked by the environment. Existing infrastructure/privacy risks above remain open.
