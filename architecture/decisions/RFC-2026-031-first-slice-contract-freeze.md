# RFC-2026-031: the First-Slice contract freeze rule

Status: **Approved 2026-10-09 by the Product Owner.** To Q-031-1 he chose `อนุมัติ รวม USG (Recommended)`, and he answered Q-031-2 to Q-031-5 as A0 recommended (transcribed verbatim in `evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-first-slice-freeze-and-records.md` §8). The approved text is this file as committed at `d0c92447`; since then only this status line and §10's appended answers have changed. Earlier status: Proposed.
Date: 2026-10-09
Author: `/claude/a0_atlas` (A0 Architecture/Integration), as an increment of `WP-0A-CON-008`
Owner: A0, on the Product Owner's disposition
Protocol version: `1.0.0`
Decides, once approved: which contracts make up the First Slice; what `Frozen` means in this repository and who sets
it; the per-contract freeze review; the declared-gap policy; the test and registry change that admits `Frozen`; and
when the G0 exit closes.
Sources of the Owner's decisions it records: `evidence/WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md`
§10.1 (the gate-rule cycle) and §10.3 (the interim rule), and
`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-first-slice-freeze-and-records.md` §4 (the First-Slice
set and the declared-gap policy).
Who merges: this is a governance PR (an RFC and a gate rule; RFC-2026-025 §5 item 6). The Owner's standing direction of
2026-10-08 names it. His question listed "#214 G0 exit และ RFC เรื่อง freeze ที่จะตามมา", and he chose
`ให้ A0 กดทุกตัวในแผน (Recommended)` ("เฉพาะ governance PR ที่อยู่ในแผนที่อนุมัติแล้ว เรื่องใหม่นอกแผนยังถามก่อน"),
transcribed in the 2026-10-08 disposition §10.2. So A0 may press this PR once the four roles pass and CI is green on a
head that contains current `main`. The Owner still approves the text: §10 lists the questions, and "Order before the
merge" says how.

---

## 1. Background

The Decision Register defines `Frozen v1` twice. §1.2 (line 43) reads "Contract ผ่าน G0; เปลี่ยนแบบ breaking ต้อง RFC",
and §5.1 (line 190) reads "compatibility/security review + fixtures ผ่าน G0 | เขียน implementation ได้". Its G0 Pass
Rule, §7.2 item 2 (line 365), reads "Shared contracts เป็นอย่างน้อย `Candidate v1`; Contract ที่ First Slice ใช้ต้อง
`Frozen v1`". Read as two events in sequence, those lines are a cycle. `WP-0A-CON-008` recorded the cycle as
`open_blockers[6]` and left it to the Product Owner and A0.

The Owner answered on 2026-10-08 (disposition §10.1) with `นับเป็นเหตุการณ์เดียว (Recommended)`, whose option text is
"การ freeze review ของ contract ที่ First Slice ใช้ เป็นส่วนหนึ่งของ G0 exit เลย — ไม่ยกเว้น §7.2(2) แต่ freeze ทีละ
contract เมื่อ owner เซ็นครบ แล้ว G0 exit ปิดเมื่อชุด First Slice ครบ". The question itself said a gate rule needs an RFC
("เป็น gate rule ต้องออก RFC"). The disposition (§6 and §10.1) lists that RFC as owed by A0. This is that RFC.

The same answer did not say which contracts make up the First Slice. On 2026-10-09 the Owner answered that and the
question of gaps that cannot be closed before a freeze (disposition of 2026-10-09, §4). §2 and §5 below record those
answers.

At `origin/main` `9d0b3d23`, no contract is Frozen. Nine are Candidate and five are Draft
(`contract-catalog/shared-kernel/index.json`). `evidence/WP-0A-CON-008/g1-freeze-readiness-2026-10-08.md` names, per
contract, what still blocks each step and who owns it. Nothing in this RFC moves a contract.

## 2. The First-Slice set

