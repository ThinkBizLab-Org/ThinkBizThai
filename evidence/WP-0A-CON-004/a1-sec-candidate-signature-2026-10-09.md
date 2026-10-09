# A1 co-owner signature decision — CTR-SEC-001, Draft → Candidate v1

| | |
|---|---|
| Run | `/claude/a1_bastion` — security co-owner of CTR-SEC-001 (with A0), Security/Privacy reviewer of WP-0A-CON-004 |
| Question | RFC-2026-010 status line: "CTR-SEC-001 awaits A1"; RFC-2026-031 §4.1 (1): "the co-owner's promotion signature on the current text" |
| Text read | `origin/main` `d17ff25606977b6e9135e9466e3606a7ccdc45da` (2026-10-09T17:11:52+07:00) |
| `contract-catalog/shared-kernel/ctr-sec-001/` tree | `408933421da8953bbab000ed39cac002c9041379` (78 fixtures) |
| `schema.json` sha256 | `ef604c0235b9c7e6c81f8c16f123c7d29f008c42d4bd4bc94cf09edfbd4dbfc9` |
| `manifest.json` sha256 | `f6530981c6c455fc74205f77f4c129d239dadb5bbbf23f09bc0947d52d5775df` |
| Target status | `Candidate` (register §5.1/§5.2 "Candidate v1"). **Not** `Frozen`. |
| Decision | **SIGNED WITH CONDITIONS K1–K5** (§4) |

This is an independent role run. It edits no contract, manifest, index, RFC or package record,
and pushes and merges nothing. The only file it adds is this one.

## 1. What I read

- `CONTRIBUTING_AGENTS.md` (protocol 1.0.0), at `d17ff256`.
- `architecture/decisions/RFC-2026-010-shared-kernel-freeze-readiness.md` (status line; the SEC
  row "3/4"; "What promotion would and would not authorize").
