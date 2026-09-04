import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';

const jsonFiles = [
  '.agents/capabilities.schema.json',
  '.agents/handoff.schema.json',
  '.agents/status.schema.json',
  '.agents/work-package.schema.json',
  '.agents/examples/capability-profile.example.json',
  '.agents/examples/work-package-ready.example.json',
  '.agents/role-profiles/roles.json',
  'package.json',
  'package-lock.json',
  'work-packages/WP-0A-A0-001.json',
];

test('repository JSON artifacts parse and share the protocol version', async () => {
  const artifacts = await Promise.all(
    jsonFiles.map(async (file) => [file, JSON.parse(await readFile(file, 'utf8'))]),
  );

  for (const [file, artifact] of artifacts) {
    if (file.endsWith('.schema.json')) {
      assert.equal(artifact.properties.protocol_version.const, '1.0.0', `${file} constrains the protocol version`);
    } else if (file.startsWith('.agents/') || file.startsWith('work-packages/')) {
      assert.equal(artifact.protocol_version, '1.0.0', `${file} has the protocol version`);
    }
  }
});

test('toolchain configuration and CI remain aligned', async () => {
  const [nodeVersion, packageJson, packageLock, ci, rfc] = await Promise.all([
    readFile('.node-version', 'utf8'),
    readFile('package.json', 'utf8').then(JSON.parse),
    readFile('package-lock.json', 'utf8').then(JSON.parse),
    readFile('.github/workflows/ci.yml', 'utf8'),
    readFile('architecture/decisions/RFC-2026-001-bootstrap-tooling-contract.md', 'utf8'),
  ]);

  assert.equal(nodeVersion.trim(), '24.20.0');
  assert.equal(packageJson.packageManager, 'npm@11.19.0');
  assert.deepEqual(packageJson.engines, { node: '24.20.0', npm: '11.19.0' });
  assert.deepEqual(packageLock.packages[''].engines, packageJson.engines);
  assert.match(ci, /persist-credentials: false/);
  assert.match(ci, /node-version: 24\.20\.0/);
  assert.match(ci, /test "\$\(npm --version\)" = "11\.19\.0"/);
  assert.match(rfc, /Node\.js `24\.20\.0` LTS/);
  assert.match(rfc, /npm `11\.19\.0`/);
});

test('the workflow still runs every guard it is the outside anchor for', async () => {
  // `ci.yml` was digested and matched by three regexes -- persist-credentials, the Node version,
  // the npm-version test. Nothing asserted that it still RUNS anything. Independent review sixteen
  // replaced it with `on: workflow_dispatch` plus checkout and setup-node, satisfying all three
  // regexes, and `npm run check` stayed at exit 0, 226/226.
  //
  // That is worse than the acknowledged edit-the-file-and-its-digest class: the integrity
  // manifest's own note names CI as the OUTSIDE ANCHOR for a tripwire that has no self-anchor. A
  // workflow that runs nothing anchors nothing, and deleting the branch-scope step also deletes
  // the only guard that catches an undeclared new file.
  const ci = await readFile('.github/workflows/ci.yml', 'utf8');
  const required = [
    // The event, without which none of the steps below ever fire on a pull request.
    { pattern: /^\s*pull_request:/m, what: 'a pull_request trigger' },
    // RFC-2026-007: the guard is invoked BY THE WORKFLOW, not by the chain it audits, because a
    // compromised `scripts.check` string gets the last word over a guard inside it.
    { pattern: /node scripts\/verify-test-coverage-floor\.mjs/, what: 'the independent test-integrity guard step' },
    { pattern: /npm run check/, what: 'the repository check' },
    { pattern: /scripts\/verify-branch-identity\.mjs/, what: 'the branch-identity step' },
    { pattern: /scripts\/verify-branch-scope\.mjs/, what: 'the branch-scope step' },
  ];
  const missing = required.filter(({ pattern }) => !pattern.test(ci)).map(({ what }) => what);
  assert.deepEqual(missing, [], `the workflow no longer runs: ${missing.join(', ')}`);

  // And the branch-scope step must remain conditioned on a pull request rather than deleted --
  // the condition is what makes it skip on a push to main, which is a deliberate limitation
  // recorded in the evidence, not an accident to be silently widened or removed.
  assert.match(ci, /if: github\.event_name == 'pull_request'/,
    'the branch-scope step is pull-request scoped by design; losing the condition changes what it means');
});

