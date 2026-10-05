# WP-0A-CON-007 — Security / Privacy re-verification at the 2026-10-06 head

## 0. What I am

I am `/claude/a1_bastion`, the Security/Privacy reviewer named in
`work-packages/WP-0A-CON-007.json`, run as a **subagent spawned by `/claude/a0_atlas`**
(the A0 session, which is also this package's Author) under RFC-2026-024 §3/3-4. The
spawning is disclosed because it is the fact a reader most needs: the session that
launched me wrote the work I am checking. I ran in my own worktree and my own private
clone, I received the Author's done / not-done list as script output with no authority,
and I checked every claim in it against the artifacts rather than adopting it. I do not
fix. I did not author, review-approve (C0), test-verify (Q0) or integrate (R0) this work,
and nothing here is their verdict.

The file name carries 2026-10-05 because that is the date the brief assigned; the work
was done on 2026-10-06, against the Author's increment of that date.

| | |
|---|---|
| Subject | PR #188, branch `agent/claude/WP-0A-CON-007-reference-bounds` |
| Head re-verified | `113e4f3950b917b6ed24410cbe52d429247c7e0e` |
| Base | `origin/main` `8c089cc` (merge-base equals main's tip; no drift) |
| Earlier verdict | `review-security-a1.md`, at `03c584b`: **security_approved_with_conditions**, conditions 1-8 |
| Toolchain | `node v24.20.0`, `npm 11.19.0` |
| Private clone | `…/scratchpad/a1-WP-0A-CON-007/clone`, checked out **on the branch name** `agent/claude/WP-0A-CON-007-reference-bounds` at `113e4f3` (not detached), so the branch-reading handoff guards run rather than skip |
| Database | none used; this package has no database surface |

## 1. Measured versus read

**Measured** (executed by me at `113e4f3`, output observed):

```
npm run check                                            (private clone, on the branch name)
ℹ tests 692   ℹ pass 692   ℹ fail 0   ℹ skipped 0        EXIT=0
  includes: verify:coverage-floor, verify-toolchain, scan:secrets (clean),
  "the handoff for this branch describes this branch" ✔,
  "a handoff cites revisions reachable from main, not just from this clone" ✔

node --test test-kits/contracts/ctr-evt-001-schema-ref-bounds.test.mjs
ℹ tests 8   ℹ pass 8   ℹ fail 0

node --test test-kits/contracts/schema-mutation-coverage.test.mjs
ℹ tests 10  ℹ pass 10  ℹ fail 0
```

My own mutation run against the package guard (`ctr-evt-001-schema-ref-bounds.test.mjs`),
each mutant applied to a schema in the private clone and reverted; `git status --porcelain`
empty afterwards:

```
control before                                                           passes
M1  schema_ref pattern widened to also admit an https URL                KILLED (fail 1)
M2  schema_ref ^ anchor removed                                          KILLED (fail 1)
M3  schema_ref letter class widened to [A-Za-z]                          KILLED (fail 1)
M4  schema_ref maxLength 32 -> 33                                        KILLED (fail 1)
M5  schema_ref maxLength 32 -> 31                                        KILLED (fail 1)
M6  schema_ref maxLength removed                                         KILLED (fail 2)
M7  ctr-evt-001.event_id maxLength removed                               KILLED (fail 1)
M8  new unbounded ctr-ten-001.tenant_shadow_id                           KILLED (fail 1)
M9  ctr-ten-001.workspace_id bounded (stale list entry)                  KILLED (fail 1)
M10 new unbounded nullable parent_ref in ctr-sec-001                     KILLED (fail 1)
M11 ctr-job-001.input_ref maxLength removed                              KILLED (fail 2)
M12 ctr-aud-001 change.before_ref (?!/) lookahead re-added               KILLED (fail 1)
M13 unbounded lease_owner_id added to ctr-job-001                        KILLED (fail 1)
M14 ctr-job-001.lease_owner made a URL-accepting string (not ref-named)  SURVIVED
control after                                                            passes
```

M1 is my own S-3 probe from the earlier review, which then left the guard 8/8 green. It is
now killed by the package's own guard, not only by the catalog ratchet. M14 survives by
design: `lease_owner` is not reference-shaped by name, the guard's rule is name-based, and
that residual is disclosed (R-5, `open_blockers[5]`). It is not a new finding.

Independent catalog measurement with my own walker (same name rule as the guard):

```
contract dirs with schema: 14   reference-shaped fields: 76
unbounded total: 49 in 9 contracts
  ctr-aud-001 4  ctr-err-001 2  ctr-flg-001 4  ctr-mod-001 4  ctr-ntf-001 4
  ctr-obs-001 10 ctr-sec-001 8  ctr-ten-001 7  ctr-usg-001 6
longest ref-named values (non-invalid fixtures): 85 dedupe_key ctr-usg-001/valid-provider-reported.json
                                                 | 81 … | 77 …
longest *_ref value: 48 input_ref ctr-job-001/valid.json
schema_ref maxLength 32; a 16-digit version run is still admitted: true
```

Further measured facts:

- `git show 653f699:…/ctr-usg-001/examples/valid-provider-reported.json`: `dedupe_key` was
  `usg:job_synthetic_0001:ai_tokens`, 32 characters. R-1's "the 85 arrived after this
  package's head" is true.
- `length(…) <= 256` CHECK constraints exist at `050_async_kernel.sql:531,535`
  (`input_ref`, `result_ref`), `140_audit.sql:474,478` (`change_before_ref`,
  `change_after_ref`) and `110_meta_connector.sql:693` (`body_ref`). R-2's "256 is
  load-bearing in the database" is true.
- `git diff origin/main...113e4f3 --stat`: seven files; **no file under
  `contract-catalog/`, `db/` or `migrations/` changed.** No schema constraint moved in this
  increment, so no control could have been weakened by it.
- The KNOWN_UNBOUNDED list in the guard equals the measured 49 exactly: the guard fails on
  an unrecorded gap (M8, M10) and on a stale entry (M9), and passes at head.

**Read, not re-executed:** the Owner's step-2 words (`evidence/WP-0A-A0-001/
product-owner-disposition-2026-10-05-g0-step2.md` lines 30-32, 60-63, 83, 101-103), which
the manifest's `prefer_cross_vendor_review: false`, `cross_vendor_exception` and
`product_reviewer_note` cite. They say what the manifest says they say. The Author's 17/17
mutation list in `author-conditions-closure-2026-10-06.md` I did not re-run item by item;
my own 14 overlap it on the security-bearing mutants.

## 2. My earlier conditions, one by one

| # | Condition (S-finding) | At `113e4f3` | Status |
|---|---|---|---|
| 1 | Correct the `x-bound-note` on eight fields of `ctr-evt-001/schema.json` (S-7) | Not corrected. The note still says "four of the sixteen". The true figures are in RFC-2026-009 R-3 and `open_blockers[3]` names WP-0A-CON-001 as owing it. | **Transferred, not closed** — see N-1 |
| 2 | Correct "51 characters" in the RFC and blocker 3 (S-8) | RFC marks the sentence wrong and points at R-1; R-1 says 85, and 48 for `*_ref`; blocker 3 restated. Measured: 85 and 48. | Closed |
| 3 | Disclose all seven CTR-TEN-001 fields and the `$ref` blind spot (S-4) | R-4 table lists all seven, says they ride inside every event through `tenant_context`, and says discovery does not follow `$ref`. The guard now walks `ctr-ten-001` directly (M8, M9 killed). | Closed, and stronger than asked |
| 4 | Name `job_type`, `lease_owner`, `progress_stage`, `last_error_code` (S-5) | Named in R-5 and `open_blockers[5]`. | Closed (wording: see N-2) |
| 5 | State the residual as 49, add CTR-SEC-001 and CTR-OBS-001 keys (S-10) | R-4 table: 49 in nine contracts by owning package; matches my measurement field for field. | Closed |
| 6 | Record what a conforming value may still carry (S-1, S-2) | R-5: 128 / 200 opaque characters; the 13-to-16-digit run in `schema_ref`. The 24 suggestion recorded in R-2, not taken. | Closed |
| 7 | Record that forms 05, 06, 08 test the bound, not the shape (S-3) | Comment added **and** every hostile form now also runs against the schema with `maxLength` removed. M1 killed. | Closed, and stronger than asked |
| 8 | Update open blocker 1 (RFC approved 82aae60) | `open_blockers[0]` RESOLVED with `82aae60`; the sequencing question moved to `required_human_authorities[0]` for the Integration Owner. | Closed |

Seven of eight closed. On condition 1 the Author's account is correct and the error was
mine: I wrote that every condition lay "inside paths this package owns or already amends",
but `amends_without_owning` had been removed in `746f80b` (2026-09-04), before my review
of `03c584b`. `contract-catalog/**` is in this manifest's `read_only_paths`. The Author
could not close condition 1 without granting itself write access to another package's
contract, which would be self-authorisation. Declining was right.

The earlier non-conditions (`CTR-TEN-001`'s seven, `CTR-NTF-001`'s four, the date-time
`format` dependency) are now each recorded with an owner: R-4, `open_blockers[1]`,
`open_blockers[4]`, `open_blockers[6]`.

## 3. New findings

### N-1 — Low — two obligations transferred to WP-0A-CON-001 exist only in the transferring package's record

`open_blockers[3]` says the `x-bound-note` correction is "OWED by WP-0A-CON-001", and
`open_blockers[5]` says the four CTR-JOB-001 strings are "ESCALATED to CTR-JOB-001's owner
(WP-0A-CON-001), required_before_freeze". Measured:

```
grep -n "x-bound-note|four of the sixteen|job_type|lease_owner|CON-007" work-packages/WP-0A-CON-001.json
  (no match)
WP-0A-CON-001 status: integration_verified
```

The receiving package's manifest carries neither item, and that package is already at
`integration_verified`. The obligation lives only in WP-0A-CON-007's blockers; once this
package reaches `done`, nothing on the owner's side holds it. The "also recorded on
WP-0A-CON-005" for the CTR-JOB-001 strings is true only as review evidence
(`evidence/WP-0A-CON-005/review-security-a1.md` S3), not as a blocker on any manifest.
The false annotation therefore sits on the system-wide envelope with no owner-side record
of the debt to fix it. Low, because the RFC (an Approved, digested document) now records
the truth and the annotation is not a control; but an escalation that the recipient has not
recorded is not yet an escalation.

### N-2 — Informational — "bare `{"type":"string"}`" is my own error, carried forward

R-5 and `open_blockers[5]` describe `job_type`, `lease_owner`, `progress_stage` and
`last_error_code` as bare `{"type":"string"}`. They carry `minLength: 1`, and already did at
`03c584b` (`git show 03c584b:…/ctr-job-001/schema.json` lines 29-31, 59-61, 96-102). My
earlier S-5 table printed the wrong declaration and the Author copied it. Substance is
unchanged: no pattern and no upper bound, and `minLength: 1` blocks none of the eight
specimens. The correction is mine to record, not a condition on the Author.

### N-3 — Informational — the ratchet's test title is now narrower than what it does

The test `every reference-shaped field in the contracts this package touches carries an
upper bound` now walks all fourteen contracts and admits 49 recorded gaps, four of them in
CTR-AUD-001, which this package edited. The title is unchanged deliberately (the test-name
digest in `scripts/test-suite-contract.mjs`), and the comment above `KNOWN_UNBOUNDED`
explains the behaviour. No reader is misled who reads the body; recorded only so the title
is not quoted as a claim.

### Nothing else

- `test-kits/integrity-manifest.json`: exactly the two digests declared in
  `authorized_cross_package_amendments` changed, and `verify:coverage-floor` passes at head.
  The amendment is declared, scoped and owed an acknowledgement by `/claude/r0_steward`; that
  is the Integration Owner's.
- `prefer_cross_vendor_review: false` rests on the Owner's step-2 words, which I read.
  Separation of duties still holds: Author `/claude/a0_atlas`, and the four other roles are
  distinct runs. My own spawning by the Author's session is disclosed in §0.
- No secret, credential, real PII or private URL in the diff; the new fixtures
  (`AT_THE_BOUND`, `ONE_PAST_THE_BOUND`, the four prefixed names, the synthetic fragment)
  are synthetic. `scan:secrets` is clean inside `npm run check`.
- No migration, deletion, tenant-isolation, external-side-effect or contract/database
  mismatch surface in this increment.

## 4. Verdict

**security_approved_with_conditions.**

Conditions 2-8 are closed, two of them more strongly than I asked. Condition 1 was
mis-addressed by me and is correctly declined by the Author; it now stands transferred. One
condition remains, and it is the transfer's receipt, not a change to this PR:

1. Before WP-0A-CON-007 moves past `integration_verified`, the Integration Owner
   (`/claude/r0_steward`, successor for WP-0A-CON-001 under step 2 item 2) records on
   WP-0A-CON-001 — its manifest or an equivalent owner-side record — the two items
   `open_blockers[3]` and `[5]` of this package say it owes: the `x-bound-note`
   correction on `ctr-evt-001/schema.json` (S-7), and the bound decision on CTR-JOB-001's
   four strings, `required_before_freeze` (S-5). (N-1)

**Stop-the-line:** no. No secret exposure, tenant leakage, duplicate external side effect,
lost job, migration divergence, irreversible deletion or contract mismatch. No constraint
in the catalog changed in this increment.

**Does anything block the merge of PR #188?** Not from Security. The remaining condition
is owed by the Integration Owner on another package's record and does not require a change
to this PR. The merge still needs what is outside my role: C0 and Q0 re-checks at this head,
`/claude/r0_steward`'s Integration verdict, a green CI run on the head, and — because the
PR edits an Approved RFC — the Product Owner merging it personally (RFC-2026-025 §5 item 6).

This review does not approve Gate G0, does not authorize a merge, and does not change the
package status.
