import assert from 'node:assert/strict';
import test from 'node:test';

import { declaredPaths, globToRegExp, undeclared } from '../scripts/verify-branch-scope.mjs';

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

  // A mid-path `**/` keeps the boundary it sits on. Independent review found it compiling to
  // `.*` with the slash dropped, so `evidence/**/notes.md` matched `evidence/XYZnotes.md` --
  // which a shell globstar does not. Latent, because no manifest uses the form today, and
  // fixed rather than left because the next one will.
  assert.ok(globToRegExp('evidence/**/notes.md').test('evidence/notes.md'));
  assert.ok(globToRegExp('evidence/**/notes.md').test('evidence/deep/notes.md'));
  assert.ok(!globToRegExp('evidence/**/notes.md').test('evidence/XYZnotes.md'));
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
