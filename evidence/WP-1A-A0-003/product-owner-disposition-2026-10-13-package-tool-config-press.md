# Product Owner disposition — who presses a pull request that is governance only because it opens a WP-1A package (2026-10-12 UTC / 2026-10-13 local, session `c2816eec`)

Recorded by A0 (`/claude/a0_atlas`), drafted by a subagent of that run. The question, its header, every option shown
with its description, and the answer below are copied from the question-tool record of session `c2816eec`; the times
are the transcript's stamps (UTC), not a clock read. Local time (UTC+7) was 2026-10-13 02:36–02:38. This is a record of
the Owner's words and of A0's reading of them. It is not a role verdict and approves nothing on A0's behalf.

## 1. Where things stood

- `main` is at `40267ae9` (PR #257, the application skeleton of `WP-1A-A0-002`). `tsconfig.json`'s `include` covers
  `apps/**` and `vitest.config.ts` only, so `npm run typecheck` does not read `src/**`. `WP-1A-A0-002`'s manifest says
  the first package that creates `src/` "also adds src/** to tsconfig.json's include" (its `open_blockers`, the
  RFC-2026-029 §10 entry).
- `WP-1A-A0-003` (tenant context and API envelope; the 2026-10-08 G1/G2 plan, `.claude/g1-g2-plan-2026-10-08.md`, its
  row) has no manifest yet, so CI's branch-scope step would find no claimant for its branch.
- A0's plan splits the package's first code into two pull requests: **PR-G**, which creates
  `work-packages/WP-1A-A0-003.json`, adds `"src/**/*.ts", "src/**/*.tsx"` to `tsconfig.json`'s `include`, and adds the
  package's branch row to `test-kits/branch-identity.test.mjs` with the regenerated `test-kits/integrity-manifest.json`;
  and **PR-1**, the pure-TypeScript code under `src/modules/platform-kernel/**`, in the risk lane.
- PR-G is governance under RFC-2026-034 §2.2: `tsconfig.json` is tool configuration, which the classifier places as
  governance and which no additive exception moves. RFC-2026-025 §5 item 6 reads, in its last bullet, "**A PR that
  changes governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a gate) is merged by the Owner personally**, never by
  delegation", and in its third, "The delegation must be given after the PR it names exists, or must name its sequence
  explicitly." The Owner's directions to A0 to press named governance pull requests are recorded exceptions to that
  rule (PR #211's; the 2026-10-08 direction §10.2), and RFC-2026-034 §2.2 recognises such standing directions as given
  under it (§3 (d) below; quoted after C0-259-2). The 2026-10-08 direction §10.2
  (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md`) covers "governance PRs
  inside the approved G0-exit/G1/G2 plan"; whether it reaches a tool-configuration change made for a plan package was
  not certain, so A0 asked.

## 2. Question, option shown and answer (verbatim)

Asked 2026-10-12T19:36:39Z, answered 19:38:08Z, through the session's question tool, as one call of one question.

### 2.1 PR-G

**Q:** "เริ่ม tenant context (WP-1A-A0-003) แบ่งเป็น 2 PR: PR-G (เล็ก, governance) = สร้าง manifest ของ package + ให้ tsconfig ตรวจ src/** ด้วย (บรรทัดเดียว); PR-1 = โค้ด tenant context + API envelope + test (risk lane, A1+Q0, A0 กดได้อยู่แล้ว) — PR-G เป็น governance ใครกด merge?"

- **Options shown:**
  - "A0 กดได้เมื่อ 4 role ผ่าน + ครอบคลุมกรณีแบบเดียวกัน (Recommended)" — "อนุญาต A0 กด PR ที่เป็น governance เพียงเพราะสร้าง manifest ของ WP-1A ใหม่ + เพิ่ม path โค้ดใหม่เข้า tsconfig include/branch ตามแผน G1/G2 — ไม่รวม dependency, CI, guard, RFC (พวกนั้นยังถามคุณ)"
  - "A0 กดได้เฉพาะ PR-G นี้" — "ครั้งต่อไปถามใหม่"
  - "ผมกดเอง" — "ส่งคำสั่ง merge ให้ผม"
- **A:** "A0 กดได้เมื่อ 4 role ผ่าน + ครอบคลุมกรณีแบบเดียวกัน (Recommended)"

## 3. What the answer directs

**(a) Who presses.** A0 may press a pull request that is governance **only** because, for one WP-1A package of the
2026-10-08 G1/G2 plan, it does one or more of the following (the words "one or more of" are A0's reading of the "+"
in the option's description, corrected after C0-259-1):

1. creates that package's manifest (`work-packages/WP-1A-*.json`);
2. adds to `tsconfig.json`'s `include` the path where that package's code lives;
3. adds that package's own branch row to `test-kits/branch-identity.test.mjs` (`BRANCH_OWNERSHIP`), with the
   regeneration of `test-kits/integrity-manifest.json` that the row needs,

once C0, A1, Q0 and R0 have passed on its final head and CI is green on it, on both jobs (`bootstrap` and
`application`), with RFC-2026-025 §5 item 6's other conditions kept (the head contains current `main`; no security
finding of any grade is open against it; the sequence condition, (d) below). The Owner may still press it himself.

**(b) What it never reaches.** As the option's description says (`ไม่รวม dependency, CI, guard, RFC (พวกนั้นยังถามคุณ)`),
these still go to the Owner, and a pull request carrying any of them is outside this direction even if it also does
(a) 1–3: a dependency (`package.json`, any lockfile, `scripts/app-dependency-allowlist.json`); CI (`.github/**`); a guard
or runner, or its data or allowlist; an RFC (`architecture/decisions/**`); and `CONTRIBUTING_AGENTS.md`.

**(c) The first pull request it reaches.** PR-G of `WP-1A-A0-003` on branch
`agent/claude/WP-1A-A0-003-tenant-envelope`: `work-packages/WP-1A-A0-003.json`, `tsconfig.json`'s two `src/**`
patterns, the branch row, the regenerated integrity manifest, this record and the package's author handoff.

**(d) RFC-2026-025 §5 item 6's sequence condition (A0's reading, added after C0-259-2; a role may disagree).** The
Owner answered at 19:38:08Z; PR #259 was opened at 2026-10-12T21:02:40Z, after the answer, so the delegation was not
given after the pull request existed. A0 reads the condition's second branch as met:

- **For PR-G (#259):** the question names it by its sequence and content: "แบ่งเป็น 2 PR: PR-G (เล็ก, governance) =
  สร้าง manifest ของ package + ให้ tsconfig ตรวจ src/** ด้วย (บรรทัดเดียว)". #259 is that pull request and carries that
  content and nothing governance besides the branch row and its digest, which the option's description names
  ("tsconfig include/branch").
- **For later pull requests (the standing part, "ครอบคลุมกรณีแบบเดียวกัน"):** the named sequence is, on A0's reading,
  the WP-1A rows of the 2026-10-08 plan ("ตามแผน G1/G2" in the option's description), one opening pull request per
  package, each limited to (a) 1–3. That is the same footing as the 2026-10-08 direction §10.2 ("governance PRs inside
  the approved G0-exit/G1/G2 plan"). A0 reads it as needing nothing more; if a role reads it otherwise, A0 asks the
  Owner again before pressing such a pull request.

This direction is an exception to §5 item 6's last bullet of the same kind as PR #211's and §10.2's, given in the
Owner's own words; it changes no rule.

## 4. A0's reading of "กรณีแบบเดียวกัน" (marked as A0's, not the Owner's words)

The Owner's words are "ครอบคลุมกรณีแบบเดียวกัน" ("covers cases of the same kind") and the description's "PR ที่เป็น
governance เพียงเพราะสร้าง manifest ของ WP-1A ใหม่ + เพิ่ม path โค้ดใหม่เข้า tsconfig include/branch ตามแผน G1/G2". A0 reads
them so:

- **"ตามแผน G1/G2"** limits it to packages named in the 2026-10-08 plan the Owner accepted. A WP-1A package outside
  that plan, or one D13 renames beyond recognition, is asked again.
- **"เพิ่ม path โค้ดใหม่เข้า tsconfig include"** is an **addition** to `include` of a path where that package's code
  lives (as `src/**` here). It does not reach removing or narrowing an `include` pattern, any `exclude` change, any
  `compilerOptions`, `extends`, `paths` or other `tsconfig*.json` field, `tsconfig.base.json`, `apps/web/tsconfig.json`,
  or any other tool configuration (`vitest.config.ts`, `next.config.ts`, `postcss.config.mjs`).
- **"branch"** is a new row in `BRANCH_OWNERSHIP` for the new package's own branch, as `WP-1A-A0-002` set the
  precedent. Moving or removing another package's row is not covered. RFC-2026-034 §2.2 already lets such a row take
  the risk lane on A1's and Q0's written confirmation; this direction matters when the same pull request is governance
  for another reason in (a).
- **"สร้าง manifest"** is creating the package's own manifest. Editing another package's manifest is not covered.
- **"4 role ผ่าน"** is C0, A1, Q0 and R0 on the final head, as in the Owner's earlier press directions.
- The direction does not lower any lane: such a pull request is still read by all four roles.

A reviewer who reads any of these differently should say so.

## 5. What these words do not do

- They do not move `WP-1A-A0-003`'s status. The Author moves it to `in_review` and no further.
- They do not amend RFC-2026-025, RFC-2026-034 or `CONTRIBUTING_AGENTS.md`. Like the 2026-10-08 direction §10.2, this
  record quotes a direction under RFC-2026-025 §5 item 6; it changes no rule.
- They do not reach PR-1. PR-1 is risk-lane work (RFC-2026-034 §2.2, "Module code": `src/modules/platform-kernel`), which
  A0 already presses after A1 and Q0 pass; this record changes nothing about it.
- They bind no provider and install nothing. RFC-2026-034 §2.1 keeps provider accounts, sandboxes and credentials out.
