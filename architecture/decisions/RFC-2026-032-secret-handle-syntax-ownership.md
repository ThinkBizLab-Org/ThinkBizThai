# RFC-2026-032: the secret-handle syntax is owned by CTR-SEC-001

Status: **Proposed.** Q-032-1 to Q-032-4 (§9) go to the Product Owner before the merge.
Date: 2026-10-09
Author: `/claude/a0_atlas` (A0, owner of CTR-MOD-001 and co-owner of CTR-SEC-001), as an increment of `WP-0A-CON-004`
Owner: A0, with A1 as co-owner of CTR-SEC-001, on the Product Owner's disposition
Protocol version: `1.0.0`
Answers: A1's §4(c) requirement in `evidence/WP-0A-CON-004/security-disposition-handle-ownership-a1.md` (the "§4c RFC");
`WP-0A-CON-004` `open_blockers[0]`; item F-1 of `evidence/WP-0A-CON-004/a1-sec-candidate-signature-2026-10-09.md` §6;
the length half of `WP-0A-CON-003` `open_blockers[1]` and `[14]` (A1 CS-1, CS-2, N1).
Decides, once approved: which contract is normative for the `secret:` handle syntax; how CTR-MOD-001 references it;
how "equal accept sets" is demonstrated; which contract closes the `maxLength` divergence; and the route by which A1's
handle issuance format (C2) arrives.
Who merges: this is a governance PR (RFC-2026-025 §5 item 6). On 2026-10-09 the Owner chose
`ให้ A0 กดทั้ง 3 (Recommended)` for three governance PRs, this one among them. That answer is being transcribed in
`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-three-governance-prs.md` on a parallel PR and is **not yet on
`main`**. A0 presses this PR only after that disposition is on `main`, the four roles pass, and CI is green on a head that
contains current `main`.

---

## 1. Background

Two contracts constrain the same string:

| Contract | Owner (index) | Status | Where | Constraint at `main` `a4eed0e8` |
|---|---|---|---|---|
| CTR-SEC-001 | A0+A1 | Candidate | `schema.json` `properties.handle` | `type: string`, `pattern: ^secret:[a-z0-9._-]+$`, `maxLength: 128` |
| CTR-MOD-001 | A0 | Candidate | `schema.json` `properties.secret_handles.items` | `type: string`, `pattern: ^secret:[a-z0-9._-]+$` (no `maxLength`) |

No other contract in `contract-catalog/` constrains a handle; every `secret:` fixture value sits under `ctr-mod-001/` or
`ctr-sec-001/`.

Decision Register §5.2 charters CTR-SEC-001 with the "opaque ref". CTR-MOD-001 fixed the syntax first, and its own
`x-source` says it "must not fix it". A1 disposed of this on 2026-09-04 (§4 of its disposition): it **ratified** the
pattern on CTR-SEC-001 at Draft under C1–C5, **refused** the precedent that a single-owner contract may fix a jointly
owned contract's syntax, and **required** a narrow RFC from A0 that:
1. records that CTR-MOD-001 at Candidate v1 carries a syntax chartered to CTR-SEC-001;
2. makes CTR-SEC-001 normative and CTR-MOD-001 referencing;
3. discloses F5 to the Product Owner;
4. closes the `maxLength` divergence, shown by probe.

On 2026-10-09 A1 extended the ratification to Candidate and held that this RFC is owed "before CTR-MOD-001 or
CTR-SEC-001 is frozen" (`a1-sec-candidate-signature-2026-10-09.md` §4). This is that RFC.

## 2. F5: disclosed, and answered

F5 is A1's finding that CTR-MOD-001 was promoted to Candidate on 2026-09-02 under RFC-2026-010 without the Owner being
told it carries a syntax chartered to CTR-SEC-001. A0 disclosed it on 2026-10-09 (asked `10:08:57Z`, answered
`10:13:45Z`). The question, both options and the answer are transcribed verbatim in
`evidence/WP-0A-CON-004/product-owner-disposition-2026-10-09-candidate-sec-aud-obs-usg.md` §2, question 1. The Owner chose
`ยังใช้ได้ RFC ตามมา (Recommended)`, whose option text reads "MOD คงเป็น Candidate แต่ต้องมี RFC §4c ที่ทำให้ SEC
เป็นเจ้าของรูปแบบ handle ก่อน MOD หรือ SEC จะ freeze".

