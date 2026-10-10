# Q0 review of PR #243: the A5 assessment of CTR-NTF-001, and the C-3 re-read against C-T3 (NTF item 2, part 2)

- **Role:** Q0, independent Tester (`/claude/q0_sentinel`), and the assessor whose condition C-T3 binds the A5 file
  (`cc-a5-loom.json` `limitations.benchmark_outcome`; `q0-a5-benchmark-2026-10-10.md` §6).
- **PR:** #243, branch `agent/claude/WP-0A-CON-006-stale-blockers`, base main `9d0751ece9ba71c6bb7812f55dd04ab3c4b96c4b`.
- **Head read:** `7ee39626d89e0d00ee32f91d782884805a64d9de` [measured: `gh pr view 243 --json headRefOid,headRefName`
  after `git fetch -q origin`; `git rev-parse HEAD` in my worktree gives the same].
- **Verdict:** `test_verified`. **C-T3 is met** by `a5-ntf-assessment-2026-10-10.md` (§2). Q0's recommendation of
  `/claude/a5_loom` stands; it is **not** withdrawn under its own rule. C-3 is met by this file.
- **Stop-the-line:** no.

## 0. Who I am

I am `/claude/q0_sentinel`, a Claude Code subagent (Anthropic, `claude-opus-5-5`), spawned by A0
(`/claude/a0_atlas`), who wrote CTR-NTF-001 and the C-1 and C-2 commits on this branch. `/claude/a5_loom`, whose file
I re-read, is spawned from the same lineage. This is the same-lineage reading the Owner accepted with disclosure
(disposition 2026-10-09 Q4); I disclose it and do not claim it is cured. I also wrote the benchmark and the C-T3
condition I now apply, so a reader should check §2 against the probes in Appendix A rather than take my scoring. I
hold no Author, Reviewer, Security, Integration Owner, merge or Owner authority. I edited nothing on the PR branch; I
wrote this one file, on `q0/WP-0A-CON-006-ntf2b-2026-10-10`, cut from the head after measuring.

## 1. Measured versus read

### 1.1 Measured on the branch name

Worktree `$SP/q0-ntf2b`: `git worktree add -q --detach … 7ee39626`, then `git checkout -q --ignore-other-worktrees
agent/claude/WP-0A-CON-006-stale-blockers` (`git rev-parse --abbrev-ref HEAD` printed the branch name). Node
v24.20.0. `origin/main` = `9d0751ec`, an ancestor of the head [measured].

| Command | Result |
|---|---|
| Full suite, **under `$SP/suite.lock`** (acquired 12:30:08Z, released 12:47:13Z; script `suite.sh`, SHA-256 `a9c9048e…f606`) | |
| `npm run check` | exit 0; tests 740, pass 740, fail 0, cancelled 0 |
| `npm run regenerate:manifest` then `git diff --exit-code` | exit 0, exit 0 (clean) |
| `npm run record:verification` then `git diff --exit-code` | exit 0 ("recorded 740 passing, 0 skipped, 0 todo"), exit 0 (clean) |
| `git status --porcelain` after the run | empty |
| `npm run check:handoff` | exit 0, "describes the branch: nothing substantive after its cited head" (cites `2d5db735`; `7ee39626` is the handoff alone) |
| `node scripts/verify-branch-scope.mjs origin/main WP-0A-CON-006` | exit 0, "all 10 changed path(s) are declared, and every amendment explains one" |
| `node scripts/db/classify-review-tier.mjs origin/main HEAD` | `tier: H (10 path(s), 9d0751e..7ee3962)`; classifier copy is the base's |
| `node scripts/db/classify-records-only.mjs origin/main HEAD` | exit 1, not records-only (contract, test and A5/Owner evidence files), as expected |
| CI | `bootstrap` run `38051931420` on `7ee39626`: SUCCESS [measured: `gh pr view 243 --json statusCheckRollup`] |

No failure needed the timeout re-run.

### 1.2 Pin mutations (worktree `$SP/q0-ntf2b-mut`, detached at the head; `mut.sh` `79a0e8a3…45b6`, output `mut.out` `f61a63a9…ceb3`)

