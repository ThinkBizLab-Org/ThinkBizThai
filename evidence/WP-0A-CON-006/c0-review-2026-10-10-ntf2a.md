# C0 review of PR #242: WP-0A-CON-006, SC-2 in the CTR-NTF-001 manifest and the `/claude/a5_loom` benchmark (NTF item 2, part 1)

## 0. Who, what, which head

- Reviewer: `/claude/c0_contract_reviewer` (C0, independent Reviewer: contract and record accuracy). Not the Author,
  not A0, not Q0, not the benchmarked run.
- Lineage (RFC-2026-024 §3/4; disposition Q4): one run spawned as a subagent by A0's run (`/claude/a0_atlas`), the
  Author of this PR and of the CTR-NTF-001 proposal, in the same vendor and model family as A0, Q0 (who wrote and
  scored the benchmark) and `/claude/a5_loom` (who took it), on a brief A0 wrote. I review only. I did not fix,
  push or merge anything. The measurements below stand regardless of who ran them.
- PR: #242, branch `agent/claude/WP-0A-CON-006-stale-blockers`, base `main`, tier H.
- Head read: `d361f68bb1603380d184c82f3dcac1c308a72e0c` (`gh pr view 242 --json headRefOid` after `git fetch`).
  Merge base `9296877418cd0939b07829c915717bf13d571d92` (PR #239).
- Commits read: `98186d14` (Q0 sheet, `-x` of `8cb37554`), `c9016ca4` (Q0 scoring and key, `-x` of `d4f6fb07`),
  `56ff27a2` (SC-2, pin, profile, package, transcription, author note), `d361f68b` (handoff, last and alone).
- Worktree: private, branch `c0/WP-0A-CON-006-ntf2a-2026-10-10` from that head. Removed after the commit.
- Measured versus read: everything in §1 was **run** on the head. The full suite, `check:handoff` and
  `record:verification` were **not** run by me; they are Q0's, on the branch name. CI `bootstrap` on the head was
  `IN_PROGRESS` when I read it.

## 1. Measured on the head

| Command / probe | Exit | Result |
|---|---|---|
| `node scripts/verify-branch-scope.mjs 92968774 WP-0A-CON-006` | 0 | all 11 changed paths declared, every amendment explains one |
| `node scripts/db/classify-review-tier.mjs 92968774` | 0 | tier H (contract manifest, contracts test, profile, integrity manifest, `amends_without_owning` widened); base classifier copy |
| `node scripts/db/classify-records-only.mjs 92968774 HEAD` | 1 | NOT records-only, as expected for a full-path PR |
| `npm run -s scan:secrets` | 0 | clean |
| `npm run -s validate:protocol` | 0 | valid |
| `node --test test-kits/contracts/catalog-registry.test.mjs` | 0 | 19/19 |
| same, with only the caveat pin reverted to `7c05ce2b6365a50e` | 1 | red: "ctr-ntf-001.untestable_by_schema was rewritten — digest 7c05ce2b6365a50e became 78c774aedcb5bdbc"; file restored, tree clean |
| `node --test` on `shared-kernel-envelope-contracts.test.mjs`, `schema-mutation-coverage.test.mjs` | 0 | pass |
| `npm run regenerate:manifest`, then `git diff --exit-code` | 0 / 0 | the committed integrity manifest is what the script produces |
| sha256 of `catalog-registry.test.mjs` | — | `fc079471…0116`, equal to its new integrity-manifest entry |
| sha256-16 of the old / new `untestable_by_schema` | — | `7c05ce2b6365a50e` / `78c774aedcb5bdbc`, equal to the pin's old and new values |

Note: `origin/main` moved to `4a0a8bd6` (PR #240) while I read. Against that tip `verify-branch-scope` reports #240's
seven WP-0A-A0-001 paths, because the branch does not contain them; against the merge base it exits 0. #240 and this
PR share no path, and `git merge-tree --write-tree origin/main HEAD` is clean.

## 2. Checks the brief names

**SC-2 wording against A1's words.** A1's condition (`open_blockers[19]`, verbatim): the manifest must state that the
deep-link permission check is evaluated for the **recipient**, at **open time**, and where the recipient's identity
comes from (even if that is "MOD-100, outside this contract"). The new item (4) states all three: "evaluated for the
RECIPIENT … never for tenant_context.actor"; "evaluated at OPEN time … not when the notification is sent"; "The
recipient's identity does not come from this contract … It comes from MOD-100, outside this contract". Holds.
Whether that wording *meets* the condition is A1's ruling (disposition Q3), not mine; see advisory C0-1.

**Manifest change is text-only and claims nothing the contract does not do.** Measured by script: the manifest is one
line of compact JSON before and after; only `untestable_by_schema` differs; every other key is equal and in the same
order; the new value is the old value **exactly** followed by ` (4) …`; ASCII only. `schema.json` and `examples/` are
unchanged. The factual claims in (4) hold against the schema: `deep_link.requires_permission` exists and is required;
`tenant_context` is CTR-TEN-001, whose only principal is `actor`; CTR-NTF-001 has no recipient field (no `recipient`,
`user_id`, `subject` or `principal` anywhere). The item sits under `untestable_by_schema` and states runtime
obligations, not schema enforcement. Holds.

**The pin move and its comment.** One value moves, `7c05ce2b6365a50e` → `78c774aedcb5bdbc`, under a two-line dated
comment naming the increment, SC-2, `open_blockers[19]` and the old digest. Nothing else in the file changes. The
integrity manifest moves that file's digest only. Measured above. Holds.

**Amendment declarations.** `amends_without_owning.paths` is re-declared to exactly the three paths this branch
changes outside `writable_paths`: `catalog-registry.test.mjs` (WP-0A-CON-008), `integrity-manifest.json`
(WP-0A-A0-002), `cc-a5-loom.json` (WP-0A-A0-001). The appended rationale explains each one and only what moved, and
says why the earlier increments' paths are dropped. `recorded_on` gains `WP-0A-A0-001.json` and keeps its five
entries in order. Nothing more is declared. Holds, with advisory C0-3 on one PR number.

**The benchmark chain.**
- Sheet → key: the sheet at `8cb37554` prints `94013cc8…3a5b`; `shasum -a 256` of the committed key prints the same,
  and the committed key is byte-identical (`cmp`) to the copy held in the session scratch area. Both `-x` carries are
  patch-identical to their sources (`8cb37554`, `d4f6fb07`).
- Answer transcription: the dispatch prompt and the resume message are recorded verbatim, the `git status` record is
  present, and the key search reports 0 hits. Diffing the transcription's verbatim section against the scratch
  `a5-bench-answer.md` (sha256 `8e107c42…8036`, the value Q0 recorded) shows two differences: the one disclosed
  redaction in T3 (ii) row F-1, and a trailing newline (advisory C0-4). With the placeholder restored and that newline
  removed, the section hashes to `8e107c42…8036`. No ten-digit `0…` or `+66` number is in the added lines, and
  `scan:secrets` exits 0.
- Scoring → outcome: Q0 §6 applies the sheet's §5 overall rule as written (T5 pass, no T1–T4 fail, no fabrication,
  T3 not a pass ⇒ recommend with conditions).
- `benchmark_outcome`: records "RECOMMEND WITH CONDITIONS", the per-task result as Q0 gives it, the forward-only scope,
  and C-T3. Measured by script: Q0's C-T3 blockquote, with `> ` markers and line breaks collapsed to single spaces, is
  a substring of `benchmark_outcome`. Verbatim. Only `limitations.benchmark_outcome` changes in the profile; no
  capability value, scope or authority sentence moves.

**Append-only and prefix.** `open_blockers` 27 → 28; `[0]`–`[26]` byte-equal to `main`. The `amends_without_owning`
rationale on `main` is an exact prefix of the head's. All other fields of `WP-0A-CON-006.json` are equal; `status`
stays `in_review`. Holds.

**Handoff.** `d361f68b` touches only the handoff. It cites `56ff27a2` as the head before the handoff, base
`92968774`, the six modified and five added files the diff shows, and states CTR-NTF-001 stays Draft. Read true.

## 3. Findings

Stop-the-line: **no**. Blocking: **none**.

- **C0-1 (advisory, for A1).** Item (4) gives two identity sources: "MOD-100 resolves who is notified" and "the
  open-time check takes the identity of whoever opens the link from the application that serves it". Read together,
  the check is evaluated for the *opener* (its last sentence says a non-recipient opener is checked for that person),
  which is the safe reading. But "the application that serves it" is unnamed and does not say the identity is the
  authenticated session's. Whether that is enough for SC-2 is A1's call. Separately, "MOD-100 resolves who is
  notified" is not quoted from a source: Decision Register line 159 gives MOD-100 "notification preference/view/
  deep-link presentation", and the DB plan's notification outbox carries a "recipient reference". It is A0's
  reading; A5 should label it decision or inference in the second PR (C-T3 (a) spirit). A1 explicitly allowed
  "MOD-100, outside this contract", so this does not block.
- **C0-2 (advisory).** `benchmark_outcome` adds, after the verbatim C-T3, "Q0's recommendation is withdrawn rather
  than re-conditioned". Q0 §6 says it "should be withdrawn". The sentence is outside the verbatim quote and cites §6,
  and it is stricter, not looser; a later edit may soften "is" to "should be" or quote Q0.
- **C0-3 (advisory).** The appended rationale says the earlier increments' paths "reached main with their PRs (#194,
  #233, #235)". #233 is a WP-0A-CON-004 PR (`65695129`); the bounds increment and review-conditions closure reached
  main with #209 (`dc7b9684`). The field is append-only, so the correction belongs in a later appended sentence; it
  changes no declaration (the dropped paths are not on this branch).
- **C0-4 (advisory).** The transcription says "Nothing else in the answer is changed", but it also ends the answer
  with a newline the scratch copy lacks. The hash statement holds only once that newline is removed. No content
  effect; worth one clause in a later record.
- **C0-5 (note, not a finding against this PR).** C-T3 (b) and (c) go beyond the sheet's T3 condition row; Q0 says
  so ("(c) is the narrowing the missed element calls for"). It binds the second PR: Q0 re-reads the A5 file against
  (a)–(c) before the signature is cited.
- **C0-6 (note).** The branch is behind `main` by PR #240 with no shared path. If A0 merges `origin/main` before the
  press, the carry clause (b) below applies.

## 4. Verdict

**`review_approved`** on head `d361f68bb1603380d184c82f3dcac1c308a72e0c`. SC-2 is stated in the CTR-NTF-001
manifest in A1's three elements, text-only, with no claim the contract does not make; the pin, the integrity digest
and the three amendment declarations move exactly as stated; the benchmark chain closes from sheet to key hash to
transcription (one disclosed redaction) to scoring to `benchmark_outcome`, which carries Q0's outcome and C-T3
verbatim; `open_blockers` and the rationale are append-only. This approval is not A1's SC-2 confirmation, not A5's
ratification and not a press.

## 5. Carry clause

This verdict carries to a later head of this PR if every commit after `d361f68bb1603380d184c82f3dcac1c308a72e0c` is
one of the following:
(a) another role's evidence file, carried with `cherry-pick -x` and touching only that file;
(b) a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync` exits 0,
`regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this PR's paths;
(c) the handoff refreshed last and alone, with prose that stays true.
Anything else needs C0 again.
