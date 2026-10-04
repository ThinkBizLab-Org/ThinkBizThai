# A1 Security/Privacy review — the sql-lexer batch (WP-0A-DB-00)

- **Reviewer role:** independent Security/Privacy, run `/claude/a1_bastion`.
- **Subject:** branch `agent/claude/WP-0A-DB-00-batch-sql-lexer`, head `45893d9` (code `b2193ad`, evidence
  `98d0f2f`, handoff `45893d9`), base `5bde893` (main). Author `/claude/a0_atlas`.
  PR <https://github.com/ThinkBizLab-Org/ThinkBizThai/pull/177> (Draft).
- **Checked out** into my own branch `review/a1-batch-sql-lexer` at `45893d9`. I measured `npm run verify`,
  `npm run check:handoff` and `scripts/verify-branch-scope.mjs` on the branch **name**
  `agent/claude/WP-0A-DB-00-batch-sql-lexer` (checked out with `--ignore-other-worktrees`, not detached), never
  on a detached HEAD.
- **Date:** 2026-10-04 (the task and the sibling evidence are dated 2026-10-03; I keep the filename the task set).

## §0 What I am

I am a subagent of `/claude/a0_atlas`, the same run that authored this batch — the same vendor and the same model
family. Under RFC-2026-024 that shared origin is on record; this review is **not** the independent human sign-off
a gate requires. This file **records findings and advances no status**. It does not mark the package reviewed,
approved, tested or ready, and it does not merge. Acceptance of a role run as the role's signature is the
Integration Owner's and the Product Owner's act, not mine. Everything below is either **measured** (I ran it) or
**read** (I read it in the tree or a cited document); each item says which.

## §1 Scope and method

The batch replaces every bespoke SQL regex/scanner — `psqlLex`'s hand scanner and `SET_NAMES`, `COPY_PROGRAM`,
`COPY_SERVER_FILE`, `SERVER_FILE_CALL`, `escapeSpellings` — plus every static reader in the test suites and
`run.mjs` (comment strippers, literal blankers, the do-block counter, the audit tripwire, the view scan) with one
tokenizer `scripts/db/sql-lexer.mjs` that follows PostgreSQL's lexical rules and **fails closed** on anything it
cannot classify. The security claim I tested: *no statement passes the lexer (no refusal, no finding) that
PostgreSQL executes differently, in a way that reaches a file, a program, the catalog or another tenant.*

I **read** the lexer, the rewritten `psql-driver.mjs`, the rewired readers, the plan
(`a0-batch-sql-lexer-plan-2026-10-03.md`), the disposition, CONTRIBUTING_AGENTS.md and RFC-2026-002, and
`git diff 5bde893..45893d9`. I then **measured** live: a fresh PostgreSQL 17.11 cluster (`/opt/homebrew/bin`,
`initdb --locale=C -A trust -U postgres`, `LC_ALL=C`, 127.0.0.1:**5501** only, TCP, `log_statement=all`), Node
`v24.20.0` (confirmed before every run; a PATH Node 26 exists and was not used). For each adversarial source I
compared `psqlLex`'s verdict against what psql actually sent (the server log) and against side effects on disk.
The cluster was stopped and its data directory removed; `db/foundation/migrations/140_audit.sql` was never
modified (I fed candidates to psql over stdin, not through `make db-migrate-clean`), and my worktree is clean.

## §2 Claims checked (measured unless noted)

