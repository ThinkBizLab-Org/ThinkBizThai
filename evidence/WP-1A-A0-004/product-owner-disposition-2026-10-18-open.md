# Product Owner disposition — opening WP-1A-A0-004 (job worker and outbox relay) and who presses its first pull request (2026-10-18 UTC, session `325454ab`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run. The question, its header, every option shown
with its description, and the answer below are copied by script, byte for byte, from the raw transcript records of the
call and its result (session `325454ab-eb14-4597-afd3-75b6b8c78ee8`, the session's question tool, tool use
`toolu_01VBSkRssP3oTmx2m5hkmUx2`, records 9933 and 9946 of the transcript file). The times are the transcript's stamps (UTC), not a
clock read. Everything marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of
A0's reading of them. It is not a role verdict and approves nothing on A0's behalf.

## 1. Where things stood

- `main` was at `f9f1aad7` (PR #295, the 2026-10-18 round audit). `WP-1A-A0-004` ("job worker and outbox relay") is
  reserved by RFC-2026-029 §7 (code, fakes and consumer tests against CTR-JOB-001 and CTR-EVT-001, both Candidate, as
  reversible work; the worker not provisioned) and owes Q-029-2 (§10) and the D6 operational limits
  (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md`, D6 row). It had no
  manifest, so CI's branch-scope step would find no claimant for its branch.
- Opening it needs a manifest and the package's row in `test-kits/branch-identity.test.mjs` (`BRANCH_OWNERSHIP`) with the
  regenerated `test-kits/integrity-manifest.json`. Both test-kit files are governance paths under RFC-2026-034 §2.2;
  both edits are kinds §2.2 lists as additive ("a row for a new branch"; "a regeneration of
  `test-kits/integrity-manifest.json` that only records the digests of files the pull request adds or changes"), which
  take the risk lane only once A1 and Q0 each confirm so in writing on the final head.

## 2. Question, options shown and answer (verbatim)

Asked 2026-10-18T15:29:17.333Z, answered 2026-10-18T15:36:54.968Z, through the session's question tool, as one call of three
questions (headers `A0-003`, `ลด gov` and `A0-004 open`). Only the `A0-004 open` question is relied on here; the other two
concern other work and are not read in this record.

**Header:** `A0-004 open`

**Q:** "เปิด WP-1A-A0-004 (job worker + outbox) — PR แรกที่เปิด package เป็น governance (แตะ guard แบบ additive) · PR ถัดไป (โค้ด job/outbox บน fake) เป็น risk lane — ใครกด PR แรก?"

- **Options shown:**
  - "เปิด + A0 กดเมื่อ 4 role ผ่าน (Recommended)" — "หรือถ้า A1+Q0 ยืนยันว่าเป็น additive ก็ลดเป็น risk lane ตาม RFC-034"
  - "เปิด แต่ผมกดเอง" — "A0 เตรียมครบแล้วรอคุณกด"
- **A:** "เปิด + A0 กดเมื่อ 4 role ผ่าน (Recommended)"

## 3. What the answer directs (A0's reading)

**(a) The package is opened.** `work-packages/WP-1A-A0-004.json` is created with status `in_progress`, owner A0,
branch `agent/claude/WP-1A-A0-004-job-worker-outbox`, and its row is added to `BRANCH_OWNERSHIP`.

**(b) Who presses the first pull request.** The question names it before it existed: "PR แรกที่เปิด package เป็น
governance (แตะ guard แบบ additive)". A0 may press that pull request once C0, A1, Q0 and R0 have passed on its final
head and CI is green on both jobs (`bootstrap` and `application`), with RFC-2026-025 §5 item 6's other conditions kept
(the head contains current `main`; no security finding of any grade is open against it). The chosen option's
description, "หรือถ้า A1+Q0 ยืนยันว่าเป็น additive ก็ลดเป็น risk lane ตาม RFC-034", is read as: if A1 and Q0 each confirm in writing, under RFC-2026-034 §2.2's confirmation rule
and naming each guard hunk, that the guard edits are additive, the pull request is in the risk lane and is merged on
that lane's readers (A1 and Q0), A0 pressing under Q-034-1. The Owner may still press it himself.

**(c) What it reaches.** The first pull request only: this manifest, the one `BRANCH_OWNERSHIP` row, the integrity-manifest
regeneration recording that file's digest, this record and the author handoff. No source code. It does not reach a
dependency, CI, any other guard or its data, an allowlist, an RFC or `CONTRIBUTING_AGENTS.md`; those are asked again.

**(d) The code increments.** The question's own text, "PR ถัดไป (โค้ด job/outbox บน fake) เป็น risk lane", matches
RFC-2026-034 §2.2 (jobs, queues; module code): A1 and Q0 read the final head and A0 presses; C0's and R0's readings
follow in the round audit. An increment that also touches a guard, `index.ts`, `run.ts`, a dependency, CI or an RFC is
governance and is not reached by this answer.

**(e) Consistency with the standing direction of 2026-10-12.** The Owner's direction of 2026-10-12T19:38:08Z
(`evidence/WP-1A-A0-003/product-owner-disposition-2026-10-13-package-tool-config-press.md` §3 (a) 1 and 3) already lets
A0 press a pull request that is governance only because it creates a WP-1A package's manifest and that package's
branch row with the regeneration. A0 reads this answer as the specific direction for this package, consistent with
that one; neither reaches anything beyond those edits. A role that reads it otherwise should say so.

## 4. Decisions this package owes (recorded, not decided here)

- **Q-029-2** (RFC-2026-029 §10, "Decided by `WP-1A-A0-004`"): which Cron fires the dispatcher. Decided before an
  increment that adds the dispatcher route or the Cron; the manifest excludes both.
- **D6 operational limits**: lease length, per-round budget, retry/back-off numbers and concurrency, with the Vercel
  function-duration measurement. The pure-TypeScript increments take them as parameters with test values only.
