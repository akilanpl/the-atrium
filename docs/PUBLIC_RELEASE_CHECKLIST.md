# Release checklist

Local gate: `npm run release:check` runs strict TypeScript, ESLint, production build, gameplay/security tests, bounded credential/tracker scan and `npm audit --audit-level=high`. No audit suppression or severity downgrade is used. CI definition is supplied; remote execution for this milestone is unverified. Browser tests are a separate required gate and have not passed locally. Scanner is a bounded pattern check, not a complete secret-history or SAST product.

Before public beta, require all of:
- No unresolved Critical/High source or dependency findings; rerun the audit on the actual release date.
- Actual staging HTTPS/WSS, CSP/HSTS, firewall, logging redaction, malicious-Origin and auth/expiry tests.
- Representative 2–6 player browsers and separate private rooms; refresh/drop/host handoff; match completion and replay.
- Bounded room/churn/slow-consumer/oversized-packet and graceful shutdown tests with RSS/latency evidence; reconcile expected peak demand with the conservative backend aggregate cap.
- Validate proxy configuration with nginx and the hosting provider. Validate retention/incident process and alerts.
- Named operator, real contact/grievance route, privacy processors/jurisdiction/age review. No invented compliance or minor-access claims.
- Document accepted Medium/Low risks, rollback owner and release artifact checksum; obtain any needed external security review.

Public beta remains a separate authorization decision. Passing local tests is not penetration testing, certification or proof of a correctly secured deployment.