**The First Slice is these thirteen contracts.** The Owner chose `12 ตัว + PAG (Recommended)`, whose option text names
them: "TEN, ERR, API, IDM, EVT, JOB, MOD, FLG, SEC, AUD, OBS, NTF ตามแผน §2 และเพิ่ม PAG ตามที่ g0-tracker ระบุไว้".
The ids are the ones in `contract-catalog/shared-kernel/index.json`. The status column is `main` at `9d0b3d23`.

| Contract | Owner (index) | Status now | Steps to Frozen | Signature beyond A0's |
|---|---|---|---|---|
| CTR-TEN-001 | A0+A1 | Candidate | Candidate → Frozen | A1, co-owner |
| CTR-ERR-001 | A0 | Candidate | Candidate → Frozen | none |
| CTR-API-001 | A0 | Candidate | Candidate → Frozen | none |
| CTR-PAG-001 | A0 | Candidate | Candidate → Frozen | none |
| CTR-IDM-001 | A0 | Candidate | Candidate → Frozen | none |
| CTR-EVT-001 | A0 | Candidate | Candidate → Frozen | none |
| CTR-JOB-001 | A0 | Candidate | Candidate → Frozen | none |
| CTR-MOD-001 | A0 | Candidate | Candidate → Frozen | none |
| CTR-FLG-001 | A0 | Candidate | Candidate → Frozen | none |
| CTR-SEC-001 | A0+A1 | Draft | Draft → Candidate → Frozen | A1, co-owner |
| CTR-AUD-001 | A0+A6 | Draft | Draft → Candidate → Frozen | A6, co-owner |
| CTR-OBS-001 | A0+A6 | Draft | Draft → Candidate → Frozen | A6, co-owner |
| CTR-NTF-001 | A5 | Draft | Draft → Candidate → Frozen | A5, owner |

CTR-PAG-001 is in the set because `evidence/g0-tracker-th.md` (row 008, line 170) already lists it among the contracts
needing "Frozen v1 สำหรับ first slice". The Owner's option gave the reason: "เพราะหน้าจอแรกต้องใช้ pagination และ PAG ก็เป็น
Candidate อยู่แล้ว".

**Not in the set:**
- CTR-USG-001 (A0+A6, Draft). §6 states what register §7.2 (2) still asks of it.
- The domain contracts of the flow that register §11.1 calls the Integration Slice (line 900: Business, Suggestion,
  Content, Asset, review, schedule, Publish, Notification). They are not in the shared-kernel catalog, and the Owner
  was not asked about them. Reading the set as shared-kernel only is A0's
  reading of the options he was shown.

Changing the set needs an amendment to this RFC that the Owner approves.

## 3. What `Frozen` means in this repository

### 3.1 The value

A contract is at the register's `Frozen v1` level when both of these read `"status": "Frozen"`:
- its `contract-catalog/shared-kernel/<dir>/manifest.json`;
- its entry in `contract-catalog/shared-kernel/index.json`.

Its `version` stays `"1.0.0"`. The register writes the level as `Frozen v1`. The catalog writes `Candidate v1` as
`"Candidate"`, so `"Frozen"` follows the same convention. The two files must agree. The registry test already fails
when they disagree (`catalog-registry.test.mjs`, "the catalog index agrees with the manifests").

### 3.2 Who sets it

1. **A0 makes the change.** Register §4.1 (line 138): "Owner มีสิทธิ์เสนอ Contract แต่ A0 freeze/version shared contract".
   The edit is made in the package that owns the contract's directory and the index (§4.5).
2. **The co-owner or owner signs the frozen text.** For a co-owned contract, A0 cannot freeze alone. This follows
   RFC-2026-010 ("These have a co-owner, and A0 cannot promote them alone"). Under RFC-2026-013, an agent run's
   assessment is that role's signature. So A1 signs CTR-TEN-001 and CTR-SEC-001, and A6 signs CTR-AUD-001 and
   CTR-OBS-001. CTR-NTF-001 is A5's contract outright, so A5 signs it as its owner, and A0 still makes the freeze
   (line 138). Each signature names the contract, the head it read, and the target status `Frozen`. A signature on an
   earlier text does not carry to a changed text. That was the reason for `g1-freeze-readiness-2026-10-08.md` §3,
   CTR-SEC-001 row, item (a).