`node --test test-kits/contracts/catalog-registry.test.mjs`, one mutant at a time, each edit checked non-empty by
`git diff --numstat`, each file restored afterwards (0 changed paths at the end):

| Mutant | Result |
|---|---|
| baseline | exit 0, pass 19, fail 0 |
| M1 caveat pin back to `78c774aedcb5bdbc` | exit 1, fail 1: "untestable_by_schema was rewritten — digest 78c774aedcb5bdbc became dfe65f16b2f36949" |
| M2 annotation pin back to `6676c9e55382b076` | exit 1, fail 1: "annotation text changed — digest 6676c9e55382b076 became d41ba1c066871f44" |
| M3 manifest alone back to `9d0751ec` | exit 1, fail 1 (`dfe65f16…` became `78c774ae…`) |
| M4 schema alone back to `9d0751ec` | exit 1, fail 1 (`d41ba1c0…` became `6676c9e5…`) |
| M5 one word in item (5): "is denied" → "is allowed" | exit 1, fail 1 (became `96410322dfa9d484`) |
| M6 one word in item (6): "71 characters" → "72 characters" | exit 1, fail 1 (became `6da2d9770ca5375a`) |
| M7 one word in A5's `dedupe_key.x-bound-note` sentence | exit 1, fail 1 (became `84f318d9ffbcd594`) |

Both moved pins bite, on the whole file and on a single word of each A5 text.

### 1.3 Other measurements