| Claim (plan / handoff / disposition) | Verdict | How |
|---|---|---|
| `npm run verify` green on the branch name | **TRUE** — `clean: exit 0 — tests 685, pass 685, fail 0` | measured |
| `npm run check:handoff` clean on the branch name | **TRUE** — "describes the branch: nothing substantive after its cited head" | measured |
| `node scripts/verify-branch-scope.mjs 5bde893 WP-0A-DB-00` exit 0 | **TRUE** — "all 16 changed path(s) are declared, and every amendment explains one" | measured |
| Differential: 221 sources, psql sent 1897, lexer split 1897, canonical text agrees for every source | **TRUE** — `test-kits/db/sql-lexer-differential.json`: 221 rows, Σlexer=1897, Σpsql=1897, 0 disagreements | measured (read the JSON) |
| The recorded sources are the real files | **TRUE** — of the 221 rows, 89 are file-backed and all 89 sha256 match the tree byte for byte; the other 132 are in-memory probe/drift strings from `run.mjs` (named, not paths), as the plan states | measured |
| `SERVER_FILE_FUNCTIONS` = 33 names incl. the 17.11 internal symbols; `APPROVED_EXTENSIONS=['pgcrypto']` | **TRUE** — 33 names; spot-checked `pg_read_file_all`, `be_lo_export`, `pg_ls_dir_1arg` present in `pg_proc.prosrc` on the live 17.11 | measured |
| Golden/fail-closed/split test passes | **TRUE** — the new foundation-contract test passes (`--test-name-pattern="one SQL lexer"`) | measured |
| Floors 80→81 tests, 1014→1044 assertions; VERIFICATION 684→685; audit-coverage line fields +1 | **TRUE** | read the diff |
| `b2193ad` is a plain commit (handoff guard was the only red, 685→683, 2 handoff-guard failures) | **PLAUSIBLE** — consistent with the tree; the refreshed head now passes 685/685 and the handoff is last and alone, as required | read |
| #176 merged by A0 under standing delegation, this PR a Draft, nothing approved | **TRUE as a record** — the disposition quotes the Owner verbatim and states A0 executed, did not decide; RFC-2026-025 §5 points remain open, which it says | read |

## §3 Adversarial battery (measured live, psql 17.11, log_statement=all)

Every dangerous spelling below was **refused** by `psqlLex`; every spelling it **passed** PostgreSQL treated as
benign or rejected with a syntax/semantic error. No divergence of security consequence was found.

| Spelling | psqlLex | PostgreSQL (live) | Agree? |
|---|---|---|---|
| `copy (select 1) to '/tmp/..'` | refuse: server file | wrote the file | yes |
| `copy (select 1) to program '…'` | refuse: PROGRAM | — | yes |
| `select pg_read_file('/etc/hostname')` | refuse: server-file fn | ran (file missing) | yes |
| `create function … language internal as 'x'` | refuse: LANGUAGE internal | — | yes |
| `… language sql as $$ select pg_read_file($1) $$` | refuse (body re-lexed) | — | yes |
| `select be_lo_export(1,'/tmp/..')` (internal symbol by name) | refuse: server-file fn | — | yes |
| `create foreign data wrapper …` | refuse: foreign-data | ran | yes |
| `create extension file_fdw` (read earlier rounds / D4) | refuse: extension | — | yes |
| `set client_encoding to 'SJIS'` / `set_config('client_encoding',…)` | refuse: client_encoding | ran | yes |
| `U&'0021' uescape '!'` | refuse: U& escape | ran | yes |
| `--c`<CR>`\! touch /tmp/a1cr` (bare CR ends comment, then meta) | refuse: `\!` | **ran the shell command** (file created) | yes — caught |
| `execute 'co'`<newline>`'py … to ''/tmp/..'''` (plain-newline continuation in a DO body) | refuse: server file | **joined and ran COPY** (file created) | yes — caught |
| `execute 'co' --x`<newline>`'py … to ''…'''` (`--`-comment continuation) | refuse: server file | **joined and ran COPY** (file created) | yes — caught |
| nested `EXECUTE` of `EXECUTE` of `copy … to '/tmp/a1deep'` (depth 2) | refuse: server file | **ran COPY at depth, file created** | yes — caught |
| `:'x'` / `\gexec` / `select 1 \gexec` | refuse: psql var / meta | psql substituted / ran | yes — caught |
| `$1$x$1$` (dollar tag starting with a digit) | refuse: param+junk | error (unterminated `$`) | yes (fail-closed) |
| `select 'a' /*`<nl>`*/ 'b'` (block comment between literals) | two separate strings | **syntax error** (PG does not continue across a C-comment) | yes |
| `execute 'co' /*`<nl>`*/ 'py…'` in a DO body | two separate strings, nothing dangerous | **syntax error**, `/tmp/a1evil` NOT created | yes |
| `copy (select 1) to stdout` | pass | ran | yes (benign, correct) |
| `select 1/**/+2`, `select $q$hello$q$` | pass | ran | yes (benign) |