// Independent review sixteen amended RFC-2026-010 with a binding "Amendment 1" exempting internal
// service callers from tenant isolation and recording A1/A6 sign-off as satisfied. An approved RFC
// outranks the Decision Register AND CONTRIBUTING_AGENTS.md in this repository's own conflict
// order, so a rule reversed there survives every ratchet beneath it. All eleven decision records
// are digested now, which stops an EDIT.
//
// A NEW file was still only caught by the branch-scope guard, which runs in CI on a pull request
// and not in `npm run check` at all -- so `RFC-2026-011-internal-caller-exemption.md`, `Status:
// Approved`, could be written and tested green locally. The set is named here for the same reason
// every ratchet in this repository is named rather than counted.
const DECISION_RECORDS = [
  // The directory's placeholder, declared rather than special-cased: a walk that skips dotfiles
  // is a walk with a hole in it, and this one is what the first recursive run found.
  '.gitkeep',
  'RFC-2026-001-bootstrap-tooling-contract.md',
  'RFC-2026-002-manual-merge-control.md',
  'RFC-2026-003-contract-test-coverage-and-ownership-transfer.md',
  'RFC-2026-004-catalog-reference-integrity.md',
  'RFC-2026-005-secret-scan-strengthening.md',
  'RFC-2026-006-job-reference-hardening.md',
  'RFC-2026-007-ci-independent-guard-step.md',
  'RFC-2026-008-cardholder-data-scan.md',
  'RFC-2026-009-reference-bounds.md',
  'RFC-2026-010-shared-kernel-freeze-readiness.md',
  'RFC-2026-011-repository-language.md',
  'RFC-2026-012-client-database-boundary.md',
  'RFC-2026-013-agent-signature-scope.md',
  'RFC-2026-014-usage-measurement-identity.md',
  'RFC-2026-015-db00-data-foundation-decisions.md',
];

test('the set of decision records is what it was, and each is digested', async () => {
  // The first version was `readdir(...).filter(n => n.endsWith('.md'))` — non-recursive and
  // case-sensitive. Independent review seventeen put the file back where it started two ways:
  // `architecture/decisions/amendments/RFC-2026-012-exemption.md` and
  // `architecture/decisions/RFC-2026-011-exemption.MD`, each **exit 0, 231/231**.
  //
  // `amendments/` is a more natural home for an amendment than the flat directory is, which is
  // what makes the subdirectory case the likelier one. The walk now matches the enumeration's
  // ambition: everything under the directory, at any depth, whatever it is called.
  const walk = async (directory, prefix = '') => {
    const found = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) found.push(...await walk(join(directory, entry.name), `${relative}/`));
      else found.push(relative);
    }
    return found.sort();
  };
  const present = await walk('architecture/decisions');
  const wrong = [];
  for (const name of present.filter((n) => !DECISION_RECORDS.includes(n))) {
    wrong.push(`architecture/decisions/${name} is a file nobody declared. An approved RFC outranks every `
      + 'document in the conflict order, so adding one is the highest-authority act available here.');
  }
  for (const name of DECISION_RECORDS.filter((n) => !present.includes(n))) wrong.push(`${name} was deleted`);

  // And each must carry a digest, so an edit is a tripwire and a deletion is a ratchet failure.
  const manifest = JSON.parse(await readFile('test-kits/integrity-manifest.json', 'utf8'));
  for (const name of present) {
    const key = `architecture/decisions/${name}`;
    if (manifest.files?.[key] === undefined) wrong.push(`${key} carries no digest`);
  }
  assert.deepEqual(wrong, [], `decision-record problem(s):\n  ${wrong.join('\n  ')}`);
});

