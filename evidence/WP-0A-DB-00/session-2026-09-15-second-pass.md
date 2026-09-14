# Session record — 2026-09-15, second pass: what was owed to A0 is paid, two RFCs are in review, and four findings are closed by measurement

Author run: `/claude/a0_atlas` (Anthropic). Package: `WP-0A-DB-00`. Written at the close of the second
overnight pass, which the Product Owner opened with "จบแล้ว มีอะไรทำต่อไป ลุยไปก่อนเลยคืนนี้ เอาให้เยอะที่สุด".
This file is a STATE RECORD and approves nothing. It supersedes
[`session-2026-09-15-overnight-integration.md`](session-2026-09-15-overnight-integration.md) for
STATE; that file's §2–§4 remain the account of the first pass and are not repeated here.

## 1. Where `main` is

`main` = `e00d918` = merge of [PR #138](https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/138).
No force-push, no direct push; every merge a merge commit of a Draft PR marked ready under the
Owner's instruction, after a green required CI run on its head, measured on the branch name.

| Measure | Value |
|---|---|
| `npm run verify` on `main` | **clean: exit 0 — tests 641, pass 641, fail 0, skipped 0, todo 0** |
| Isolation cases | **844** (837 after the first pass; +4 F1 separation rows, +1 093 backdate proof, +1 F3 write half, +1 094 forged requester) — CI run 34898670970 and the scratch cluster agree |
| Migrations added this pass | 093 (`updated_at` triggers), 094 (`requested_by` is the caller) |
| Decision records in review | RFC-2026-023 (shape B), RFC-2026-024 (cross-vendor withdrawn) |
| `open_blockers` | 161 — three marked CLOSED with reasons (witness guard: never open; the 128 KiB ceiling; 131's margin) |
| Open Draft PRs for this package | none |

## 2. What merged, in order

| PR | What | Cases |
|---|---|---|
| #130 | manifest: `outputs` describes the package (38 → 72), a never-open blocker closed, a dead writable path removed | — |
| #131 | **driver on stdin** — the ~128 KiB ceiling on a migration is gone; `db-migrate-clean` proves it with a 200,000-byte probe on every run; the byte-budget rule replaced by a stdin/meta-command rule | 837 |
| #132 | **RFC-2026-023** — the acting-user narrowing (shape B), in review | — |
| #133 | **Q0-100 F1** — the link narrowing's halves separated by two fixture rows; Q0's probe Q6 replayed goes red on exactly the new case | 841 |
| #134 | **batch 093** — `updated_at` maintained by the database on the five tables that handed it to the client (C0-080 M4, C0-081 M3, C0-090 M5); a schema-wide apply-time rule and a static twin | 842 |
| #135 | **RFC-2026-024** — the cross-vendor condition withdrawn, transcribed for disposition | — |
| #136 | **Q0-081 F3** — the write half of §8.6 case 4 on `content_targets` | 843 |
| #137 | **batch 094** — an approval request's `requested_by` is the caller (A1-090 S13); the forgery measured landing before, refused after | 844 |
| #138 | **Q0-081 F2** — two whys corrected after replaying probe P1 (081's Page branch is observable by no case; the item's policy answers first) | 844 |

## 3. Three things measured this pass that the records did not know

1. **`INSERT … RETURNING` is checked against the USING half.** Q0-081's probe P10 (the item term cut from WITH CHECK only) stays green even with the new write case, because the returned row must satisfy USING, which still names the item. Cut from both halves, the read case and the write case both go red. Recorded in the case's `why` and `a0-q0-081-f3-write-half-2026-09-15.md`.
2. **081's Page branch decides nothing a case can see.** With the Page question deleted from both halves of `content_targets_scope_narrowing`, all 844 cases pass: `content_items`' own narrowing hides the sibling item in the subquery first. Two whys said otherwise, one of them written by this session the evening before; both corrected (#138).
3. **The witness-type guard this session asked for already existed** (batch 100's and batch 131's rules). The blocker A0 wrote at the 082 integration is marked CLOSED with that reason, not deleted (#130).

## 4. Where this session was wrong

- The F3 case's `why` attributed its refusal to 081's Page branch (§3.2). Written from reasoning, corrected the same night from measurement.
- The 083 evidence's probe tally was written before the probes ran (first pass, recorded there); this pass ran every probe before writing its tally.
- Two verify runs were red after a commit because the plumbing commit carried a non-exempt file (test-kits/db, scripts/test-suite-contract) and the handoff cited the commit before it; each fixed by a further refresh-and-commit. The rule — refresh the handoff in the same commit as any non-exempt change, or last — is now in the memory file and this record.

## 5. What is owed, and to whom

**Decisions only the Product Owner can make** (unchanged from the first pass, plus two dispositions):

1. **RFC-2026-023** (shape B) and **RFC-2026-024** (cross-vendor) — dispose. Until 024 is disposed, `independence.prefer_cross_vendor_review` stays `true` by design.
2. **A1-100 S2** — `asset_versions.original_filename` (PII-2) in the client SELECT grant.
3. **The pre-080 families' narrowings** (`for all to authenticated` in 020/021/030/040/041/070 and the rest) — shape-C closures, or wait for shape B.
4. **A1-090 S14** — the `approval_events.comment` read surface and the projection RFC-2026-021's path would need.
5. **A1-100 S4** — `app_worker`'s INSERT/UPDATE grants on the asset tables for acts no §8 cell licenses.

**Owed to A0:** the assertion-strength findings on integrated batches (Q0-081 F4, C0-090 M1–M3, C0-081 M2/M4) — each is a statement about how much an "asserted at apply time" sentence is worth, fixable only by forward files that re-assert more strongly, and worth one batch rather than six; the fixture loads still go through `--command` (a fixture over 131,072 bytes would meet the old ceiling; none is near it).

## 6. Housekeeping

The scratch PostgreSQL cluster on `127.0.0.1:5499` is stopped; the user's server on `/tmp:5432` was never touched. `make` on this machine trips an Xcode licence prompt; `node scripts/db/run.mjs <target>` is the same command. Local branches for every merged PR of this pass can be deleted (0 ahead of `main`).
