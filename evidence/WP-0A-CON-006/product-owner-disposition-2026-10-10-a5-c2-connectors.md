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

## Second answer, for Vercel only (2026-10-10, 12:03:15Z)

Vercel stayed `connected` after the first answer, and the app's switch reported it already disabled. The Owner asked
first what A0 needed (12:00:08Z) and then why Vercel had to be cut (12:00:58Z). A0 answered at 12:01:14Z with the
reasons (the profile's `false` and validator exit 67; the Vercel tools that read environment variables; the profile
as the fact an A5 signature rests on, RFC-2026-013) and, for the case the Owner did not want Vercel off, two
alternatives, shown verbatim:

- **(ก)** คง `false` ไว้ แล้วเปิดเผยใน profile ว่ามี Vercel อยู่ใน harness แต่ห้ามใช้และไม่ได้ใช้ ข้อเสียคือ `false` จะกลายเป็นข้อห้ามเชิงนโยบาย ไม่ใช่ข้อเท็จจริงของเครื่องมือ และ A1 กับ A5 ต้องยอมรับการตีความนี้
- **(ข)** เปิด RFC แก้ validator ทำได้ แต่ NTF ต้องรอจน RFC ผ่าน

The Owner answered at 12:03:15Z, verbatim: "ก"

What this settles:

- For **Vercel only**, `cc-a5-loom.json` keeps `can_access_external_secrets: false` and gains a disclosure that the
  Vercel connector is present in the harness, is forbidden to this run, and was not used. That `false` is, for
  Vercel, a policy prohibition, not a fact of the tools. A1 and A5 must accept that reading before the A5 signature is
  cited (the condition the Owner was shown).
- Supabase, Microsoft 365, Gmail and Cloudflare stay off under the first answer; the first answer is not withdrawn.
- The validator and the capability schema are not changed (alternative (ข) was not chosen). The same reading for the
  other Claude profiles of this session is not decided here.

## Third answer, after a machine restart (2026-10-10, 16:24:43Z)

After the machine restarted, two connectors that had not been present when A5 and A1 measured were connected in the
session: Neon and Sentry. Vercel then read `disabled`. A0 asked at 16:24:02Z and the Product Owner answered at
16:24:43Z (tool call and tool result stamps in the session transcript).

**Q:** "หลังเครื่อง restart มี connector ใหม่เปิดอยู่ใน session นี้ 2 ตัวที่ตอน A5/A1 วัดไม่มี: Neon (114 tools — รัน SQL, ดึง connection string, สร้าง/หมุน credential ได้) และ Sentry (15 tools — อ่าน error/log ซึ่งอาจมี PII, แก้ issue ได้) · Neon อยู่ในกลุ่มเดียวกับ Supabase ที่คุณสั่งปิดไปแล้ว ถ้าปล่อยไว้ เงื่อนไข C-2 ที่ A5 และ A1 เพิ่งยอมรับจะไม่จริงอีก (ต้องให้ทั้งสองอ่านซ้ำ) จะให้ทำอย่างไร?"

- **Options shown:**
  - "ปิดทั้ง Neon และ Sentry (Recommended)" — "ผมปิดทั้งสองใน session นี้ (และเป็นค่าเริ่มต้นของ session ใหม่) สภาพกลับไปตรงกับที่ A5 และ A1 ยอมรับไว้ ไม่ต้องอ่านซ้ำ"
  - "ปิดเฉพาะ Neon" — "Sentry คงไว้ ต้องให้ A5 และ A1 อ่านซ้ำว่า Sentry อยู่นอกขอบเขต C-2 หรือต้องเปิดเผยเพิ่ม"
  - "คงไว้ทั้งคู่ + เปิดเผย" — "เพิ่ม Neon และ Sentry ลงในข้อความเปิดเผยแบบเดียวกับ Vercel (ห้ามใช้/ไม่ได้ใช้) แล้วให้ A5 และ A1 อ่านซ้ำก่อนขั้นที่ 3"
- **A:** "ปิดทั้ง Neon และ Sentry (Recommended)"

A0 turned both off at 16:24:45Z. After the turn ended, the app's connector listing read `disabled` for Cloudflare,
Gmail, Microsoft 365, Neon, Sentry, Supabase and Vercel; connected were Claude Docs, Notion, visualize, Figma and the
local scheduled-tasks server. With Vercel now off as well, the session is stricter than the state A5
(`a5-ntf-reread-2026-10-10.md` §3.2) and A1 (`a1-review-2026-10-10-ntf2b.md` §5) accepted: the Vercel disclosure in
`cc-a5-loom.json` stays true (the connector is forbidden and was not used) and no longer describes a connected tool.

## What the first answer settled, read with the second

- Under the first answer alone, `cc-a5-loom.json` kept `can_access_external_secrets: false` unamended, made true of the
  session by turning the connectors off. The second answer amends that for Vercel (above).
- C-2 closes when `/claude/a5_loom` re-measures the session's connectors and records that none of Supabase, Microsoft
  365, Gmail and Cloudflare is connected, and accepts the Vercel disclosure (second answer); A1 accepts it too. That record is the A5's own words, carried on the A5-assessment PR.
- The Owner's answer covers this session. It does not amend the capability schema, the validator or any other profile,
  and it says nothing about sessions in which the connectors are turned back on.
