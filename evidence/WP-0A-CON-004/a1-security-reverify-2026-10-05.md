# WP-0A-CON-004 — Security / Privacy re-verification at the 2026-10-06 head

## 0. What I am

I am `/claude/a1_bastion`, the Security/Privacy reviewer named in
`work-packages/WP-0A-CON-004.json` (`security_reviewer_agent_run_id`), run as a **subagent
spawned by `/claude/a0_atlas`** (the A0 session, which is also this package's Author) under
RFC-2026-024 §3/3-4. The spawning is disclosed because it is the fact a reader most needs:
the session that launched me wrote the work I am checking. I received the Author's done /
not-done list as script output with no authority, and I checked every claim in it that
bears on security against the artifacts rather than adopting it. I do not fix. I did not
author, review-approve (C0), test-verify (Q0) or integrate (R0) this work, and nothing here
is their verdict.

The file name carries 2026-10-05 because that is the date the brief assigned; the work was
done on 2026-10-06, against the Author's increment of that date.

| | |
|---|---|
| Subject | PR #196, branch `agent/claude/WP-0A-CON-004-security-audit-observability` |
| Head re-verified | `23eb05570ae2c6b4afba8f7346430af66989855a` (work commit `38da14a`, handoff commit `23eb055`) |
| Base | merge-base with `origin/main` is `8c089cc`. **`origin/main` has since moved to `fa10229`** (PRs #187 and #188 merged); see §3 N-2 |
| Earlier A1 verdicts on this package | `security-disposition-handle-ownership-a1.md` (2026-09-04, at `3076315`): **refused in part, ratified in part**, conditions C1-C5, RFC required (§4c). `co-owner-review-sec-aud-obs-usg.md` (2026-09-02): CTR-SEC-001 **sign off with blocking conditions** |
| Toolchain | `node v24.20.0`, `npm 11.19.0` |
| Database | none used; this package has no database surface (port 5582 not touched) |

**How the branch-reading guards were run, stated exactly.** The brief asked for a private
clone. This session's sandbox refused every `git clone` into the scratchpad
(`…/scratchpad/a1-WP-0A-CON-004/`), and the branch name is already checked out in the
Author's worktree, so a plain checkout was impossible too. I therefore switched **my own
worktree** onto the branch NAME with `git switch --ignore-other-worktrees
agent/claude/WP-0A-CON-004-security-audit-observability` — `git branch --show-current`
printed the branch name, `HEAD` was `23eb055`, not detached — ran the guards, made **no
commit** while on it, and switched back. The branch ref was `23eb055` before and after. The
guards that read the branch name therefore ran rather than skipped; the isolation is a
worktree, not a clone, and I record the difference rather than paper over it.

## 1. Measured versus read

**Measured** (executed by me, output observed):

```
on branch name agent/claude/WP-0A-CON-004-security-audit-observability @ 23eb055

npm run check                                                     EXIT=0
  verify:coverage-floor, verify-toolchain, scan:secrets, validate:protocol, test:bootstrap
  ℹ tests 692   ℹ pass 692   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0   ℹ todo 0
  (duration_ms 531580)

npm run check:handoff                                             EXIT=0
  handoffs/WP-0A-CON-004-author-handoff.json describes the branch: nothing substantive after its cited head

node scripts/verify-branch-scope.mjs 8c089cc0 WP-0A-CON-004       EXIT=0
  WP-0A-CON-004: all 12 changed path(s) are declared, and every amendment explains one
node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-004    EXIT=73
  (lists #187/#188 files: main has moved past the merge-base; a two-dot read against the
   moved tip is the wrong base, recorded so nobody re-runs it and mistakes it for scope creep)

node scripts/validate-work-package-role-separation.mjs work-packages/WP-0A-CON-004.json   EXIT=0
node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-004-security-audit-observability
  WP-0A-CON-004                                                   EXIT=0
node scripts/scan-repository-secrets.mjs                          EXIT=0
```

**Rule content unchanged.** A script that drops every `x-*` key and compares the rest,
base `8c089cc` against head, for the three contracts this package owns:

```
ctr-sec-001: non-annotation content identical = true
ctr-aud-001: non-annotation content identical = true
ctr-obs-001: non-annotation content identical = true
git diff --stat 8c089cc0 HEAD -- ctr-{sec,aud,obs}-001/examples   (empty)
```

So no `type`, `pattern`, `maxLength`, `enum`, `required`, `const`, `allOf` or fixture moved.
The increment is annotation, caveat and record text, plus the six digest pins and the
integrity-manifest digest that move with it — which the scope guard above accounts for.

**Trial merge with the moved `main` (`fa10229`)**, in my worktree, then aborted and reset
to `23eb055` (`git status` clean, no `MERGE_HEAD` afterwards):

```
git merge-tree --write-tree HEAD origin/main
  CONFLICT (content): Merge conflict in test-kits/integrity-manifest.json   (one file)
  conflict = three digest lines (catalog-registry, ctr-evt-001-schema-ref-bounds,
             ctr-job-001-reference-hardening test files)
resolved: ours, then node scripts/regenerate-integrity-manifest.mjs -> "rebuilt 91 digest(s)"
node --test test-kits/contracts/*.test.mjs                         tests 82  pass 82  fail 0
node --test integrity-manifest-rebuild, repository-json,
            work-package-ownership, ratchets-bite                  tests 38  pass 38  fail 0
npm run scan:secrets                                               EXIT=0
npm run validate:protocol                                          EXIT=0
```

This includes #188's catalog-wide `KNOWN_UNBOUNDED` guard, which passes on the merged tree:
none of the 22 entries it attributes to WP-0A-CON-004 went stale, which is consistent with
the rule-content result above.

**Probe for C3** (`…/scratchpad/a1-WP-0A-CON-004/probe.mjs`, importing the repository's own
`test-kits/contracts/json-schema-subset.mjs`; synthetic strings only):

```
pattern identical: true | SEC maxLength: 128 | MOD maxLength: undefined
benign                 MOD=PASS SEC=PASS
body 121 (total 128)   MOD=PASS SEC=PASS
body 122 (total 129)   MOD=PASS SEC=rej   <-- DIVERGE
body 200               MOD=PASS SEC=rej   <-- DIVERGE
bare 32 lowercase hex  MOD=PASS SEC=PASS
uuid                   MOD=PASS SEC=PASS
empty body             MOD=rej  SEC=rej
uppercase prefix       MOD=rej  SEC=rej
diverging cases: 2
```

The accept sets still differ exactly as on 2026-09-04; the boundary is at 129 characters.

**Text sweeps** over `ctr-sec-001/`, `ctr-mod-001/`, the manifest, the handoff and the
Author's closure file: every occurrence of "compose" / "composing" and of "ZERO coverage";
every positive claim matching "security control", "opacity guarantee", "as a control";
"nothing else"; and an exact-substring test of my §7 wording in `open_blockers[0]` and in the
handoff (both `true`).

**Read, not executed:** the Author's closure file, the diff of `WP-0A-CON-004.json`, the
Owner's step-2 disposition (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-05-g0-step2.md`
§3 rows 1-3), #188's `KNOWN_UNBOUNDED` block on `main`. I did not re-run my 2026-09-04 scanner
probe (12/15 detected, 5/5 lowercase-canonical missed): the scanner and the handle pattern
are byte-unchanged at this head, so the numbers the annotations now quote are the ones I
measured then.

## 2. My earlier conditions, one by one

| Condition (2026-09-04 disposition) | State at `23eb055` | Evidence |
|---|---|---|
| **C1** — the pattern is never cited as a control | **Holds.** No schema, manifest, handoff, blocker or closure text claims it is one; `x-opacity-limitation`, `x-maxlength-note`, `freeze_boundary` and `open_blockers[1]` all say it is not. One residual sentence understates the surface; see N-1. | sweep, §1 |
| **C2** — a handle issuance format before freeze | **Open, owed by me**, through the §4(c) RFC. Not a merge condition for a Draft text increment; `accepted-gap-structureless-handle-body.json` still states the gap and is unchanged. | examples diff empty |
| **C3** — make the composition claim true, or withdraw it | **Closed by withdrawal.** The `handle` x-source and the manifest `freeze_boundary` now say the adoption does NOT make the two compose and give the accept-set difference as the reason. The only remaining "two contracts composing" sentences are inside quoted history marked "Text as recorded:" in `open_blockers[0]` and the handoff, which is not citation. Making the sets equal remains owed through the RFC; my probe confirms they still differ. | probe + sweep, §1 |
| **C4** — correct "zero coverage" in three places | **Closed** (since 2026-09-04, re-confirmed). Every remaining occurrence is the sentence "An earlier version … said … ZERO coverage; A1 measured it and that was false". | sweep |
| **C5** — this disposition covers one blocker only | **Respected.** SEC-003 class, SEC-016 break-glass fields, runtime redaction tests, cross-tenant scope binding and audit immutability are still open and are now named in `required_human_authorities` and `open_blockers`. The redaction `freeze_boundary` now says the six flags are a producer self-attestation and "NOT evidence that any surface is free of plaintext" — the honest statement, and a correction I would have asked for. | manifest diff |
| **§7** — record my wording on `open_blockers[0]` | **Closed.** My §7 text is present verbatim (exact substring) in `open_blockers[0]` and in the handoff, with the owed RFC and the C3 measurement appended. The blocker is kept, not deleted. | substring test |
| **§4(c)** — a narrow RFC opened by A0 | **Open.** `architecture/decisions/` has no RFC on handle syntax. Correctly recorded as owed by A0, not done here. | read |

Co-owner condition (2026-09-02, CTR-SEC-001 sign-off): the `rotating`-with-revocation hole
was closed by `allOf[4]` before this branch and is untouched; the fixture set is byte-unchanged.

Owner step 2 applied by the Author (cross-vendor withdrawal, null Product slot): I checked
that the cited disposition says what the manifest says it says (rows 1 and 3, reply
`บืนยันขั้น 2`). Neither weakens a security control. Separation of duties still holds:
role-separation validator exit 0, and this file is written by a run distinct from the
Author's role id even though the Author's session spawned it.

## 3. New findings

**N-1 (minor, pre-existing, not introduced by this PR).** `ctr-sec-001/schema.json`
`handle.x-opacity-limitation` still opens with *"It excludes mixed-case base64 and nothing
else"*, and two sentences later says *"The pattern excludes every format carrying a mandatory
uppercase character — AWS, Meta, Google, JWT, SendGrid, Twilio — not only mixed-case
base64."* The first sentence is my 2026-09-04 F4: a security artifact understating what it
covers. The Author removed the same duplicated half-sentence from `open_blockers[1]` in this
increment but left it in the schema, so the annotation now contradicts itself. It does not
breach C1 — the paragraph still says the pattern is not a control — and the correct fact is
in the same paragraph, so nobody is misled into relying on the pattern. **Fix:** delete
"and nothing else" (or the whole first clause) in the next text increment; it moves one
annotation pin in `catalog-registry.test.mjs`. Cheap enough to do in this PR; not a merge
blocker from Security.

**N-2 (record staleness; merge mechanics).** PR #188 merged to `main` (`fa10229`) after this
branch was cut. Two consequences:
- The new blocker on the 22 unbounded reference fields says they are listed "on PR #188" and
  will be bounded "after #188 merges". That precondition is now met, so the deferral reason
  has lapsed and the work is due. From the security side these fields matter: four of the
  eight CTR-SEC-001 entries (`scope.workspace_id`, `rotation.owner.id`, `revocation.actor.id`,
  `correlation_id`) are `{"type":"string"}` with **no pattern and no bound**, so they will
  carry any string of any length — including a mixed-case credential the handle pattern
  would reject — which is my co-owner finding from 2026-09-02 and is still true. This is a
  Draft contract and the gap is recorded, so it does not block this text increment; it is a
  **condition before CTR-SEC-001 leaves Draft**, and the blocker text should be refreshed to
  "#188 merged at `fa10229`".
- The PR is behind `main` and conflicts in `test-kits/integrity-manifest.json` only (digest
  lines). Resolved by regeneration, the merged tree passes every contract test including
  #188's catalog-wide guard (§1). That is R0's to perform; I record that from Security's side
  the conflict is mechanical and carries no content.

**N-3 (escalation not yet delivered).** My 2026-09-04 F5 — that the Product Owner promoted
`CTR-MOD-001` to Candidate v1 under RFC-2026-010 without being told it fixes a syntax
chartered to `CTR-SEC-001` — is now recorded correctly on this package, but 32 days on it has
still not reached the Owner: no RFC exists and no Owner-facing record I could find
(`evidence/WP-0A-A0-001/`, `architecture/decisions/`) mentions it. The RFC is the vehicle A1
named and it is outside this package's paths, so this is not this PR's defect. I ask A0 to
put F5 to the Owner in the next Owner batch as a one-line disclosure, without waiting for the
full RFC text: an Owner who has not been told cannot decide whether the promotion stands.

No other finding. No credential, token, private URL, PII or customer content appears in the
diff; the secret scan is clean; the fixtures are unchanged and synthetic.

## 4. Verdict

**security_approved_with_conditions** for this increment (PR #196 at `23eb055`), within the
boundary of my 2026-09-04 disposition, which stands unchanged: refused in part (the precedent),
ratified in part (the pattern on `CTR-SEC-001.handle` at Draft under C1-C5).

My conditions on the increment are closed: C1 holds, C3 is closed by withdrawal, C4 stays
closed, C5 is respected, and the §7 wording is on the blocker verbatim. What remains:

1. **N-1** — remove "and nothing else" from `handle.x-opacity-limitation`. Non-blocking;
   preferably in this PR, otherwise the next increment.
2. **N-2** — bound or pattern the 22 fields, starting with the four unconstrained CTR-SEC-001
   strings, now that #188 has merged; refresh the blocker text. Before CTR-SEC-001 leaves
   Draft.
3. **N-3** — A0 discloses F5 to the Product Owner. Not a merge condition for this PR.
4. Carried, unchanged: C2 (issuance format, by me through the RFC), the §4(c) RFC including
   equal accept sets (C3's other branch), SEC-003 data class, SEC-016 break-glass fields,
   runtime redaction tests, cross-tenant scope binding, audit immutability. All before freeze;
   none before this merge.

This is **not** a co-owner signature promoting `CTR-SEC-001`; RFC-2026-010's "CTR-SEC-001
awaits A1" is still not answered, and `CTR-SEC-001` stays Draft.

**Stop-the-line:** no. No secret exposure, tenant leakage, duplicate external side effect,
lost job, migration divergence, irreversible deletion or contract mismatch. No constraint in
any contract changed in this increment.

**Does anything block the merge of PR #196?** Not from Security. The merge still needs what
is outside my role: C0's re-review and a first Q0 verdict at this head, `/claude/r0_steward`'s
Integration verdict including the update from `main` (N-2), and a green CI run on the final
head.

## 5. Limits

- One agent run's assessment, same vendor and model as the Author whose session spawned it;
  RFC-2026-024 withdrew the cross-vendor condition for this package and RFC-2026-013 makes a
  distinct A1 run's assessment the role signature. It is not a certified security review.
- The branch guards ran in my worktree switched onto the branch name, not in a private clone
  (§0). The ref was not moved.
- Nothing here approves Gate G0, authorizes a merge, advances a freeze level or changes the
  package status.