3. **The Product Owner approves.** Register §7.2 item 8 (line 371) reads "Product Owner และ A0 ลงสถานะ `Approved`".
   - The Owner approves each freeze by name (§4.4).
   - A0 transcribes the approval verbatim in a `product-owner-disposition-*` file on `main`, merged before the status
     change or in the same PR.
   - A0's own approval is the change it authors. It approves nothing that a role must verify.

### 3.3 What `Frozen` permits, and what changes after it

- **Consumers.** Register §5.1 (line 190) reads "เขียน implementation ได้". Until the G0 exit closes (§6), however,
  `CONTRIBUTING_AGENTS.md` "Current gate constraint" and register line 373 still bind every agent. The Owner confirmed
  that on 2026-10-08 (disposition §10.3). So one contract's freeze does not on its own let application code start.
- **A breaking change needs an RFC.** Register line 43 says so, and this RFC adds no exception. A0 proposes the
  following definition (Q-031-5):
  - **Breaking:** any change to the set of documents the contract's `schema.json` accepts. That covers both
    narrowing (a valid document becomes invalid) and widening (a document a consumer relies on being rejected becomes
    valid). It also covers any change to a field's meaning, to `owner`, to `consumers`, or to the index's
    `required_before_freeze`. Removing a declared gap without its closing evidence (§5.4) is breaking too.
  - **Not breaking:** a change that leaves the accepted set unchanged. Examples are a description or `x-` annotation,
    an added fixture that confirms existing behaviour, and a declared gap closed by evidence that needs no schema
    change.
  - **C0 classifies each change in writing.** When in doubt, it is breaking.
  - **Versions.** A breaking change approved by RFC is version `2.0.0`, and it goes through this review again as
    `Frozen v2`. A non-breaking change keeps `1.0.0`.
- **Consequence.** A gap that is closed by narrowing the schema (most of the open bounds in
  `g1-freeze-readiness-2026-10-08.md` §2) needs an RFC once the contract is Frozen. A gap closed before the freeze
  needs none. So the bounded-value items should be closed before the freeze wherever their owner can close them.

## 4. The per-contract freeze review

### 4.1 Preconditions

A contract enters its freeze review only when all of these hold on `main`:

1. **It is Candidate.** A Draft contract passes Candidate first, in its own increment:
   - **CTR-SEC-001, CTR-AUD-001 and CTR-OBS-001** need, under RFC-2026-010, the co-owner's promotion signature on the
     current text, and then the Product Owner's disposition. RFC-2026-010's status line still reads "CTR-SEC-001 awaits
     A1; CTR-AUD-001, CTR-OBS-001 and CTR-USG-001 await A6". The open items are recorded in
     `g1-freeze-readiness-2026-10-08.md` §3: A1's promotion signature on SEC, A6's countersignature of the fourteen
     2026-10-07 bound values, and the OBS `implementation_version` bound.
   - **CTR-NTF-001** is outside RFC-2026-010, which calls it "A5's and remains unassessed". It needs an A5 assessment
     and ratification first (`WP-0A-CON-006` `open_blockers[1]`, `[2]`, `[19]`, `[22]`). It then needs a Product Owner
     disposition naming CTR-NTF-001 for Candidate. **This RFC is the rule for that step.** Draft → Candidate needs the
     owner's signature and the Owner's disposition, as RFC-2026-010 required for the other nine.
2. **Every `required_before_freeze` item is present.** This uses RFC-2026-010's method. The owner (and co-owner) say
   in their signature that the artifact is the one the phrase meant. RFC-2026-010's "presence, not sufficiency" limits
   are why this signature is needed.
3. **Every open item is closed or declared.** This covers every open "before freeze" item in the contract's manifest
   (`freeze_boundary`, `untestable_by_fixture`, `untestable_by_schema`, `accepted_gaps`) and in any package's
   `open_blockers` that names the contract. Each is either:
   - closed, with evidence on `main`; or
   - carried as a declared gap under §5.
4. **The `freeze_boundary` is restated.** It must no longer open "Draft only." (`WP-0A-CON-003` `open_blockers[14]`
   (3)). It must say what the frozen contract does and does not settle.
