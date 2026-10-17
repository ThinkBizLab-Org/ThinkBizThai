# Records transcription: PR #259, #261, #265 and #275 after their merges, and the job-store.ts duty (2026-10-17)

Scribe: `/claude/a0_atlas` (A0, this package's Author), drafted by a subagent of that run. Every word recorded is a
role's own, in its file on `main`, or the Owner's, in a disposition on `main`; the facts were read with `gh` and `git`
on 2026-10-17 against `main` at `01b49187` (the merge of PR #281). Nothing is quoted from a chat or a log; that A0
pressed each pull request is A0's own statement as scribe (`gh` shows only the account, `workstationgroup`). A0
decides nothing here, closes no role's finding and moves no status. This is meant as a records-only pull request
under RFC-2026-025 §6.

Branch `agent/claude/WP-1A-A0-003-tenant-envelope`, recreated from `origin/main` `01b49187`.

## 1. What `main` already carried, and what was missing

`open_blockers[0]` (STATE) records #259's and #261's merge times and merge commits, that #261 was pressed by A0 under
`required_human_authorities[1]`, and the four round-two verdicts on #261. It does not record either final head, CI
run or lane, who pressed #259 or the Owner's words it relied on. Nothing on `main` records the merges of #265 or #275
(`R0-265` appeared nowhere in `work-packages/` before this increment, as R0-275-2 and C0-275-1 measured). The missing
facts are `open_blockers[21]` (#259, #261), `[22]` (#265) and `[23]` (#275); `[24]` is R0-281-2's duty.

## 2. Facts

| PR | Merged (UTC) | Merge commit | Final head | CI on the final head (`pull_request`) | Lane printed | Press authority |
|---|---|---|---|---|---|---|
| #259 PR-G | 2026-10-14T09:20:11Z | `e69fc87b72549fe930f0209c5d7ce604691c0913` | `f723662b9a42fe46b1f4a06835d602e4057db3c7` | run `38539239403` success; `bootstrap` `115769606691`, `application` `115776864459` success; 821 tests, 0 fail | governance | Owner 2026-10-12T19:38:08Z, `required_human_authorities[0]` |
| #261 PR-1 | 2026-10-14T12:55:51Z | `2aef81825e198f298039ef3d8fa32200034d54f4` | `1c34880ddf82a23ec5115d8b869a9d0eeebd3a12` | run `38564806352` success; `bootstrap` `115854652818`, `application` `115863748428` success; 827 tests, 0 fail | risk | `required_human_authorities[1]` (RFC-2026-034 §2.2, Q-034-1) |
| #265 PR-2 | 2026-10-15T10:36:19Z | `14716adf00d4d27c23d4ff1771b3dbcc9a9aea76` | `38f5dd82ac1468d04a774eb7488bb8c323e73a4a` | run `38681569474` success; `bootstrap` `116247069664`, `application` `116252125976` success; 827 tests, 0 fail | governance | Owner 2026-10-14T13:01:02Z and 2026-10-15T02:13:35Z, `required_human_authorities[2]`, `[3]` |
| #275 PR-3 | 2026-10-15T19:19:55Z | `e78404680c43cb2cc6cbeb0386f7b7caabe53c4e` | `960207d88c32db656169232903a720a344c9df09` | run `38789797692` success; `bootstrap` `116611094748`, `application` `116621255025` success; 836 tests, 0 fail | risk | `required_human_authorities[1]` |

How verified: `gh pr view <n> --json mergedAt,mergeCommit,headRefOid,mergedBy` (every `mergedBy` is
`workstationgroup`); `gh run list --commit <final head>` (one run each); `gh run view <run> --json jobs`; the lane and
test counts from `gh run view <run> --log` (`review tier and lane:`, `ℹ tests`, `ℹ fail`). For each merge,
`git log -1 --format=%P` gives main and the final head; `git merge-base --is-ancestor <main parent> <final head>` exits 0
and the merge's tree equals the final head's (`2cfe613a`, `7c95a648`, `0ad11348`, `9bfe016d`).

Commits after each reading head (`git log --first-parent`):

- #259, after `9dc4e813`: the four re-read files `b61ef747` C0, `cb2b1428` A1, `281ca967` Q0, `f5eebd15` R0 (one file
  each), then `f723662b` the handoff alone.
- #261, after `90eb8a77`: `cde95de0` C0, `5d2385cc` A1, `0021d3c9` Q0, `dae1df49` R0, then `1c34880d` the handoff alone.
- #265, after `535e6b58`: `31b53bba` C0, `f91e9a61` A1, `a2443535` Q0, `e86463f8` R0; `e1bce345` a merge of main
  `94c858f0` (PR #264); `1ee0c826` the handoff; `cd8fcaa5` a merge of main `20f92350` (PR #263); `38f5dd82` the handoff.
- #275, after `a8656d04`: `14fb4e43` C0, `a3b83e08` A1, `8a95ac25` Q0, `cc52fefd` R0; `7f34adb5` a merge of main
  `047385f8` (PR #270); `960207d8` the handoff.

`node scripts/db/classify-records-only.mjs --sync` exits 0 on each main merge (`--sync e86463f8 e1bce345 94c858f0`,
`--sync 1ee0c826 cd8fcaa5 20f92350`, `--sync cc52fefd 7f34adb5 047385f8`); it names the generated files involved and
leaves their regeneration to the reader, which this increment did not re-run. Whether any press used
`--match-head-commit` is not recorded on `main`; each merge's second parent is the final head.

## 3. Verdicts and the Owner's words

Each quoted in its entry, extracted by script from the file on `main` (whitespace folded, as the sources wrap their
lines), 37 quotes in all, none retyped:

- #259 at `9dc4e813`: `c0-reread-2026-10-13-pr259.md`, `a1-reread-…`, `q0-reread-…`, `r0-reread-…`; the Owner's answer
  `A0 กดได้เมื่อ 4 role ผ่าน + ครอบคลุมกรณีแบบเดียวกัน (Recommended)`
  (`product-owner-disposition-2026-10-13-package-tool-config-press.md` §2.1).
- #261: `[0]` already records the four round-two verdicts; R0's `r0-reread-2026-10-14-pr261.md` "Ready at `90eb8a77`"
  is added. No PR-specific Owner direction: the risk lane's presser is A0 under Q-034-1 (the Owner's
  `ยืนยันทั้ง 6 ข้อ (Recommended)`, `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-11-fast-lane.md`).
- #265 at `535e6b58`: the four `*-2026-10-15-pr265.md` files; the Owner's two answers with the first one's description
  (`product-owner-disposition-2026-10-15-kernel-surface-press.md` §2, §6.2).
- #275 at `a8656d04`: the four `*-pr275.md` files. No PR-specific Owner direction (`required_human_authorities[1]`).
  C0-275-2 asked which condition the press applied. All four role files are on `main`, so both held, `[1]`'s (A1 and Q0)
  and the PR body's (all four), with CI green on both jobs. `[23]` states this as a fact, since #275 has no disposition.

## 4. The words the roles asked to be recorded after the merges

- **R0-265-1** (the RFC-2026-007 drift): the sentence is in `[22]`; the wording fix is PR #280, and R0's #280 file
  closes R0-265-1 at that merge, subject to R0-280-1.
- **R0-265-2** (`FailureReportPort` in `scope.include`): **not done**. `scope` is not a field §6.1 item 4 admits on
  the records path. It stays named in `[18]` (2) and is owed by the next increment that amends this manifest outside
  the records path.
- **R0-265-3** and **R0-275-3** (the handoff's rollback and press wording): done in this increment's handoff.
- **R0-265-4**: the `commit-when-clean` gap is on WP-0A-CON-008 and fixed by PR #278. The `amended_by` entries on
  WP-0A-DB-00 and WP-0A-A0-002 for #265 (and #259) are **not done**: both manifests are outside this package's
  `writable_paths`, and adding an `amended_by` entry is not a record under §6.1 item 4. They stay owed by those
  packages.
- **C0-275-1**: the PR #265 advisories still open after #275 are listed in `[23]` as their files state them.
- **R0-275-2**: this is the records pull request it names.
- **Q0-AUD1015-7** (who pressed #259 and #261): answered in `[21]`.

## 5. R0-281-2, option (ii)

`[24]` names the duty of the pull request that creates `src/modules/platform-kernel/adapters/job-store.ts`: it adds
that path to `PLATFORM_KERNEL_CREATED` in `test-kits/db/foundation-contract.test.mjs` §C test 2. It quotes R0's
recommendation and the self-enforcing assertion that C0-281-1, A1-281-1 and Q0-281-1 offered as the alternative. It
also records that the creating pull request edits a WP-0A-DB-00 guard (governance), which
`required_human_authorities[2]` does not reach.

## 6. What changed

- `work-packages/WP-1A-A0-003.json`: `open_blockers[21]` to `[24]` appended; `[0]` to `[20]` and every other field
  byte-equal. `status` stays `in_progress`: R0's #265 and #275 files keep it there ("The manifest stays `in_progress`"),
  and the last acceptance criterion (the provider-bound increment) holds the package short of `integration_verified`.
- `handoffs/WP-1A-A0-003-author-handoff.json`: rewritten for this increment (task `pr259-275-records-2026-10-17`).
- This file.
