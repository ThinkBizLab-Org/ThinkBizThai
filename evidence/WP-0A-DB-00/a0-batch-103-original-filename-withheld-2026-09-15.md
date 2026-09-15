# Batch 103 — `asset_versions.original_filename` leaves the client SELECT grant (A1-100 S2)

Run: `/claude/a0_atlas` (Author, A0 Integration). Date: 2026-09-15. Owner disposition: answer 3 of
[`product-owner-disposition-2026-09-15-rfcs-and-pii-filename.md`](product-owner-disposition-2026-09-15-rfcs-and-pii-filename.md)
— "ตามแนะนำ", the recommendation being A1's own §2A.4: one `revoke`, one case, the entitlement left
undefined as batch 100 left `asset_rights`' "by permission".

## 1. What the file is

`revoke select (original_filename) on app.asset_versions from authenticated;` — the one statement;
a corrected catalog comment (100's cannot be edited: migration invariant 1); an apply-time block
asserting (1) `authenticated` holds no privilege of any kind on the column, (2) every other column
100 granted is still granted, (3) `app_worker` still reads and writes it. Numbered 103, after 102,
before 110. One case, `owner-a-cannot-read-the-uploaded-filename-of-version-a1`: the tenant's own
owner, refused on the column by the grant (`deniedBy: 'grant'`, `deniedOn: asset_versions`); the
id carries no asset word because batch 100's control rule pins the count of ids that do.

## 2. Measured, scratch PostgreSQL 17.11 (fresh cluster each run)

| Run | Result |
|---|---|
| full set with 103 | `applied 103_asset_original_filename_withheld.sql`; `schema-lint: ok`; **`857 isolation case(s) passed.`** = 856 + 1 |
| the same set without 103 | **`FAILED — 1 of 857`**, the new case: "1 row(s) came back. The operation was permitted." — the value the owner read was `fixture-a1.jpg`, the fixture's uploaded filename, which is the finding reproduced |
| static suites | identity 285/285; contract 60/60 |

Every existing case on `asset_versions` passes unchanged in both runs: the row is still readable
(`owner-a-sees-the-asset-version-of-a1`), the tenant boundary still holds on the locator, and the
worker's cases do not move, so the revoke withdrew exactly the one column.

## 3. What this does not decide

Who is entitled to read an uploaded filename. §4.2 says "ผู้มีสิทธิ์"; no document names the role.
When one does, the batch that reads it grants the column to that role's projection (RFC-2026-021
§3), not back to `authenticated`. The "เข้ารหัส" half of §4.2 is unchanged: the column is plaintext
at rest, and the blocker entry (re-headed PARTLY CLOSED) keeps that half.
