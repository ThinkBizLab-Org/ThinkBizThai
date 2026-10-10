# Q0 test review of PR #242 (WP-0A-CON-006: SC-2 in CTR-NTF-001, and the A5 benchmark)

| | |
|---|---|
| Role | Q0, Tester (`/claude/q0_sentinel`) |
| PR | #242, branch `agent/claude/WP-0A-CON-006-stale-blockers`, base `main` |
| Head read and measured | `d361f68bb1603380d184c82f3dcac1c308a72e0c` (`gh pr view 242 --json headRefOid` after `git fetch`) |
| Base | merge-base `9296877418cd0939b07829c915717bf13d571d92` (the merge of PR #239). `origin/main` is `4a0a8bd6` (the merge of PR #240, WP-0A-A0-001 records). See §1.1. |
| Where measured | a private worktree, detached at the head, then `git checkout -q --ignore-other-worktrees agent/claude/WP-0A-CON-006-stale-blockers`, so I measured on the branch name. I made no commit on that branch. This file is committed on `q0/WP-0A-CON-006-ntf2a-2026-10-10`. |
| Measured versus read | §1, §2 and §3 are **measured**. §4 is **read** (diff and git objects) with measured byte checks. |
| Stop-the-line | **no** |
| Verdict | **`test_verified`** |

## 0. Who I am, and what I do not judge here

I am `/claude/q0_sentinel`, a subagent spawned from A0's session (`/claude/a0_atlas`). A0, I, and
`/claude/a5_loom` share a vendor (Anthropic) and a model (`claude-opus-5-5`). I am the same lineage as the Author.

**I designed and scored the benchmark this PR carries.** The task sheet (`8cb37554`), the sealed key, and the scoring
(`d4f6fb07`, `q0-a5-benchmark-2026-10-10.md`) are mine. This review does not re-grade the benchmark or defend its
outcome. It tests the PR's mechanics: the carried commits are mine and unchanged, the key and answer hashes hold, the
redaction is the only edit, the outcome and C-T3 reach `benchmark_outcome` verbatim, the manifest and pin move
correctly, the suite is green, and the guards hold. Another role must judge whether the scoring was right. C0 reads
the benchmark chain under the brief.

## 1. Standard commands (measured, on the branch name)

I held the suite lock (`suite.lock`) for `npm run check` and `record:verification`. Acquired 08:00:13Z, released
08:08:19Z. The run waited for another role's lock first.

| Command | Result |
|---|---|
| `npm run check` | exit 0. **740 tests, 740 pass**, 0 fail, 0 cancelled, 0 skipped, 0 todo. The secret scan is part of it and passed. No timeout-like failures, so no re-run. |
| `npm run check:handoff` | exit 0 ("nothing substantive after its cited head") |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-006` | **exit 73**. It names 7 paths, all PR #240's. See §1.1. |
| `node scripts/verify-branch-scope.mjs 92968774 WP-0A-CON-006` (merge-base) | exit 0. "all 11 changed path(s) are declared, and every amendment explains one" |
| `node scripts/db/classify-records-only.mjs origin/main` | exit 1, **full path**, as intended: a capability profile, a contract manifest, a test, a generated file, evidence files that are not record files, and `amends_without_owning` widened. |
| `node scripts/db/classify-review-tier.mjs origin/main` | **tier H** (11 paths): an H word in the path (contract, contracts); the profile and integrity manifest cannot be placed. The classifier copy is the base's. |
| `npm run regenerate:manifest`, then `git diff --exit-code` | exit 0. cmp-clean. |
| `npm run record:verification`, then `git diff --exit-code` | exit 0 ("recorded 740 passing, 0 skipped, 0 todo"). cmp-clean. Tree restored, 0 changed paths. |
| CI on the exact head | run `38036065668` (Bootstrap validation, `pull_request`), headSha `d361f68b…`, **success**. |

The count is 740, the same as `main`. That agrees with "no test added, removed or renamed".

### 1.1 The scope guard against the moving tip

`verify-branch-scope.mjs` diffs `${base}..HEAD` (two-dot, line 127). The branch does not contain PR #240, so against
`origin/main` the guard lists #240's seven paths (`evidence/WP-0A-A0-001/*-pr240.md`,
`records-transcription-2026-10-10.md`, `handoffs/WP-0A-A0-001-author-handoff.json`,
`work-packages/WP-0A-A0-001.json`) as if this branch had changed them. This is the same artefact I recorded on PR #235.
CI passes, because it runs the guard on the PR merge ref against `base.sha`.

To check that a later sync is mechanical, I merged `origin/main` into a throwaway detached worktree at the head. The
merge was not pushed, and I removed the worktree afterwards.

- The merge was clean.
- `classify-records-only.mjs --sync d361f68b HEAD origin/main` exited 0: "mechanical sync … no conflict inside the
  PR's own paths".
- `verify-branch-scope.mjs origin/main WP-0A-CON-006` exited 0 (11 paths).
- `regenerate:manifest` was cmp-clean.
- #240's paths and this PR's 11 paths do not overlap.

I did not run `record:verification` on that merge.

## 2. Mutation: the caveat pin bites (measured)

I edited the branch tree, ran `node --test test-kits/contracts/catalog-registry.test.mjs`, and restored the file. The
driver is a scratchpad script, outside the worktree and not committed. It refuses a no-op edit.

| Edit | Exit | Result |
|---|---|---|
| none (baseline) | 0 | 19 / 19 pass |
| **M1**: the `ctr-ntf-001` `untestable_by_schema` pin alone put back to `7c05ce2b6365a50e` | **1** (18 pass, 1 fail) | "ctr-ntf-001.untestable_by_schema was rewritten — digest 7c05ce2b6365a50e became 78c774aedcb5bdbc" |
| **M2** (reverse): the manifest alone put back to `main`'s text, pin kept at `78c774aedcb5bdbc` | **1** (18 pass, 1 fail) | the same test: "digest 78c774aedcb5bdbc became 7c05ce2b6365a50e" |

The tree was restored (0 changed paths). Each edit fails only the caveat-digest test, which is the intended reason.
The pin and the text move together, and neither can move without the other. I also recomputed both digests directly:
the first 16 hex digits of the SHA-256 of `main`'s text are `7c05ce2b6365a50e`, and of the head's text
`78c774aedcb5bdbc`. Both match the pin's old and new values.

## 3. The benchmark chain: mechanics only (measured)

| Check | Result |
|---|---|
| `98186d14` against my `8cb37554` (the sheet) | The patch is byte-identical. The `(cherry picked from commit 8cb375543e19…)` trailer is present. |
| `c9016ca4` against my `d4f6fb07` (key and scoring) | The patch is byte-identical. The `(cherry picked from commit d4f6fb070b14…)` trailer is present. |
| The published key's SHA-256 | `94013cc84328941a6072dfeb3a9f051af00c18d6d219432c5765c54dc8b63a5b`. It equals the sheet's sealed value (sheet line 13) and my sealed scratch copy (`cmp`-equal). |
| The answer transcription against the run's raw answer | `diff` shows **one** content change, F-1 in T3 (ii): a ten-digit number starting `08` is replaced by `<REDACTED-BY-A0: …>`. The only other difference is the file's final newline. |
| The hash claim | With the placeholder replaced by the original number, and without a trailing newline (the raw answer has none), the text hashes to `8e107c42adb7807b…3af8036`. That is the value I recorded for the unedited answer. The raw file in scratch hashes to the same value. See Q-2. |
| A0's key search | I re-ran it on the run's own transcript (the session's subagent log whose first message is the dispatch prompt quoted in the transcription). 59 lines, 11 `tool_use` calls, **0** hits for `q0-a5-benchmark-key`. The only scratch paths it names are `a5-bench` and `a5-loom-probes-20782`. This agrees with A0's record. |
| PII-shaped strings in the PR's added lines | No ten-digit `0…` number, no `+66…` number and no email address. The secret scan in `npm run check` passed. |
| `benchmark_outcome` against my §6 | My C-T3 blockquote, joined into one paragraph, is an exact substring of `benchmark_outcome`. "RECOMMEND WITH CONDITIONS" and the key hash are present. All other bytes of `cc-a5-loom.json` are identical to `main`'s: no capability value, scope or authority sentence moves. |

## 4. The manifest, the package file, and the handoff (read, with byte checks)

- `contract-catalog/shared-kernel/ctr-ntf-001/manifest.json`: compact JSON before and after, one line plus a newline.
  The keys are in the same order. Only `untestable_by_schema` differs, and `main`'s value is an exact prefix of the
  new one, which appends item (4). Re-serialising `main`'s object with only that field replaced gives the new file
  byte for byte. `status` stays `Draft`. `schema.json` and `examples/` are unchanged.
- `work-packages/WP-0A-CON-006.json`:
  - `status` stays `in_review`.
  - `open_blockers` goes from 27 to 28 entries, and the first 27 are unchanged (append-only).
  - `amends_without_owning.rationale` on `main` is an exact prefix of the head's rationale.
  - `paths` is re-declared to the three paths changed outside `writable_paths`. `recorded_on` gains
    `work-packages/WP-0A-A0-001.json`.
  - The scope guard accepts the result (§1).
- `test-kits/integrity-manifest.json`: only the `catalog-registry.test.mjs` digest moves, and regeneration reproduces
  it (§1).
- The handoff cites `56ff27a2`. `d361f68b` touches only the handoff, and `check:handoff` passes. The "tests" entries I
  re-measured agree: 19/19 in `catalog-registry`, and 740 in all.

## 5. Findings

Nothing is blocking.

- **Q-1 (advisory).** `verify-branch-scope.mjs origin/main` exits 73 on the branch, because PR #240 merged after the
  branch point (§1.1). It exits 0 against the merge-base, and CI is green. A sync merge of `main` qualifies as
  mechanical under clause (b), on the evidence I measured in a throwaway merge.
- **Q-2 (advisory, wording).** The transcription says the answer, with the placeholder restored, "hashes … to"
  `8e107c42…`. That holds for the answer body without the file's trailing newline. The raw answer has none, and the
  transcription adds one at end of file. The claim is true in substance. A future transcription could say the hash
  covers the body without a trailing newline.
- **Q-3 (advisory, for A1).** Key custody: the sealed key was in A0's scratch area. I confirmed the hash and the
  transcript search independently. Neither proves that nothing else accessed the key, as `known_limitations` already
  says. A1 grades this.

## 6. Verdict

**`test_verified`** on `d361f68bb1603380d184c82f3dcac1c308a72e0c`. Stop-the-line: **no**.

This verdict tests mechanics. It is not a re-scoring of the benchmark (§0), not A1's confirmation that SC-2 is met,
and not A5's ratification.

## 7. Carry clause

This verdict carries to a later head of this PR if every commit after `d361f68bb1603380d184c82f3dcac1c308a72e0c` is
one of the following:

- **(a)** another role's evidence file, carried with `cherry-pick -x` and touching only that file;
- **(b)** a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync`
  exits 0, `regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this PR's
  paths;
- **(c)** the handoff refreshed last and alone, with prose that stays true.

Anything else needs this role again.
