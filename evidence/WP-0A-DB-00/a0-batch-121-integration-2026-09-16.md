# A0 integration record — batch 121 (metric snapshots), 2026-09-16

Author run: `/claude/a0_atlas`. Package `WP-0A-DB-00`. This file records what was built, what three
independent role runs found, and what changed because of them. It is the Author's record and it
approves nothing: the Author is not the Reviewer, the Tester, the Security reviewer or the
Integration Owner, and under RFC-2026-002 the merge is the Product Owner's.

## 1. What merged into the branch, in order

| Commit | What |
|---|---|
| `76b1897` | the plan, the Owner's answer, and the branch slot repointed |
| `426c294` | batch 121 itself — the migration, the fixture, 24 cases, 5 static tests, the CI entry |
| `f154519` | the seven blockers the batch opens, one of them measured that day |
| `2c91640` | A1's security review (cherry-picked `-x`) |
| `c1a6f4c` | C0's contract review (cherry-picked `-x`) |
| `0c04008` | A1's and C0's findings acted on |
| `2dbb5f3` | both floors moved, and a digest shifted off a card-shaped run |
| `e471c09` | Q0's test review (cherry-picked `-x`) |
| `df9d163` | Q0's five surviving mutations closed |

## 2. The batch, in three sentences

§8.3's "Publish delivery/post/metric INSERT" row has three nouns and batch 120 registered two. This
is the third and last: one table, `app.performance_snapshots`, `N` in every client column and `S`
for the service, classified CARRIED in `service-policy-map.json` beside the target, the job and the
post — RFC-2026-022 §3 names `120` and `121` in ONE row, so the cell is continued and not re-argued.
No service policy is written, because the decision is approved and NOT IN EFFECT.

## 3. What the three role runs found, and what changed because of them

Three distinct runs, each in its own isolation worktree, each opening with the §0 disclosure
RFC-2026-024 made a rule. A1 and Q0 reviewed head `426c294`; C0 reviewed the same head. None of them
is the Author and none approved anything of its own.

| Run | Findings | Stop-the-line | Measured live |
|---|---|---|---|
| A1 `/claude/a1_bastion` | 2 MEDIUM, 3 LOW | no | yes — own cluster on 5501, 28 payload attacks, 17 write attempts |
| C0 `/claude/c0_contract_reviewer` | 2 HIGH, 3 MEDIUM | **yes, twice** | no, and its §0 says so |
| Q0 `/claude/q0_sentinel` | 1 HIGH, 1 MEDIUM-HIGH, 2 MEDIUM, 2 LOW | no | yes — own cluster on 5503, 50 mutations over 58 runs |

### Acted on

| Finding | What it said | What changed |
|---|---|---|
| **C0 F1** (stop-the-line) | Seven statements claimed a reading was "recorded in the work package's open blockers". `open_blockers` was unchanged at 175 and named none of them. Two sat inside `comment on table` and `comment on policy` — text migration invariant 1 freezes permanently after merge. | True of the head C0 read. `f154519` had already opened them; the count is now 187. This is the third time in two batches that a reviewer has caught this class, which is why the blockers now land in their own commit before review rather than after. |
| **C0 F2** (stop-the-line) | The fixture asserted "the page-pinned member is admitted to NOTHING in this family" and cited `pinned-editor-a-sees-zero-metric-snapshot-rows` as the measurement. **No such case exists.** The committed case says the opposite and its own `why` says the fixture was corrected; it was not. | Rewritten to what was measured. A1 found the dangling id independently, one grade lower. |
| **A1 F1** | The four shape constraints discriminate on JSON **type**, not meaning. `{"impressions": 17841400000000000}` — an Instagram post-id shape — passed all four, and A1 read it back **as an ordinary client identity**. §9.1 makes an external post id PROVIDER-3 and batch 120 withholds even its **hash** from `authenticated`. The same value as a string was already refused: the identifier changed type for free. | `performance_snapshots_metrics_values_are_plausible`, every value `0..10^12`, with a probe writing A1's exact literal. **The threshold is A0's, not the Owner's**, and is recorded as owed. |
| **A1 F2** | The narrowing's comment said the term "cannot decide a read by itself", carried over from A1's F4 against batch 120. Measured false: dropping the policy takes `editor_a` and the page-pinned editor from 2 snapshots to 3, and disabling row level security on all four parent tables changes nothing. | Rewritten, after the Author re-measured and got the same numbers. The term is the only business-and-page-scope control on this table and the sentence invited deleting it. |
| **A1 F4** | `{}` was a valid payload; negatives too. | `..._metrics_is_not_empty`, and the plausibility bound covers negatives. |
| **Q0 F1** (HIGH) | The apply-time block asserted the five CHECKs **exist**; never what they **say**. Add `followers` to the allowlist and nothing else, and a Graph API error sentence inserts and is readable by every active member — A1's `failure_class` finding, in the column this batch says it closed it in. "True of the code as written and false of the code as defended." | All three payload constraints must name the same ten keys, asserted by text in the migration **and** in the fixture. |
| **Q0 F2** (MEDIUM-HIGH) | `using (app.is_active_member(...))` → `using (true)` survived every layer, because the narrowing's four parent tables answer first. `021_member_scope.sql`: the scope helper "is NOT a membership test and must be ANDed with one." | An apply-time assertion on `pg_get_expr(polqual)`. A case cannot isolate it, because the parents refuse the same callers. |
| **Q0 F3 / F4** | `generated always` → `by default` survived; two probes were caught only by falling through to the composite FK, so the assertion that makes a probe a probe never ran and the error misdirected. | `attidentity = 'a'` asserted; all ten probes given a `when others` arm. |
| **C0 MEDIUM ×2** | A `covers: ['§8.6/4']` tag claimed a mandatory authorization case on the case that measures its opposite; the assertion floor stayed at 2101 while five assertion-bearing tests were added. | Tag removed; floor moved to the measured 2133. |

