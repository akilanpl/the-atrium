# Privacy and community notice — preview

Use a pseudonym and fictional puzzle clues. Never enter real names, contact information or other personal details. Your nickname, avatar, position, connection status and key count are shared with the lobby. A clue is sent to its assigned visitor; hidden locations remain on the server. No email, account password, chat, advertising, analytics or third-party runtime media requests are required.

| Data | Purpose | Retention / deletion |
|---|---|---|
| Nickname, clue, avatar, gameplay state | Temporary private match | RAM; waiting-room departure removes the seat; active-match departure leaves a roster/puzzle tombstone until replay/disposal, at most one hour from creation |
| Invite | Admit invited guests | RAM, 30 minutes; replacement/kick/disposal revokes earlier |
| Unused admission grant and seat | Finish connection | 10 seconds; one use |
| Recovery credential | Restore the same seat | Server grace 20 seconds after disconnect; sessionStorage until leave/tab closure; stale credentials rejected; room lifetime at most one hour |
| Socket IP | Network handling and abuse limits | Transient connection and bounded limiter RAM; limiter entries expire within one minute plus up to 30-second sweep |
| Report IDs and reason enum | Notify lobby host | RAM, at most 32 per lobby and 10 minutes; deleted on disposal; no free-text allegation retained |
| Settings (avatar, graphics, volume, effects, mute) | Remember preferences | Browser localStorage until cleared using the entry-screen control or browser settings |
| Aggregate operational events | Diagnose failure/abuse without names, IPs or content | Console stream only; operator must configure a 24-hour maximum log lifecycle before public operation |

Leave stops participation; it does not pretend to erase copies already seen by other players. Clearing preferences/recovery removes this app's named browser keys, not other sites' data. Reports notify the host; they are not sent to an outside moderation team. No persistent account exists to delete. Server restart clears all live data. Infrastructure may still process IPs: review hosting/CDN/support processors and publish their details before launch.

The preview is intended for adults 18+. This notice is not an age-verification mechanism. A public beta requires an actual named operator, contact/grievance channel, jurisdiction/processor review and an appropriate age policy. Those details cannot be invented by this implementation. Do not invite minors until their specific requirements have been reviewed and implemented.

## India commencement review
India's DPDP Act 2023 and Rules 2025 require an applicability review; the framework is phased, not all substantive duties commencing together in November 2025. The [official Rules Gazette](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf) specifies rules 1, 2 and 17–21 on publication, rule 4 after one year, and rules 3, 5–16, 22 and 23 after eighteen months. The [Ministry announcement](https://www.pib.gov.in/PressReleaseIframePage.aspx?PRID=2190014&lang=2&reg=48) is dated 14 November 2025; the Gazette notification is dated 13 November with a 14 November publication identifier. Planning dates commonly follow the publication date: 14 November 2026 and 14 May 2027. Counsel must confirm the governing publication/commencement notifications and section-specific Act schedule, including children's data, security, breach response, rights and any gaming-law applicability. As of this review (24 October 2026), the one-year and eighteen-month phases are still ahead. No legal compliance certification is asserted.
