# C0 review of the G0 records PR (#186), 2026-10-05

Subject: PR https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/186, branch
`agent/root/WP-0A-A0-001-repository-bootstrap`, head `44dec5b`, base `main @ 600b48b`, package
`WP-0A-A0-001`. Seven files: the new disposition
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`, `evidence/g0-tracker-th.md`,
`handoffs/WP-0A-A0-001-author-handoff.json`, and `work-packages/WP-0A-A0-001.json`, `WP-0A-CON-002.json`,
`WP-0A-CON-003.json`, `WP-0A-CON-006.json`.

## 0. What I am

I am a subagent of `/claude/a0_atlas`, spawned by A0's workflow script to act as the independent Reviewer
run `/claude/c0_contract_reviewer`. RFC-2026-024 §3/3 requires this disclosure. I share a vendor and a
parent with the Author. I did not write any of the PR's content. I review it and I approve nothing: this
file is not a merge authorisation, not a role signature for G0, and it moves no package status.

## 1. Method

- Read `CONTRIBUTING_AGENTS.md`, RFC-2026-025 (§2 and §5), the disposition, the tracker diff, the four
  manifest diffs, the handoff, `evidence/WP-0A-A0-006/blocker-re-audit.md`, and A0's G0 survey (scratchpad
  `g0-survey.md`).
- Compared the manifests old and new with a parser, not by eye: each changed `open_blockers` entry was
  checked for its index, and for whether it still ends with `Text as recorded: <the original entry>`
  byte for byte. No other manifest field changed in CON-002/003/006. The only other change in A0-001 is
  the new `ownership.amends_without_owning`.
- Opened every file and line cited by the nine closures at `600b48b`. Re-ran the JWT probe in memory: I
  built the token shape from fragments at runtime and wrote nothing to disk.
- Read branch protection and repository visibility live with `gh api`, read-only.
- To check item (1), I read the session transcript for A0's message that put step 2 to the Owner and for
  the Owner's reply. A0's message is at `2026-10-05T14:57:18Z` and the reply at `2026-10-05T15:15:45Z`,
  in session `27edf3de`.
- Ran the repository checks with the PR branch checked out **by name** in this worktree (§4).

## 2. Findings

| ID | Grade | Finding |
|---|---|---|
| F1 | **Major (blocks merge)** | The decision list in the disposition is not the list A0 put to the Owner. The record goes further than what the Owner confirmed. |
| F2 | Minor | The CON-002 #13 closure is narrower than the original blocker. Its schema half still stands. |
| F3 | Minor | Two closures move a residual off the open list using A0's own reasoning, not the re-audit: CON-002 #01 and CON-003 #04. |
| F4 | Minor | The edited tracker row "Capability benchmark" now has 6 cells under a 4-column header. The stale text is duplicated and the new text is not rendered. |
| F5 | Info | The PR is not record-only, which agrees with A0's own statement. The task text calls it "record-only". That label is wrong. |
| F6 | Info | Committing this review after the handoff means the handoff is no longer the last commit. |

### F1: the recorded decision list is not the one the Owner saw (Major)

**The Owner's words are verbatim.** The transcript reply is exactly `บืนยันขั้น 2`, and the disposition §2
reproduces it exactly. The typo note is correct.

**The decision list is not verbatim.** Disposition §1 says its 15-row table is "The list, as A0 sent it
(translated from Thai)". It is not. The table is §3 step 2 of A0's G0 survey, reordered: OPEN-016 moves
after OPEN-003. The message the Owner actually answered (heading `ขั้นที่ 2: ขอคุณยืนยันครั้งเดียว`) had
**14 bullets and no OPEN-ids**. Compared item by item:

| Disposition item | What the Owner was shown | Gap |
|---|---|---|
| 14 OPEN-001 "draft pricing, no automatic charging" | No pricing bullet. The only related words are inside the payment bullet: `ออก invoice เอง ไม่ตัดเงินอัตโนมัติ และไปใช้ Stripe หลังผ่าน G0` | "Draft pricing" was never put to the Owner. The following still claim it was decided: disposition §3 row 14 ("Closes OPEN-001's 'pricing draft before G0' half … as an approach"), the tracker G0-020 cell `OPEN-001 แนวทาง (ข้อ 14)`, and the tracker "5–15" row. |
| 7 OPEN-007 "video/Reel to P1 behind a feature flag (off)" | `เลื่อนวิดีโอและ Reel ไปเป็น P1` | "Feature flag off" was not shown. |
| 11 OPEN-002 "Singapore region with a minimum-retention draft" | `เก็บข้อมูลใน region สิงคโปร์` | The retention half was not shown. Yet §3 row 11 says it closes "OPEN-002's G0 policy draft", and that draft covers retention per data class. |
| 9 OPEN-014 "async support in Thai business hours" | `support แบบไม่ realtime ในเวลาทำการ` | Small gap: "Thai" is inferred. |
| Count | 14 bullets | "fifteen" appears in disposition §1 and §2, in the tracker (`เสนอ 15 ข้อ`), and in handoff assumptions[1] ("A0's fifteen step-2 decisions"). |

Mitigation, recorded fairly: the message did say `ทุกข้อคือค่า default ที่ปลอดภัยซึ่ง register เขียนไว้อยู่แล้ว`.
The register's safe defaults for OPEN-007 (`Feature flag off`), OPEN-002 (`Singapore candidate, minimum
retention`), OPEN-014 (`Async Thai business-hours support`) and OPEN-001 (`Manual invoice, no
auto-charge`) do carry the missing words. So filling in gaps (b) to (d) from the register is a defensible
**reading**. It is A0's reading, though, and the record presents it as the list the Owner saw. Gap (a) is
different. "Pricing draft before G0" is OPEN-001's **due item**, not its safe default, so no reading of
"confirm the safe defaults" approves it. The OPEN-id mapping of every bullet is also A0's. The Owner was
shown none of the ids.

The repository has caught this pattern before: C0's review of batch 123 caught A0 adding a sentence to an
Owner-approved record (RFC-2026-025 status line). An Owner disposition must not record more as decided
than the Owner was shown.

**Fix before merge:**
1. Quote A0's step-2 message in the disposition as sent, in Thai. It is A0's own text and contains no
   personal data.
2. Label the OPEN-id column and the four filled-in words as A0's mapping to the register's safe defaults.
3. Record OPEN-001's pricing draft as **not put to the Owner**. Remove "closes … pricing draft half" from
   §3 row 14 and from tracker G0-020.
4. Narrow §3 row 11 to the region.
5. Change "fifteen/15" to what was sent, in the disposition, the tracker and the handoff.

### F2: CON-002 #13 is half closed (Minor)

What I confirmed: `scanText()` in `scripts/scan-repository-secrets.mjs:475` reports `["json-web-token"]` for
a synthetic three-segment `eyJ…` value at `tenant_context.actor.id`. The rule is at `:330`. That closes
the blocker's clause "the repository secret scanner has no pattern for it", and matches the re-audit
verdict.

What still stands: the original blocker said the value "passes every check: it is a string in a declared
slot". `contract-catalog/shared-kernel/ctr-ten-001/schema.json` still declares `actor.id` as
`{"type":"string","minLength":1}`. The schema admits a JWT-shaped value, and the scanner only covers
committed files, not runtime payloads.

The closure follows the re-audit, so I do not ask to reopen it. Its CLOSED note should say that the
schema half remains with CTR-TEN-001's owner (WP-0A-CON-001, as the original says).

### F3: residuals moved off the open lists by A0's reasoning (Minor)

- **CON-002 #01.** The re-audit's verdict covers only "RFC-2026-004 approved". The entry's own stated open
  remainder was "no required review exists … Retiring RFC-2026-002 needs an RFC". The closure says this
  remainder "is amended by RFC-2026-025 … not a blocker of this package". I checked the facts: the live
  read shows no `required_pull_request_reviews`, so the remainder is still true. RFC-2026-025 is Approved,
  but it moves the merge button and does not add a required review or retire RFC-2026-002. The remainder
  is recorded as a known limitation in the tracker row "Canonical guide … protected CI", so dropping it
  from CON-002's list loses nothing. The CLOSED note should still say the remainder is true and has moved
  to the tracker, not imply that RFC-2026-025 answers it.
- **CON-003 #04.** The closure is correct for the root-required property:
  `test-kits/contracts/catalog-registry.test.mjs:808-878`, with a floor of `checked >= 101` at `:878`. The
  original also named a residual: nested `required` lists are unmeasured. The note says it "stays below as
  text and is not this package's blocker". The text does survive, inside the CLOSED entry, but no open
  entry and no other package now carries it. Name an owner, or keep it open.

### F4: tracker row with too many cells (Minor)

`evidence/g0-tracker-th.md:29` has 7 pipes, which is 6 cells, under a 4-column header (`:24-26`). Before
this PR it had 5 cells, already one too many. The edit added the corrected capability text as a new cell
and **left the old one after it**. The old cell still says a benchmark is needed "และ vendor diversity",
which item 1 withdrew. GitHub drops cells beyond the header, so neither capability text renders. Collapse
the row to 4 cells and keep only the corrected text.

### F5: not record-only (Info, agrees with A0)

RFC-2026-025 §5 item 1 excludes Owner dispositions and "removing or rewording an open blocker". Item 5
says any `ownership` change other than the branch slot makes a PR not record-only, and this PR adds
`ownership.amends_without_owning`. §5 also says "Until item 5's mechanical check exists, no PR is treated
as record-only". The PR changes no code, migration, script, test, fixture, CI file, contract, decision
document, `docs/**`, `CONTRIBUTING_AGENTS.md` or RFC. I verified this with the PR file list and
`git diff --stat 600b48b 44dec5b`. A0's disposition §7 and handoff assumptions already say "not
record-only". The task text calling it a "record-only PR" contradicts both, and the record is right.

Consequence: the merge needs the role runs the package gates require: Reviewer (this file), Tester, and
Integration Owner. It is not governance, so the standing delegation can apply once those runs are clean.

### F6: handoff ordering (Info)

This file is committed after the handoff commit `44dec5b`. Before merge, A0 must re-run `refresh:handoff`
so the handoff is again the last commit and touches only itself (RFC-2026-025 §2 item 1).

## 3. The five checks

| # | Question | Answer |
|---|---|---|
| 1 | Owner's words verbatim, the exact list put to him, nothing more recorded as decided? | **Words: yes. List: no.** See F1. |
| 2 | Is every closed blocker really closed? | **Yes for all 10 at the level the re-audit judged, with notes on 3 (F2, F3).** Spot-checked at `600b48b`: RFC-2026-004 `:3` "Approved 2026-09-02" (CON-002 #01, CON-003 #01, CON-006 #01); `ctr-job-001/schema.json:79,86` allow-list pattern (CON-002 #11); `json-schema-subset.mjs:123-124` fails closed on any format but date-time (CON-002 #12); in-memory JWT probe → `json-web-token` (CON-002 #13); `catalog-registry.test.mjs:808-878` (CON-003 #04); `metric_labels` found only in `ctr-usg-001/manifest.json:70` prose (CON-006 #06); `schema-mutation-coverage.test.mjs:149` `COVERAGE_FLOOR = 0.70` (CON-006 #11); A0-001 open_blockers[1] by the live read. All 10 are closed in place, indices unchanged (13/10/13/3 entries before and after), and the original text is kept verbatim after `Text as recorded:`. |
| 3 | Are the protected-CI corrections true? | **Yes.** Live, read-only, 2026-10-05: `required_status_checks.strict: true`, `contexts: ["bootstrap"]`, `enforce_admins.enabled: true`, `allow_force_pushes.enabled: false`, `allow_deletions.enabled: false`, `required_conversation_resolution.enabled: true`, no `required_pull_request_reviews` key; repository `visibility: public`. The corrected tracker text at `:67`, `:92-94` and `:108` matches. The remaining stale statements (`CONTRIBUTING_AGENTS.md:61-79`, RFC-2026-002 status line, `OVERNIGHT-SUMMARY.md`) are correctly listed as owed in disposition §5, not edited. |
| 4 | Record-only under RFC-2026-025 §5? | **No.** See F5. No code, migration, CI or protected file is changed. |
| 5 | Repo checks on the branch name | **Pass.** See §4. |

## 4. Commands (branch `agent/root/WP-0A-A0-001-repository-bootstrap` checked out by name at `44dec5b`; Node `v24.20.0`)

| Command | Exit | Result |
|---|---|---|
| `npm run check` | 0 | coverage floor, toolchain, secret scan and protocol validators passed; `tests 691, pass 691, fail 0, skipped 0, todo 0` |
| `npm run check:handoff` | 0 | "describes the branch: nothing substantive after its cited head" (before this review commit) |
| `node scripts/verify-branch-scope.mjs 600b48b WP-0A-A0-001` | 0 | "all 7 changed path(s) are declared, and every amendment explains one" |
| `git merge-base --is-ancestor origin/main HEAD` | 0 | the head contains current `main` (`600b48b`) |
| `gh pr view 186` | 0 | OPEN, Draft, MERGEABLE, head `44dec5b`; required check `bootstrap` was IN_PROGRESS when read |
| `gh api …/branches/main/protection`, `gh api repos/…` | 0 | as in §3 row 3 |

## 5. Verdict

**`changes_requested`.**

- **Stop-the-line: none.** No secret, tenant data, migration, side effect or contract meaning is touched.
- **Merge is blocked by F1.** An Owner disposition records items as decided that the Owner was not shown:
  OPEN-001's pricing draft outright, plus the feature-flag and retention qualifiers presented as the
  Owner's list. The disposition also misdescribes its own source.
- F2 to F4 should be fixed in the same pass. They are not individually blocking.
- After the fix, the PR still needs the Tester and Integration Owner runs (F5), and a refreshed handoff as
  the last commit (F6). The fix commit touches only the disposition, the tracker and the handoff, so a
  re-check by this role covers F1 to F4 (RFC-2026-025 §5 item 2).
