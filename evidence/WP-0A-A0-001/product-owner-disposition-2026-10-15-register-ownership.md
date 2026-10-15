# Product Owner disposition — the Decision Register's owner, and who presses its RFC-2026-034 §8 item 3 notes (2026-10-15 UTC, session `325454ab`)

Recorded by A0 (`/claude/a0_atlas`), drafted by an author subagent of that run, on `WP-0A-A0-001`. The question, its
header, every option shown with its description, and the answer below are copied by script from the question-tool
record of session `325454ab` (transcript lines 3462 and 3463) and compared with it byte for byte; the times are the
transcript's stamps (UTC), not a clock read. This is a record of the Owner's words and of A0's reading of them. It is not
a role verdict, approves nothing, and moves no status on A0's behalf.

## 1. Where things stood

- `main` is at `6fb5ab13` (PR #273). RFC-2026-034 ("fast lane") is in effect from the Owner's merge of PR #251 on
  2026-10-11 (`8086281b`). Its §8 item 3 owes, among other notes, "a note on Decision Register line 373 and §5.1 by the
  register's owner".
- The register, `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md`, was in no work package's `writable_paths` or `outputs.files` on `main`, so no package could
  write that note. PR #273 (the G0-024 note) recorded it in this package's `open_blockers` as owed and waiting for an
  owner (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-15-governance-bundle-press.md` §6 (d)).
- The register is under `docs/**`, a governance path under RFC-2026-034 §2.2, so a pull request that edits it is
  governance.

## 2. Question, options shown and answer (verbatim)

Asked 2026-10-15T15:46:16.478Z, answered 2026-10-15T15:51:38.460Z, through the session's question tool, as one call of one
question. This pull request's authority is this answer, not the answer of 2026-10-15T02:13:35.293Z recorded in
`product-owner-disposition-2026-10-15-governance-bundle-press.md`.

**Header:** "Register"

**Q:** "Decision Register (docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md) ไม่มี WP ใดเป็นเจ้าของใน writable_paths จึงใส่หมายเหตุตาม RFC-034 §8 item 3 (บรรทัด 373 และ §5.1) ไม่ได้ — จะให้ทำอย่างไร?"

- **Options shown** (single choice):
  - "ให้ A0-001 เป็นเจ้าของ + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "PR เดียว: เพิ่ม path register ใน writable_paths ของ WP-0A-A0-001 + หมายเหตุ 2 จุด (ไม่แก้ข้อความกติกา) · 4 role + CI เขียว 2 job + ไม่มี security finding ค้าง"
  - "A0 เตรียม PR, ผมกดเอง" — "เนื้อหาเหมือนข้อแรก แต่ส่งคำสั่ง merge ให้คุณกด"
  - "ยังไม่ทำ" — "บันทึกเป็นงานค้าง register ยังเขียนกติกาเก่าไปก่อน"
- **A:** "ให้ A0-001 เป็นเจ้าของ + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

## 3. What the answer directs (A0's reading, marked; a role may disagree)

**(a) Ownership.** `WP-0A-A0-001` becomes the register's owner: the exact path `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` (no glob) joins its
`ownership.writable_paths`. **A0's reading:** "เป็นเจ้าของ" is met by `writable_paths`, which the option description
names; the path is not added to `outputs.files`, because the package's `read_only_paths` keeps `docs/**` and the
ownership validator forbids an output that matches a read-only path (exit 69), and the words do not ask for it. No other
package declares the path in `writable_paths` or `outputs.files` (read by script over `work-packages/*.json` on
`6fb5ab13`).

**(b) What this pull request carries.** One pull request ("PR เดียว"): the path above, and two dated notes in the
register ("หมายเหตุ 2 จุด"), in the register's language (Thai), each on its own new lines, keeping every existing line
whole and changing no rule text ("ไม่แก้ข้อความกติกา"):
- under §5.1's table (Contract Freeze Levels), whose `Frozen v1` and `Integrated v1` rows are the "§5.1 lines 190–191"
  RFC-2026-034 names;
- under the rule "ถ้าไม่ผ่าน G0 อนุญาตเฉพาะ Spike, Prototype, Fixture, Fake Adapter, Contract Test และ reversible
  foundation ที่ไม่ผูก schema เท่านั้น", which was line 373 when RFC-2026-034 cited it (it moves two lines down,
  because the §5.1 note is added above it).

Each note says that RFC-2026-034 (merged by the Product Owner in PR #251, `8086281b`, 2026-10-11) amends it and quotes
RFC-2026-034 §3's row verbatim, cell by cell. **Which §3 row is relevant is A0's reading:** the only row that names
the register is "RFC-2026-031 §3.3 "Consumers" and §9 (…); Decision Register line 373 and §5.1 lines 190–191; 2026-10-08
disposition §10.3" / "as to writing and merging application code only, §2.1", so both notes quote that row. The
pull request also closes the `open_blockers` entry PR #273 added (a closing clause, the old text kept as prefix),
records this answer in `required_human_authorities`, and re-declares `test-kits/integrity-manifest.json`
(WP-0A-A0-002's file), whose digest of the register `npm run regenerate:manifest` rebuilds.

**(c) Who presses.** A0 may press this pull request once C0, A1, Q0 and R0 have passed on its final head, CI is green on
it on both jobs (`bootstrap` and `application`), and no security finding of any grade is open against it ("4 role + CI
เขียว 2 job + ไม่มี security finding ค้าง"). The Owner may still press it himself.

## 4. RFC-2026-025 §5 item 6

Its third bullet reads: "The delegation must be given after the PR it names exists, or must name its sequence
explicitly." Its last bullet reads: "**A PR that changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is
merged by the Owner personally**, never by delegation."

- **Last bullet.** This pull request changes a governance path (`docs/**`, and the register is the gate's own rule
  text), so the rule would have the Owner merge it personally. The answer above is the Owner's own direction that A0
  presses it on the stated conditions: an Owner-directed exception to the last bullet for this pull request only, of
  the same kind as PR #211's and the 2026-10-15T02:13:35.293Z direction, given in the Owner's words. It changes no rule.
- **Third bullet.** The answer was given before this pull request existed. A0 reads the bullet's second branch as met:
  the question and its chosen option named this pull request's content before it was opened ("PR เดียว", the register
  path in `WP-0A-A0-001`'s `writable_paths`, "หมายเหตุ 2 จุด", "ไม่แก้ข้อความกติกา").
- **The other conditions are kept.** The head contains current `main` when pressed; no unresolved security finding of
  any grade is open against it; the Integration Owner's verdict (R0) is required, and is one of the four role passes in
  §3 (c); CI is green on both jobs on the final head.

## 5. What these words do not do

- They do not move `WP-0A-A0-001`'s status, which stays `integration_verified`.
- They do not amend the register's rules, RFC-2026-025, RFC-2026-031, RFC-2026-034 or `CONTRIBUTING_AGENTS.md`; the
  notes record an amendment already in effect.
- They do not give this package any other path under `docs/**`, and they are not a standing delegation for later
  edits of the register: each later governance pull request on it is pressed as RFC-2026-025 §5 item 6 says, unless the
  Owner directs otherwise for it.
- They do not decide the other §8 item 3 notes (RFC-2026-025, RFC-2026-030, RFC-2026-031, WP-0A-A0-010
  `open_blockers[1]`), or §8 items 1, 2, 4 and 5.
- They do not decide whether the notes are accurate and complete: that is C0's, A1's, Q0's and R0's to read.