5. **The registry admits `Frozen`.** The change of §7.1 must be merged.
6. **No security finding of any grade is open** from A1 against the contract's current text.

### 4.2 One contract at a time

The Owner's answer of 2026-10-08 reads "freeze ทีละ contract เมื่อ owner เซ็นครบ". In this RFC that means:
- **Each freeze increment changes the status of exactly one contract.** It carries its own role round, its own
  signatures and its own Owner approval.
- **Reviews may run in parallel, but no contract's verdict carries to another.**
- **A contract that composes another** (`composes`, for example CTR-API-001 on CTR-TEN-001 and CTR-ERR-001) may freeze
  before or after the one it composes. If a composed contract changes later, the composing contract is affected by
  that change.

Reading "ทีละ contract" as a per-contract decision, and not as a strict serial order, is A0's reading.

### 4.3 The roles and what each checks

Each role writes its own file under the freeze increment's `evidence/<package>/`. Each file names the contract, the
head it read, and its verdict toward `Frozen`. The verdict values are the ones each role already uses
(`review_approved`, `security_approved`, `test_verified`, `integration_verified`).

| Role | Run | Checks |
|---|---|---|
| Reviewer (compatibility) | C0 `/claude/c0_contract_reviewer` | Each `required_before_freeze` item against the schema and fixtures. The `composes` graph and the references resolve. Every open item of §4.1 (3) is closed with cited evidence or appears as a declared gap that meets §5. The restated `freeze_boundary` is accurate. The compatibility classification of §3.3 for any change since Candidate. |
| Security/Privacy | A1 `/claude/a1_bastion` | Every First-Slice contract, because register §5.1 names "compatibility/security review": tenant binding, secret and content redaction, identifier bounds, and that no declared gap is a security gap the Owner did not accept (§5.5). An A1 finding of any grade blocks the freeze. |
| Tester | Q0 `/claude/q0_sentinel` | `npm run check` green on the head. Every fixture behaves as named. The declared-gap and registry tests of §7.1 bite on this contract (one reversal per new rule, measured). The status move appears in the manifest, the index, the registry pin and the census tests, all in the same commit. |
| Integration Owner | R0 `/claude/r0_steward` | The change lands once, in the package that owns the paths, with each other package's file declared under `amends_without_owning`. CI green on the head that contains current `main`. The co-owner's or owner's signature, and the Owner's approval, are on `main` and name this contract and this text. The consumers named in the index are not broken. |
| Co-owner or owner | A1 (TEN, SEC), A6 (AUD, OBS), A5 (NTF) | Signs the frozen text as co-owner or owner (§3.2 item 2). For TEN and SEC, A1's co-owner signature is a separate statement from its security review in the row above. |

### 4.4 The Owner's approval

After the role files and the signature are on the branch, A0 asks the Owner by name: "freeze CTR-XXX-001 at head
`<sha>`". A0 transcribes the question, the options and the answer verbatim in a `product-owner-disposition-*` file. One
question may list several contracts, but each must be answered by name (Q-031-4).

A freeze PR is tier H under RFC-2026-030 (a contract and a gate). A freeze of a First-Slice contract is part of the
plan the Owner approved (plan §2, row `WP-0A-CON-008`). A0 reads the 2026-10-08 standing direction as covering the
press of such a PR once four roles pass and CI is green. The Owner's approval of the freeze itself is still asked per
contract. That reading is A0's (Q-031-4).

### 4.5 Where the change lands

Each contract's directory belongs to one package, and the index belongs to `WP-0A-CON-001`. A freeze increment is a PR
of the package that owns the contract's directory:
- `WP-0A-CON-001`: TEN, ERR, EVT, JOB and `index.json`.
- `WP-0A-CON-002`: API, PAG, IDM.
- `WP-0A-CON-003`: MOD, FLG.
- `WP-0A-CON-004`: SEC, AUD, OBS.
- `WP-0A-CON-006`: NTF.

