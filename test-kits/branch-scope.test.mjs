import assert from 'node:assert/strict';
import test from 'node:test';

import { amendmentProblems, declaredPaths, globToRegExp, undeclared } from '../scripts/verify-branch-scope.mjs';

// A manifest is a promise; a branch is a fact. `validate-work-package-ownership.mjs` checks the
// promise -- that declared outputs sit inside declared writable paths. Nothing checked the fact.
//
// Two failures in this repository came through that gap. A stacked rebase resolved with
// `--theirs` on a file the BASE had just changed silently reverted it: the payment-card
// separator withdrawal came back and the scanner then reported the package's own test file. And
// work done on the top branch while answering review findings accumulated changes to twenty-six
// paths belonging to packages further down the stack, none of them declared.
//
// The guard itself runs against a base ref, which a test cannot assume. What is asserted here is
// the matching, which is where a guard like this usually goes wrong: too permissive and it says
// nothing, too strict and it fails on the paths a package legitimately owns.
test('a glob matches within one segment, and `**` spans directories only as a whole segment', () => {
  assert.ok(globToRegExp('evidence/WP-0A-CON-008/**').test('evidence/WP-0A-CON-008/author-self-check.md'));
  assert.ok(globToRegExp('evidence/WP-0A-CON-008/**').test('evidence/WP-0A-CON-008/nested/deep.md'));
  assert.ok(!globToRegExp('evidence/WP-0A-CON-008/**').test('evidence/WP-0A-CON-007/author-self-check.md'));

  // A bare `*` must not cross a directory boundary -- this repository has already had a guard
  // defeated by a `**` that was read as spanning when it was written inside a segment.
  assert.ok(globToRegExp('handoffs/WP-0A-*-author-handoff.json').test('handoffs/WP-0A-CON-008-author-handoff.json'));
  assert.ok(!globToRegExp('handoffs/WP-0A-*-author-handoff.json').test('handoffs/nested/WP-0A-X-author-handoff.json'));
  assert.ok(!globToRegExp('scripts/*.mjs').test('scripts/nested/thing.mjs'));
});

test('a path that is neither owned nor recorded as an amendment is reported', () => {
  const manifest = {
    ownership: {
      writable_paths: ['work-packages/WP-X.json', 'evidence/WP-X/**'],
      amends_without_owning: { paths: ['package.json'] },
    },
  };
  const patterns = declaredPaths(manifest);
  assert.deepEqual(
    undeclared(['work-packages/WP-X.json', 'evidence/WP-X/note.md', 'package.json'], patterns),
    [],
  );
  assert.deepEqual(
    undeclared(['contract-catalog/shared-kernel/ctr-api-001/schema.json', 'work-packages/WP-Y.json'], patterns),
    ['contract-catalog/shared-kernel/ctr-api-001/schema.json', 'work-packages/WP-Y.json'],
  );
});

test('a manifest that declares nothing reports every changed path', () => {
  assert.deepEqual(undeclared(['a.md', 'b/c.json'], declaredPaths({})), ['a.md', 'b/c.json']);
});

// `amends_without_owning` was an unvalidated escape hatch. Nothing read it except the scope
// guard, and the guard unioned it straight into the allowed set -- so it silently overrode the
// SAME manifest's `forbidden_paths`, which name `.env`, `db/**`, `migrations/**` and
// private-key extensions. A package may amend what it does not own; it may not amend what it
// has itself declared forbidden.
test('an amendment cannot reach a path the package itself forbids', () => {
  const manifest = {
    ownership: {
      writable_paths: ['evidence/WP-X/**'],
      forbidden_paths: ['.env', 'db/**', 'migrations/**', '*.pem'],
      amends_without_owning: { paths: ['db/**'], rationale: 'stated' },
    },
  };
  assert.deepEqual(amendmentProblems(manifest, ['evidence/WP-X/a.md']), []);
  const problems = amendmentProblems(manifest, ['db/0001_init.sql', 'keys/server.pem']);
  assert.equal(problems.length, 2, 'both the migration path and the key in a subdirectory must be reported');
  assert.match(problems[0], /forbidden_paths/);
});

// `*.pem` in a forbidden list names a FILE SHAPE, not a top-level path. Matched as written it
// forbade `server.pem` and allowed `keys/server.pem` -- in the one list that exists to stop a
// private key reaching the repository.
test('a slashless forbidden pattern forbids that shape at any depth', () => {
  const manifest = { ownership: { forbidden_paths: ['*.pem', '.env'] } };
  for (const file of ['server.pem', 'keys/server.pem', 'a/b/c/server.pem', '.env', 'config/.env']) {
    assert.equal(amendmentProblems(manifest, [file]).length, 1, `${file} must be reported`);
  }
  assert.deepEqual(amendmentProblems(manifest, ['keys/server.pub', 'docs/env.md']), []);
});

test('an amendment path may not be absolute or traverse, and needs a reason', () => {
  const traversal = { ownership: { amends_without_owning: { paths: ['../outside/x', '/etc/passwd'], rationale: 'stated' } } };
  assert.equal(amendmentProblems(traversal, []).length, 2);

  const unexplained = { ownership: { amends_without_owning: { paths: ['package.json'] } } };
  assert.match(amendmentProblems(unexplained, [])[0], /no rationale/);

  const fine = { ownership: { amends_without_owning: { paths: ['package.json'], rationale: 'why' } } };
  assert.deepEqual(amendmentProblems(fine, []), []);
});