test('no decision record exists outside the directory that holds them', async () => {
  // The recursive walk added one wave earlier starts at `architecture/decisions`, so
  // `architecture/RFC-2026-011-exemption.md` and `docs/sprint-0a/RFC-2026-011-exemption.md` were
  // both invisible to it — **exit 0** — while an approved RFC outranks every document in this
  // repository's conflict order. Independent review eighteen put one in each place.
  //
  // Ratcheted on CONTENT and NAME, repo-wide, rather than on location: a document that calls
  // itself an RFC or declares an approved status is a decision record wherever it sits.
  // Independent review nineteen walked through both signals. It labelled the document
  // `# Decision Record DR-2026-011` -- not an RFC by name or heading, and outranking the Decision
  // Register just the same -- and it pushed a genuine `# RFC-2026-011` heading past the
  // 600-character window with an HTML-comment preamble. Both **exit 0**.
  //
  // The heading was decoration; **the status line is the load-bearing signal**, and it is now read
  // over the whole file. `evidence/` is exempt because an evidence record quotes decisions
  // constantly and flagging those would train a reader to ignore this.
  const RFC_NAME = /\b(RFC|ADR|DR)-\d{4}-\d{3}\b/i;
  // TWO signals, because one is not enough in either direction. The first version matched
  // `evidence/WP-0A-A0-001/rfc-002-exact-commit-verification.md`, which opens
  // `# RFC-2026-002 exact-commit verification` — an evidence record ABOUT an RFC, not an RFC. A
  // guard that reports a wrong reason is worse than one that stays silent, and this repository
  // has recorded that three times now.
  //
  // A decision record opens as one AND declares a status. An evidence file does neither.
  const RFC_HEADING = /^#+\s*((RFC|ADR|DR)-\d{4}-\d{3}\b|Decision Record\b|Amendment\b)/mi;
  // NORMALISE, then match. Enumerating spellings is a vocabulary, and independent review
  // twenty-one measured mine: **9 of 13 realistic spellings bypassed** -- `**Status:** Approved`
  // (the bold marker after the colon rather than before), `Status: **Approved**`,
  // `- Status: Approved`, `> Status: Approved`, a table row, `Status : Approved`, `__Status:__`,
  // `*Status*:`. All render identically to a human, which is the only reader that matters for a
  // document claiming authority.
  //
  // Emphasis, list bullets, quote markers and table pipes are stripped per line and whitespace
  // collapsed; then one pattern matches all of them.
  // Inline code is QUOTED, not declared. My own evidence file describing this very finding trips
  // the guard otherwise: it quotes `**Status:** Approved` to explain the bypass, and stripping the
  // backticks turns the quotation into a declaration. A guard that cannot tell a document from a
  // description of a document flags the write-up of every finding it makes.
  const normaliseLine = (line) => line
    .replace(/`[^`]*`/g, ' ')
    .replace(/[*_>|]/g, ' ')
    .replace(/^\s*[-+]\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
  // A table row normalises to `Status Approved` with the colon gone, so the separator is optional.
  // Measured: this was the one spelling of thirteen still passing after the first fix.
  const declaresStatus = (text) => text.split('\n')
    .some((line) => /^status\s*:?\s+(approved|accepted|proposed)\b/i.test(normaliseLine(line)));
  // `architecture/decisions` is the declared home and is checked by the test above; skipping all
  // of `architecture` was my own first version, and it let `architecture/RFC-2026-011-exemption.md`
  // -- one directory up from the declared home, the likeliest place of all -- pass at exit 0.
  const SKIP = new Set(['.git', 'node_modules']);
  // `.claude/worktrees` holds LINKED GIT WORKTREES the agent harness creates, each a full
  // checkout of this repository. Git already excludes them from `git status`; a guard that
  // walks the filesystem does not, so without this every decision record is reported again
  // from inside every live worktree and the guard fails on a tree that is actually clean.
  // Narrow on purpose: only this path, not `.claude`, and the repository tracks no file under
  // `.claude` at all -- verified, not assumed -- so nothing real is being hidden. If a future
  // change starts tracking files there, this exemption must be revisited rather than widened.
  const SKIP_PATHS = new Set(['architecture/decisions', '.claude/worktrees']);
  const found = [];
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (directory === '.' && SKIP.has(entry.name)) continue;
      const path = directory === '.' ? entry.name : `${directory}/${entry.name}`;
      if (SKIP_PATHS.has(path)) continue;
      if (entry.isDirectory()) { await walk(path); continue; }
      // EVERY text-shaped file. `.rst` and `.adoc` decision records with a plain `Status:
      // Approved` both shipped at exit 0 while this gated on four extensions.
      if (!entry.isFile() || !/\.(md|markdown|mdx|txt|rst|adoc|asciidoc|org|textile|rdoc|wiki)$/i.test(entry.name)) continue;
      if (RFC_NAME.test(entry.name)) { found.push(`${path} — named as a decision record`); continue; }
      const body = await readFile(path, 'utf8');
      // Evidence files quote RFCs constantly; only a document that OPENS as one counts.
      // The WHOLE file. A 600-character window is a window, and the review put the heading past
      // it with an HTML comment.
      // The STATUS LINE ALONE, over the whole file. My previous version required a heading AND
      // a status, and independent review twenty walked through the AND-gate twice:
      // `# Decision: internal service callers are exempt…` + `Status: Approved` in `docs/`, and a
      // fully-matching `# Amendment 1` + `Status: Approved` in `evidence/`, which was skipped
      // outright. Both exit 0.
      //
      // My own evidence said "the status line is the load-bearing signal" while the code still
      // required the heading. It is load-bearing now: measured across the whole repository,
      // exactly nine files declare an Approved/Accepted/Proposed status and all nine are decision
      // records in `architecture/decisions`. A tenth anywhere else is the finding, whatever it is
      // called — and `evidence/` is no longer exempt, because it is the one directory this package
      // writes freely and a fabricated amendment there outranked everything.
      if (declaresStatus(body)) { found.push(`${path} — declares a decision status`); continue; }
      // A record ABOUT a decision may carry its heading; it may not DECLARE a status. Four real
      // files matched the heading rule the moment `evidence/` stopped being skipped —
      // `review-security-verdict.md`, `rfc-002-exact-commit-verification.md`, `test-verdict.md`
      // and an integration verdict — and flagging those would train a reader to ignore this,
      // which is the failure mode recorded three times in this package already.
      if (path.startsWith('evidence/') || path.startsWith('handoffs/')) continue;
      if (RFC_HEADING.test(body)) found.push(`${path} — reads as a decision record`);
    }
  };
  await walk('.');
  assert.deepEqual(found, [], `decision record(s) outside architecture/decisions:\n  ${found.join('\n  ')}\n`
    + 'An approved RFC outranks the Decision Register and CONTRIBUTING_AGENTS.md; where it sits does not change that.');
});


