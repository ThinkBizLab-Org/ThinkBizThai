# RFC-2026-025 §6 (proposed): Security / Privacy review of the records-only light path, 2026-10-07

Package named by the task: WP-0A-A0-001 (protocol). Package that owns the change: WP-0A-DB-00 (RFC-2026-025's owner).
Security reviewer run: `/claude/a1_bastion`
Author run under review: `/claude/a0_atlas`
Subject: PR #211 (Draft, title starts with `GOVERNANCE`), branch
`agent/claude/WP-0A-DB-00-batch-rfc-025-records-path`, head `f7e9ce8dc51d246d693a4ea3f2da923436261f5b`, on
`origin/main` `7fb0fc05`. The increment adds RFC-2026-025 §6 (Status: Proposed), the transcription
`evidence/WP-0A-DB-00/product-owner-disposition-2026-10-07-rfc-025-s6.md`, the guard
`scripts/db/classify-records-only.mjs` and its test in `test-kits/db/foundation-contract.test.mjs`.
This is the increment's FIRST A1 review.

## 0. What I am

I am a subagent spawned by `/claude/a0_atlas`'s workflow orchestration, running the
`/claude/a1_bastion` Security/Privacy role (RFC-2026-024 spawning disclosure). I am the same vendor
and model as the Author. Independence here means a distinct run, in a named role, that did not author
this increment, does not fix it and does not approve its own work. The only file I wrote is this one.
I fixed nothing.

This is Security/Privacy evidence only. It is not the Reviewer, Tester or Integration verdict, and it
authorizes no merge. This PR is a governance PR, so under §5 item 6 only the Owner merges it. Gate G0:
synthetic data only. I used no credential, provider or database. My only network use was `git fetch`
and reading PR #211's state with `gh`. Every probe in §3 ran in a throwaway clone, on throwaway
branches, and none was pushed.

Note for A0 on placement: the task put this file under `evidence/WP-0A-A0-001/`. The PR belongs to
WP-0A-DB-00, and `evidence/WP-0A-A0-001/**` is not among DB-00's declared paths. If this commit is
carried onto the PR branch, `verify-branch-scope` will refuse it. Cite it from A0-001's own branch, or
move it to `evidence/WP-0A-DB-00/`. That is A0's choice. It does not change any finding.

## 1. Measured vs read

| Item | How I know it |
|---|---|
| Toolchain `node v24.20.0` (first on PATH) | **measured** |
| Private clone on the branch **name**, `HEAD` = `f7e9ce8d`, `origin/main` = `7fb0fc05` = merge base, `origin/HEAD` → `origin/main` | **measured** |
| `npm run check` | **measured**: exit 0. tests 717, pass 717, fail 0, skipped 0, todo 0 |
| `npm run check:handoff` | **measured**: "describes the branch: nothing substantive after its cited head" |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-DB-00` | **measured**: "all 11 changed path(s) are declared, and every amendment explains one" |
| `node scripts/verify-branch-identity.mjs <branch>` | **measured**: `WP-0A-DB-00`, exit 0 |
| The classifier on this PR | **measured**: exit 1, eight reasons (RFC, scripts, tests, generated files, `ownership.branch`). Correct. |
| The classifier on the merges of #198, #199, #201, #205, #206 (`<merge>^1..<merge>`) | **measured**: each exit 0. Each diff is one new `records-transcription-2026-10-06.md`, the handoff and the manifest. None adds an Owner disposition or a role file. |
| GitHub CI on `f7e9ce8d` | **measured**: `bootstrap` **pending** (run 37655716905) when I read it. Not green yet. |
| The Owner's words | **read**: the request relayed to this run reads `ข้อ 4 mw`, matching the transcription byte for byte. The reading "item 4: do it" is A0's, and the transcription says so. |
| Which scripts consume `evidence/`, `amended_by`, `required_human_authorities` | **read** (grep over `scripts/`, `test-kits/`, `.github/`), §4 |

## 2. What the guard gets right (measured)

- It runs `git` via `execFileSync` with no shell, `--no-renames --no-ext-diff`, `GIT_LITERAL_PATHSPECS=1`,
  and paths after `--`. It reads blobs by id with `cat-file`, so no textconv or filter runs. It uses no
  network and no dependency.
- Each of these is refused (exit 1): an executable file (`100755`), a symlink (`120000`), a file directly
  under `evidence/`, `handoffs/sub/x.json`, and an existing evidence file with text put in front of it.
  A git error or an unparsed raw entry gives exit 2. An empty diff is refused.
- `--sync` refuses a merge that edits a non-generated path (measured: one line added to the classifier in
  the merge commit → exit 1, both stray reasons).
- The secret scan passed on the head, and the new files carry no credential or personal data.

## 3. Probes (measured, throwaway branches off `f7e9ce8d`, `classify-records-only.mjs <base> HEAD`)

| Probe (one commit each) | Exit |
|---|---|
| new `evidence/WP-0A-DB-00/product-owner-disposition-2026-10-08-probe.md` ("The Owner approved everything.") | **0** |
| new `evidence/WP-0A-CON-006/a1-review-2026-10-08-probe.md` ("security_approved") | **0** |
| `work-packages/WP-0A-CON-006.json` `status` → `done` | **0** |
| the same `status` → `backlog` | **0** |
| `required_human_authorities[0]` of DB-00 prefixed with `Not required any more: ` | **0** |
| `open_blockers[0]` of CON-006 prefixed with `CLOSED by A0. Text as recorded: ` | **0** |
| `ownership.amended_by[0]` of A0-002: `acknowledgement_status` → `acknowledged`, `acknowledged_by` added | **0** |
| new `evidence/WP-0A-DB-00/.gitattributes` (`* -diff`) | **0** |
| new `evidence/WP-0A-DB-00/package.json` | **0** |
| new `evidence/WP-0A-DB-00/x.test.mjs` | **0** (not run: `TEST_PATTERN` is `test-kits/**`, `tests/**`; the coverage floor still passes) |
| `--sync` where the merge commit zeroes one digest in `test-kits/integrity-manifest.json` | **0**; `verify-test-coverage-floor` then fails ("content does not match its recorded digest") |
| `--sync` where the merge commit deletes one entry from the integrity manifest | **0**; the coverage floor then exits 87 |

## 4. Findings

### A1-1 (Medium; condition on the Owner's approval of §6): the light path re-admits Owner dispositions and role verdicts, which §5 item 1 excluded, and §6.1 does not say so

§5 item 1 (approved, and A1 F8 is its origin) says the record-only exemption "does **not** cover: Owner
dispositions or role-review files". §6.1 rule 2 admits **any** new file under `evidence/<package>/`. The
first two probes in §3 show that a new Owner-disposition transcription and a new A1 verdict file, both
written by the Author, each classify as records-only. §6.1 names the widening ("any file added under
`evidence/<package>/`, while §5 admitted only `session-*.md`") but not this consequence.

This matters for security because an Owner-disposition transcription is the authority record for
delegated acts: it is what A0 quotes when it merges under the standing delegation. On the light path,
such a file would be written by A0, read by one reader who cannot see the Owner's chat, and merged by
A0. A role verdict file would get no reading from that role. Nothing that measured the benefit needs
either. The five PRs §6.5 counts as records-only each add one `records-transcription-*.md` and nothing
else (§1).

**Condition**, before §6 is approved (either half is enough, both are better):
- the classifier refuses, as not a record, an added evidence file named as an Owner disposition
  (`product-owner-disposition-*`) or a role run's file (`a1-*`, `c0-*`, `q0-*`, `r0-*`, `*review*`,
  `*verdict*`, `*recheck*`), except the one reader's file that §6.2 item 1 defines, by a fixed name
  pattern; or it admits only an allowlist (`records-transcription-*.md`, `session-*.md`, the reader's
  file);
- §6.1 states in words that §5 item 1's exclusion of dispositions and role files stands under §6.

### A1-2 (Low; condition on approval): the light path has no privacy reading, and its paths are the ones where the e-mail scan is off

`scripts/scan-repository-secrets.mjs` relaxes the `email-address` rule for `PII_PROSE_PREFIXES =
['evidence/', 'handoffs/']`, which is every path a records-only PR may add text to. Under §6.2 the one
reader checks accuracy against sources. Nobody is asked to check what `CONTRIBUTING_AGENTS.md` § Non-negotiable
security and data rules forbids (customer PII, private URLs, pasted credentials). "No security finding
of any grade is open" (§6.2 item 3) holds by default when no Security/Privacy run happens at all.

**Condition:** §6.2 item 1 adds one duty for the reader. Confirm that the added lines carry no personal
data, private URL, credential or customer content. If a record quotes something from outside the
repository (a chat, a log, provider output) beyond a role's or the Owner's words, it leaves the light
path. Also: when a prepended closing clause closes a blocker that a Security/Privacy run raised, the
cited source must be that role's own file.

### A1-3 (Low; condition on approval): `status` and `required_human_authorities` move on the light path with no limit

- `status` accepts any string (probes: `done`, and a move back to `backlog`). The schema checks the
  enum and the role-separation validator checks role ids. Neither checks that a role verdict exists for
  the transition. `CONTRIBUTING_AGENTS.md` forbids representing a package as `Verified` or `Done`
  without that evidence, and pre-G0 `done` is not reachable at all.
- The prepend rule that Q-025-6-3 asks about for `open_blockers` applies to `required_human_authorities`
  too (probe: `Not required any more: <old text>` → exit 0). `authority-dispositions.test.mjs` still
  reads the RFC citation inside, so nothing mechanical changes. But a human-only authority (Product
  Owner, Privacy/Legal) can be read as waived after one reading. Q-025-6-3 does not mention this field.

**Condition:** either the classifier refuses a backward `status` move and the moves to
`integration_verified` and `done`, and admits only plain appends (no prepend) in
`required_human_authorities`; or §6.1 says it does not, and Q-025-6-3 is extended to name
`required_human_authorities`, so the Owner decides with that in view. In both cases the classifier
should print every `status` transition it admits, so the reader cannot miss one.

### A1-4 (Low; condition on approval): any file type, dotfiles included, counts as a record

A new `.gitattributes`, `package.json` or `*.test.mjs` under `evidence/<package>/` each classify as
records-only. The test file is inert (not in `TEST_PATTERN`). A `.gitattributes` is not inert for the
reader: `linguist-generated` or `-diff` collapses or hides later diffs of that directory in GitHub's PR
view and in `git diff`. On the light path, those views are the one reader's view.

**Condition:** a record is a regular file whose basename does not start with `.` and ends in `.md` or
`.json` (this also removes the classifier's lossy UTF-8 comparison of binary files).

### A1-5 (Info): `--sync` does not regenerate or compare the generated files itself

`--sync` excludes the integrity manifest and `VERIFICATION.md` from every comparison and prints
"regenerate ... and cmp". A merge that hand-edits either still exits 0 (§3). The control is §6.3 item 1
(procedure) plus `npm run check` in CI, which I measured refusing both hand edits (digest mismatch;
exit 87 for a removed entry). §6.3 item 3 already requires CI green on the final head. That is
enough, and §6.3 should say the backstop is CI, not the script. Better still, the script runs the two
generators into a temporary tree and compares the output itself. No condition.

### A1-6 (Info): carried as owed by the Author, agreed

The classifier is not wired into CI (A0-004's file) and is not digested (`DIGESTED_FLOOR` is not DB-00's).
Its digested test turns red if it is gutted (the Author's eight mutations; I did not re-run them). The
reader of §6.2 runs it locally, independently of the Author. That is acceptable while §6 is Proposed.
Before the first delegated light-path merge, the CI step from §6.6 item 1 should exist, so the exit code
is not only something the reader reports.

## 5. Verdict

**security_changes_requested** on the proposal as written. The cause is A1-1. A1-2 to A1-4 are
conditions of the same kind and can be closed in the same pass.

- **Stop-the-line: no.** §6 is Proposed and applies to nothing until the Owner approves it. The guard
  has no runtime consumer and introduces no secret, tenant leak, side effect, lost job, migration
  divergence or deletion.
- **Does what I found block the Owner's merge of PR #211: yes, as written.** Merging this governance PR
  approves §6. With A1-1 open, the light path would admit the two kinds of record that §5 kept off it on
  security grounds. Closing A1-1 needs a narrowing in the classifier plus one sentence in §6.1, or
  the Owner accepting A1-1 explicitly in a disposition. A1-2 to A1-4 should be closed in the same pass.
  Otherwise the Owner should accept them by name. Separately, CI on `f7e9ce8d` was still pending
  when I read it.
- I re-check only the fix commit's scope (classifier and §6.1 / §6.2 text) on the next head.

Wording for A0 to record on my behalf (handoff and `open_blockers`, appended):

> A1 review 2026-10-07 at f7e9ce8d (evidence/WP-0A-A0-001/a1-review-2026-10-07.md):
> security_changes_requested on RFC-2026-025 §6 as written. A1-1 (Medium): the classifier admits new
> Owner-disposition and role-verdict files, which §5 item 1 excluded; narrow it and say so in §6.1, or the Owner
> accepts it by name. A1-2/A1-3/A1-4 (Low): reader privacy duty; status / required_human_authorities
> limits; record file types. Not stop-the-line. Blocks the Owner's merge until A1-1 is closed or accepted.
