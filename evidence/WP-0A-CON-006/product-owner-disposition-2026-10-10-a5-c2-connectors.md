# Product Owner disposition — A5 condition C-2, the session's external connectors (2026-10-10)

A0 (`/claude/a0_atlas`) asked this in session `c2816eec` through the session's question tool. The question was put at
2026-10-10T08:42:20Z and the Product Owner answered at 10:03:03Z; both times are the tool call and tool result stamps
in the session transcript. Main was at `9d0751ec` (PR #242). The A5 assessment was on local branch
`a5/WP-0A-CON-006-ntf-assessment-2026-10-10` at `96d08f35`.

## Context put to the Owner

`/claude/a5_loom`'s owner assessment of CTR-NTF-001 (`evidence/WP-0A-CON-006/a5-ntf-assessment-2026-10-10.md`
§0.1, §5) set condition C-2: the run measured that the session's harness had connectors able to read hosting
environment variables (Vercel), run SQL on database projects (Supabase) and send mail and chat (Microsoft 365, Gmail),
with Cloudflare also connected. It asked that `cc-a5-loom.json` declare `can_access_external_secrets: true`. The
capability schema (`.agents/capabilities.schema.json`, `const: false`) and `scripts/validate-capability-profiles.mjs`
(exit 67) require every profile to deny external-secret access, and the same connectors were present for every Claude
run of the session (A0, C0, A1, Q0, R0, A6). The decision is the Owner's: how the session runs, and the security
posture every profile states, are not A0's to choose.

## Question, options shown and answer (verbatim)

**Q:** "A5 (/claude/a5_loom) ประเมิน CTR-NTF-001 แล้ว: รับรองแบบมีเงื่อนไข แต่เงื่อนไข C-2 ชนกฎของ repo — A5 วัดได้ว่า session นี้มี connector ที่อ่าน secret/รัน SQL/ส่งอีเมลได้ (Vercel env, Supabase SQL, Microsoft 365, Gmail, Cloudflare) จึงขอแก้ cc-a5-loom.json เป็น can_access_external_secrets: true แต่ schema และ validator บังคับให้ทุก profile เป็น false (exit 67) และ connector ชุดนี้ก็อยู่กับทุก Claude run (A0, C0, A1, Q0, R0, A6) ด้วย จะให้แก้อย่างไร?"

- **Options shown:**
  - "ปิด connector ใน session (Recommended)" — "ผมปิด Vercel, Supabase, Microsoft 365, Gmail, Cloudflare ใน session นี้ (Notion คงไว้เพื่ออัปเดต handoff) แล้วให้ A5 วัดซ้ำ ค่า false จะเป็นจริง profile ไม่ต้องแก้ ใช้ได้กับทุก role run ใน session นี้"
  - "คง false + เปิดเผยใน profile" — "ไม่ปิด connector แต่เพิ่มข้อความใน cc-a5-loom.json ว่ามี connector อยู่ใน harness แต่ห้ามใช้และไม่ได้ใช้ ยอมรับว่าค่า false เป็นข้อห้ามเชิงนโยบาย ไม่ใช่ข้อเท็จจริงของเครื่องมือ"
  - "เปิด RFC แก้ validator" — "เขียน RFC ให้ profile ประกาศ true ได้พร้อมมาตรการควบคุม (governance PR, ต้องผ่าน 4 role) ช้ากว่าและ NTF รอจนกว่า RFC จะผ่าน"
- **A:** "ปิด connector ใน session (Recommended)"

## What A0 did on it

- 10:03:17Z–10:03:18Z: A0 turned Vercel, Supabase, Microsoft 365, Gmail and Cloudflare Developer Platform off for the
  session through the app's connector switch (it also becomes the default for new sessions). Supabase, Microsoft 365,
  Gmail and Cloudflare then read `disabled`.
- Vercel still read `connected` at 11:07Z, and the switch answered "already disabled". A0 reports this to the Owner
  rather than working around it. C-2 is not closed while any of the five reads `connected`.

## What this settles, and what it does not

- `cc-a5-loom.json` keeps `can_access_external_secrets: false` and is not amended for C-2. The value is made true of the
  session, not rewritten.
- C-2 closes when `/claude/a5_loom` re-measures the session's connectors and records that none able to read external
  secrets, run SQL or send mail is connected. That record is the A5's own words, carried on the A5-assessment PR.
- The Owner's answer covers this session. It does not amend the capability schema, the validator or any other profile,
  and it says nothing about sessions in which the connectors are turned back on.