- **C-1, independently** (`c1check.mjs` `7932ddde…6ee1`, Appendix A): A5's item (5) (973 chars) and item (6) (774
  chars), extracted mechanically from the A5 file's quote blocks, occur verbatim in the head manifest's
  `untestable_by_schema`, in the order (4) < (5) < (6); item (5) is absent at the base. The two replacement sentences
  for items (2) and (3) are present and the replaced "OWED by A5 before this contract leaves Draft" and "until it is
  recorded they are A0['s]" are gone. The only manifest key that differs base → head is `untestable_by_schema`.
  This agrees with A5's own re-read §2; the schema side (three `x-` leaves, no constraint moved) I take from A5's
  `c1.mjs` result and my M4/M7 mutants, not from a second deep-diff of my own.
- **`open_blockers` append-only:** base 28 entries, head 30; entries `[0]`–`[27]` are byte-identical
  [measured, node comparison]. The only other WP change is `ownership.amends_without_owning.rationale`, extended at
  its end (the declared-amendment text for the three paths).
- **A5's probe files:** `probe.mjs` `8a98e2e6…3c` and `probe2.mjs` `9d21cd63…5a`, the hashes A5 records; each is
  byte-identical to its Appendix B source in the A5 file [measured: `cmp`]. Validator
  `json-schema-subset.mjs` `9037cc0a…5632` at base and head [measured].

### 1.4 Read, not measured

The Owner's dispositions (2026-10-09 NTF/A5; 2026-10-10 C-2), `cc-a5-loom.json` at the head, R0's
`r0-review-2026-10-10-ntf2a.md` §5a, my benchmark §6, and the source lines A5 cites, spot-checked by line number:
the workstream plan `:270`, `:273`, `:286`; the Register `:138`, `:173`, `:177`, `:211`, `:271`; RFC-2026-009 R-2
`:169-183` and R-5 `:236-240`; batch 051 `:505`, `:525`, `:576-577`, `:597-601`. Each says what A5 quotes it for.
The C-2 reading of the Vercel disclosure is A1's and A5's to accept (Owner's second answer), not mine; I do not rule
on it.

## 2. C-3: the A5 assessment re-read against C-T3

### (a) every bound and character class labelled decision (with source line) or inference (with basis)

**Met.** The §3 `[22]` table labels each of the four bounds `[22]` names and C-T3 lists (`notification_id` 128,
`message_key` 128, `deep_link.target_ref` 256, `dedupe_key` 128), the `dedupe_key` class, the `notification_id`
class (none), the `message_key` pattern, the `target_ref` grammar and the dead `dedupe_key.minLength`. Each is an
"owner decision" with a source line; where the *number* has no baseline source A5 says so and labels the number an
**inference** with its basis (R-2's class values), and labels the `ntf:` namespace and the OD-4 digest encoding as
inferences. The source lines exist and support what they are cited for (§1.4). One residual is advisory
(Q0-NTF2B-1).

### (b) every fixture cited for a rule fails with it and validates with that rule alone deleted, by an executed probe

**Met.** A5 cites 18 invalid fixtures [measured: every `invalid-*.json` name in the file]. All 18 are in its two
probes, whose commands and verbatim output are in the file. I re-ran both probes on the base and on the head: output
**byte-identical** to the blocks recorded in the A5 file in all four runs (57 and 10 lines) [measured: `diff`].

Independently, `q0probe.mjs` (Appendix A) enumerates all 63 constraint sites of the shipped schema (every keyword and
every single `required` name, including inside `allOf`/`if`/`then`/`not`) and, for every one of the 31 invalid
fixtures, lists the single-site deletions that make it validate. For each of A5's 17 cited isolations, the leaf rule
A5 names is one of them (for the four `allOf` fixtures the others are only the enclosing `allOf`/`if`/`then`). For
`invalid-dedupe-key-minlength.json` no single deletion validates it, which is what A5 says: it does **not** cite that
fixture as evidence for `minLength`, only as evidence that `minLength` is dead (OD-5). Base and head outputs are
identical. The four valid fixtures validate.

### (c) every `const` rule relied on: is an absent property rejected, and which fixture isolates it

**Met.** The schema has five `const` sites [measured, `q0probe.mjs`]: one enforcing (`deep_link.requires_permission:
const true`) and four `if` selectors (`kind` "command"/"result"; `delivery.state` "failed"/"delivered"). A5's §2.1
covers all five:

- `requires_permission`: absent is rejected by `deep_link.required`; isolated by
  `invalid-deep-link-omits-permission-flag.json` (INVALID present; VALID with `requires_permission` alone removed from
  `deep_link.required`). Reproduced, and also shown by a constructed value. With the `const` deleted the absent flag
  is still rejected by `required`, so the two guards are independent.
- `kind` selectors: absent `kind` is rejected by top-level `required`; A5 states **no fixture** isolates it and shows
  it by a constructed value, which is what (c) asks for ("Where no such fixture exists, it says so"). I confirmed no
  fixture lacks a top-level `kind` [measured: `Object.hasOwn`], and that both `if`s carry `required: ["kind"]`, so with
  `kind` absent and `required[kind]` deleted, neither branch applies and even a result without `delivery` validates.
  That is the fail-open the benchmark's T3 was about; here it is guarded and declared.
- `delivery.state` selectors: absent `state` is rejected by `delivery.required`; isolated by
  `invalid-delivery-required.json`. Reproduced.

So the file does **not** ratify a `const`-enforced rule without the absent case, and the withdrawal rule in my
benchmark §6 is not triggered. `locale` is a one-value `enum`, not a `const`, and A5 does not rely on it; it is in
the top-level `required` anyway.

**C-T3 is met. C-3 is met.** Under `benchmark_outcome`, the A5 file may be cited as A5's ratification as far as C-T3
is concerned; whether it is cited also waits on C-1's and C-2's other readers (A1, C0) and on R0.

## 3. Findings

No blocking finding.

- **Q0-NTF2B-1 (advisory, C-T3 (a) residual).** OD-1 adopts the whole schema, but `notification_id.minLength: 1` and
  the enum value sets (`kind`, `channel`, `locale`, `delivery.state`, `failure_class`) carry no decision/inference
  label in the A5 file. I grade it advisory, not a C-T3 failure: the condition's purpose and its named list concern
  the bounds and classes `[22]` records as A0's inferences, all of which are labelled; `minLength: 1` is the
  non-empty floor, and its fixture is isolated per (b). A5 may label it when it next writes (step 3 or Frozen).
- **Q0-NTF2B-2 (advisory).** The schema's bound notes still read "THE BOUND IS A DECLARED INFERENCE" (A0's 2026-10-07
  wording), and `dedupe_key.x-bound-note` still says "this key has no stated composition to size against" before A5's
  appended sentence states one. A reader of the schema alone sees A0's label beside A5's. Not a C-1 defect (A5 chose
  exactly which texts to change); worth tidying with F-2 before Frozen.
- **Q0-NTF2B-3 (advisory).** Two cases rest on constructed values rather than fixtures, as A5 declares: absent `kind`,
  and the email-shaped and spaced `dedupe_key` (the one class fixture isolates `+` only). Fixtures for them would let
  the suite, not only a probe, hold them. For F-2.
- **Observation.** `schema.json` was re-serialised (six `\uXXXX` escapes in `delivery.x-source` now raw UTF-8),
  recorded by A5 as O-1 and in the handoff's `known_limitations`; the parsed value is unchanged and no pin reads bytes.

## 4. Carry clause

This verdict carries to a later head of this PR if every commit after `7ee39626d89e0d00ee32f91d782884805a64d9de` is
one of the following:
(a) another role's evidence file, carried with `cherry-pick -x` and touching only that file;
(b) a merge of `origin/main` that is mechanical under RFC-2026-025 §6.3: `classify-records-only.mjs --sync` exits 0,
`regenerate:manifest` and `record:verification` are cmp-clean, and the merge brings none of this PR's paths;
(c) the handoff refreshed last and alone, with prose that stays true.
Anything else needs this role again, including any change to the A5 assessment or re-read, to the CTR-NTF-001
manifest, schema or examples, or to `cc-a5-loom.json`.

## Appendix A. Probes (outside the repository, `$SP/q0-ntf2b-probes/`)

Commands: `node probe.mjs <wt>`, `node probe2.mjs <wt>` (A5's, unchanged), `node q0probe.mjs <wt>` and
`node c1check.mjs <head-wt> <base-wt>`, each against `$SP/q0-ntf2b` (head) and, where applicable, `$SP/q0-ntf2b-base`
(detached at `9d0751ec`). `q0probe.mjs` SHA-256 `2b099292bf5364abba0c198fe4f117f8752a0b686f4fce2e0c03e91e9b4c083b`,
head output `f7f81f94d10c1fb6ef8ec0914149d7491b29218fc4d15a0414112cbe94976831`, identical at the base.

`q0probe.mjs` output on the head (fixture lines abbreviated to the cited ones and the two that matter for (c); the
full file is in the scratchpad):

```text
sites enumerated: 63
invalid-command-carrying-delivery.json: present INVALID(1) | single deletions that validate: allOf, allOf.0.if, allOf.0.then, allOf.0.then.not
invalid-command-without-deep-link.json: present INVALID(1) | single deletions that validate: allOf, allOf.0.if, allOf.0.then, allOf.0.then.required[deep_link]
invalid-dedupe-key-contact-detail.json: present INVALID(1) | single deletions that validate: properties.dedupe_key.pattern
invalid-dedupe-key-minlength.json: present INVALID(2) | single deletions that validate: NONE
invalid-dedupe-key-too-long.json: present INVALID(1) | single deletions that validate: properties.dedupe_key.maxLength
invalid-deep-link-additionalproperties.json: present INVALID(1) | single deletions that validate: properties.deep_link.additionalProperties
invalid-deep-link-omits-permission-flag.json: present INVALID(1) | single deletions that validate: properties.deep_link.required[requires_permission]
invalid-deep-link-public-url.json: present INVALID(1) | single deletions that validate: properties.deep_link.properties.target_ref.pattern
invalid-deep-link-target-ref-too-long.json: present INVALID(1) | single deletions that validate: properties.deep_link.properties.target_ref.maxLength
invalid-deep-link-without-permission.json: present INVALID(1) | single deletions that validate: properties.deep_link.properties.requires_permission.const
invalid-delivered-with-failure-class.json: present INVALID(1) | single deletions that validate: allOf, allOf.3.if, allOf.3.then, allOf.3.then.properties.delivery.not
invalid-delivery-required.json: present INVALID(1) | single deletions that validate: properties.delivery.required[state]
invalid-failure-without-class.json: present INVALID(1) | single deletions that validate: allOf, allOf.2.if, allOf.2.then, allOf.2.then.properties.delivery.required[failure_class]
invalid-message-free-text.json: present INVALID(1) | single deletions that validate: properties.message_key.pattern
invalid-message-key-too-long.json: present INVALID(1) | single deletions that validate: properties.message_key.maxLength
invalid-notification-id-minlength.json: present INVALID(1) | single deletions that validate: properties.notification_id.minLength
invalid-notification-id-too-long.json: present INVALID(1) | single deletions that validate: properties.notification_id.maxLength
invalid-required.json: present INVALID(1) | single deletions that validate: allOf, allOf.1.if, allOf.1.then, allOf.1.then.required[delivery]
valid-command.json: VALID
valid-result-delivered.json: VALID
valid-result-failed-transient.json: VALID
valid-result-suppressed-duplicate.json: VALID
## consts in schema
properties.deep_link.properties.requires_permission.const
allOf.0.if.properties.kind.const
allOf.1.if.properties.kind.const
allOf.2.if.properties.delivery.properties.state.const
allOf.3.if.properties.delivery.properties.state.const
absent requires_permission: ["$.deep_link: missing required property 'requires_permission'"]
absent requires_permission, deep_link.required[requires_permission] deleted: []
absent requires_permission, const ALSO deleted (sanity): ["$.deep_link: missing required property 'requires_permission'"]
absent kind: ["$: missing required property 'kind'"]
absent kind, required[kind] deleted: []
result minus kind minus delivery, required[kind] deleted: []
result minus delivery.state: ["$.delivery: missing required property 'state'"]
result minus delivery.state, delivery.required[state] deleted: []
fixtures with no top-level kind: none
```

The 13 uncited invalid fixtures (`invalid-additionalproperties`, `-channel-enum`, `-dedupe-key-type`,
`-deep-link-target-ref-type`, `-deep-link-type`, `-delivery-additionalproperties`, `-delivery-failure-class-enum`,
`-kind-enum`, `-message-key-type`, `-missing-tenant-context`, `-notification-id-type`, `-unknown-delivery-state`,
`-unsupported-locale`) each isolate exactly one site as well.

`q0probe.mjs` source, verbatim (the file hashed above):

```javascript
// Q0 independent C-T3 probe for CTR-NTF-001 (PR #243). Read-only against the worktree in argv[2].
// For EVERY example fixture: validate as shipped, then delete each constraint site of the schema ONE AT A TIME
// (every constraint keyword, and every single name of every `required` array, anywhere in the schema, including
// inside allOf/if/then/not), and list the deletions that make that fixture VALID. A fixture "isolates" a rule when
// deleting that rule alone makes it validate. Independent of A5's probe: the site enumeration is exhaustive, not a
// hand-picked list, so it also shows whether A5's named rule is the (only) isolating site.
import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const ROOT = process.argv[2];
const { validate } = await import(join(ROOT, 'test-kits/contracts/json-schema-subset.mjs'));
const DIR = join(ROOT, 'contract-catalog/shared-kernel/ctr-ntf-001');
const json = async (p) => JSON.parse(await readFile(p, 'utf8'));
const schema = await json(join(DIR, 'schema.json'));
const ten = await json(join(ROOT, 'contract-catalog/shared-kernel/ctr-ten-001/schema.json'));
const resolve = (ref) => (ref === '../ctr-ten-001/schema.json' ? ten : null);
const KW = new Set(['type', 'enum', 'const', 'pattern', 'minLength', 'maxLength', 'minimum', 'maximum', 'additionalProperties', 'not', '$ref', 'if', 'then', 'allOf']);
const sites = [];
(function walk(o, p) {
  if (Array.isArray(o)) { o.forEach((v, i) => walk(v, [...p, i])); return; }
  if (!o || typeof o !== 'object') return;
  for (const [k, v] of Object.entries(o)) {
    if (k.startsWith('x-') || k === 'description' || k === 'title' || k === '$schema' || k === '$id') continue;
    if (k === 'required' && Array.isArray(v)) v.forEach((n) => sites.push({ path: [...p, 'required'], name: n }));
    else if (KW.has(k)) sites.push({ path: [...p, k] });
    if (k === 'properties') for (const [pk, pv] of Object.entries(v)) walk(pv, [...p, 'properties', pk]);
    else if (typeof v === 'object') walk(v, [...p, k]);
  }
})(schema, []);
const label = (s) => s.path.join('.') + (s.name ? `[${s.name}]` : '');
const del = (s) => {
  const c = JSON.parse(JSON.stringify(schema));
  const parent = s.path.slice(0, -1).reduce((x, k) => x[k], c);
  const last = s.path.at(-1);
  if (s.name !== undefined) parent[last] = parent[last].filter((n) => n !== s.name);
  else delete parent[last];
  return c;
};
const v = (sch, doc) => validate(sch, doc, { resolve });
console.log(`sites enumerated: ${sites.length}`);
const files = (await readdir(join(DIR, 'examples'))).filter((f) => f.endsWith('.json')).sort();
for (const f of files) {
  const doc = await json(join(DIR, 'examples', f));
  const e = v(schema, doc);
  if (!f.startsWith('invalid-')) { console.log(`${f}: ${e.length ? 'INVALID ' + JSON.stringify(e) : 'VALID'}`); continue; }
  const iso = sites.filter((s) => v(del(s), doc).length === 0).map(label);
  console.log(`${f}: present ${e.length ? 'INVALID(' + e.length + ')' : 'VALID!!'} | single deletions that validate: ${iso.length ? iso.join(', ') : 'NONE'}`);
}
// C-T3 (c): every `const` in the schema, and the absent case for its property.
console.log('## consts in schema');
const consts = sites.filter((s) => s.path.at(-1) === 'const').map(label);
console.log(consts.join('\n'));
const base = await json(join(DIR, 'examples', 'valid-command.json'));
const noFlag = JSON.parse(JSON.stringify(base)); delete noFlag.deep_link.requires_permission;
console.log(`absent requires_permission: ${JSON.stringify(v(schema, noFlag))}`);
console.log(`absent requires_permission, deep_link.required[requires_permission] deleted: ${JSON.stringify(v(del({ path: ['properties', 'deep_link', 'required'], name: 'requires_permission' }), noFlag))}`);
console.log(`absent requires_permission, const ALSO deleted (sanity): ${JSON.stringify(v(del({ path: ['properties', 'deep_link', 'properties', 'requires_permission', 'const'] }), noFlag))}`);
const noKind = JSON.parse(JSON.stringify(base)); delete noKind.kind;
console.log(`absent kind: ${JSON.stringify(v(schema, noKind))}`);
console.log(`absent kind, required[kind] deleted: ${JSON.stringify(v(del({ path: ['required'], name: 'kind' }), noKind))}`);
// absent kind on a RESULT-shaped doc: would the result rules (delivery required) still bind? (they must not, by if.required)
const res = await json(join(DIR, 'examples', 'valid-result-delivered.json'));
const resNoKindNoDelivery = JSON.parse(JSON.stringify(res)); delete resNoKindNoDelivery.kind; delete resNoKindNoDelivery.delivery;
console.log(`result minus kind minus delivery, required[kind] deleted: ${JSON.stringify(v(del({ path: ['required'], name: 'kind' }), resNoKindNoDelivery))}`);
// absent delivery.state on a result
const noState = JSON.parse(JSON.stringify(res)); delete noState.delivery.state;
console.log(`result minus delivery.state: ${JSON.stringify(v(schema, noState))}`);
console.log(`result minus delivery.state, delivery.required[state] deleted: ${JSON.stringify(v(del({ path: ['properties', 'delivery', 'required'], name: 'state' }), noState))}`);
// top-level `kind` presence in every fixture (A5: no fixture omits kind)
const omitKind = [];
for (const f of files) { const d = await json(join(DIR, 'examples', f)); if (!Object.hasOwn(d, 'kind')) omitKind.push(f); }
console.log(`fixtures with no top-level kind: ${omitKind.length ? omitKind.join(', ') : 'none'}`);
```

`c1check.mjs` output on the head against the base:

```text
untestable_by_schema type string
item (5) len 973 verbatim in head: true in base: false
item (6) len 774 verbatim in head: true
(5) precedes (6): true ; (4) precedes (5): true
"is A5's decision of 2026-10-10, stated in item (6)" in head: true
"A5 ratified the bounds, the class and this declara" in head: true
"OWED by A5 before this contract leaves Draft" in head: false
"until it is recorded they are A0" in head: false
manifest keys differing base->head: [ 'untestable_by_schema' ]
```
