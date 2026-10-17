# A1 round audit, 2026-10-17 (RFC-2026-034 §2.3): `main` `2aef8182`..`01b49187`, PRs #262–#281

| | |
|---|---|
| Role | A1, independent Security/Privacy reviewer, `/claude/a1_bastion` |
| Range | `2aef8182` (merge of #261) exclusive to `01b49187` (merge of #281) inclusive; first-parent merges #262–#281 (20), fixed even if `main` moves |
| Reading | 2026-10-16T19:15:24Z to 19:30:11Z UTC (`date -u` at start and before writing), plus the writing of this file (2026-10-17 local) |
| Worktree | one, in my scratchpad, branch `a1/audit-2026-10-17` cut from `01b49187`; no `node_modules`, no `npm ci`; suite lock not touched (no full suite run: Q0's); removed at the end |
| Findings | **A1-AUD1017-1 (Low)**, **A1-AUD1017-2 (Low)**; A1-AUD1017-3 to -5 (Info) |
| Stop-the-line | **No** |
| Blocks a risk-lane or fast-lane move? | **No.** Both Lows are about presses of governance PRs (#278, #268); no A1 finding of any grade is open against the risk-lane work in range (#262–#264, #272, #273, #275–#277) |

## 0. Who I am

`/claude/a1_bastion`, A1, a subagent spawned by the Author's run (`/claude/a0_atlas`), same vendor and model
(Anthropic, `claude-opus-5-5`) as A0, C0, Q0 and R0: a same-lineage review, disclosed as the Owner's disposition of
2026-10-09 (Q4) requires. I hold no Author, Reviewer, Tester, Integration Owner, Product Owner, merge or gate
authority. I fixed nothing, pushed nothing, merged nothing and wrote no other role's verdict; every `gh` call was a
read. A1 runs wrote the per-PR A1 files in range; this audit re-measures rather than relies on them, and says where
it relies on them. Two of the findings below are against A1's own earlier practice.

## 1. Per pull request: tier, lane, press, readers

Measured: the base's two classifiers (`git show <merge>^1:scripts/db/classify-{review-tier,records-only}.mjs` into a
scratch directory), run as CI runs them, `node <copy> <merge>^1 <merge>^2 --lane --head-ref=<branch>
--repo=ThinkBizLab-Org/ThinkBizThai --head-repo=ThinkBizLab-Org/ThinkBizThai`, all exit 0; the CI log of each PR's
`pull_request` run on its final head (`gh run view <id> --log`, the step's own output lines, not the script text);
`git merge-base --is-ancestor <merge>^1 <merge>^2` (all 20: the head contained `main`); the presser from the session
transcript `325454ab…jsonl` (every press is an A0 `Bash` tool call `gh pr merge <n> --merge --match-head-commit
<sha>`, 20 of 20, each `<sha>` equal to the PR's final head; #281's also carried `--delete-branch`, A1-AUD1017-5).
My classifier output equals CI's printed `tier`/`lane` line for every PR. The classifiers are unchanged in range
(`git diff 2aef8182 01b49187 -- scripts/db/` is empty), so the base copy is the same file throughout.

| PR | CI printed (final-head run; both jobs) | Lane I hold | Pressed (UTC), authority | A1's last reading → final head |
|---|---|---|---|---|
| #262 | H, risk (38670962315 ✓✓); records-only exit 1 (role files) | risk (not audit: it carries the PR's own role files) | 10-15 02:40, Q-034-1 | re-read pass at `bcb24b79`; then C0/A1 files, handoff: carried |
| #263 | H, risk (38678239408 ✓✓) | risk; body says "Records lane" (A1-AUD1017-3) | 04:11, Q-034-1 | `fb551363`; role files, two merges of `main` disjoint (remerge-diff empty), handoffs: carried |
| #264 | H, risk (38673843811 ✓✓) | risk; body says "Records lane" (-3) | 03:21, Q-034-1 | `86f3d767`; role files, merge `9ed86da1` disjoint, handoffs: carried |
| #265 | H, **governance** (38681569474 ✓✓) | governance (creates `index.ts`, `run.ts`; edits a guard test) | 10:36, Owner 2026-10-14T13:01:02Z + 10-15T02:13:35Z Q1 | `535e6b58`; role files, merges `e1bce345` (named in A1's verdict) and `cd8fcaa5` (#263's records, not named; disjoint, remerge-diff empty): held in substance |
| #266 | H, governance (38733379219 ✓✓) | governance | 12:37, 02:13:35Z Q2 item (2) | `f3ee0c1d`; role files, handoff: carried |
| #267 | H, governance (38762107334 ✓✓) | governance | 15:55, Q2 items (3), (4) | re-read `e7c48160`; role files, merge `fdd6b583` disjoint, handoff: carried |
| #268 | H, governance (38736697953 ✓✓) | governance | 13:19, Q2 item (5) | `0a873c2f`; merge `649ef191` **changes `test-kits/integrity-manifest.json`, a path #268 changes**: A1's clause (b) and Q0's clause unmet as worded, unrecorded (**A1-AUD1017-2**) |
| #269 | H, governance (38743854390 ✓✓) | governance | 13:56, Q2 item (5) | known carry error, recorded in #277 (§2) |
| #272 | H, risk (38748160502 ✓✓) | risk (`ownership.amends_without_owning` changed) | 14:22, Q-034-1 (A0 also cites Q2 (5)) | `382cb823`; role files, merge `bd015a2d` disjoint, handoff: carried |
| #271 | H, governance (38752303650 ✓✓) | governance | 14:54, Q2 item (5) | `14db1f85`; merge `81b300a1` overlaps at the manifest only, which A1's clause excepts when regeneration is clean and the key set is `main`'s: measured both (128 = 128 keys, regenerate clean): carried |
| #273 | H, risk (38759359687 ✓✓) | risk (`evidence/g0-tracker-th.md`) | 15:33, Q-034-1 (A0 also cites Q2 (5)) | `1abe629b`; role files, merge `94ca9650` disjoint, handoff: carried |
| #274 | H, governance (38775514862 ✓✓) | governance | 17:35, Owner 15:51:38Z (register ownership) | known carry error, recorded in #277 |
| #270 | H, governance (38781107838 ✓✓) | governance | 18:31, Q2 item (1) | known carry error, recorded in #276 |
| #275 | H, risk (38789797692 ✓✓) | risk (platform-kernel test) | 19:19, Q-034-1 | `a8656d04`; role files, merge `7f34adb5` (mechanical, disjoint), handoff: carried |
| #276 | H, risk (38795886966 ✓✓) | risk (`required_tests` changed) | 20:02, Q-034-1 | `533c1b9f`; role files, merge `9d21bf6a` disjoint, handoff: carried |
| #277 | H, risk (38837747283 ✓✓) | risk; body says "Records lane" (-3) | 10-16 02:14, Q-034-1 | re-read `5f58bd17`; role files, handoff: carried |
| #278 | H, governance (38851087280 ✓✓) | governance | 04:52, Owner 02:40:07Z (1) | re-read `2b50d10a`; role files, handoff: carried. **Two A1 Lows open against the PR's own diff at the press (A1-AUD1017-1)** |
| #279 | H, governance (38905580106 ✓✓) | governance | 13:45, 02:40:07Z (3) | fourth re-read `4754f394`; role files, handoff: carried |
| #280 | H, governance (38931759066 ✓✓) | governance | 16:38, 02:40:07Z (2) | `8fa33aa1`; role files, handoff: carried |
| #281 | H, governance (38947169060 ✓✓) | governance | 18:50, Owner 17:10:27Z (`ตาแนะนำ`) | `34319ac8`; role files, handoff: carried |

CI on `main` (push runs) is green on every one of the 20 merge commits, `01b49187` included (run 38950430585,
`bootstrap` and `application` both `success`; its log shows `npm audit --include=dev --audit-level=high` "found 0
vulnerabilities" and 8 application test files passed). Required checks on `main` (read-only `gh api`): `bootstrap`,
`application`, `strict: true`, `enforce_admins: true`, force pushes and deletions off: unchanged since the first audit.

**Authority, checked by script against the transcript.** Every Thai span quoted in `"…"` or `` `…` `` in the 13
Owner dispositions added in range occurs byte-equal in the transcript's user messages, question-tool inputs and
results (225 of 228 spans; the three misses are two regex artefacts spanning two separate quotes, and `(2)
ทำต่อทีหลัง`, which is the 2026-10-12T15:19:55Z answer of session `c2816eec`, found there at that stamp). The
kernel-deletion-gap disposition's three fenced blocks equal transcript lines 5264 (two) and 5268 (`ตาแนะนำ`, the
whole message) exactly. Each direction was given before its pull requests existed and names their content (RFC-2026-025
§5 item 6, third bullet): Q2 at 02:13:35Z names five items, and #266–#274 were opened after it; the 02:40:07Z answer
names three, and #278–#280 were opened at 03:11Z–14:17Z; `ตาแนะนำ` answers a question naming the one fix, and #281 was
opened at 17:41:38Z. Q2's "ไม่รวม dependency ใหม่": no package file or lockfile changed in range (`git diff --quiet …
-- package.json package-lock.json apps/web/package.json scripts/app-dependency-allowlist.json` exit 0). The Owner's
words of 2026-10-15T17:07:06Z (`ผมนอนแล้ว คืนนี้คุณยิงยาวไปได้เลย ไม่ต้องหยุดถาม`) and 17:07:27Z are not cited as press
authority by any record in range (`git grep`), and every overnight press has a named direction above.

## 2. Lane notes

- **Every lane CI printed is right**, and none was lowered. The classifier's probe at `01b49187` (synthetic one-file
  commits with `git commit-tree`, nothing pushed): an edit of `application/tenant-context.ts` or of a new
  `src/modules/content/ui` file prints `tier: H`, `lane: risk`; an edit of `index.ts`, `application/run.ts` or a new
  `adapters/job-store.ts` prints governance. `M_ELIGIBLE_MODULES` is still `[]`, so no code reaches the fast lane.
- **#262, #263, #264, #277** are labelled audit or records in their bodies, and CI printed risk, because each carries
  its own role-review files, which `classify-records-only.mjs` refuses as "not a record file". All four roles read
  each; A1 and Q0 passed on the final heads. A label, not a reading lowered (A1-AUD1017-3).
- **The known carry errors** (#269, #270, #274) are recorded in #276 and #277 as the brief says; I re-measured the
  three merges: `classify-records-only.mjs --sync <merge>^1 <merge> <merge>^2` exit 0 on `9f1c71e8`, `7f1c93e4`,
  `789f7e2a`, `node scripts/regenerate-integrity-manifest.mjs` leaves no diff on each, and the overlap with the PR is
  `test-kits/integrity-manifest.json` only. The same holds for #268's `649ef191`, the one of the class not recorded.
- **The first round's audit files** on `main` are blob-equal to the auditors' kept branches (`{c0,a1,q0,r0}/audit-2026-10-15`,
  each tip touching only its own file; blobs `c22aedd2`, `35afd1e4`, `4d7514dd`, `8d3593bd` on both sides), and each
  carried commit on #262 records `cherry picked from commit <tip>`: the re-check Q-034-5 (a) asks of the next audit.

## 3. Security posture of the cumulative diff

**Tenant isolation, `src/modules/platform-kernel` (#265, #275), read at `01b49187`.** `run.ts` resolves the context
first and answers a refusal with the resolver's own minted error; the handler only receives the frozen, `WeakSet`-minted
context; the reply is read through its own properties once each, and anything else, a builder's refusal included, is
answered as `platform.internal` under the context's ids from constants. The failure report carries only server-minted
ids, the stage, the answered code and `typeof` of a thrown value, and a reporting port that throws or rejects does not
change the reply. `errorEnvelope` now refuses an error not minted from a `defineStableError` definition
(`UntrustedStableErrorError`). The scope is frozen before `directory.admits` (A1-AUD1015-3 closed), the fake directory
keys membership on kind and id with the port's comment saying so (A1-AUD1015-2 closed), `actorOf` reads only own
`kind` and `id` (A1-261-N4 closed, pinned per field by #275). A1-AUD1015-4 is recorded in `domain/idempotency.ts` and
the manifest's Q9 as a contract question with an interim rule for the caller. `index.ts` exports no fake, no
`adapters/**` and no shape helper. I found no cross-tenant path. A1-265-N1 to -N3 stay open as recorded for the
composition increment; see A1-AUD1017-4 for when they stop being acceptable as review-held.

**Classifier exception list.** `STRING_NAME_EXCEPTIONS` is unchanged in range. A1-280-1 (a created platform-kernel file
could be deleted, with its test, and the suite stay green, since #265) is closed by #281: measured in my worktree,
`node --test --test-name-pattern='a records-only diff on the repository as it stands'
test-kits/db/foundation-contract.test.mjs` passes 1/1 at the head and fails ("a platform-kernel file once created left
the repository") with `index.ts` removed from the index and the tree, and again with `application/run.ts` removed;
restored after each. No PR in range deleted a file under `src/` (`git log --diff-filter=D`).
`db/foundation/lint/audit-coverage-map.json` changed by line numbers only (#268, #281): with every `"line": N`
masked, the files at `2aef8182` and `01b49187` are identical, so no quote or index pin moved.

**CI and guards.** `ci.yml` (#270, #279): in the `application` job, `npm audit --include=dev --audit-level=high` and
the release age now run straight after `npm ci --ignore-scripts` and before the first step that loads package code
(A1-AUD1015-1 and A1-270-1 closed; the order and the flag are pinned in `test-kits/app-stack.test.mjs`, measured by the
PR readers with negative controls; the push run on `01b49187` shows the audit line). No `shell:`, `defaults:`,
`$GITHUB_ENV` or `$GITHUB_PATH` write exists in `ci.yml` (only comments name `GITHUB_PATH`). #266's handoff-guard
exemption is keyed to the base classifier's own audit predicate by import and to WP-0A-A0-001's branch; the PR-side
fork check stays CI's; it can excuse only a branch whose every path is a regular file in one dated
`evidence/audits/<date>/`. #278 stages before the verifier and refuses a conflicted index with 95 before staging;
its two residuals are A1-AUD1017-1.

**Secrets and personal data.** `node scripts/scan-repository-secrets.mjs` at `01b49187`: exit 0. Over every added line
of `git diff 2aef8182 01b49187`: the only e-mail-shaped string is `git@github.com`; URL hosts are GitHub, the npm
registry, `127.0.0.1` in test probes and a `.invalid` test marker; no key- or token-shaped string; 12 lines carry the
home path `/Users/bank/ThinkBizThai/.claude/ntf-session` in role files, as earlier evidence on `main` does: not a secret.
`.gitignore` still ignores `.env`, `.env.*` (but `.env.example`), `*.pem`, `*.key`.

**Dependencies.** No package file or lockfile changed in range; `node scripts/verify-app-dependencies.mjs` at
`01b49187`: exit 0 (172 registry tarballs with sha512, 6 bundled, licences accepted).

**Recorded residuals, still acceptable?**

- **A1-278r2-1** (a refusal's `read-tree` drops intent-to-add, assume-unchanged, skip-worktree and sparse bits):
  acceptable as a residual today. Measured on the main checkout: 2380 index entries, every one `H`; no
  `core.sparseCheckout`; no hook (`core.hooksPath` unset, only samples in `.git/hooks`). But it is recorded only in
  A1's file and one handoff sentence, not in `known_limitations` or the manifest, and the manifest's
  `open_blockers[15]` says the index "is the index after the refusal" without the exception: A1-AUD1017-1.
- **A1-279-3** (`shell:` could make a multi-line step soft) and **Q0-279r2-2** (`$GITHUB_ENV` written from a shell
  step): acceptable. Neither form exists in `ci.yml` at `01b49187`, both are in WP-0A-A0-004's `known_limitations` as
  owed, and every `ci.yml` edit is a governance path that four roles read. They stop being acceptable the day any
  `ci.yml` edit can be merged on fewer readers. A1-279r4-1 (Info, a lenient-parser spelling) likewise.

**Press while a security finding was open.** For 19 of the 20 the final A1 reading says no security finding of any
grade is open against the PR on the head carried to the merge. A1-270-1 (Low) and A1-280-1 (Low) were open at #270's
and #280's presses against `main`'s existing state, not against those PRs' diffs, and both are now closed (#279,
#281). The exception is #278 (A1-AUD1017-1).

## 4. Findings

### A1-AUD1017-1 (Low; press condition): #278 was pressed with two A1 Lows open against its own diff, called "advisories"

`evidence/WP-0A-CON-008/a1-reread-2026-10-16-pr278.md` (A1's last reading, at `2b50d10a`, carried to `0d773f6f`)
grades **A1-278r2-1** "Low (integrity/privacy), advisory, open" and **A1-278r2-2** "Low (integrity), advisory, open",
and says neither counts against RFC-2026-025 §5 item 6. Both are introduced by #278 (the first: "`main`'s gate never
touched the index on a refusal"; the second: `isolateGit`, "new in this PR", passes the caller's `GIT_INDEX_FILE` to
`git`). §5 item 6's second bullet reads "No unresolved **security** finding of any grade is open against the PR", and
the Owner's chosen option at 02:40:07Z bounded the press by "CI เขียว 2 job + ไม่มี security finding ค้าง". No RFC defines
a Low that is not a finding; "advisory" is A1's own label, and a graded Low introduced by the PR itself is the case the
"any grade" words exist for. A0 pressed at 04:52:47Z relying on A1's label, which is a fair reading of what A1 wrote:
the fault is in A1's grading, not A0's press. The exposure is small and measured (§3: no index flags, no sparse
checkout, no hook, no `GIT_*` set by CI or the gate), and the commit gate is local tooling, not CI.

**Fix (no stop-the-line; nothing to revert):** (1) A1, from now on, grades an item it does not hold against a PR as
Info, or names a Low as open and blocking; never "Low, advisory, not counting". (2) WP-0A-CON-008, in its next
governance increment, either closes both (restore with `read-tree` only when `git ls-files -v` shows only `H`/`C` and no
intent-to-add, else refuse before staging; delete `GIT_DIR`, `GIT_INDEX_FILE`, `GIT_WORK_TREE`,
`GIT_OBJECT_DIRECTORY`, `GIT_ALTERNATE_OBJECT_DIRECTORIES`, `GIT_COMMON_DIR` from the gate's and the cases' child
environment), or records both in the handoff's `known_limitations` and corrects `open_blockers[15]`'s "the index …
after the refusal" to except per-entry flags. (3) WP-0A-CON-008's records name this press as made with two Lows open.
This finding is against governance work already read by four roles; it does not attach to any risk-lane PR.

### A1-AUD1017-2 (Low; carry): #268 was pressed with A1's and Q0's carry clauses unmet as worded; not recorded

#268's final head `d8f02b36` follows A1's and Q0's readings at `0a873c2f` by four role files, a merge of `main`
(`649ef191`, of #266's `9b3ffbd5`) and the handoff. The merge changes `test-kits/integrity-manifest.json`, which #268
itself changes (its own paths: two RFC status lines, `db/foundation/lint/audit-coverage-map.json`, the disposition, the
handoff, the manifest, `work-packages/WP-0A-DB-00.json`). A1's clause (b) admits only "a mechanical merge of `main`
… that changes no path this PR changes", with no manifest exception (A1's #271 clause has one; #268's does not). Q0's
reads "This verdict holds for head `0a873c2f` only; any new commit on the PR branch needs a fresh Q0 reading." So
neither A1 nor Q0 had passed on the exact final head as their own words required. It is the class of the recorded
#269, #270 and #274 errors, but #268's is in no record on `main` (`git grep` for `649ef191` or `0a873c2f` with a carry
reading: none). In substance A1's reading holds: `--sync` exit 0, regeneration clean, overlap the manifest only, and
nothing #268 changed moved (its coverage-map lines are line-number only). **Owed:** WP-0A-DB-00's next records PR names
the press as made with A1's and Q0's carry unmet as worded, as #276 and #277 did for the other three. Not a security
defect.

### A1-AUD1017-3 (Info; labels): records and audit labels on risk-lane PRs

#263, #264 and #277 say "Records lane (RFC-2026-025 §6)" in their bodies, and A1's own #277 file says "Pass for A1 on
the records lane"; #262 says "Audit lane". CI printed risk on all four, rightly: each carries its own role-review files,
which RFC-2026-025 §6.1 rule 2 excludes from records, and #262 is not only audit files. Every one was read by all four
roles, A1 and Q0 passed on the final heads, and A0's press authority is the same on the risk lane (Q-034-1), so nothing
was lowered. As long as records PRs carry four role files they are risk-lane PRs; either label them so, or use one
`light-path-reading-*.md` reader as §6.2 provides.

### A1-AUD1017-4 (Info; forward): what stays held by review must become a guard before any module takes the fast lane

A1-265-N2 (`defineStableError` is public and can be called at run time with a caught message, which then passes the
"minted only" check of `errorEnvelope`), A1-265-N3 (`resolveTenantContext` is public, so any caller with its own
always-true directory mints a context the builders accept) and A1-AUD1015-4's interim rule (the caller binds the actor
into `payload_hash`) are each held today by the A1 reading every platform-kernel consumer gets on the risk lane.
A fast-lane pull request has one C0 reader and no A1 (RFC-2026-034 §2.2), and every module Q-034-2 names may import
`src/modules/platform-kernel/index.ts`. So before the governance PR of RFC-2026-034 §8 item 5 names any module in
`M_ELIGIBLE_MODULES`, each of the three needs a mechanical hold: definitions only as top-level `const` with literal
fields (a boundary rule), the resolver reachable outside platform-kernel only through the composed runner, and
idempotency keyed with the actor in the store or the contract (Q9). For that PR's A1 reading.

### A1-AUD1017-5 (Info; records): #281's press deleted WP-0A-DB-00's ownership branch

A0 pressed #281 with `gh pr merge 281 --merge --delete-branch --match-head-commit e3eaf3ce…` (transcript, 18:50:30Z);
`git ls-remote origin 'refs/heads/agent/claude/WP-0A-DB-00*'` is now empty, while `work-packages/WP-0A-DB-00.json`
still names `agent/claude/WP-0A-DB-00-batch-rfc-030-risk-tiered-review` as `ownership.branch`. The other 19 presses
kept their branches. Nothing is lost (the head is in `main`'s history), no test resolves remote refs, and CI on
`main` is green; the next WP-0A-DB-00 increment recreates the branch from `main`, and its records should say why it
starts there. Not a security defect.

### Carried, unchanged (not raised again)

A1 N1, N2 (Low, RFC-2026-029 text; must close before any worker is provisioned); A1-259-N1, A1-259-N3; A1-261-N1
(now narrowed by the minted-only rule), -N2, -N3; A1-265-N1 to -N5 (for the composition and provider-bound increments);
A1-279r4-1 (Info). Closed in range and verified here: A1-AUD1015-1, A1-AUD1015-2, A1-AUD1015-3, A1-261-N4, A1-261-N5
(the failure-report port), A1-270-1, A1-270-2 (by #279, as its readers measured), A1-280-1.

## 5. Verdict

**Findings:** two Lows (A1-AUD1017-1, a press with two A1 Lows open against the PR's own diff; A1-AUD1017-2, an
unrecorded carry lapse on #268) and three Info. **Stop-the-line: no.** No tenant leakage, secret exposure, unreviewed
dependency or licence change, lowered lane or self-lowering classifier edit was found in the cumulative diff, and every
CI and guard change in range tightens or keeps what it touches. Every press in range was made by A0 with
`--match-head-commit` on the exact final head, under the authority its lane names (Q-034-1 for the risk lane; for
governance, an Owner direction given in his own words before the PR existed and quoted exactly), on a head containing
`main`, with both required jobs green. The recorded residuals A1-278r2-1, A1-279-3 and Q0-279r2-2 are acceptable as
residuals today, with the first owed a record (A1-AUD1017-1). A1 has no open finding against the risk-lane work in range
(#262–#264, #272, #273, #275–#277), so A1 blocks none of their packages' moves past `in_review`; whether each moves is
C0's, Q0's and R0's to say.

This file is A1's only output: no other role's verdict, no manifest status, no fix.
