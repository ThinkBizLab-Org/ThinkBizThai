# WP-0A-CON-006: CTR-USG-001 Draft → Candidate (Author increment, 2026-10-09)

Written by a subagent of `/claude/a0_atlas`, the Author. It states what this increment changes, what it was checked
against, and what it leaves undone. It is not a role verdict. The Author approves, test-verifies and integrates
nothing.

Branch `agent/claude/WP-0A-CON-006-stale-blockers` (this package's `ownership.branch`), fast-forwarded from
`dfac3d00` (an ancestor of main) to `origin/main` `65695129` (PR #233). PR #233 moved CTR-SEC-001, CTR-AUD-001 and
CTR-OBS-001 and is the template for this increment. Full path, tier H.

## 1. Commits, in order

| Commit | What | Why first / why separate |
|---|---|---|
| `a98910d2` | A6's signature, `git cherry-pick -x c68cc97c` | the co-owner signature on USG (RFC-2026-031 §3.2 (2), §4.1 (1)) |
| `e4f5b2f4` | the status move, every file of it in one commit | RFC-2026-031 §4.5, "All of these move in one commit" |
| `b0264087` | A6 §8's permitted sentence swap in `untestable_by_schema` (5) and (6), with its digest pin | kept apart so that `e4f5b2f4` is the pure status move A6 §8 describes |
| next | `work-packages/WP-0A-CON-006.json` records and this file | the records cite `e4f5b2f4` and `b0264087` |
| last | the handoff, refreshed last and alone | |

The Owner's disposition (`อนุมัติ USG (Recommended)`) is already on `main` in
`evidence/WP-0A-CON-004/product-owner-disposition-2026-10-09-candidate-sec-aud-obs-usg.md` §2 item 5, merged with
PR #233, so no disposition commit is needed here.

## 2. A6's §8 conditions, checked

| Condition | Check | Result |
|---|---|---|
| A6 §0: the signed blobs are the text on main | `git rev-parse origin/main:contract-catalog/shared-kernel/ctr-usg-001/{schema.json,manifest.json,examples}` | `af83ccca…`, `4d3e647c…`, `3074198f…`: equal to A6's §0. `git diff --stat d17ff256 origin/main -- …/ctr-usg-001` is empty |
| §8: in the directory, the promotion commit changes only `"status"` | `git diff d17ff256 e4f5b2f4 -- contract-catalog/shared-kernel/ctr-usg-001` | one hunk, `-  "status": "Draft",` / `+  "status": "Candidate",`; nothing else |
| §8: outside it, only index status, registry pin, census assertions, integrity manifest | `git show --stat e4f5b2f4` | those, plus `tests/db/identity/identity-isolation.test.mjs`: two assertions that read USG's manifest status. **Flag for A6 and the roles:** they are status assertions, not contract text; whether they sit inside "the census assertions" is A6's to say |
| §8: the swap, "and nothing else in the contract" | `git diff --word-diff=porcelain e4f5b2f4 b0264087 -- contract-catalog` | exactly the two sentences A6 quotes, each replaced by "Countersigned by A6 on 2026-10-09: evidence/WP-0A-CON-006/a6-candidate-signature-2026-10-09.md."; `schema.json` `af83ccca` and `examples/` `3074198f` unchanged at `b0264087` |
| §8: "together with the digest pin that follows" | `git show b0264087 -- test-kits/contracts/catalog-registry.test.mjs` | `CAVEAT_DIGESTS` ctr-usg-001 `untestable_by_schema` `cbd0acbf2f282076` → `0c2b8e05d11523d7`, the value the guard reported; integrity manifest regenerated |
| Version | manifest, index, registry pin | `1.0.0`, unchanged |
| `freeze_boundary` | the diffs above | unchanged |

## 3. What is recorded in `work-packages/WP-0A-CON-006.json`

A6's wording is copied by a script from §7 of the signed file: blockquote lines joined with single spaces, characters
kept byte for byte, old entries kept whole.

| Index | Source | Edit |
|---|---|---|
| `[13]` | A6 §7, "For `open_blockers[13]`" | appended, with backticks as written; `[13]` stays open for `[22]` (A5) |
| `[18]` | A6 §7, `open_blockers[18]` | prefixed CLOSED with A6's words, old text after "Text as recorded:" |
| `[23]` | A6 §7, `open_blockers[23]` | prefixed CLOSED with A6's words, old text after "Text as recorded:" |
| `[25]` | A6 §7, new entry | appended verbatim |
| `[26]` | A0 | the move at `e4f5b2f4`, the swap at `b0264087`, A6's file, the Owner's disposition path, A6's two conditions of use, the scope note, and what is not done |
| `required_human_authorities` | A0 | one entry appended: the Owner's disposition naming CTR-USG-001 is given |
| `ownership.amends_without_owning` | A0 | paths set to the six files changed outside `writable_paths`; rationale appended; `recorded_on` added |

`status` stays `in_review` (it is `in_review` on main). This increment owes its own C0, A1, Q0 and R0 round.

## 4. The `recorded_on` gap

On PR #233, A1 observed and R0 recorded as R-233-1 that WP-0A-CON-004's `recorded_on` omitted WP-0A-CON-001 and
WP-0A-CON-002. This package's field had no `recorded_on` at all. It now lists every owner whose file this increment
amends, each of which owes the record on its next PR:

| File | Owner | Integration Owner (acknowledgement owed) |
|---|---|---|
| `contract-catalog/shared-kernel/index.json` | WP-0A-CON-001 | `/root/r0_steward` |
| `test-kits/contracts/shared-kernel-contract-catalog.test.mjs` | WP-0A-CON-001 | `/root/r0_steward` |
| `test-kits/contracts/shared-kernel-envelope-contracts.test.mjs` | WP-0A-CON-002 | `/claude/r0_steward` |
| `test-kits/contracts/catalog-registry.test.mjs` | WP-0A-CON-008 | `/claude/r0_steward` |
| `tests/db/identity/identity-isolation.test.mjs` | WP-0A-DB-00 (`tests/db/identity/**`) | `/claude/r0_steward` |
| `test-kits/integrity-manifest.json` | WP-0A-A0-002 | `/claude/r0_steward` |

`/root/r0_steward` is the earlier Codex run. A CON-001 acknowledgement by it is owed, as R0 noted on #233 (R-233-2).

## 5. Tests

- `node --test test-kits/contracts/*.test.mjs tests/db/identity/identity-isolation.test.mjs` at `e4f5b2f4`'s tree:
  390/390. `identity-isolation.test.mjs` needs no database (its header: "What can be proven about the batch 010
  isolation suite WITHOUT a database"), so it was run.
- `node --test test-kits/contracts/*.test.mjs` at `b0264087`: 83/83.
- The full suite runs under `scripts/commit-when-clean.mjs` on the handoff commit; its count is in the handoff.

## 6. Not done here

- **RFC-2026-010's status line** still reads "CTR-SEC-001 awaits A1; CTR-AUD-001, CTR-OBS-001 and CTR-USG-001 await
  A6". It is WP-0A-CON-008's file and editing it would make this a governance PR. Owed to a WP-0A-CON-008 step, with
  A6's §7 sentence (the same as in `evidence/WP-0A-CON-004/a6-candidate-signature-2026-10-09.md` §7).
- **`test-kits/ratchets-bite.test.mjs`** is not touched: its Draft-promotion reversal names CTR-NTF-001, which stays
  Draft.
- **CTR-NTF-001** stays Draft: A5's assessment and ratification (`[1]`, `[2]`, `[19]`, `[22]`) are owed.
- **Freeze** items stay as in A6 §6: (5) undeclarable (RFC-2026-031 §5.5(3)); N-U1 (dead `dedupe_key.minLength`,
  WP-0A-CON-003); N-U3 / `[24]` (WP-0A-DB-00).
- The owners' records of the amendments (§4).
- The scope fields `scope.exclude` and `contracts_produced` still describe the materialization increment
  ("Contract freeze-level advancement", "at Draft only"). They are kept as written, as WP-0A-CON-004 did; `[26]` says
  why.