So item 3 of A1's list is done, and this RFC does not reopen it. The CTR-MOD-001 promotion stands. This RFC is a
precondition of either contract's freeze review (§7).

## 3. Decision: CTR-SEC-001 is normative

1. **The normative definition** of a secret handle is CTR-SEC-001 `schema.json` `properties.handle`. That means every
   keyword that is not an annotation (every key not starting with `x-`), today `type`, `pattern` and `maxLength`.
2. **Direction of change.** The syntax changes only in CTR-SEC-001, with A1's co-owner signature on the changed text
   (RFC-2026-031 §3.2 (2) logic; RFC-2026-013). CTR-MOD-001 follows in the same pull request. A change made from the
   CTR-MOD-001 side alone fails the test of §5.
3. **What is not decided here.** The handle **issuance** format (A1 C2) is A1's to specify. This RFC fixes only the
   route by which it arrives (§6, Q-032-3).
4. **C1 stands.** The pattern is a namespacing convention, not a security control, and nothing here cites it as one.

## 4. How CTR-MOD-001 references it: a pinned copy, not a `$ref`

**Decision: CTR-MOD-001 keeps an inline, byte-equal copy of the normative keywords, and a test pins the copy to its
source.** A `$ref` was considered and rejected for three reasons, each measured at `a4eed0e8`:

- **The catalog does not admit a fragment reference.** `test-kits/contracts/catalog-reference-integrity.test.mjs` allows
  a `$ref` only to a contract's whole canonical `schema.json`, by `basename(target) === 'schema.json'`. A reference to
  `../ctr-sec-001/schema.json#/properties/handle` fails that check. The subset validator's resolver in
  `catalog-registry.test.mjs` maps whole reference strings to whole files. A whole-file `$ref` would make each handle a
  full CTR-SEC-001 document, which is wrong.
- **The ratchets do not follow a `$ref`.** `schema-mutation-coverage.test.mjs` and `catalog-registry.test.mjs` measure
  each contract's own `schema.json`. Through a `$ref`, a change to CTR-SEC-001 would change CTR-MOD-001's accepted set
  while moving no CTR-MOD-001 pin. That is the silent cross-contract change §3.3 of RFC-2026-031 exists to stop.
- **Admitting fragments would change three guards owned elsewhere** (WP-0A-A0-003, WP-0A-CON-008, WP-0A-CON-003) for one
  field. The copy costs one test.

The copy:
- `secret_handles.items` carries the same non-`x-` keywords as `handle`, with the same values (§8 gives the edit).
- Its `x-source` names CTR-SEC-001 `properties.handle` as normative under this RFC. It no longer says the syntax is a
  declared inference of this contract.

## 5. How "equal accept sets shown by probe" is demonstrated

A new test, `test-kits/contracts/secret-handle-syntax.test.mjs`, owned by `WP-0A-CON-004` (the normative side), with
three assertions:

1. **Keyword identity, pinned.** The non-`x-` keywords of CTR-MOD-001 `secret_handles.items` and CTR-SEC-001
   `handle` are deep-equal. The SHA-256 of their canonical JSON (sorted keys) equals a digest literal in the test. So a
   change to both at once also moves a line in a `WP-0A-CON-004` file.
2. **Equal verdicts over a corpus, at document level.** Each corpus value is put into a shipped valid fixture of each
   contract (`ctr-mod-001/examples/valid-ready.json` as `secret_handles[0]`, and
   `ctr-sec-001/examples/valid-managed-active.json` as `handle`). Both documents are validated with the repository's
   `json-schema-subset.mjs`, the same validator the catalog tests use, so sibling rules count as well. For every value,
   the CTR-MOD-001 document is valid if and only if the CTR-SEC-001 document is.
3. **Expected verdicts, pinned.** Each corpus value also carries its expected verdict, so the two contracts cannot drift
   together without a visible test edit.

