# Records transcription: owner-side amendment records for #279 and #287, merge records of #264 and #267 (2026-10-18)

Scribe: `/claude/a0_atlas` (A0, this package's Author), drafted by a subagent of that run. Every word recorded is a
role's own, in its file on `main`, or the Owner's, in a disposition on `main`; the facts were read from `gh` and `git`
on 2026-10-18 against `main @ dbde14da`. Every quote was extracted by script from its file (whitespace folded, because
the sources wrap their lines), not retyped. A0 decides nothing here, gives no acknowledgement and moves no status.

## 1. What R0 asked for

- R0-287-2 (`evidence/WP-0A-A0-004/r0-review-2026-10-17-pr287-r3.md` §7): WP-1A-A0-002 has no `ownership.amended_by`
  entry naming PR #287's amendment or PR #279's; transcribe both, citing R0's acknowledgement.
- R0-AUD1017-3 (`evidence/audits/2026-10-17/r0-audit.md` §7 item 3): merge records of #264 (`94c858f0`) and #267
  (`f64c537b`); a closing clause on `open_blockers[0]` ("AUTHOR COMPLETE ONLY …", stale since #257); a note on `[6]`
  item (1) that Q0-257r6-1's tests merged in #267. Then the status move of §5, once C0's and Q0's package verdicts are
  on `main`.

## 2. Facts

| Fact | #264 | #267 | How verified |
|---|---|---|---|
| Merged | 2026-10-15T03:21:00Z, `workstationgroup` | 2026-10-15T15:55:22Z, `workstationgroup` | `gh pr view <n> --json mergedAt,mergedBy` |
| Merge | `94c858f00652499f773c6af39f128a484d8eeaca` | `f64c537b746ad04b035340fd60ef80dc86225103` | `gh pr view` `mergeCommit` |
| Parents | `5e0eef47…` (main), `d980fed1…` (final head) | `6fb5ab13…` (main), `8ca23b1f…` (final head) | `git log -1 --format=%P`; `git merge-base --is-ancestor M^1 M^2` true; `M^{tree}` = `M^2^{tree}` |
| CI | run `38673843811`, `bootstrap` `116222841512`, `application` `116228649322`, success; 827/827 | run `38762107334`, `bootstrap` `116515778329`, `application` `116523553199`, success; 835/835 | `gh run list --commit <head>`; `gh run view <id> --json jobs`; `--log` |
| Lane printed | `tier: H, lane: risk` | `tier: H, lane: governance` | the `review tier and lane:` line of that run |
| Readings | C0, A1, Q0, R0 at `86f3d767` | C0, A1, Q0, R0 round two at `e7c48160` | the role files under `evidence/WP-1A-A0-002/` |
| After the readings | four role files, handoff, merge `9ed86da1` (PR #262), handoff | four role files, merge `fdd6b583` (PR #273), handoff | `git log <reading>..<final head>` |
| Press | A0, risk lane, RFC-2026-034 §2.2 (Q-034-1) | A0, the Owner's 2026-10-15T02:13:35Z answer, q.2 | `r0-audit.md` §2 table, §3 |

PR #279: merged as `42b37f00` (final head `996b24d2`), the last R0 reading at `4754f394`. PR #287: merged as
`f025d3d1` (final head `2ffa49c3`), the last R0 reading at `2c50e9a8`; `git diff --stat 2c50e9a8 2ffa49c3 --
test-kits/app-stack.test.mjs` is empty. #279 moved app-stack's floors in `scripts/test-suite-contract.mjs` 19 to 21
tests and 175 to 204 assertions (`git diff 42b37f00^1 42b37f00`); #287 did not move them.

## 3. Recorded

- `work-packages/WP-1A-A0-002.json` `ownership.amended_by`, new, two entries (WP-0A-A0-004's #279 and #287), each with
  R0's acknowledgement verbatim: for #279 its four rounds (`r0-review-2026-10-16-pr279.md` and `r0-reread`,
  `r0-reread3`, `r0-reread4`); for #287 rounds 3 and 2 (`r0-review-2026-10-17-pr287-r3.md` §3, `-r2.md` §3) and the
  R0-287-2 finding.
- `open_blockers[0]`: a closing clause appended after the old text, which stays whole as the prefix.
- `open_blockers[6]`: a note on item (1), quoting Q0's "closed" from `q0-review-2026-10-15-pr267.md`; the old text stays
  whole as the prefix.
- `open_blockers[8]`, `[9]`: the merge records of #264 and #267, new at the end. `[1]`–`[5]` and `[7]` byte-equal.
- `status` stays `in_review`. R0's audit gives `integration_verified` at `f64c537b` only "once C0's `review_approved`
  and Q0's `test_verified` for the package are on `main`"; neither is.

## 4. Not done here

- The scripts/test-suite-contract.mjs and integrity-manifest sides of #279 and #287 are WP-0A-A0-002's records.
- Owners' `amended_by` entries for #255, #257, #259 and #260 (R0-AUD1015-6, `r0-audit.md` §7 item 9) and #270
  (R0-270-2) are not transcribed here.
- PR #286's merge record (`ba3efcfd`), merged after the audit's range, is not in R0's §7 list and is not recorded here.
- Whether R0-287-2 and R0-AUD1017-3's item 3 are closed is R0's to write.
