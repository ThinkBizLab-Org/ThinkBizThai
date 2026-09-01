# WP-0A-CON-008 — response to the tenth independent review

Run: `/claude/a0_atlas` (author). AUTHOR's own record; **not** independent
verification.

**The coverage ratchet held for the second consecutive round.** 478
assertion-carrying injections, 0 invisible; then 24 assertion-free structural
templates at every object node of every contract — **9,350 injections**, of which 6,825
were invisible to the surface, 49 were both conformance-preserving and semantically
real, and **all 49 would have to be written down** as a new named site. **0 bypasses.**
The reviewer also re-derived the walk from the shipped source and reproduced
`SITE_FLOOR` and `UNKILLED_CEILING` exactly, so the sweep measured what CI measures.

What it found instead was that **the things around the schemas were not guarded at
all.**

## 1. A contract's status and owner were enforced by nothing

Setting three Draft contracts to `"Frozen"` and **dropping A1 as security co-owner of
the secret-handle contract** passed at exit 0. There was no allowed-status vocabulary,
and `owner` was read by no test.

This package's own scope excludes *"any change to a contract status, in a manifest, in
the catalog index or in the Decision Register"* — and nothing enforced that exclusion,
including against this package.

## 2. The catalog index was outside every ratchet

`owner`, `consumers` and `required_before_freeze` were read by no test and the file
carried no digest. Emptying `CTR-MOD-001`'s `required_before_freeze` passed — and that
list is **the exact one RFC-2026-010 assesses each contract against**, so emptying it
makes a contract vacuously freeze-ready. This package's entire deliverable rests on a
file anyone could edit silently.

Both are closed by pinning the registry: every contract's identity, freeze level,
owner, index entry and freeze requirements, with the index required to agree with the
manifests. Verified against all three of the reviewer's edits.

## 3. A rename hid a file from the branch-scope guard

Git prints only the destination of an `R100`, so `git mv` on another contract's
`schema.json` into this package's evidence directory reported *"all 1 changed path(s)
are declared"*. That is **the first failure the guard was written for** returning
through the tool's own default. Fixed with `--no-renames` under `WP-0A-A0-004`.

## 4. `amends_without_owning` overrode the manifest's own forbidden paths

Nothing validated it. The guard unioned it straight into the allowed set and consulted
neither `read_only_paths` nor `forbidden_paths`, so a package could amend a path it had
itself declared forbidden — `db/**`, `migrations/**`, `*.pem`.

Now checked: an amendment cannot reach a forbidden path, cannot be absolute or
traversing, and cannot be declared without a reason.

**And writing that check found a second defect the reviewer had not:** `*.pem` in a
forbidden list was matched as written, so it forbade `server.pem` and allowed
`keys/server.pem`. A slashless forbidden pattern names a **file shape**, and it now
forbids that shape at any depth.

## 5. The handoffs were unvalidated and had drifted

Nothing loaded a handoff instance against `.agents/handoff.schema.json`, and the
protocol schemas themselves carried no digest. Unenforced, they had drifted exactly as
you would expect:

- **two cited SHAs that no longer existed in any branch** after a rebase;
- `recommended_next_work_packages` was empty in all ten, against a protocol sentence
  that requires it — and `evidence/WP-0A-CON-008/handoffs.md` quotes that sentence as
  satisfied;
- four fields were byte-identical across every package, so three packages that touch no
  contract at all claimed *"contract-catalog changes are additive or corrective"*;
- `rollback_or_forward_fix` described a change far smaller than the diff it covers —
  *"one decision record and one manifest"* against 33 added and 13 modified files.

All ten are regenerated from the current history: real full-length revision ranges,
a per-package rollback line naming what that package actually changed, a real next
package, and a compatibility claim derived from whether the package touches a contract.

Four checks now enforce it, and the protocol schemas are digested. The revision check
found one more: `WP-0A-A0-002`'s handoff carried **abbreviated** SHAs, which survive
until the object does — which is precisely how the two orphaned ones got there.

## 6. A mid-path `**/` lost its boundary

`evidence/**/notes.md` matched `evidence/XYZnotes.md`. Latent, and fixed.

```
$ npm run check
ℹ tests 171   pass 171   fail 0   skipped 0   todo 0   exit 0
```