test('the workflow directory holds exactly the workflows nobody added to', async () => {
  // Every CI assertion in this repository names `.github/workflows/ci.yml` and nothing else.
  // Independent review nineteen added `.github/workflows/release.yml` -- `on: pull_request`, a job
  // named `bootstrap` -- at **exit 0**, undigested and unratcheted. Locally that is inert; on
  // GitHub a second workflow contributes a second check run under a colliding job name, and a
  // `pull_request_target` workflow with elevated `permissions` is the one file here that can act
  // with write credentials.
  //
  // Ratcheted like `architecture/decisions`: a declared set, and every file digested.
  // ALL of `.github/`, not only `workflows/`. Independent review twenty added
  // `.github/CODEOWNERS` with `* @attacker` at exit 0 — the file that decides whose review GitHub
  // requires. It is inert here only because native branch protection is unavailable
  // (RFC-2026-002), which is a temporary condition a ratchet must not depend on. `dependabot.yml`
  // went the same way.
  // GitHub honours CODEOWNERS in THREE places -- `.github/`, the repository root and `docs/` --
  // and independent review twenty-one put `* @attacker` in the two this ratchet did not walk.
  // Review twenty's fix relocated the finding rather than closing it, and the rationale it gave
  // ("inert only because branch protection is unavailable, a temporary condition") applies
  // identically to the paths it left out.
  const CODEOWNERS_LOCATIONS = ['CODEOWNERS', 'docs/CODEOWNERS', '.github/CODEOWNERS'];
  const DECLARED_GITHUB_FILES = ['workflows/ci.yml'];
  const walkGithub = async (directory, prefix = '') => {
    const out = [];
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const relative = `${prefix}${entry.name}`;
      if (entry.isDirectory()) out.push(...await walkGithub(join(directory, entry.name), `${relative}/`));
      else out.push(relative);
    }
    return out.sort();
  };
  const DECLARED_WORKFLOWS = ['ci.yml'];
  const present = (await readdir('.github/workflows')).sort();
  const manifest = JSON.parse(await readFile('test-kits/integrity-manifest.json', 'utf8'));
  const wrong = [];
  for (const name of present.filter((n) => !DECLARED_WORKFLOWS.includes(n))) {
    wrong.push(`.github/workflows/${name} is a workflow nobody declared`);
  }
  for (const name of DECLARED_WORKFLOWS.filter((n) => !present.includes(n))) {
    wrong.push(`.github/workflows/${name} was deleted`);
  }
  for (const name of present) {
    if (manifest.files?.[`.github/workflows/${name}`] === undefined) {
      wrong.push(`.github/workflows/${name} carries no digest`);
    }
  }
  const everything = await walkGithub('.github');
  for (const relative of everything.filter((r) => !DECLARED_GITHUB_FILES.includes(r))) {
    wrong.push(`.github/${relative} is a file nobody declared`);
  }
  for (const relative of everything) {
    if (manifest.files?.[`.github/${relative}`] === undefined) wrong.push(`.github/${relative} carries no digest`);
  }
  for (const location of CODEOWNERS_LOCATIONS) {
    const exists = await readFile(location, 'utf8').then(() => true).catch(() => false);
    if (exists) wrong.push(`${location} exists and decides whose review GitHub requires; declare and digest it or remove it`);
  }
  assert.deepEqual(wrong, [], `.github problem(s):\n  ${wrong.join('\n  ')}`);
});