**The corpus**, at least:
- Every row of A1's Probes 2 and 4 (`security-disposition-handle-ownership-a1.md` §2). The credential-shaped bodies are
  built at run time from a prefix and a repeated synthetic character. A literal would fire `npm run scan:secrets`, as
  A1's own first draft did.
- The length boundary: total length 127, 128, 129, 200 and 407. The last is CON-003's measured value.
- Empty body, uppercase prefix, no prefix, `/`, space, a trailing `\n`, a non-ASCII letter, an astral character, and the
  non-strings `0`, `null` and `[]`.

At `a4eed0e8` assertion 2 **fails** on the 129-, 200- and 407-character values (accepted by CTR-MOD-001, rejected by
CTR-SEC-001). That failure is the divergence. The test lands green only together with the §8 edit.

## 6. The issuance format (A1 C2)

C2 asks for "An issuer-assigned identifier that a producer cannot mint from credential material": fixed length,
issuer-side namespace, structurally verifiable. It narrows both contracts, so under RFC-2026-031 §3.3 it must land
**before** either freezes, or it needs an RFC after.

**Proposed route (Q-032-3).** A1 specifies the grammar as an amendment to this RFC: a new §6.1, A1's words transcribed by
A0, approved by the Owner. It is then implemented the same way as §8: in CTR-SEC-001 first, the CTR-MOD-001 copy in the
same PR, and the §5 corpus extended. Its acceptance test is A1's: none of the five Probe 4 shapes satisfies the grammar.
`ctr-sec-001/examples/accepted-gap-structureless-handle-body.json` stays until then.

## 7. Breaking-change classification (RFC-2026-031 §3.3)

Both contracts are **Candidate**. RFC-2026-031 §3.3's rule that a breaking change needs an RFC, and its version rule,
bind `Frozen` contracts, so neither binds these edits. The classification is given anyway, by §3.3's definition, so
that C0 can confirm it in writing and so that it is on record before either freeze:

| Edit (§8) | Accepted set | Class by §3.3 | Version |
|---|---|---|---|
| CTR-MOD-001 `secret_handles.items` gains `maxLength: 128` | narrows: a handle of 129+ characters becomes invalid | **breaking** | stays `1.0.0` (Candidate) |
| CTR-MOD-001 `x-source` rewritten (§4) | unchanged | not breaking | `1.0.0` |
| CTR-MOD-001 new fixture `invalid-secret-handle-too-long.json` | unchanged (confirms the new rule) | not breaking | `1.0.0` |
| CTR-SEC-001 `handle.x-source` rewritten | unchanged | not breaking | `1.0.0` |
| A1's issuance format (§6), later | narrows both | **breaking** for both | before freeze, so `1.0.0` |

**Measured impact of the CTR-MOD-001 narrowing.** The longest valid `secret:` value in any shipped fixture is 49
characters (`ctr-mod-001/examples/*` and `ctr-sec-001/examples/*`, at `a4eed0e8`). No shipped document becomes invalid.
A consumer fake or test written against Candidate CTR-MOD-001 with a handle over 128 characters would break. None is in
the repository.

**Freeze gating.** F-1 cannot be a declared gap (RFC-2026-031 §5.5 (2): it is an open A1 condition). Neither CTR-MOD-001
nor CTR-SEC-001 enters its freeze review (RFC-2026-031 §4) until this RFC is Approved, the §8 increment is merged, and §5's
test is green on `main`.

## 8. What changes, in which files (not in this PR)

**This PR changes no contract, fixture or test.** The edits below come in one later increment, with its own four-role
round and A1's co-owner signature on the changed CTR-SEC-001 text.