The three continuation cases are the sharpest: PostgreSQL joins adjacent string literals across whitespace or a
`--` comment that contains a newline, but **not** across a `/* */` comment — and the lexer's `continuation()`
reproduces exactly that distinction, so an `EXECUTE` whose COPY is split across a continuation is still caught,
while the C-comment case (which PostgreSQL itself rejects) is read identically by both. The depth-walk caught a
COPY buried two `EXECUTE` levels deep.

## §4 Findings

**No stop-the-line finding. No finding that blocks the merge.** The two items below are informational; both are
already disclosed by the Author in the handoff `not_done` list, and I confirmed the underlying rewiring is
present and correct, so neither is a defect — only a gap in the batch's own red-mutation evidence.

### F1 — INFO — view-scan rewiring is present but its mutation is unmeasured
`tests/db/identity/identity-isolation.test.mjs:57` — `viewScanText` now reads through
`canonicalStatements` (the one lexer), and `:25` imports it; the rewiring is real (**read**), and I exercised the
shared `canonicalStatements`/`walkLevels` path live through `psqlLex` without finding a divergence (**measured**,
§3). What is missing is only the Author's own M-style proof that *weakening this specific reader turns the
identity-isolation suite red* — the handoff says so (`not_done` item 1). Remedy (owner: A0): add the view-scan
mutation to the mutation harness, or record that `viewScanText`'s contribution is covered by the
foundation-contract golden corpus. Not blocking.

### F2 — INFO — VERIFICATION.md was hand-rendered, not written by `npm run record:verification`
`evidence/VERIFICATION.md` — the Author used `scripts/record-verification.mjs`'s `render` directly because
`record:verification` refuses while the handoff guard is red and the handoff must be the last, lone commit
(disclosed, `not_done` item 2). I **measured** `npm run verify` = 685/685/0, which equals the recorded figure,
and `verification-record.test.mjs` re-checks it inside `npm run check` (green). So the value is correct; the only
gap is provenance, not accuracy. Remedy: none required for this batch; note the pattern for the handoff-guard
chicken-and-egg in the protocol if it recurs.

### Observations (not findings)
- COPY FROM STDIN with inline data followed by `\.` is **refused** (the `\.` lexes as a meta-command). This is an
  over-refusal that fails closed; the differential shows no fed source uses inline-STDIN data, so nothing
  integrated breaks. Harmless, worth knowing if a future fixture needs inline COPY data.
- `E''` and `U&`-prefixed tokens are refused wherever they appear, at every level — a deliberately broad rule
  that closes the entire escape-spelling class. Correct for security; it means a fed source may never carry an
  E-string or U&-literal/identifier (none of the 221 do).

## §5 Limits of this review

- The security guarantee is **lexical**. What a statement *means* (which function a name resolves to through
  `search_path`, what a trigger body does, whether a grant widens access) and text *computed at run time*
  (`format()`, `||`, `set_config` of a built name, `EXECUTE` of a concatenation) are outside any static lexer and
  stay with the live catalog probes in `run.mjs`. The code and plan say this; I did not re-verify those probes
  here.
- Multibyte client encodings (SJIS/BIG5/GBK/…) can mask bytes before PostgreSQL lexes. The batch refuses every
  static spelling that changes the encoding (`client_encoding`, `set names`, their escape spellings), so the only
  residual path is a *computed* encoding change, the run-time limit above. I confirmed the static refusals fire;
  I did not fuzz non-ASCII byte sequences under a pre-set unsafe encoding.
- I measured a wide adversarial battery, not an exhaustive one. Absence of a divergence in §3 is strong evidence,
  not a proof of totality.
- I am a same-family subagent of the Author (RFC-2026-024). This is a recorded review, not the independent human
  sign-off a gate needs.

## §6 Verdict

**Stop-the-line: NO. Blocks merge: NO** (on the Security/Privacy dimension). The lexer and the readers rewired
onto it read SQL as PostgreSQL 17.11 does across every spelling I could put past them, the differential and
packaging claims are true as measured, and the governance record (Draft PR, A0 executing a standing delegation,
nothing approved) is accurate. The merge still requires the other role runs (C0, Q0) and the Integration
Owner/Product Owner acts per 127 §6 and RFC-2026-002; this review grants none of them.
