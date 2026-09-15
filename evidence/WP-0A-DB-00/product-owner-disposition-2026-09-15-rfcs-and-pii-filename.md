# Product Owner disposition — 2026-09-15, in session: RFC-2026-024, RFC-2026-023, and A1-100 S2

Transcribed by `/claude/a0_atlas` (Author). The Owner's words are verbatim; A0's question is quoted
first so each answer is read against what was asked. Follows
[`product-owner-disposition-2026-09-15-pr-144-and-row-b.md`](product-owner-disposition-2026-09-15-pr-144-and-row-b.md)
in the same session.

## 1. What A0 put to the Owner (verbatim, Thai)

> | # | คำถาม | ตอบยังไง |
> |---|---|---|
> | 1 | **RFC-2026-024** (ถอน cross-vendor) | `approve` / `reject` — แนะนำ approve; ไม่มีเนื้อหาใหม่ แค่ทำให้ repo ตรงกับสิ่งที่ทำมา 8 batch |
> | 2 | **RFC-2026-023** (shape B) | `approve + เงื่อนไข 3 ข้อ` / `reject เพราะ service ไม่เขียนแทน user` / `รอ` — ถ้ายังไม่แน่ใจ ตอบ "รอ" ก็ได้ ไม่มีอะไรบล็อกคืนนี้ เพราะ shape C ปิดครบแล้ว |
> | 3 | **A1-100 S2** — `asset_versions.original_filename` (PII-2) อยู่ใน SELECT grant ของ client ทั้งที่ comment บอกว่ากัน | `ถอดออกจาก grant` / `ปล่อยไว้ + แก้ comment` — แนะนำถอด; เป็น 1 บรรทัด migration + 1 case |

## 2. The Owner's answer (verbatim)

> 1. approve
> 2. รอ + ขอรายละเอียดเพิ่มเติม
> 3. ตามแนะนำ

## 3. What each answer means, as A0 read it and acted on it

| # | Answer | Reading | Acted |
|---|---|---|---|
| 1 | `approve` | **RFC-2026-024 is approved.** Its §3 lands as written: DB-00's `prefer_cross_vendor_review` becomes `false`; `cross_vendor_exception` is replaced by a sentence recording the withdrawal; the §0 spawning disclosure becomes a rule of the role files; G0's external verification and RFC-2026-002's green-CI requirement are untouched | this pull request |
| 2 | `รอ + ขอรายละเอียดเพิ่มเติม` ("wait, and give me more detail") | **RFC-2026-023 stays In review.** Nothing in the tree changes; A0 answers the request for detail in the session and, if the Owner asks, as a companion note to the RFC | nothing changed |
| 3 | `ตามแนะนำ` ("as recommended") | **`original_filename` leaves the client SELECT grant** — the recommendation A0 gave in the same message: one forward migration revoking the column from `authenticated`, one case, the entitlement ("ผู้มีสิทธิ์") left undefined as batch 100 left `asset_rights`' "by permission" | batch 103, the next pull request |

## 4. What this file is not

Not a disposition of RFC-2026-023; not a definition of who is entitled to read an uploaded filename.

## 5. Later the same session: the social key's ON DELETE (blocker 161)

A0 put `a0-social-key-on-delete-options-2026-09-15.md` to the Owner with two answers:

> 1. **ON DELETE ของ social key** — อ่าน memo แล้วตอบ `(a)` (account ไม่เคยถูก hard-delete; disconnect = status → NO ACTION ถูกแล้ว, ปิด blocker ด้วย 1 ประโยคใน contract) หรือ `(b)` (retention ลบ account ได้ → ต้อง batch จริง: SET NULL + แก้ natural key ของ target) — ผมแนะนำ (a)

The Owner's answer (verbatim):

> 1. a

Reading: **a social account row is never hard-deleted except by workspace closure; disconnection is
a status. NO ACTION on `content_targets_social_scope_fk` stands.** Acted: the sentence is written
where this package can write it — `db/foundation/README.md` and a contract rule that pins the key
to carrying no ON DELETE action by this decision — and the connector contract (`docs/**`, read-only
to this package) is owed the same sentence by its owner; blocker 161 closes with that one thing
remaining.