| File | Owner | Edit |
|---|---|---|
| `contract-catalog/shared-kernel/ctr-mod-001/schema.json` | WP-0A-CON-003 | `secret_handles.items`: add `"maxLength": 128`; rewrite `x-source` per §4 |
| `contract-catalog/shared-kernel/ctr-mod-001/examples/invalid-secret-handle-too-long.json` | WP-0A-CON-003 | new: `valid-ready.json` with a 129-character handle |
| `contract-catalog/shared-kernel/ctr-mod-001/manifest.json` | WP-0A-CON-003 | `fixtures` gains the new file; `source_references` gains this RFC |
| `contract-catalog/shared-kernel/ctr-sec-001/schema.json` | WP-0A-CON-004 | `handle.x-source`: state it is normative under this RFC. Drop "ADOPTED FROM CTR-MOD-001" and the withdrawn-composition sentence (C3 is then met on its "made true" branch). `x-opacity-limitation` unchanged (C1) |
| `contract-catalog/shared-kernel/ctr-sec-001/manifest.json` | WP-0A-CON-004 | `source_references` gains this RFC |
| `test-kits/contracts/secret-handle-syntax.test.mjs` | WP-0A-CON-004 (new) | §5 |
| `test-kits/contracts/catalog-registry.test.mjs` | WP-0A-CON-008 | MOD and SEC annotation digests; MOD fixture set by name |
| `test-kits/contracts/schema-mutation-coverage.test.mjs` | WP-0A-CON-003 | MOD constraint surface +1 `maxLength` site and its floor |
| `scripts/test-suite-contract.mjs`, `test-kits/integrity-manifest.json` | WP-0A-A0-002 | the new test's floors and name digest; the manifest is regenerated, not edited by hand |

**Package (recommended, not for the Owner).** The increment is made in `WP-0A-CON-004`, which owns the normative side
and the new test. It amends the `ctr-mod-001/` files without owning them, recorded for `WP-0A-CON-003`, as earlier
increments have done. That way the schema edits and the test land in one commit range, and the test is never red on
`main`. A split increment (CON-003 for MOD, CON-004 for SEC and the test) would need the test to land after the MOD edit,
and would leave §4's copy unpinned in between.

**Records closed by that increment, not by this PR:** `WP-0A-CON-004` `open_blockers[0]` (the RFC half; C2 stays open
through §6 until A1 specifies it); the length half of `WP-0A-CON-003` `open_blockers[1]` and `[14]` (1); CTR-SEC-001
`handle.x-source`'s "withdrawn until a probe shows equal accept sets".

**Not changed by this RFC:** any contract status, owner or version; the Decision Register (`docs/**` is read-only to
every package, and the register's owner transcribes §3 into §5.2); RFC-2026-010 and RFC-2026-031, which are cited and
not amended; A1's refusal of the precedent, which this RFC implements and does not replace.

## 9. Questions for the Owner

Each question carries A0's recommendation. The Owner's answers are recorded on this branch before the merge.

- **Q-032-1.** Approve this text: CTR-SEC-001 normative for the handle syntax, and CTR-MOD-001 holding a pinned copy
  checked by the §5 test (not a `$ref`, for §4's reasons)? **A0 recommends yes.** It is what A1 required, and the Owner's
  F5 answer named it.
- **Q-032-2.** Close the `maxLength` divergence by giving CTR-MOD-001 `maxLength: 128`, a narrowing of a Candidate
  contract that rejects no shipped document (§7)? The alternative is to remove CTR-SEC-001's bound. That widens a
  security contract whose bound A1 signed at Candidate (K1, text identity). **A0 recommends adding the bound to CTR-MOD-001**, under this RFC
  with no separate disposition for the narrowing.
- **Q-032-3.** Route A1's issuance format (C2) as an amendment to this RFC (§6.1, A1's words, the Owner's approval)
  rather than a separate RFC? **A0 recommends the amendment.** A1 asked that C2 "travel through" this RFC so that
  CTR-MOD-001 derives from it. Either way it must land before either freeze (§7).
- **Q-032-4.** Confirm the freeze gate of §7: neither CTR-MOD-001 nor CTR-SEC-001 enters its freeze review until this RFC
  is Approved, the §8 increment is merged, and §5's test is green? **A0 recommends yes.** It restates the Owner's F5
  answer as a checkable condition.

**Order before the merge.**
1. A0 puts Q-032-1 to Q-032-4 to the Owner.
2. A0 transcribes the answers in a `product-owner-disposition-*` file on this branch and updates the status line.
3. The four roles read that head. A1 reads it as the co-owner whose condition this answers.
4. A0 presses the PR on a green head containing current `main`, once the 2026-10-09 three-governance-PRs disposition is on
   `main`.

Until then the status stays `Proposed`, and nothing in §3 to §8 binds.