The PR declares the other packages' files it must move under `amends_without_owning`:
- the index (`WP-0A-CON-001`);
- the registry pin (`WP-0A-CON-008`);
- the census assertions in `shared-kernel-contract-catalog.test.mjs` (`WP-0A-CON-001`),
  `shared-kernel-envelope-contracts.test.mjs` (`WP-0A-CON-002`) and `ctr-job-001-reference-hardening.test.mjs`
  (`WP-0A-CON-005`);
- the regenerated integrity manifest.

All of these move in one commit, as on 2026-09-02. A new package whose `writable_paths` span the catalog would avoid
the cross-package amendments. Registering one is A0's choice and is not made here.

## 5. Declared gaps (the Owner's answer of 2026-10-09)

### 5.1 The rule

The Owner chose `ได้ ถ้าประกาศครบ (Recommended)`: "Frozen ได้เมื่อช่องว่างทุกข้อระบุเจ้าของ และ gate ที่ต้องปิดก่อน (เช่นระยะเก็บ
audit ต้องปิดก่อนใช้ข้อมูลลูกค้าจริง) และการเปลี่ยนแบบ breaking ต้องทำ RFC". So:

1. A contract may be Frozen with open gaps.
2. This holds only if **every** gap is declared in its manifest, each with an **owner** and the **gate that must close
   it**.
3. A breaking change after Frozen needs an RFC (§3.3).

A gap that is not declared blocks the freeze.

### 5.2 Where a gap is declared: a new manifest field, `declared_gaps`