### Where the Author did more than the finding asked, and why

Q0's remedy for its own D01h was to move the payload probes into the fixture, where `rls-smoke`
re-runs them against the database as the whole migration set left it. **The Author applied it, then
measured it, and it was not sufficient**: a probe fires a fixed literal, so widening the allowlist
with a key no probe sends left `rls-smoke` green. The key-set **text** assertion is therefore in the
fixture as well, and Q0's own M17 applied after the migration set now fails the suite by name. The
move is still right and is kept; it was not the whole fix, and this record says so rather than
reporting the recommendation as though following it had closed the hole.

### Recorded and not acted on

- **C0 F3** — §3.3's canonical field table names `social_account_id` for "target/publish/metrics"
  and this table has none. Genuine, and the one document tension this batch did not surface for
  itself. **Not implemented**: choosing between §3.3 and §4.8 is the Owner's, and the tension was
  found after the Owner had answered. Blocker.
- **Q0's D01h in general form** — a post-migrate pass re-running every batch's apply-time invariants
  after the full set. Q0 says plainly it is a property of the harness and not of this batch, and
  that every batch from 000 to 140 has it. Blocker against A0 Integration.
- **A1 F5** — the composite FK is `MATCH SIMPLE`, so its guarantee rests on the three NOT NULLs,
  which the apply-time block asserts per column. Recorded in A1's own file.

## 4. A1 graded against its own mandate, and the Author did not overrule it

A1's brief said that a PROVIDER-3 value reaching `app` through `metrics` is HIGH and stop-the-line.
A1 measured exactly that and graded it **MEDIUM**, reasoning that no provider-authored *text* can
reach `app` (which is what §9.2 prohibits), that the numeric case is §9.1's and §9.3's subject, that
no client identity holds INSERT so nothing today can place such a value, and that no tenant boundary
is crossed. A1 wrote the disagreement into its own file and said the Owner may overrule it.

**The Author took no position on the grade** and closed the finding on its merits instead. An Author
may not grade its own batch's severity. If the Owner reads §9.1's "external post ID" as making any
admissible representation of one stop-the-line, then batch 121 was stop-the-line at `426c294` and
this record should be read as saying so even though the code is now fixed. It is a blocker.

## 5. Two things that went wrong in the running of this session

1. **A role run's `initdb` landed in the shared scratchpad root and replaced the Author's cluster
   data directory** mid-session. The Author's measurements were re-run on a rebuilt cluster in a
   private subdirectory. **The user's own server on port 5432 was never touched**, which was checked
   rather than assumed: it was still listening on the same pid afterwards. The brief told each run to
   use its own scratchpad and its own port; it did not say that the parent directory is shared.
2. **A regenerated digest failed the secret scan.** Editing `scripts/test-suite-contract.mjs` gave it
   a sha256 containing a thirteen-digit run that began with a 4 and happened to satisfy Luhn — and
   `scan-repository-secrets.mjs` correctly refused the tree. The scanner's own header explains why it
   has no allowlist: "an allowlist of safe card numbers is the shape a real leak hides in." The tree
   changed to move the digest; the scanner did not change to forgive it. **The first draft of this
   very paragraph quoted the offending digits and tripped the scanner a second time**, which is the
   rule working exactly as written — the digits are not reproduced here.

Q0 also recorded two honesty notes of its own: it broke its harness mid-sweep and one run reported a
false survivor, which it caught from its log and redid; and five drift probes were confounded by an
unrelated tripwire and were redone properly.

## 6. What no run could verify, in their own words

C0 ran nothing live and adopted none of the Author's numbers; every SQLSTATE, the seven-case control
basis and the test counts are unverified by it. A1 could not verify the source `docs/**`, the Owner's
answers as answers, or a real service identity — the only member of `app_worker` is `postgres`, which
bypasses RLS. Q0's main stated limit is the sharpest of the three: **the Author wrote the batch, the
brief and the mutation list, so every class the Author named was caught — which measures the list,
not the suite.** **No run verified CI in execution**, and none of them is the Integration Owner.