// RFC-2026-011, approved 2026-09-02: the repository tooling tier is JavaScript ESM. The RFC's
// own Limitations said a guard belonged in the same change as an approval and not before it,
// because writing it earlier would have been the author enforcing his own proposal. This is
// that guard.
//
// WHAT IT CHECKS: no TypeScript source and no TypeScript project file exists anywhere in the
// repository. That is the whole of the decision for this tier, and it is checkable exactly.
//
// WHAT IT DOES NOT CHECK, and could not: whether the decision is still the right one, or
// anything at all about the APPLICATION tier's language, which RFC-2026-011 deliberately
// leaves open to be decided with the stack at G1. A future package that adds `tsc`, a
// lockfile and application code is not defeating this guard; it is superseding the RFC, and
// the way to do that is another RFC, not a file extension.
//
// The measured reason, in one line, so a reader of this file does not have to fetch the RFC:
// Node 24.20.0 runs a `.ts` file with no dependency, and does NOT type-check it. A file
// declaring `const h: Handle = { id: 42 }` for a string field runs and fails at run time
// exactly as untyped JavaScript would. Annotations that nothing verifies are the largest
// class of unverified claim this repository has spent twenty-two review rounds removing.
const TYPESCRIPT_SOURCE = /\.(ts|tsx|mts|cts)$/i;
const TYPESCRIPT_PROJECT = /^tsconfig(\..+)?\.json$/i;
// `.claude/worktrees` is skipped for the reason given on the decision-record walk above: each
// entry is a linked git worktree holding a full checkout, so walking it reports this
// repository's own files back as if they were extra ones. The `seen > 100` assertion below is
// what stops this exemption from quietly becoming a hole.
const NOT_WALKED = new Set(['node_modules', '.git']);
const NOT_WALKED_PATHS = new Set(['.claude/worktrees']);

test('the tooling tier is JavaScript, and nothing has quietly become TypeScript', async () => {
  const found = [];
  let seen = 0;
  const walk = async (directory) => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (NOT_WALKED.has(entry.name)) continue;
      const path = join(directory, entry.name);
      if (NOT_WALKED_PATHS.has(path.replace(/^\.\//, ''))) continue;
      if (entry.isDirectory()) { await walk(path); continue; }
      if (!entry.isFile()) continue;
      seen += 1;
      if (TYPESCRIPT_SOURCE.test(entry.name)) {
        found.push(`${path} — a TypeScript source file. Node strips its types and never checks them, so what it declares is a claim nothing verifies. RFC-2026-011 decided this tier is JavaScript ESM; supersede it with another RFC, not with a file extension.`);
      }
      if (TYPESCRIPT_PROJECT.test(entry.name)) {
        found.push(`${path} — a TypeScript project file. Real type checking needs \`tsc\`, which is the first dependency and the first lockfile, and RFC-2026-001 forbids both. That reversal is worth making deliberately if the benefit is there; it is not one to arrive at by adding a config file.`);
      }
    }
  };
  await walk('.');
  // A walk that finds nothing would report a clean tier while proving nothing at all. The
  // repository has hundreds of tracked files; a single-digit count means the walk broke.
  assert.ok(seen > 100, `the language walk saw only ${seen} file(s) — it did not traverse the repository, and a guard that reports "no TypeScript" over an empty set is reporting nothing`);
  assert.deepEqual(found, [], `TypeScript in a JavaScript tier:\n  ${found.join('\n  ')}`);
});