None of the existing fields can hold an owner and a gate:
- **`accepted_gaps`** is a map keyed by a fixture file. `shared-kernel-schema-conformance.test.mjs` ("a fixture the
  contract knowingly accepts is declared as a gap") requires every key to be a listed `accepted-gap-*` fixture that the
  schema accepts. It fits one kind of gap only: a document the schema accepts but should not.
- **`untestable_by_fixture` and `untestable_by_schema`** are prose strings, and their text is pinned by digest. They
  have no owner and no gate.
- **`.agents/work-package.schema.json`** constrains work packages, not contract manifests. A package's `open_blockers`
  are free text with no gate field, and they sit in a different file from the contract they describe.
- **Contract manifests have no JSON Schema of their own.** Their key set is `MANIFEST_KEYS` in
  `test-kits/contracts/catalog-registry.test.mjs`, which rejects an undeclared key.

A0 proposes one new key, `declared_gaps` (Q-031-2). It is an array. Each entry is an object with exactly these keys:

| Key | Value |
|---|---|
| `id` | `<XXX>-GAP-<nn>`, where `<XXX>` is the contract's three letters, e.g. `AUD-GAP-01`. Unique in the manifest. Never reused. |
| `kind` | One of `runtime` (behaviour a fixture cannot show), `schema` (a rule JSON Schema cannot express), `accepted-fixture` (an `accepted_gaps` entry), `decision` (a value or policy owed by someone outside the contract owner, e.g. a retention period) |
| `gap` | What is unresolved, in at least 80 characters. The existing `accepted_gaps` reason test sets that floor. |
| `owner` | Who closes it, from a closed list: `A0`, `A1`, `A2`, `A3`, `A4`, `A5`, `A6`, `Product Owner`, `Legal/PDPA adviser`, `Accountant`. Never empty. |
| `closes_before` | The gate it must be closed before, from a closed list: `G1`, `G2`, `G3`, `G4`, `G5`, `G6`, `production-customer-data` |
| `source` | Where the gap is recorded: a manifest field name (`untestable_by_fixture`, `untestable_by_schema`, `freeze_boundary`), an `accepted_gaps` key, or `WP-…:open_blockers[n]` |

**Coverage rule at Frozen.** These are checked mechanically (§7.1):
- every `accepted_gaps` key is the `source` of at least one declared gap;
- `untestable_by_fixture` and `untestable_by_schema`, where present, are each the `source` of at least one declared
  gap.

The items inside `freeze_boundary` and in packages' `open_blockers` are matched by C0 reading them (§4.3). No script
can split prose into items.

### 5.3 The audit retention period

The Owner's own example is the audit-log retention period ("ระยะเก็บ audit ต้องปิดก่อนใช้ข้อมูลลูกค้าจริง"). On
`main` it is `WP-0A-CON-004` `open_blockers[9]` (legal). At the CTR-AUD-001 freeze it is declared with:
- `kind: "decision"`;
- `owner: "Legal/PDPA adviser"`;
- `closes_before: "production-customer-data"`.

That gate is the binding constraint the Owner accepted with D0: "ห้าม production customer data จนกว่าข้อ legal/PDPA จะผ่าน"
(2026-10-08 disposition §2.1 and §4.1; register OPEN-002, line 111). Plan §6 binds the legal/PDPA adviser to G2. The
gap is bound to the data condition itself, not to a gate number, so it stays bound even if that gate moves. A6, the
contract's co-owner, puts the value into the contract once the adviser gives it. That is a breaking change if it
narrows the schema (§3.3).

### 5.4 What a gate binding does

- **A gap with `closes_before: "Gn"` blocks the exit of gate Gn.** The record of that gate's exit lists every declared
  gap bound to it, with the evidence that closed it.
- **A gap with `closes_before: "production-customer-data"`** means no production customer data may pass through any
  path the contract governs until the gap is closed.
- **Closing a gap** removes its entry and cites the closing evidence in the same commit. If closing it changes the
  schema's accepted set, it is a breaking change and needs an RFC (§3.3).

### 5.5 What may not be declared

The Owner's answer allows "ช่องว่างทุกข้อ" to be declared. A0 proposes three narrower limits (Q-031-3):
1. A missing `required_before_freeze` item cannot be declared. The register makes those items the minimum artifact,
   and the column is headed "Artifact ขั้นต่ำก่อน Freeze".
2. An open A1 finding of any grade against the contract text cannot be declared. It is closed, or A1 grades it no
   longer a finding.
3. A gap in tenant isolation (a document that could cross a tenant boundary) cannot be declared.
   `CONTRIBUTING_AGENTS.md` lists tenant isolation among the "Non-negotiable security and data rules".

## 6. When the G0 exit closes

The G0 exit decided on 2026-10-08 (D0) is **conditional**. It closes when **both** of these hold:

1. **All thirteen contracts of §2 read `"status": "Frozen"` on `main`.** Disposition §10.1: "G0 exit ปิดเมื่อชุด First
   Slice ครบ".
2. **A PR amending `CONTRIBUTING_AGENTS.md` "Current gate constraint" is merged.** Disposition §10.3: the constraint
   binds "จนกว่า contract ชุด First Slice จะ freeze ครบและมี PR แก้ CONTRIBUTING". A0 reads "มี PR" ("a PR exists") as
   **merged**. A PR that is open but unmerged changes nothing an agent reads, so A0 takes the stricter reading.
   `CONTRIBUTING_AGENTS.md` belongs to `WP-0A-A0-001`. The 2026-10-08 disposition §6 lists what the amendment must say.

**One more condition, A0's reading (Q-031-1).** Register §7.2 item 2 has a first clause: "Shared contracts เป็นอย่างน้อย
`Candidate v1`". CTR-USG-001 is a shared contract and is Draft. The Owner's answer of 2026-10-08 says §7.2 (2) is not
waived. A0 therefore reads CTR-USG-001 as needing Candidate before the exit closes: A6's signature and a Product Owner
disposition under RFC-2026-010. Q-031-1 asks the Owner to confirm or to waive it. Neither answer moves USG into the
First Slice.

**What this RFC does not decide about the exit.** Register §7.2 items 1 and 3 to 8, other than item 2 and item 8 as it
applies to the freezes, were recorded as not checked (2026-10-08 disposition §4.2). Item 6 (wireframes) stays A0's
reading there. This RFC does not decide how any of them reads against the conditional exit.

**Wording.** When both conditions hold, the closing record (a `WP-0A-A0-010` or `WP-0A-A0-001` increment that updates
`evidence/g0-tracker-th.md` G0-024) says "G0 exit: closed". It never says "G0 passed", the wording the 2026-10-08
disposition §4.1 and §10.3 forbid. It lists the thirteen freezes with their merge commits.

## 7. The test and registry change that admits `Frozen`

This section specifies the change. It does not implement it, and this PR changes no test.

### 7.1 One preparatory PR, owned by `WP-0A-CON-008`, before the first freeze

`WP-0A-CON-008` owns `test-kits/contracts/catalog-registry.test.mjs` and `test-kits/ratchets-bite.test.mjs`. The PR is
tier H, because it changes a ratchet. It changes no contract.

1. **`catalog-registry.test.mjs`.**
   - `FREEZE_LEVELS` becomes `['Draft', 'Candidate', 'Frozen']`. The per-contract pin is unchanged, so a status still
     moves only by a pinned edit.
   - `MANIFEST_KEYS` gains `declared_gaps`.
   - A new test, "a declared gap names its owner and the gate that closes it":
     - every `declared_gaps` entry has exactly the keys of §5.2, an `id` matching the contract and unique;
     - `owner` and `closes_before` come from the closed lists;
     - `gap` is at least 80 characters;
     - `source` resolves (a manifest field that is present, an `accepted_gaps` key, or a `WP-…:open_blockers[n]` that
       exists).
   - A new pin, `DECLARED_GAP_DIGESTS`. It works like `ACCEPTED_GAP_DIGESTS`, in both directions, so that a gap cannot
     be dropped or reworded without a reviewed edit.
   - A new test, "a Frozen contract declares every gap and no longer reads Draft only". When `status` is `Frozen`:
     - `declared_gaps` is present;
     - the coverage rule of §5.2 holds;
     - `freeze_boundary` does not begin "Draft only.";
     - the index entry is `Frozen` too.
   - A `Draft` contract cannot be pinned `Frozen` without a pinned `Candidate` step before it. The pin history is
     reviewed, not computed, so this is stated in the test's comment, not measured.
2. **`ratchets-bite.test.mjs`.**
   - Two reversals set `status = 'Frozen'`: "promoted out of its freeze level", and the catalog reversal "a Candidate
     contract promoted to a level the register does not define". Once one contract is Frozen, the first is a no-op for
     that contract. This is the trap that file already names: a reversal "aimed at something that was not a change".
     Both reversals change to a value outside the vocabulary, for example `'Released'`.
   - New reversals, each measured: a declared gap's `owner` emptied; its `closes_before` set outside the list; one
     gap deleted.
3. **`scripts/test-suite-contract.mjs`** (owned by `WP-0A-A0-002`). The test-count floors and the name digest for the
   new tests are declared as an amendment of that path.

### 7.2 Per freeze, in the freeze increment (§4.5)

- **`shared-kernel-contract-catalog.test.mjs` (`WP-0A-CON-001`).** It asserts `status: 'Candidate'` for TEN, ERR, EVT
  and JOB (lines 66 and 80) and asserts exactly five Draft contracts (line 71). The assertions become "Candidate or
  Frozen, as pinned", and the Draft count moves when a Draft contract is promoted.
- **`shared-kernel-envelope-contracts.test.mjs` (`WP-0A-CON-002`).** It asserts `status: 'Candidate'` for the envelope
  contracts (line 122) and nine Candidates in the index (line 147).
- **`ctr-job-001-reference-hardening.test.mjs` (`WP-0A-CON-005`).** It asserts Candidate for CTR-JOB-001 (lines 150 and
  153).
- **`index.json`.** Its `freeze_boundary` reads "It does not change Candidate/Draft status or freeze any contract". It is
  restated when the first contract freezes.

## 8. Order (not binding)

1. This RFC, approved and merged.
2. The §7.1 preparatory PR (`WP-0A-CON-008`).
3. The closing increments per package. These are the items of `g1-freeze-readiness-2026-10-08.md` §2 and §3. Each
   package closes what it owns, or prepares it as a declared gap.
4. Draft → Candidate for SEC, AUD and OBS (RFC-2026-010), and for NTF (§4.1).
5. The freeze increments, one contract each (§4).
6. The `CONTRIBUTING_AGENTS.md` amendment (`WP-0A-A0-001`).
7. The closing record of the G0 exit (§6).

## 9. What this RFC does not change

- **No contract status, schema, fixture, owner or version.** `contract-catalog/` is untouched by this PR.
- **The Decision Register.** `docs/**` is read-only to every package. The register's owner transcribes §2, §3 and §6
  into §5.1, §5.2 and §7.2, by RFC or an Owner-approved edit (2026-10-08 disposition §6).
- **RFC-2026-010, RFC-2026-013, RFC-2026-025 and RFC-2026-030.** Each is cited and none is amended. In particular,
  this RFC grants no exception to RFC-2026-025 §5 item 6 beyond the Owner's standing direction already transcribed in
  the 2026-10-08 disposition §10.2.
- **`CONTRIBUTING_AGENTS.md`.** Its "Current gate constraint" binds unchanged until §6 holds.
- **Any co-owner's signature.** This RFC signs nothing for A1, A5 or A6. It does not decide whether the 2026-09-02
  signatures on SEC, AUD or OBS survive the 2026-10-07 changes (`g1-freeze-readiness-2026-10-08.md` §3).
- **G0.** It does not say G0 passed. It does not close the G0 exit. It waives no item of register §7.2.

## 10. Questions for the Owner

Each question carries A0's recommendation. The Owner's answers are recorded on this branch before the merge.

- **Q-031-1.** Approve this text, including the CTR-USG-001 reading of §6 (Candidate before the exit closes)? A0
  recommends yes. Waiving §7.2 (2)'s first clause for USG would be a further gate change.
- **Q-031-2.** Record declared gaps in a new manifest key, `declared_gaps`, with the shape and closed lists of §5.2? A0
  recommends yes. No existing field can hold an owner and a gate (§5.2).
- **Q-031-3.** Keep three kinds of gap undeclarable (§5.5): a missing `required_before_freeze` item, an open A1 finding,
  and a tenant-isolation gap? A0 recommends yes. These limits are narrower than "ช่องว่างทุกข้อ", so they need the
  Owner's word.
- **Q-031-4.** Approve each freeze by name (one question may list several contracts, each answered by name)? And may
  A0 press a freeze PR under the standing direction of 2026-10-08 once its four roles, its signature and his approval
  are on the branch (§4.4)? A0 recommends yes to both.
- **Q-031-5.** Use the breaking-change definition and version rule of §3.3? A0 recommends yes.

**Order before the merge.**
1. A0 puts Q-031-1 to Q-031-5 to the Owner.
2. A0 transcribes the answers in a disposition on this branch and updates the status line above.
3. The roles re-read that commit (RFC-2026-025 §5 item 2).
4. A0 presses the PR under the 2026-10-08 standing direction, on a green head that contains current `main`.

Until then the status stays `Proposed`, and nothing in §2 to §7 binds beyond what the Owner's own answers of
2026-10-08 and 2026-10-09 already decide.

**The Owner's answers (appended 2026-10-09).** Asked at `2026-10-09T04:52:30Z` and answered at `2026-10-09T04:52:46Z`;
the questions, options and answers are transcribed verbatim in
`evidence/WP-0A-CON-008/product-owner-disposition-2026-10-09-first-slice-freeze-and-records.md` §8. The questions above
are kept as written.

- **Q-031-1:** `อนุมัติ รวม USG (Recommended)`. The text is approved, with the CTR-USG-001 reading of §6.
- **Q-031-2 and Q-031-5** (asked as one question): `รับทั้งสองข้อ (Recommended)`.
- **Q-031-3:** `รับทั้ง 3 ข้อ (Recommended)`.
- **Q-031-4:** `ได้ ทั้งสอง + กด #229 (Recommended)`. Freezes are approved by name, per contract. A0 presses a freeze PR
  under §4.4 once its four roles, the co-owner signature and the Owner's approval are on the branch, and presses PR
  #229 once its four roles pass. For PR #229 and for freeze PRs under §4.4 this is an exception to RFC-2026-025 §5
  item 6. It does not amend that rule.

Step 2 of "Order before the merge" is done by that disposition and this status line. Steps 3 and 4 remain.
