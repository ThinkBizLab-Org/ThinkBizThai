# A1 security disposition — the CTR-MOD-001 / CTR-SEC-001 secret-handle ownership conflict

Attested by: `/claude/a1_bastion` (A1, Security/Privacy), Anthropic `claude-opus-5`.
Distinct from the Author run `/claude/a0_atlas` and from every other run named on
`work-packages/WP-0A-CON-004.json`. Capability profile:
`.agents/capability-profiles/cc-a1-bastion.json`.

Work package: `WP-0A-CON-004`, which names A1 in `required_human_authorities` as the
authority who must dispose of this blocker.
Revision examined: `3076315392cba899c2501ccc71044797934ac95d` (`main`, merge of PR #34).
Branch: `agent/claude/WP-0A-CON-004-a1-security-disposition`, cut from that commit.
Date: 2026-09-04. Gate G0 constraint observed throughout: no network, no credentials,
no provider call, synthetic values only.

---

## 0. Why this document exists, and why it is not a transcription

The blocker on `work-packages/WP-0A-CON-004.json` reads:

> "SECRET-HANDLE OWNERSHIP CONFLICT, unresolved by this package. `CTR-MOD-001`
> `secret_handles` already fixed the pattern `^secret:[a-z0-9._-]+$` while Decision
> Register 5.2 owns `CTR-MOD-001` to A0 and `CTR-SEC-001` to A0+A1, so a single-owner
> contract fixed the syntax of a jointly-owned one with no RFC. `CTR-SEC-001` adopts
> that pattern as PRECEDENT... The A1 owner is a required authority and must dispose of
> it; this author must not."

An earlier A1 assessment is reported to have ratified the pattern retroactively, on the
ground that two different handle syntaxes would stop the contracts composing. **That
disposition is not in this repository.** `evidence/WP-0A-CON-004/co-owner-review-sec-aud-obs-usg.md`
contains no occurrence of the string `MOD-001`:

```
$ grep -n "MOD-001" evidence/WP-0A-CON-004/co-owner-review-sec-aud-obs-usg.md
$ echo $?
1
```

So a blocker naming A1 as its authority has had no attested A1 verdict anywhere in the
tree. This document does not adopt the reported earlier reasoning. Every claim below was
re-executed against the shipped files at the revision named above. Two of the claims the
blocker itself makes did not survive that.

---

## 1. What I read

- `work-packages/WP-0A-CON-004.json` — the blocker, `ownership`, `required_human_authorities`.
- `contract-catalog/shared-kernel/ctr-mod-001/schema.json` (`secret_handles`), `manifest.json`.
- `contract-catalog/shared-kernel/ctr-sec-001/schema.json` (`handle`, `x-source`,
  `x-opacity-limitation`), `manifest.json` (`freeze_boundary`), the shipped fixtures.
- `contract-catalog/shared-kernel/index.json`.
- `docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md` §5.1 freeze
  levels, §5.2 shared-kernel ownership, §8.1 when an RFC is required, §8.4 conflict rule.
- `CONTRIBUTING_AGENTS.md` — authority order, ownership and change control.
- `architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md`.
- `scripts/scan-repository-secrets.mjs`, `test-kits/contracts/json-schema-subset.mjs`.
- `evidence/WP-0A-CON-004/co-owner-review-sec-aud-obs-usg.md`.

---

## 2. Probes and their output

Toolchain, via `zsh -lc` (the login shell worked; no substitution was needed):

```
$ node --version && npm --version
v24.20.0
11.19.0
```

Probe scripts were written to
`/private/tmp/claude-501/-Users-bank-ThinkBizThai/cb23f394-422b-4ec3-b024-e2751f208eb9/scratchpad/a1-probe/`
and import the repository's own `test-kits/contracts/json-schema-subset.mjs` and
`scripts/scan-repository-secrets.mjs`. No hand-written predicate stands in for either.
Every value is synthetic; no probe used, held or produced a real credential.

**Redaction note.** The probe bodies below are shown as `prefix + ⟨length and case of the
random part⟩` rather than verbatim. The first draft of this file pasted the literals, and
`npm run scan:secrets` returned **13 findings against this evidence file** — one per
vendor rule in Probe 3. That red run is itself the cleanest confirmation of Finding F3
below, so it is reported rather than quietly avoided: the repository scanner does fire on
credential shapes that the handle pattern admits, including when they arrive inside a
`secret:` handle. The shapes are preserved; only the random parts are elided.

### Probe 1 — is the pattern really fixed in `CTR-MOD-001`, and is it byte-identical?

```
CTR-MOD-001 secret_handles.items.pattern = "^secret:[a-z0-9._-]+$"
CTR-SEC-001 handle.pattern               = "^secret:[a-z0-9._-]+$"
byte-identical: true
MOD hex : 5e7365637265743a5b612d7a302d392e5f2d5d2b24
SEC hex : 5e7365637265743a5b612d7a302d392e5f2d5d2b24
MOD other constraints on item: {"type":"string","pattern":"^secret:[a-z0-9._-]+$"}
SEC other constraints on handle: type=string maxLength=128 minLength=undefined
MOD item maxLength: undefined
```

**The pattern string is byte-identical. The two constraints are not.** `CTR-SEC-001`
carries `maxLength: 128`; `CTR-MOD-001` carries no length bound at all.

### Probe 2 — what the pattern admits and excludes, and where the two contracts diverge

Each string validated against `CTR-MOD-001.secret_handles.items` and
`CTR-SEC-001.handle` through the subset validator.

```
handle                                                     MOD  SEC  note
secret:openai.default                                      PASS  PASS  benign reference
secret:sk_live_⟨28 MIXED-case alnum⟩                       rej   rej   Stripe live secret key, canonical form
secret:sk_live_⟨28 lowercase alnum⟩                        PASS  PASS  the same key, lowercased
secret:ghp_⟨36 lowercase alnum⟩                            PASS  PASS  GitHub PAT, all lowercase
secret:npm_⟨36 lowercase alnum⟩                            PASS  PASS  npm access token, lowercase
secret:sk-ant-api03-⟨36 lowercase alnum⟩                   PASS  PASS  Anthropic-shaped, lowercase
secret:hvs.⟨32 lowercase alnum⟩                            PASS  PASS  Vault service token, lowercase
secret:whsec_⟨24 lowercase alnum⟩                          PASS  PASS  Stripe webhook secret, lowercase
secret:xoxb-⟨8⟩-⟨8⟩-⟨12 lowercase alnum⟩                   PASS  PASS  Slack bot token, lowercase
secret:0123456789abcdef0123456789abcdef                    PASS  PASS  lowercase hex 128-bit
secret:abcdefghijklmnopqrstuvwxyz234567                    PASS  PASS  lowercase base32
secret:EAA⟨28 MIXED-case alnum⟩                            rej   rej   Meta token (uppercase mandatory)
secret:AKIA⟨16 UPPERCASE alnum⟩                            rej   rej   AWS access key id (uppercase mandatory)
secret:eyJ⟨...⟩.⟨...⟩.⟨...⟩                                 rej   rej   JWT (uppercase mandatory)
secret:⟨200 x "a"⟩                                         PASS  rej   200-char body
secret:                                                    rej   rej   empty body
SECRET:openai.default                                      rej   rej   uppercase prefix
openai.default                                             rej   rej   no prefix
secret:openai/default                                      rej   rej   slash in body
secret:openai default                                      rej   rej   space in body
```

The `⟨200 x "a"⟩` row is the finding. **A 200-character handle is valid in a
`CTR-MOD-001` manifest and rejected by `CTR-SEC-001`.** The accept sets differ.

### Probe 3 — does the scanner really detect only strings the pattern already rejects?

Each `secret:<body>` embedded in a JSON line as it would appear in a contract fixture,
then passed to the repository scanner's own `scanText`.

```
handle                                       SEC-001  scanner findings
secret:sk_live_⟨28 lowercase alnum⟩          PASS     "stripe-secret-key"
secret:rk_live_⟨30 lowercase alnum⟩          PASS     "stripe-restricted-key"
secret:whsec_⟨24 lowercase alnum⟩            PASS     "stripe-webhook-secret"
secret:ghp_⟨36 lowercase alnum⟩              PASS     "github-token"
secret:github_pat_⟨50 lowercase alnum⟩       PASS     "github-fine-grained-pat"
secret:npm_⟨36 lowercase alnum⟩              PASS     "npm-access-token"
secret:sk-proj-⟨26 lowercase alnum⟩          PASS     "openai-project-key"
secret:sk-ant-api03-⟨36 lowercase alnum⟩     PASS     "anthropic-api-key"
secret:sk-⟨34 lowercase alnum⟩               PASS     "openai-legacy-key"
secret:xoxb-⟨8⟩-⟨8⟩-⟨12 lowercase alnum⟩     PASS     "slack-token"
secret:xapp-1-⟨6⟩-⟨6⟩-⟨16 lowercase alnum⟩   PASS     "slack-app-token"
secret:hvs.⟨32 lowercase alnum⟩              PASS     "vault-token"
secret:0123456789abcdef0123456789abcdef      PASS     -
secret:abcdefghijklmnopqrstuvwxyz234567      PASS     -
secret:correct-horse-battery-staple-2026     PASS     -

admitted by CTR-SEC-001 handle pattern: 15; of those, scanner fired on: 12
```

**The blocker's claim is false as written.** Twelve of fifteen bodies are admitted by the
handle pattern *and* detected by the scanner. "Schema and scanner compose to zero
coverage" is not what the two artifacts do.

### Probe 4 — so what is the residual gap, stated correctly?

Probe 3's twelve hits are prefix-bearing formats whose canonical random part is
mixed-case; the lowercased strings above are shaped like those credentials but are not
working ones. The shapes that are simultaneously (a) admitted by the pattern, (b) still a
working credential in their canonical all-lowercase form, and (c) invisible to the
scanner, are the case-insensitive ones:

```
secret:9f8e7d6c5b4a39281706f5e4d3c2b1a0            PASS   NO FINDING   Twilio auth token shape: bare 32 lowercase hex
secret:3f2504e0-4f89-11d3-9a0c-0305e82c3301        PASS   NO FINDING   UUIDv1 used as an API key
secret:a3d1c9e7b5f30284a6c8e0d2f4b6a8c0e2d4f6a8    PASS   NO FINDING   HMAC shared secret: 40 lowercase hex
secret:tr0ubadour-horse-battery-2026               PASS   NO FINDING   human-chosen passphrase
secret:postgres.prod.readwrite.pw.hunter2hunter2   PASS   NO FINDING   password pasted behind a dotted label
```

Five of five missed. The gap is real, it is narrower than the blocker says, and its
shape is different: it is **the prefix-less, case-insensitive credential**, not "every
credential".

### Probe 5 — freeze levels and the promotion record

```
mod freeze_level: Candidate
sec freeze_level: Draft
index.json: CTR-MOD-001 status "Candidate"; CTR-SEC-001 status "Draft",
            required_before_freeze ["opaque ref","scope","rotation/revoke","redaction tests"]
Decision Register §5.2 line 207: | CTR-MOD-001 | ... | A0 | ... | Draft | ... |
index.json source: docs/sprint-0a/sprint-0a-decision-register-contract-catalog-th.md#5.2
```

`architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md:3`:

> "Status: Partially approved 2026-09-02 — the Product Owner approved the five A0-owned
> promotions (CTR-API-001, CTR-PAG-001, CTR-IDM-001, CTR-MOD-001, CTR-FLG-001), which
> are now Candidate. CTR-SEC-001 awaits A1..."

```
$ grep -ic "handle\|secret" architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md
0
```

### Probe 6 — tree state and branch guards

```
$ npm run check
ℹ tests 260   ℹ pass 260   ℹ fail 0   ℹ cancelled 0   ℹ skipped 0   ℹ todo 0

$ node scripts/verify-branch-identity.mjs agent/claude/WP-0A-CON-004-a1-security-disposition
no work package declares ownership.branch "agent/claude/WP-0A-CON-004-a1-security-disposition".
exit=75

$ node scripts/verify-disposition-branch.mjs main
this branch is not a Product Owner disposition
exit=78
```

Recorded, not worked around. Repointing `WP-0A-CON-004.ownership.branch` at this branch
would take the package's declared branch away from its Author, so I did not. How this
disposition lands is the Integration Owner's call, and it is stated here rather than
decided by me.

---

## 3. Findings

**F1. The breach is real and the author's own schema says so.** `CTR-MOD-001`'s
`x-source` on `secret_handles` reads: *"CTR-SEC-001 (owner A0+A1) is the chartered owner
of handle syntax and this single-owner contract must not fix it."* It then fixes it.
Decision Register §5.2 assigns `CTR-SEC-001` to A0+A1 with `opaque ref` first among its
pre-freeze artifacts; §8.4 states *"ถ้า Agent สองตัวแก้ owner เดียวกัน: owner registry
ชนะ; Agent ที่ไม่มี ownership ถอน patch/แยก proposal"* — the owner registry wins and the
non-owner withdraws the patch or files a separate proposal. Neither happened.
`CONTRIBUTING_AGENTS.md:36` requires an RFC before changing ownership or contract
meaning. None was opened.

**F2. The justification for adopting the pattern is not achieved by the adoption as
shipped.** `CTR-SEC-001`'s `x-source` argues the pattern must be adopted because *"a
manifest reference and a registry handle must be the same string or the two contracts do
not compose."* Probe 1 and Probe 2 show the two contracts already do not compose in
exactly that direction: `maxLength: 128` on `CTR-SEC-001.handle`, absent on
`CTR-MOD-001.secret_handles.items`, so a manifest can list a handle no
`CTR-SEC-001` document can carry. Pattern identity was checked; accept-set identity was
not. The argument that carries the ratification is, as of this revision, false.

**F3. The blocker overstates the scanner gap, and attaches it to the wrong thing.**
"scripts/scan-repository-secrets.mjs detects only strings the pattern already rejects, so
schema and scanner compose to zero coverage" is contradicted by Probe 3 at 12/15. What is
true, and is the statement that should have been made: `scan-repository-secrets.mjs` walks
repository files at commit time (`scanDirectory`). PT-010's concern is a handle appearing
in a **log line, an event and a job at runtime**, where the scanner has no reach
whatsoever. "Zero coverage" is false about the repository and true about runtime; the
blocker attaches it to the repository.

**F4. The blocker's characterisation of what the pattern excludes is also imprecise, in
the pessimistic direction.** *"It excludes mixed-case base64 and nothing else"* — Probe 2
shows it also rejects every credential format carrying a mandatory uppercase character:
AWS `AKIA…`, Meta `EAA…`, Google `AIza…`, JWT `eyJ…`, SendGrid `SG.`, Twilio `AC…`. That
is most of the vendor formats in the repository's own `CREDENTIAL_RULES`. This does not
make the pattern a control — a producer choosing the body simply chooses a lowercase one
— but a security contract must not understate its surface any more than it may overstate
it. Both are wrong claims about a security artifact.

**F5. The breach has already been consumed, and the Product Owner approved it without
being told.** This is the fact the blocker does not contain and it is the most important
one here. `CTR-MOD-001` was promoted `Draft → Candidate v1` on 2026-09-02 under
RFC-2026-010 as one of *"the five A0-owned promotions"* — in the same sentence that
records *"CTR-SEC-001 awaits A1."* RFC-2026-010 contains no occurrence of `handle` or
`secret`, at any case (Probe 5). So the artifact the Product Owner promoted on the strength of its
being single-owner contains a syntax decision chartered to a jointly-owned contract that
the same approval recorded as awaiting me. At Candidate v1 consumers may build fakes,
fixtures and consumer tests against it (§5.1). The syntax is now consumable and I never
saw it. RFC-2026-010 anticipates precisely this: *"If any owner reads a 'present' row and
disagrees that the artifact is what the phrase meant, that disagreement is the useful
outcome."* This document is that disagreement.

**F6. A source-of-truth drift, noted in passing.** Decision Register §5.2 line 207 still
records `CTR-MOD-001` as `Draft` while its manifest and `index.json` record `Candidate` —
and `index.json` declares that register section as its `source`. RFC-2026-010 is an
approved decision newer than the baseline, so the index is correct under
`CONTRIBUTING_AGENTS.md`'s authority order and the register row is stale. Not a defect in
the promotion; a stale row in a source-of-truth document, owned by A0.

---

## 4. Verdict

**REFUSED IN PART, RATIFIED IN PART. An RFC was required, and still is.**

**(a) RATIFIED, with the conditions in §5.** `CTR-SEC-001` may carry
`^secret:[a-z0-9._-]+$` on `handle` **at Draft**. I am a co-owner of `CTR-SEC-001`, so
`CTR-SEC-001`'s syntax is mine to set jointly with A0; choosing the string
`CTR-MOD-001` already emits, rather than minting a second one, is the least-harm
engineering choice at Draft and I make it on my own authority. This is a decision about
`CTR-SEC-001` and nothing else.

**(b) REFUSED: I do not ratify the precedent.** The proposition the blocker asks me to
bless — that a single-owner contract may fix the syntax of a jointly-owned one, to be
regularised afterwards by the aggrieved co-owner — is a change to how ownership works,
not a change to a schema. `CONTRIBUTING_AGENTS.md:36` puts ownership changes behind an
RFC. If an A1 evidence file could supply that, then every ownership breach in this
repository could be cured after the fact by the owner who was bypassed writing a markdown
file, and the owner registry would mean nothing. That outcome is worse than the defect it
would cure. The direction of authority runs the other way: `CTR-SEC-001` is the chartered
owner of `opaque ref`, so `CTR-MOD-001` must be made to derive from `CTR-SEC-001`, not
`CTR-SEC-001` from `CTR-MOD-001`. Adopting the string is not the same act as endorsing
how it got there, and I am doing only the first.

**(c) REQUIRED: a narrow RFC, opened by A0** as owner of `CTR-MOD-001` and of the
Decision Register. It must:

1. record that `CTR-MOD-001` at Candidate v1 carries a handle syntax chartered to
   `CTR-SEC-001`;
2. state the direction of derivation — `CTR-SEC-001` normative, `CTR-MOD-001`
   referencing — so the next change to the syntax cannot be made from the single-owner
   side again;
3. **disclose to the Product Owner that the RFC-2026-010 promotion of `CTR-MOD-001` was
   granted without this fact** (F5), and let the Product Owner decide whether that
   promotion stands;
4. close the `maxLength` divergence (F2) in whichever contract the owners choose, and
   demonstrate the closure by probe rather than by assertion.

I have not opened this RFC. `architecture/decisions/**` is outside `WP-0A-CON-004`'s
`ownership.writable_paths` and outside my authority; an RFC authored by the security
reviewer who then signs it is the self-approval `CONTRIBUTING_AGENTS.md:27` forbids.

---

## 5. Conditions

Each is blocking. All must hold before `CTR-SEC-001` leaves Draft; C3 and C4 additionally
apply to `CTR-MOD-001` at its current Candidate v1.

**C1 — Never cited as a control.** The pattern must not be described as a security
control, an opacity guarantee, or a defence against credential material, in any schema,
manifest, handoff, evidence file, RFC, or status report. Currently discharged by
`ctr-sec-001/schema.json` `x-opacity-limitation` and by the manifest `freeze_boundary`;
the condition is that this survives every future edit, not that it is true today.

**C2 — A handle issuance format before freeze.** An issuer-assigned identifier that a
producer cannot mint from credential material: fixed length, drawn from an issuer-side
namespace, and **structurally verifiable** — a checksum or an issuer segment, so that a
pasted credential fails the grammar by construction rather than by luck. Its acceptance
test is that of the shapes in Probe 4 — bare lowercase hex, a UUID, an HMAC secret, a
passphrase, a dotted label with a password after it — **none** satisfies the issuance
grammar. **I do not specify the format in this document.** Writing it would be contract
content in a path I do not hold, and it must travel through the RFC in §4(c) so that
`CTR-MOD-001` derives from it rather than the reverse — which is the entire point of the
refusal. A1 must specify it there. Until then,
`ctr-sec-001/examples/accepted-gap-structureless-handle-body.json` correctly states the
gap and must not be closed.

**C3 — The composition claim must be made true or withdrawn.**
`CTR-MOD-001.secret_handles.items` and `CTR-SEC-001.handle` must have the same accept
set, shown by a probe over at least the divergence in Probe 2. Until they do, the
sentence *"a manifest reference and a registry handle must be the same string or the two
contracts do not compose"* must not be cited as the justification for the adoption,
because as shipped it is not satisfied.

**C4 — The false claim must be corrected where it is written.** The "zero coverage"
sentence appears in three places and is wrong in all three:
`contract-catalog/shared-kernel/ctr-sec-001/schema.json` (`handle.x-opacity-limitation`),
`contract-catalog/shared-kernel/ctr-sec-001/manifest.json` (`freeze_boundary`), and
`work-packages/WP-0A-CON-004.json` (`open_blockers[1]`). Each must be replaced with what
Probes 3 and 4 show: the scanner detects most prefix-bearing credential formats inside a
conforming handle body at commit time and is blind to case-insensitive ones; and it has
no reach at all over a handle at runtime, which is the surface PT-010 is about. **All
three paths are outside my writable paths.** A0 owns the correction; I am recording it,
not making it, as `WP-0A-CON-004`'s rules require.

**C5 — This disposition covers one blocker only.** It does not touch the SEC-003 data
class assignment, the SEC-016 break-glass fields, the missing redaction tests, the
cross-tenant scope binding, or audit immutability. Those blockers still name A1 and are
still open. I did not examine them here and nothing in this document should be read as
having.

---

## 6. What I am **not** ratifying

Stated plainly, because a ratification that is quoted without its boundary becomes a
different document:

1. **Not `CTR-MOD-001`'s act, and not the precedent.** A single-owner contract fixing a
   jointly-owned contract's syntax remains an ownership breach requiring an RFC. §4(b).
2. **Not `CTR-MOD-001`'s promotion to Candidate v1.** I take no position on whether it
   stands; I record that it was approved without the fact in F5 and that the Product
   Owner should be given that fact.
3. **Not a co-owner signature on `CTR-SEC-001`.** RFC-2026-010's *"CTR-SEC-001 awaits
   A1"* is **not** answered by this document. Ratifying one pattern under conditions is
   not signing a contract for promotion, and `CTR-SEC-001` stays Draft.
4. **Not the pattern as a control.** It is a namespacing convention. It stops a
   verbatim paste of an uppercase-bearing vendor credential and nothing more, and even
   that is a side effect of the charset rather than a designed property.
5. **Not the `maxLength` divergence.** C3 is a condition, not an accepted gap.
6. **Not the standing of an agent run as an owner.** `co-owner-review-sec-aud-obs-usg.md`
   records that whether A1 is held by an agent run or a person is the Product Owner's
   call. That limitation applies to this document unchanged. This is a security
   assessment by a distinct run that did not author the work; it is not a certified
   security review and RFC-2026-013 governs what an agent signature is worth.

---

## 7. What follows for the blocker

`open_blockers[0]` on `work-packages/WP-0A-CON-004.json` is **not** cleared and must not
be deleted. It is now **disposed with a recorded verdict**, and its correct next state is:

> Disposed 2026-09-04 by `/claude/a1_bastion` —
> `evidence/WP-0A-CON-004/security-disposition-handle-ownership-a1.md`. Refused in part:
> the precedent is not ratified and an RFC is required (§4b, §4c). Ratified in part:
> `CTR-SEC-001` may carry the pattern at Draft under conditions C1–C5. Escalates to the
> Product Owner because `CTR-MOD-001` was promoted to Candidate v1 under RFC-2026-010
> without disclosure of the conflict.

Editing that manifest is the Author's or Integration Owner's act, not mine; the text is
supplied so the disposition is not paraphrased. I have not touched the blocker, any
schema, any manifest, or any package status. The only file this branch adds is this one.

`open_blockers[1]` requires the factual correction in C4 before it can be relied on by
anyone.

---

## 8. Limits of this document

- It is one agent run's assessment against the shipped files at
  `3076315392cba899c2501ccc71044797934ac95d`. It is not a certified security assessment,
  and no benchmark of this run's security capability exists.
- `prefer_cross_vendor_review` is not satisfied: this run shares vendor and model with
  the Author it is reviewing, a correlated blind spot recorded but not waived on
  `WP-0A-CON-004.independence.cross_vendor_exception`.
- The probes show what the shipped artifacts do at this revision. They do not show that a
  credential has never entered this repository; `scan-repository-secrets.mjs` says so
  itself in its own header, and RFC-2026-005 records what a pattern scanner is and is not
  evidence of.
- My capability profile declares `can_create_branch_or_worktree: false`, self-declared on
  2026-08-31 for `WP-0A-A0-002`. I created a branch here because the assignment requires
  a fresh branch and forbids committing to `main`. Recorded rather than left for someone
  to notice.
- Nothing here approves Gate G0, authorizes a merge, or advances any freeze level.
