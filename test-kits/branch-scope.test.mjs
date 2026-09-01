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

test('an amendment list cannot be a pattern that names nothing', async () => {
  // `declaredPaths()` unions writable_paths and amends_without_owning.paths, and the ownership
  // validator read only the first of those -- not for shape, not for breadth, not for overlap.
  // Independent review thirteen appended `"**"` to the amendment list: globToRegExp('**')
  // compiles to /^.*$/, so a branch touching contracts it does not own reported
  // "all N changed path(s) are declared" at exit 0.
  //
  // The neighbouring field had been hardened and this one had nothing, which is the more general
  // lesson: a check on one field says nothing about the field beside it.
  const { validateManifestOwnership, OwnershipValidationError } = await import('../scripts/validate-work-package-ownership.mjs');
  const manifest = (paths, rationale = 'a reason long enough to be a reason and not a placeholder word') => ([{
    work_package_id: 'WP-T-001',
    ownership: {
      writable_paths: ['owned.txt'],
      read_only_paths: [],
      amends_without_owning: { paths, rationale },
    },
    outputs: { files: ['owned.txt'] },
  }]);

  for (const pattern of ['**', '*', '*/*', '**/*']) {
    assert.throws(() => validateManifestOwnership(manifest([pattern])),
      (error) => error instanceof OwnershipValidationError && error.code === 74,
      `${JSON.stringify(pattern)} names nothing and must be rejected`);
  }
  assert.throws(() => validateManifestOwnership(manifest(['/etc/passwd'])), { code: 74 });
  assert.throws(() => validateManifestOwnership(manifest(['../outside.txt'])), { code: 74 });
  assert.throws(() => validateManifestOwnership(manifest(['scripts/run-test-suite.mjs'], 'too short')), { code: 74 },
    'an amendment is a claim about another package\'s files and has to say why');

  // And the legitimate forms still pass: a concrete path, and a glob with a literal segment.
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['scripts/run-test-suite.mjs'])));
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['evidence/WP-0A-CON-007/**'])));
  assert.doesNotThrow(() => validateManifestOwnership(manifest([])), 'an empty amendment list needs no rationale');
});

test('an amendment cannot be a blanket permission over a tree', async () => {
  // `namesSomething` closed `["**"]`. Probing that fix immediately afterwards showed
  // `contract-catalog/**` and `scripts/**` still passed: one literal segment, an entire tree.
  //
  // And the probe found one already declared and unnoticed — WP-0A-CON-007 amended
  // `contract-catalog/shared-kernel/**`, covering **705 files, the whole catalog**, including
  // ctr-ntf-001 which belongs to A5 and which that package never touched. It named a permission
  // rather than recording work. Replaced with the thirteen contract directories its own git range
  // shows it changed.
  const { validateManifestOwnership, AMENDMENT_BREADTH_CAP, OwnershipValidationError } =
    await import('../scripts/validate-work-package-ownership.mjs');
  const tree = [];
  for (let i = 0; i < 400; i += 1) tree.push(`contract-catalog/shared-kernel/ctr-${i}/schema.json`);
  for (let i = 0; i < 20; i += 1) tree.push(`evidence/WP-0A-CON-007/note-${i}.md`);
  const manifest = (paths) => ([{
    work_package_id: 'WP-T-001',
    ownership: {
      writable_paths: ['owned.txt'],
      read_only_paths: [],
      amends_without_owning: { paths, rationale: 'a reason long enough to be a reason and not a placeholder word' },
    },
    outputs: { files: ['owned.txt'] },
  }]);

  // Breadth in files, measured against a tree with no protected file in it so the two rules are
  // observed separately.
  assert.throws(() => validateManifestOwnership(manifest(['evidence/**']), [
    ...Array.from({ length: 400 }, (unused, i) => `evidence/WP-X/note-${i}.md`),
  ]),
  (error) => error instanceof OwnershipValidationError && error.code === 74 && /covers 400 files/.test(error.message),
  'a whole-tree amendment must be rejected even though it names a literal segment');
  assert.throws(() => validateManifestOwnership(manifest(['contract-catalog/shared-kernel/**']), tree), { code: 74 });

  // Breadth in PROTECTION, which the file cap does not measure: `scripts/**` covers fifteen
  // files and would pass the cap — and those fifteen are every guard in this repository.
  assert.throws(() => validateManifestOwnership(manifest(['scripts/**']), tree),
    (error) => error instanceof OwnershipValidationError && error.code === 74 && /protected file/.test(error.message),
    'a glob over a guard is a permission, not a record');
  assert.throws(() => validateManifestOwnership(manifest(['.agents/**']), tree), { code: 74 });
  assert.throws(() => validateManifestOwnership(manifest(['contract-catalog/**']), tree), { code: 74 });
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['scripts/verify-branch-scope.mjs']), tree),
    'naming the protected file is exactly what the rule asks for');

  // Bounded ones still pass, which is what makes the cap a cap rather than a ban.
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['evidence/WP-0A-CON-007/**']), tree));
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['contract-catalog/shared-kernel/ctr-1/**']), tree));
  assert.ok(AMENDMENT_BREADTH_CAP >= 64 && AMENDMENT_BREADTH_CAP <= 256,
    'the cap is pinned so that widening it is a deliberate edit, not a quiet one');

  // Without a file list the FILE-COUNT check cannot run, and the pure form stays pure — the real
  // validator always supplies the tree. The protected-file rule needs no tree and still applies,
  // which is the more important half: it does not depend on being called the right way.
  assert.doesNotThrow(() => validateManifestOwnership(manifest(['evidence/**'])),
    'breadth in files is measured only where the tree is known');
  assert.throws(() => validateManifestOwnership(manifest(['scripts/**'])), { code: 74 },
    'the protected-file rule must not depend on the caller supplying a file list');
});
