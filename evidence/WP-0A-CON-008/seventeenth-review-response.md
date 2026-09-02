# Independent review #17

Three HIGH, one MEDIUM, one counting error in this package's evidence. All closed.

## HIGH 1 — one line in `.npmrc` silenced every `npm run`, including the verifier

```
script-shell=/usr/bin/true
```

That is the whole mutation. After it: `npm run check` **exit 0 with zero tests executed and zero
guards run**; `npm run verify` **exit 0 with no output at all**. No failing test, `package.json`
byte-identical, every digest intact, `DIGESTED_FLOOR` satisfied.

This is strictly worse than review sixteen's newline, which the allowed-alphabet check now catches
— because **that check reads the chain string, and the chain string is untouched here.** npm
decides which shell runs it, and that decision lived in a file no guard read. It deleted the suite,
the toolchain pin, the secret scan and all three protocol validators from CI's check step, **and
silenced the one command this repository tells reviewers to trust.**

The fix had to go where npm cannot reach. My first attempt put the check inside
`verify-clean-run.mjs`, and probing it showed the obvious: **`npm run verify` runs through npm too,
so it never executed.** The check now lives in `scripts/verify-test-coverage-floor.mjs`, which CI
invokes with `node` directly — the same reason RFC-2026-007 gives for the workflow not trusting the
chain. Verified: `node scripts/verify-test-coverage-floor.mjs` with `.npmrc` present exits **90**.

`verify-clean-run.mjs` additionally refuses an exit 0 that reports no passing test at all: **exit 0
is not evidence that anything ran.**

## HIGH 2 — eight of nine contract suites could be replaced with placeholders

`MIN_DECLARED_TESTS_BY_DIRECTORY['test-kits/contracts']` was **7** against **78** declared tests —
ninety per cent headroom in the one floor written to stop a protected suite being swapped for a
placeholder. The review gutted eight suites, then reversed three real rules: `CTR-SEC-001`'s handle
pattern to `^.*$`, its six redaction consts from `true` to `false`, and `CTR-API-001`'s root
`additionalProperties` to `true`. **exit 0, 167/167, no failing test.**

Ten Draft contracts — including the envelope every module composes and the secret-handle contract —
lost the constraint surface, the registry, the caveats, the mutation walk and the reference checks
at once. `DIGESTED_FLOOR` does not help: it ratchets *which files are digested*, and every gutted
file stayed digested.

`DECLARED_TEST_FLOOR_BY_FILE` pins each suite at what it declares today, and a file with no floor
is itself a failure. Adding tests is free; a file that has declared N keeps declaring N. Verified:
the eight-suite mutation now exits **84**.

## HIGH 3 — the decision-record walk was non-recursive and case-sensitive

Added one wave earlier, and defeated two ways:
`architecture/decisions/amendments/RFC-2026-012-exemption.md` and
`architecture/decisions/RFC-2026-011-exemption.MD`, each **exit 0**. `amendments/` is a *more*
natural home for an amendment than the flat directory, which makes the subdirectory the likelier
case.

The walk is recursive now and declares everything under the directory, at any depth, whatever it is
called. Its first run found `.gitkeep`, which no `ls` had shown me — now declared and digested,
because **a walk that skips dotfiles is a walk with a hole in it.** Verified: both mutations exit 1.

## MEDIUM 4 — the approval guard failed at its own stated claim, twice

**Vocabulary:** *"completed the independent security review … raised no objections, and cleared the
shared-kernel freeze"* contains none of the five stems the regex hunted for. exit 0.

**The window:** `prose.indexOf(runId)` takes the **first** occurrence, so a benign mention in an
earlier field moved the ±160-character window off the payload — and the payload then used the
literal words *"approved"* and *"signed off"*, attached to the security reviewer's run id.
**exit 0.** That is not the acknowledged "a handoff that lies about its own work needs a reader"
limitation; it is a one-line indexing bug failing a narrower claim the test does make.

Three corrections: every occurrence, the whole string value rather than a byte window over
serialised JSON, and the run ids **enumerated from the repository** — every capability profile and
every role assignment — rather than pattern-matched. The pattern version reported
`contract-catalog/shared-kernel/ctr-api-001/examples/valid-accepted.json` as an agent run id, which
is a guard reporting a wrong reason, recorded twice in this package as worse than silence.

And an exemption for sentences saying an approval is **required or outstanding** — three real
handoffs say exactly that (*"requires an acknowledgement countersigned by …"*), and flagging them
would train a reader to ignore the check, which is how a guard stops working without anyone editing
it.

Verified: both bypasses now exit 1. **The residual limitation is unchanged and still listed: a
vocabulary is not a control, and a handoff lying about its own work needs a reader.**

## Counting error corrected

*"All eleven decision records are digested"* — there are **ten** RFCs (plus the `.gitkeep` the
recursive walk found). Corrected where it was written.

## Verification

See `evidence/VERIFICATION.md`. `npm run verify` reports the exit code directly.

---

## Self-probe in the same layer: what a guard reads versus what it protects

`.npmrc` was one instance of a class — configuration that changes what tooling sees without
changing a byte any guard reads. Probing the rest of that class:

| probe | result |
| --- | --- |
| duplicate `"files"` key in the integrity manifest (`JSON.parse` keeps the last) | **exit 86** — held |
| a credential in a `.gitignore`d file | **exit 70** — held; the scanner walks the tree, not git |
| **a guard script replaced by a symlink to a file outside the repository** | **exit 0** — hole |
| `.gitattributes` with a `filter=` attribute | **exit 0** — hole, latent |
| `NODE_OPTIONS=--require …` | **exit 0** — not closeable from inside the repository |

### The symlink

`readFile` follows a symlink, so `scripts/verify-branch-scope.mjs → /tmp/elsewhere/x.mjs` keeps
its digest matching perfectly: the bytes are simply read from somewhere nothing here protects.
**What a symlink buys is not a byte change; it is a change of where the bytes come from.** On
another machine, in CI, or after a clone, that path holds something else or nothing at all, and the
digest that vouched for the file vouched for a target no one can see from here.

Every digested path must now be a regular file — `lstat`, all 65 of them. Verified: **exit 91**,
naming the link.

### `.gitattributes`

A `filter=` attribute routes content through a program on checkout and check-in, so the working
tree need not hold the bytes the object store does. The filter's *definition* lives in
`.git/config` and is not committed, which makes the attribute file harmless on its own — and
exactly the kind of thing that is harmless until it is not. Added to the same declare-or-absent
rule as `.npmrc`. Verified: **exit 90**.

### `NODE_OPTIONS`, stated rather than guarded

`NODE_OPTIONS=--require /tmp/pre.cjs npm run verify` exits 0. **Nothing inside a repository can
defend against the environment its own interpreter is started with**, and pretending otherwise
would be a guard that reports a wrong reason. It belongs with protected CI on the "not closed"
list: the answer is a trusted runner, not another test.