- `architecture/decisions/RFC-2026-031-first-slice-contract-freeze.md` §3.2, §4.1 (1)–(6), §5.1–§5.5,
  and §10 (Owner's answers: Q-031-3 `รับทั้ง 3 ข้อ (Recommended)`, so §5.5 binds).
- `contract-catalog/shared-kernel/ctr-sec-001/schema.json`, `manifest.json`; the CTR-SEC-001 entry
  of `contract-catalog/shared-kernel/index.json` (`required_before_freeze`: `opaque ref`, `scope`,
  `rotation/revoke`, `redaction tests`).
- `work-packages/WP-0A-CON-004.json` `open_blockers[0]`–`[20]`.
- My own prior files: `security-disposition-handle-ownership-a1.md` (§4, §5 C1–C5, §6),
  `a1-security-reverify-2026-10-05.md` §4, `a1-review-2026-10-07.md` §3–§4,
  `a1-recheck-2026-10-07b.md`, `a1-review-2026-10-09-pr230.md`.
- `evidence/WP-0A-CON-008/g1-freeze-readiness-2026-10-08.md`, CTR-SEC-001 and CTR-MOD-001 rows.
- `db/foundation/migrations/060_ai_gateway.sql` (`private.ai_credential_references`),
  `scripts/db/rls-smoke.mjs`, `db/foundation/test-helpers/rls-assertions.mjs` (for §5).

## 2. Measurements

```
git rev-parse origin/main                                   d17ff25606977b6e9135e9466e3606a7ccdc45da
git diff --stat 27288393 d17ff256 -- .../ctr-sec-001/        schema.json | 2 +- (1 line)
git log -1 -- .../ctr-sec-001/                              728e5648 (2026-10-07)
node --test test-kits/contracts/shared-kernel-schema-conformance.test.mjs   tests 6, pass 6, fail 0 (exit 0)
node --version                                              v24.20.0
```

The single line changed since `27288393` (where I gave `security_approved` and countersigned the
eight values) is the `scope.capability_key` `x-bound-note` text, C0 R-1's text-only fix. The
`maxLength: 64` and the pattern are unchanged. I re-read it at `a1-recheck-2026-10-07b.md`, and
no accepted set has moved since. The text I sign is therefore the text I last approved, plus one
annotation I have already read. The full suite was not run (instruction); the one conformance
file above shows the accepted-gap fixtures still validate and the invalid ones still fail.

## 3. My own preconditions for leaving Draft, checked against the text

In 2026-09-04 §5 I wrote "All must hold before `CTR-SEC-001` leaves Draft". Each one checked:

| Item | Required | State at `d17ff256` | Holds for Candidate? |
|---|---|---|---|
| C1 never cited as a control | must survive every edit | `handle.x-opacity-limitation` opens "THIS PATTERN IS NOT A SECURITY CONTROL"; `freeze_boundary` and `open_blockers[1]` say the same | **yes** |
| C2 issuance format | "before freeze", by its own words | not specified; `accepted-gap-structureless-handle-body.json` still states the gap | **not a Candidate precondition**; owed before freeze |
| C3 composition made true or withdrawn | one branch | withdrawn: `handle.x-source` says the adoption "does NOT make the two compose" and the claim is "withdrawn until a probe shows equal accept sets" | **yes** (withdrawn branch) |
| C4 "zero coverage" corrected in three places | done | schema `x-opacity-limitation`, manifest `freeze_boundary`, `open_blockers[1]` all carry the 12/15 and REACH wording | **yes** |
| C5 scope of the disposition | limit, not a test | unchanged | n/a |
| N-2 bound the four bare SEC strings | before leaving Draft | eight SEC values bounded, each with its kill fixture; countersigned by me at Draft (`a1-review-2026-10-07.md` §4) | **yes** |
| N-3 / §4(c)(3): F5 disclosed to the Owner, who decides whether the MOD promotion stands | before I would sign anything resting on the MOD syntax | asked by A0 on 2026-10-09; Owner answered `ยังใช้ได้ RFC ตามมา (Recommended)` (option text: "MOD คงเป็น Candidate แต่ต้องมี RFC §4c ที่ทำให้ SEC เป็นเจ้าของรูปแบบ handle ก่อน MOD หรือ SEC จะ freeze") | **yes, on A0's relay** — K2 makes the transcription on `main` a condition |

Open A1 findings against the CTR-SEC-001 text at this head: **none open as findings**. Every item I
have raised against it is either closed (N-1, N-2, N-4, C3, C4) or is a carried before-freeze item
(C2, §4c RFC, SEC-003 class, redaction tests, scope binding, F5 transcription). `a1-review-2026-10-09-pr230.md`
raised nothing against SEC.

What Candidate means and does not mean (register §5.1; RFC-2026-010 "What promotion would and
would not authorize"): schema and examples are ready; fakes, fixtures and consumer tests are
permitted; no production schema, migration, provider call or G0 item is authorized. The
remaining SEC gaps are all of the kind that block **freeze**, not of the kind that make a fake or
a consumer test unsafe to write — with one exception, the scope gap, which K4 bounds.

## 4. Decision

**SIGNED WITH CONDITIONS.** As security co-owner of CTR-SEC-001, I sign CTR-SEC-001 for
promotion from `Draft` to `Candidate` at `origin/main` `d17ff256`, tree `40893342`, on the text whose
digests are in the header table. This answers RFC-2026-010's "CTR-SEC-001 awaits A1" for Candidate
only. **It is not a signature toward `Frozen`** (RFC-2026-031 §3.2 item 2 requires a separate one
on the text to be frozen).

**The handle pattern.** I extend my 2026-09-04 ratification of `^secret:[a-z0-9._-]+$` on `handle`
from Draft to **Candidate**, under C1–C5 unchanged. I still refuse the precedent (§4(b) of that file);
that refusal does not change. On the Owner's answer the §4c RFC is owed **before CTR-MOD-001 or
CTR-SEC-001 is frozen**, and I hold it to that: neither contract can enter its freeze review without it.

Conditions. Each one binds the promotion increment. If any fails, this signature does not carry.

- **K1 — Text identity.** The increment may change, inside `ctr-sec-001/`, only `manifest.json`
  `"status"` (`"Draft"` → `"Candidate"`). Outside it, it may change the index entry's `status`, the
  registry pin, the census assertions and the regenerated integrity manifest (RFC-2026-031 §4.5
  pattern). Any other byte changed under `ctr-sec-001/` voids this signature. That includes the
  `freeze_boundary` opening "Draft only.", which stays as written at Candidate as it did for
  CTR-MOD-001. Restating it is a freeze-review item (RFC-2026-031 §4.1 (4)).
- **K2 — F5 on `main`.** The Owner's F5 question, options and answer (`ยังใช้ได้ RFC ตามมา
  (Recommended)`) are transcribed verbatim in a `product-owner-disposition-*` file, merged before
  the status move or in the same PR. I rely on A0's relay of that answer. The relay alone is not a
  record.
- **K3 — The Owner's disposition by name.** The status move needs a Product Owner disposition
  naming CTR-SEC-001 for Candidate, transcribed verbatim (RFC-2026-031 §4.1 (1)). My signature is
  necessary but not sufficient.
- **K4 — Consumer bound at Candidate (scope).** The status-move record states, in A0's words or
  mine: "At Candidate, no fake, fixture or consumer test may treat the `scope` a CTR-SEC-001 document
  claims as authority. A fake resolver takes the tenant scope from the trusted request or worker
  context (CTR-TEN-001), and refuses a handle whose recorded scope differs. No fixture carries
  credential material, and the handle pattern is not cited as a control (C1)." Without this, a
  consumer built at Candidate would encode the tenant-isolation gap in `untestable_by_schema` (2),
  which is the gap §5 says can never be declared.
- **K5 — Its own round.** The promotion PR is tier H (a contract). It gets a C0, A1, Q0 and R0
  round at its head. My security review in that round checks K1–K4 by diff. It does not reopen this
  decision unless the text moved.

Stop-the-line: **no**. No secret, tenant data, migration, provider call or accepted-set change is
involved.

## 5. Scope binding: how it can be closed, and so whether SEC can ever freeze

**The problem.** `untestable_by_schema` (2) and `open_blockers[6]`: nothing binds the `scope` a
document claims to the scope recorded at issuance, so a document, or a CTR-MOD-001 manifest
listing the same handle, "may claim another tenant's scope and be accepted". That is a gap in
tenant isolation. RFC-2026-031 §5.5 (3), which the Owner accepted, forbids declaring it. It is
also the meaning of the `required_before_freeze` item `scope`, and §5.5 (1) forbids declaring a
missing one of those too. So it must be **closed**, with evidence on `main`, or SEC never freezes.
And because RFC-2026-031 §6 closes the G0 exit only when all thirteen are Frozen, the G0 exit
waits on it.

**It cannot be closed in JSON Schema, and that is not the claim to make.** A document can always
*say* any scope. The closure is to make the claim **not count**. Two parts are both required.

1. **Contract text (before freeze, a meaning clarification while not yet Frozen).** `scope` becomes
   normatively a *registry echo*: "the scope recorded at issuance, reported for display and audit;
   it is never an input to authorization. A resolver takes the requesting scope from the trusted
   CTR-TEN-001 context and resolves only a handle whose registry record matches it at every level
   given (workspace, then business profile, then page context profile, then capability)." The
   `untestable_by_schema` (2) sentence is rewritten as *closed by* the runtime evidence in part 2,
   citing it by path. It no longer describes an open gap. The prose limitation (a schema cannot
   compare two properties) stays true and is stated as a reason, not as a gap.
2. **Live isolation evidence (the closing artifact).** A resolver exists as a typed `private`
   service. For the AI consumer the registry already exists: `private.ai_credential_references`
   (060), canonical scope `workspace_id`, no role privilege. The resolver reads `workspace_id`, and
   lower levels where the registry carries them, from the trusted session (the authorization
   helpers of 011 and 172/173), never from a parameter the caller supplies. Then isolation cases are
   added to A1's case set run by `make db-rls-smoke` (`scripts/db/rls-smoke.mjs`, one rolled-back
   transaction per case) against a live database, at minimum:
   - S1: workspace B's member or worker resolves workspace A's handle and gets not-found. The
     response does not tell "exists elsewhere" from "never existed".
   - S2: a request whose claimed scope is A's, made from B's trusted context, is refused. The
     claimed scope is ignored, never honoured.
   - S3: within one workspace, a handle issued for business profile X is refused for business
     profile Y (where the registry records that level).
   - S4: a CTR-MOD-001 manifest installed in B listing A's handle string does not resolve.
   - S5: a revoked handle does not resolve in its own scope. This also serves `rotation/revoke`.
   - S6: no role, client or service, can `SELECT` the registry row directly (the 060 grant
     posture, asserted rather than read).
   Each case has a reversal: weakening the resolver's scope predicate makes S1 or S2 fail,
   measured once, as Q0 does for every new rule.

The registry must cover every consumer the index names (AI, Meta, Notification, Storage adapters),
or the contract's consumers are narrowed by RFC to those that have one. With both parts on `main`,
open_blockers[6] closes with evidence and nothing about scope needs declaring. **SEC can freeze.**
Without part 2, it cannot. That is a decision about the G0 exit's critical path, and the Owner
should hear it in those terms. This work is reversible foundation, which the gate constraint allows
before G0.

## 6. What remains before freeze (CTR-SEC-001)

Classified under RFC-2026-031 §5.5. "Must close" means it cannot be a `declared_gaps` entry.

| # | Item | Where recorded | Owner | Must close / may declare |
|---|---|---|---|---|
| F-1 | §4c RFC: CTR-SEC-001 normative for handle syntax, CTR-MOD-001 referencing; equal accept sets by probe (C3, `maxLength` 128 vs unbounded) | `open_blockers[0]`; Owner's F5 answer | A0 opens, A1 signs | **must close**: it is my open condition (§5.5 (2)) and the Owner made it a precondition of either freeze |
| F-2 | C2 issuance format: issuer-assigned, fixed length, structurally verifiable (checksum or issuer segment). None of the five lowercase shapes (32-hex, UUID, HMAC hex, passphrase, dotted-label password) satisfies it. Closes `accepted-gap-structureless-handle-body.json` | `open_blockers[1]`; manifest `accepted_gaps` | A1 specifies through F-1 | **must close**: it is the meaning of `opaque ref` (§5.5 (1)) and my condition (§5.5 (2)). It narrows the schema, so it has to land before freeze or it needs an RFC |
| F-3 | SEC-003 data class pinned (a credential handle is not `internal`). Closes `accepted-gap-classification-below-restricted.json` | `open_blockers[2]` | A1 | **must close**: a credential declared below its class is a security gap I will not accept as declared. Narrowing, so before freeze |
| F-4 | Scope binding, both parts of §5 | `open_blockers[6]`; `untestable_by_schema` (2) | A0 (contract text), resolver owner (A3 for the AI registry; owners of the others), A1 (cases) | **must close**: tenant isolation (§5.5 (3)) and `scope` (§5.5 (1)) |
| F-5 | Runtime redaction tests over log, event, job, analytics, error-trace and browser output, showing a resolved secret and a handle body do not appear in them. This replaces the `const: true` self-attestation as evidence | `open_blockers[7]`; `untestable_by_fixture`; RFC-2026-010 "3/4" | A1 (cases), A0/A6 (the surfaces) | **must close**: a missing `required_before_freeze` item (§5.5 (1)) |
| F-6 | Rotation overlap semantics (does a `rotating` handle with no revocation record resolve?) | `freeze_boundary` | A0+A1 | must close before freeze. Fixing it later narrows or widens the accepted set, which is breaking under §3.3 |
| F-7 | Revocation **immediacy** and propagation, as a resolver property over time | `untestable_by_fixture`; `open_blockers[7]` | A1 / resolver owner | close where the same harness can (S5 shows *not resolvable after revoke*). Propagation latency across caches **may be declared** as `runtime`, owner A1, `closes_before: "production-customer-data"` |
| F-8 | SEC-005 storage encryption and masking; retention of a revoked handle | `untestable_by_fixture`; `freeze_boundary` | A1 (encryption), Legal/PDPA adviser (retention) | **may be declared**: `runtime`, owner A1, `closes_before: "production-customer-data"`; retention `decision`, owner `Legal/PDPA adviser`, `closes_before: "production-customer-data"` |
| F-9 | `freeze_boundary` restated without "Draft only." | RFC-2026-031 §4.1 (4) | A0 | at the freeze increment |
| F-10 | A1 co-owner signature on the frozen text, and no open A1 finding of any grade | RFC-2026-031 §3.2 (2), §4.1 (6) | A1 | at the freeze increment |

Not mine to clear, and noted for completeness: `open_blockers[3]` SEC-016 break-glass fields
belongs to CTR-AUD-001, not SEC, and is still owed by A1 there.

A correction to the brief I was given: it numbers "[2] C2 issuance format + SEC-003 class". On
`main`, the issuance format (C2) is `open_blockers[1]` and the SEC-003 class is `open_blockers[2]`.
The table above uses the manifest's numbering.

## 7. Exact wording for A0 to record

I do not edit these files. A0 records the following verbatim, with `<…>` placeholders filled from
measured values.

**(a) `work-packages/WP-0A-CON-004.json` `open_blockers[0]`**: append in place, keeping the index:

> UPDATED 2026-10-09 BY A0 (/claude/a0_atlas), RECORDING A1'S WORDS (evidence/WP-0A-CON-004/a1-sec-candidate-signature-2026-10-09.md §4): "I extend my 2026-09-04 ratification of `^secret:[a-z0-9._-]+$` on `handle` from Draft to **Candidate**, under C1–C5 unchanged. I still refuse the precedent". F5 was disclosed to the Product Owner on 2026-10-09 and he answered `ยังใช้ได้ RFC ตามมา (Recommended)` ("MOD คงเป็น Candidate แต่ต้องมี RFC §4c ที่ทำให้ SEC เป็นเจ้าของรูปแบบ handle ก่อน MOD หรือ SEC จะ freeze"), transcribed in <disposition path>. STILL OPEN: the §4c RFC (CTR-SEC-001 normative for handle syntax, CTR-MOD-001 referencing, equal accept sets by probe) and the C2 issuance format through it. Closing gate: before CTR-MOD-001 or CTR-SEC-001 enters its freeze review. Cannot be a declared gap (RFC-2026-031 §5.5 (1), (2)).

**(b) `open_blockers[6]`**: append in place:

> CLASSIFIED 2026-10-09 BY A1 (/claude/a1_bastion; a1-sec-candidate-signature-2026-10-09.md §5), RECORDED BY A0: a tenant-isolation gap, so under RFC-2026-031 §5.5 (3) it must be CLOSED, not declared, before CTR-SEC-001 freezes. Closure = (1) contract text making `scope` a registry echo that is never an authorization input, with the resolver taking scope from the trusted CTR-TEN-001 context; and (2) live isolation cases S1–S6 in `make db-rls-smoke` against a typed `private` resolver over each consumer's registry (for AI, `private.ai_credential_references`), each with one measured reversal. Until then, at Candidate, no fake, fixture or consumer test may treat a document's claimed `scope` as authority.

**(c) `open_blockers[7]`**: append in place:

> CLASSIFIED 2026-10-09 BY A1 (a1-sec-candidate-signature-2026-10-09.md §6 F-5, F-7, F-8), RECORDED BY A0: the runtime redaction tests are a missing `required_before_freeze` item and must be delivered, not declared (RFC-2026-031 §5.5 (1)). Revocation propagation latency, SEC-005 encryption and masking, and revoked-handle retention may be declared at the freeze, with `closes_before: "production-customer-data"` (owners A1, A1, Legal/PDPA adviser).

**(d) A new entry when SEC moves to Candidate:**

> ADDED <date> BY A0 (/claude/a0_atlas): CTR-SEC-001 moved Draft → Candidate at <head sha> on A1's co-owner signature (evidence/WP-0A-CON-004/a1-sec-candidate-signature-2026-10-09.md, signed at main d17ff256, ctr-sec-001 tree 40893342, conditions K1–K5) and the Product Owner's disposition <path>. A1's words: "This answers RFC-2026-010's 'CTR-SEC-001 awaits A1' for Candidate only. It is not a signature toward `Frozen`." Consumer bound (K4): "At Candidate, no fake, fixture or consumer test may treat the `scope` a CTR-SEC-001 document claims as authority. A fake resolver takes the tenant scope from the trusted request or worker context (CTR-TEN-001), and refuses a handle whose recorded scope differs. No fixture carries credential material, and the handle pattern is not cited as a control (C1)." Before freeze: F-1 to F-10 of that file §6.

**(e) RFC-2026-010 status line.** Replace "CTR-SEC-001 awaits A1;" with the following. It applies
once K2 and K3 are on `main`. Before then, use only its first sentence.

> CTR-SEC-001: A1 signed for Candidate on 2026-10-09 with conditions K1–K5 (evidence/WP-0A-CON-004/a1-sec-candidate-signature-2026-10-09.md, at main d17ff256); the Product Owner approved its promotion on <date> (<disposition path>), and it is now Candidate. A1's signature is not toward Frozen.

If the Owner has not yet answered for SEC, the line reads only: "CTR-SEC-001: A1 signed for
Candidate on 2026-10-09 with conditions K1–K5 (evidence/WP-0A-CON-004/a1-sec-candidate-signature-2026-10-09.md, at main d17ff256); awaits the Product Owner's disposition."

## 8. Limits

- One agent run's assessment of the shipped text at `d17ff256`. It is not a certified security
  review, and RFC-2026-013 governs what an agent signature is worth. This run shares vendor and
  model with the Author. The cross-vendor condition was withdrawn by the Owner on 2026-10-05
  (RFC-2026-024).
- The F5 answer is A0's relay. I have not seen a transcription on `main`, which is why K2 exists.
- §5's resolver design is a security requirement, not contract content. I wrote no schema and no
  migration. Whether each consumer has a registry is for their owners to show.
- The full test suite was not run at this head. One conformance file was (§2).
