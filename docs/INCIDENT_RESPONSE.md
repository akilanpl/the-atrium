# Incident response

Owner/contact: must be assigned before public beta. This preview does not operate a staffed response service.

For unauthorized joins, stolen invites or abusive content: host locks joins, replaces the invite, kicks the offending seat and reports/hides content. Kick replaces the invite automatically. For systemic authorization faults or unexpected room/memory growth: operator blocks new admissions at the edge, captures sanitized aggregate metrics and version identifiers, drains or stops the single process, and keeps the site closed pending reproduction/fix. Restart revokes all in-memory credentials.

Do not copy raw upgrade URLs, body dumps, private clues or full IPs into issue trackers. If narrowly scoped incident evidence must be retained, restrict access, document its purpose and deletion date and obtain privacy/legal review. Normal application logs are category/aggregate only and should expire within 24 hours. Reports expire in ten minutes; they are not a durable forensic record.

Triage severity and affected time/version; reproduce with disposable local guests; add a regression; run the release gate and independent review when appropriate; deploy only through an authorized staging/rollback process. Verify isolation, revocation, origin limits and error sanitization before reopening. Assess user/regulator notification obligations with counsel using actual affected data and current jurisdiction-specific deadlines; do not invent a universal deadline. Record root cause, fixes, verification and preventive changes without participant content.
