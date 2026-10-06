# WP-0A-CON-004: Independent Tester carry reading after `main` moved

Package: Secret handle, audit event and observability contracts
Tester run: `/claude/q0_sentinel` (declared `role_assignments.tester_agent_run_id`)
Author run under test: `/claude/a0_atlas`, a different run.
Subject: PR #196, branch `agent/claude/WP-0A-CON-004-security-audit-observability`, head
`f80f586e867748874fa35b1947133ceebcbe5b6b`. `origin/main` is `9e15881b10277b141c651abcaa2eb0ad9e9e0c6f`
(#194, CON-006) and **is contained** in the head (`git merge-base --is-ancestor` exit 0), merged in at
`31879073`.
Verdict carried: `q0-recheck-2026-10-06.md` (`test_verified_with_conditions` at `3082874`).
Trigger: R0's `r0-sync-reading-2026-10-06.md` R-1. My own carry rule says a move of `main` that forces a
second merge needs a new Tester run, and `catalog-registry.test.mjs` took `main`'s pins through a
conflict. This is that run, kept short.
Measured on 2026-10-06. Protocol version: `1.0.0`. Gate: G0. Synthetic only: no provider, no credentials,
no database.

## 0. What I am, and the verdict

I am a subagent spawned by `/claude/a0_atlas`'s workflow orchestration, running as the Tester role
`/claude/q0_sentinel` under RFC-2026-024. The run that spawned me is this package's Author, and it made
the merge I am reading. I took nothing from A0's merge report or R0's reading as measured: every figure
below was re-derived in a private clone. I do not fix. I wrote this one file and nothing else, and I did
not push.

**Verdict: my verdict carries over the merge.** At `f80f586e` the PR's own contract and test lines are
byte-identical to what I verified at `3082874`. The `catalog-registry.test.mjs` conflict is a clean union
by contract ownership, and every resolved pin is guarded both ways (9 of 9 mutations caught). The suite is
692/692, `check:handoff` exits 0, and the required CI run on this exact head is green. **The verdict now
reads `test_verified`** at `f80f586e`, subject to the one mechanical note in §4.

This file is independent Tester evidence only. It is not C0's carry reading, A1's record or R0's
integration verdict. It authorizes no merge and no gate movement.

## 1. Where and how I measured

- Private clone `…/scratchpad/q0-con004-carry`, checked out **on the branch name** with its upstream
  set (`git status -sb`: `## agent/claude/WP-0A-CON-004-security-audit-observability...origin/agent/claude/WP-0A-CON-004-security-audit-observability`),
  `origin` set to the GitHub remote and fetched, `origin/HEAD` set to `origin/main`, a local `main` at
  `origin/main`. This avoids the `origin/HEAD` pitfall in §1 of my re-check.
- Node `v24.20.0`, npm `11.19.0` from `/Users/bank/.local/node-v24.20.0/bin`, first on `PATH`. `npm ci`
  exit 0.
- A throwaway copy, `…/scratchpad/q0-con004-carry-mut`, on the same branch name, for the mutations. Each
  mutation started from and ended on a clean tree; nothing there was committed.

## 2. What changed since my verdict head `3082874`

| Check | Result |
|---|---|
| `git diff --quiet 3082874 HEAD -- contract-catalog/shared-kernel/ctr-{sec,aud,obs}-001` | exit 0: this package's three contracts are byte-identical to my verdict head |
| PR `+`/`-` lines under `contract-catalog/` and `test-kits/`, excluding `catalog-registry.test.mjs` and the integrity manifest: `git diff fa102298 3082874` vs `git diff 9e15881b HEAD` | sha1 of both `e876b42c…`: **identical** |
| `git diff --name-only 9e15881b HEAD -- contract-catalog test-kits` | the six SEC/AUD/OBS schema and manifest files, `catalog-registry.test.mjs`, `integrity-manifest.json`. Nothing else |
| `git diff --stat 3082874 HEAD -- scripts .github architecture package.json package-lock.json .node-version CONTRIBUTING_AGENTS.md` | empty |
| `work-packages/WP-0A-CON-004.json`, `3082874..HEAD` | one string changed: `open_blockers[15]` closed in place (`84074eff`). Not a rule, not a contract claim |
| `git diff --name-only 31879073 HEAD` | `r0-sync-reading-2026-10-06.md` and the handoff only: R0's file, then the refresh last and alone |

## 3. The resolved pins in `catalog-registry.test.mjs`

| Check | Result |
|---|---|
| `git diff -U0 9e15881b HEAD` (vs `main`) | exactly the PR's six pin lines: `CAVEAT_DIGESTS` `freeze_boundary` for `ctr-aud-001`, `ctr-obs-001`, `ctr-sec-001`, and the annotation pins `ctr-aud-001` (23, `3628c9d7…`), `ctr-obs-001` (21, `66946f6c…`), `ctr-sec-001` (21, `c6383e79…`, the A1 N-1 pin I verified) |
| `git diff -U0 a8f45dd9 HEAD` (vs the pre-merge branch tip) | exactly `main`'s lines: `CAVEAT_DIGESTS` `ctr-ntf-001` and `ctr-usg-001`, the `ctr-usg-001` annotation pin (15, `6819e111…`), the NTF fixture list, the NTF/USG `source_references` pins. No line is new to both sides |
| `shasum -a 256` of the file at the head | `17a6ea142e3f6fa5aa3e6f51d74465b8d0cf21e4ce0d4bca6d576aec55e8fc93`, equal to its integrity-manifest entry |
| `npm run regenerate:manifest` | `rebuilt 91 digest(s)`, `git status --porcelain` empty: every committed digest equals its file |

### Mutations at `f80f586e`

The run covers all `test-kits/contracts/*.test.mjs` plus `integrity-manifest-rebuild.test.mjs` and
`test-coverage-floor.test.mjs` (117 tests). Control 117/117 before and after the campaign. In the
mutations marked *rehash*, the integrity digest was rewritten to the mutated bytes, so the integrity
tests cannot catch them and only the pin itself can. Script: `…/scratchpad/q0carry-mut.sh`.

| # | Mutation (a resolved value reverted to the other side) | Caught by |
|---|---|---|
| M1 | `ctr-sec-001` `freeze_boundary` → `main`'s `5a5bd195…` | 6 tests: `a caveat cannot be replaced by its opposite` and 5 integrity tests |
| M1r | the same, *rehash* | `a caveat cannot be replaced by its opposite` (the message names `ctr-sec-001.freeze_boundary`) |
| M2r | `ctr-obs-001` annotation pin → `main`'s `19, 117d7f1a…`, *rehash* | `an annotation cannot be rewritten, deleted or added without being written down` |
| M3r | `ctr-aud-001` `freeze_boundary` → `main`'s `5a435a5c…`, *rehash* | `a caveat cannot be replaced by its opposite` |
| M4r | `ctr-ntf-001` `freeze_boundary`/`untestable_by_fixture` → the branch's old `0d7a35df…`/`0b3a2ecd…`, *rehash* | `a caveat cannot be replaced by its opposite` |
| M5r | `ctr-usg-001` annotation pin → the branch's old `14, cb3bf23e…`, *rehash* | `an annotation cannot be rewritten, deleted or added without being written down` |
| M6r | `ctr-usg-001` `source_references` → the branch's old `064d3597…`, *rehash* | `the normative manifest fields cannot be rewritten or invented` |
| M7 | integrity digest of the file → the branch's pre-merge `6403f1e5…` | 5 integrity tests (`gutting a protected file is caught by its content digest` and four more) |
| M8 | integrity digest of the file → `main`'s `a00c7828…` | the same 5 integrity tests |

**9 of 9 caught.** Taking either side's value for any resolved pin fails the suite, even when the
integrity digest is made to agree. Taking either side's integrity digest fails too.

## 4. Declared commands at `f80f586e`, on the branch name

| Command | Result |
|---|---|
| `node --test test-kits/contracts/catalog-registry.test.mjs` | exit 0, tests 15, pass 15 |
| `node --test test-kits/contracts/*.test.mjs` | exit 0, tests 79, pass 79 |
| 117-test contract and integrity subset | exit 0, 117/117 |
| `npm run check` | exit `0`: tests 692, pass 692, fail 0, cancelled 0, skipped 0 |
| `npm run check:handoff` | exit `0`: `describes the branch: nothing substantive after its cited head` |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-004` | exit 0: `all 21 changed path(s) are declared, and every amendment explains one` |
| `node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-004.json` | exit 0 |
| `npm run scan:secrets` | exit 0 |
| GitHub | `Bootstrap validation` run `37411240076` on `f80f586e`: `success`. PR #196: `OPEN`, not Draft, `mergeable: MERGEABLE`, `headRefOid` `f80f586e` |

**Note (mechanical, not a defect).** This file is an ordinary commit on top of `f80f586e`, so once it is
carried the handoff no longer cites the tip, and the in-suite guard and `check:handoff` go red until the
handoff is refreshed again, last and alone, with C0's carry reading before it. The green run that counts
is on that final refresh head.

## 5. Findings

None new. O-2 (two rules held only by the generic pin) and O-3 (closure §5 heading cites the old base)
are carried, both non-blocking. Nothing is stop-the-line: no secret, tenant data or real credential, and
the merge adds no fixture of this package.

## 6. Verdict

**`test_verified`** at `f80f586e867748874fa35b1947133ceebcbe5b6b`, carried from `q0-recheck-2026-10-06.md`
over the `main` merge `31879073`. F-2 and O-1 of that file hold at this head (handoff refreshed last and
alone, `check:handoff` 0, CI green with `main` contained).

**Carry rule.** This verdict carries to the final refresh head without another Tester run if `git diff
f80f586e <final-head>` touches only `evidence/WP-0A-CON-004/` files and
`handoffs/WP-0A-CON-004-author-handoff.json`, and `bootstrap` is green there. If `main` moves again, a
clean merge whose only change to this PR's `+`/`-` lines is a regenerated integrity digest equal to its
bytes carries too. Any conflict in `contract-catalog/shared-kernel/ctr-{sec,aud,obs}-001/**` or in this
package's pins, or a resolution that takes a value from neither side, needs a new Tester run.

Wording A0 may record on my behalf:

> Q0 (/claude/q0_sentinel) test_verified, carried over main 9e15881 merged at 31879073
> (evidence/WP-0A-CON-004/q0-carry-reading-2026-10-06.md): the PR's contract and test lines unchanged
> since 3082874; catalog-registry.test.mjs resolved by contract ownership, every resolved pin guarded
> both ways (9/9 mutations caught, 6 with the integrity digest made to agree); npm run check 692/692
> and check:handoff 0 at f80f586e on the branch name; bootstrap run 37411240076 green there.

Stop-the-line: **no.** Blocks the owner merge: **no** from the Tester side, once the final refresh head
has a green `bootstrap` run.

Attested by `/claude/q0_sentinel` against `f80f586e867748874fa35b1947133ceebcbe5b6b` on the branch name,
with `main` @ `9e15881b10277b141c651abcaa2eb0ad9e9e0c6f`.
