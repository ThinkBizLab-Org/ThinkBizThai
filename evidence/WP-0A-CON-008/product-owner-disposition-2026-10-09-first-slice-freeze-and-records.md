# Product Owner disposition, 2026-10-09, in session: the First-Slice set, declared gaps, and two record questions (A0-004, A0-005)

Transcribed by a subagent of `/claude/a0_atlas` (A0), the Author, at A0's direction. The Owner's words, the questions
and their options are verbatim. A0's messages that the Owner answered are verbatim too. This file records the Owner's
decisions. It is not a role signature. It moves no package's status and no contract's status.

- **Source.** Session `3ecec68b`, 2026-10-09; the times are UTC.
- **How it was checked.** A0 relayed the answers to this run. This run checked every quoted string against the session
  transcript (`~/.claude/projects/-Users-bank-ThinkBizThai/3ecec68b-e4f6-4050-80ff-05c0b0b1e6a8.jsonl`, outside the
  repository, not committed). It quotes the transcript, not the relay.
- **Why it is filed under `WP-0A-CON-008`.** That package owns the freeze-readiness record and `open_blockers[6]` (the
  gate-rule question). Its PR also adds RFC-2026-031, which §4 decides the content of.
- **The two record answers (§3).** They concern `WP-0A-A0-004` and `WP-0A-A0-005`. They are transcribed here so that
  each sits on `main` in an Owner disposition merged through the full path, as RFC-2026-025 §6.2 item 1 requires
  before a later records PR quotes them. This file does not edit either package.

## 1. Order of events

| Time (UTC) | Who | What |
|---|---|---|
| `2026-10-09T03:36:25Z` | A0 | Lists three groups of work and recommends an order (§2) |
| `2026-10-09T04:25:04Z` | Owner | `เอาตามคุณแนะนำ` (§2) |
| `2026-10-09T04:25:16Z` | A0 | Asks the A0-004 and A0-005 questions (§3) |
| `2026-10-09T04:28:37Z` | Owner | Answers both (§3) |
| `2026-10-09T04:32:45Z` | A0 | Reports the freeze survey and asks the First-Slice and gap questions (§4) |
| `2026-10-09T04:33:16Z` | A0 | The question call itself (§4) |
| `2026-10-09T04:33:21Z` | Owner | Answers both (§4) |
| `2026-10-09T04:34:20Z` | A0 | Says what it will draft, and who presses each PR (§5) |
| `2026-10-09T04:35:52Z` | Owner | `ลุยต่อ` (§5) |

**Correction to the brief this run was given.** The brief placed `เอาตามคุณแนะนำ` after the four answers, as the Owner's
reply to a recommendation to start the freeze work. The transcript shows it came first, at `04:25:04Z`. It answered
A0's message of `03:36:25Z`, which is quoted in §2. This record follows the transcript.

## 2. The Owner's `เอาตามคุณแนะนำ`, and what it answered

A0's message of `03:36:25Z`, verbatim (Thai):

> ต่อจากนี้มีงาน 3 กลุ่ม เรียงตามว่าอะไรขวางมากที่สุด
>
> **1. ต้องให้คุณตัดสิน (ขวาง A0-004 และค้ำ A0-005)**
> - **A0-004 / #212:** #212 ถูกกด merge ขณะที่ A1-R1 (finding ด้านความปลอดภัยระดับ LOW) ยังเปิดอยู่ และคำสั่งให้กดมาก่อน PR ถูกสร้าง ทางเลือกคือ
>   - (ก) คุณรับรองการกดย้อนหลัง แล้วให้ A1 ปิด A1-R1 (แก้ประโยคใน RFC-2026-007 ซึ่งเป็น PR governance) จากนั้นจึงบันทึก
>   - (ข) บันทึกตามจริงว่าเป็นการละเมิด §5 ข้อ 6 และให้ A0-004 ค้างสถานะ `in_review` ต่อไปจนกว่าจะแก้ครบ
> - **A0-005 / #190:** คำว่า `คุณทำเลย` ของคุณเมื่อ 6 ต.ค. ครอบคลุมการกด merge #190 ด้วยหรือไม่ ถ้าใช่ บันทึกที่ merge ไปแล้วถือว่าถูก ถ้าไม่ การตัดสินของ R0 จะเป็นโมฆะ และต้องถอยสถานะกลับ
>
> **2. งานบันทึกที่ผมทำต่อได้เลย ไม่ต้องรอคุณ**
> - บันทึกหลัง merge ของ #221–#227 ตามถ้อยคำที่ R0 ให้มา (แยก PR ละ package รวม 6 ตัว)
> - หมายเหตุ `required_human_authorities[1]` ของ A0-008 และการปิด `open_blockers[5]` ของ A0-005
> - ถ้อยคำของ C0, A1 และ Q0 สำหรับ #211 ซึ่งต้องปักแหล่งอ้างอิงไว้ที่ระดับ commit ก่อน
>
> **3. งานหลักของแผน G1/G2 ซึ่งสำคัญกว่างานบันทึก**
> - G0 exit ยังมีเงื่อนไขค้าง: ต้อง freeze contract ชุด First Slice และแก้ `CONTRIBUTING_AGENTS.md` ก่อน จึงจะเริ่มเขียนโค้ดแอปได้
> - R-17 และ PR ที่แก้ `CONTRIBUTING_AGENTS.md` ตาม RFC-030 §7 เป็น PR governance
>
> **ผมแนะนำ:** ให้คุณตัดสินข้อ 1 สองเรื่องก่อน ระหว่างนั้นผมเริ่มงานกลุ่ม 3 คือการ freeze contract ชุด First Slice ซึ่งเป็นงานที่ขวางการเริ่ม G1 จริง ส่วนกลุ่ม 2 ค่อยทำทีหลัง เพราะเป็นแค่บันทึกต่อเนื่อง ไม่ได้ขวางอะไร
>
> จะให้ไปทางไหนดีครับ

The Owner, `04:25:04Z`:

> เอาตามคุณแนะนำ

**What it decides.** It accepts A0's recommendation, quoted as written:
"ให้คุณตัดสินข้อ 1 สองเรื่องก่อน ระหว่างนั้นผมเริ่มงานกลุ่ม 3 คือการ freeze contract ชุด First Slice ซึ่งเป็นงานที่ขวางการเริ่ม G1 จริง ส่วนกลุ่ม 2 ค่อยทำทีหลัง". So:
- A0 asks the two item-1 questions (§3);
- A0 starts the First-Slice freeze work (§4, RFC-2026-031);
- the group-2 records follow later.

**What it does not decide.** It chooses no option of item 1. A0 put those as separate questions twelve seconds later
(`04:25:16Z`), and the Owner answered them there (§3). It names no PR. It gives no merge direction.

A0 acknowledged at `04:25:11Z`:

> รับทราบครับ จะเริ่มงาน freeze contract ชุด First Slice ไปพร้อมกับขอคำตัดสินสองเรื่องจากคุณ

## 3. The two record questions (A0-004, A0-005)

Asked `2026-10-09T04:25:16Z`, answered `2026-10-09T04:28:37Z`, in one call.

### 3.1 A0-004 and PR #212

**Question** (header `A0-004`, single choice):

> A0-004 / PR #212 ถูกกด merge ตอนที่ A1-R1 (LOW) ยังเปิดอยู่ และคำสั่งให้กดมาก่อน PR ถูกสร้าง จะให้จัดการอย่างไร?

Options, as shown:

- `บันทึกตามจริง ค้างไว้ (Recommended)`: "บันทึกว่าเป็นการละเมิด §5 ข้อ 6 (กลุ่มเดียวกับ R19) A0-004 ยังเป็น in_review จนกว่า A1-R1 จะปิดผ่าน PR governance ที่แก้ประโยคใน RFC-2026-007"
- `รับรองย้อนหลัง`: "คุณรับรองการกด #212 ย้อนหลัง ให้ A1 ปิด A1-R1 ผ่าน PR governance แล้วจึงบันทึก integration_verified"

**The Owner chose `บันทึกตามจริง ค้างไว้ (Recommended)`.**

What it decides, in the option's words:
- The press of PR #212 is recorded as a breach of RFC-2026-025 §5 item 6, in the same class as R19.
- `WP-0A-A0-004` stays `in_review` until A1-R1 is closed.
- A1-R1 is closed through a governance PR that corrects the sentence in RFC-2026-007.

The sources on `main`:
- **A1-R1 (LOW)** is `evidence/WP-0A-A0-004/a1-recheck-2026-10-07.md` (the "New" table and "A1-R1 (LOW) — §C's 'never at
  column 0' is not true for `\r`"). The sentence it names is in RFC-2026-007, Amendment 2026-10-08 §C.
- **R19** is R0's finding that PR #204 was pressed before two re-checks existed. A1 discusses it in
  `evidence/WP-0A-A0-002/a1-recheck-2026-10-09.md` §2.4, and R0 in `evidence/WP-0A-A0-002/r0-ruling-2026-10-09.md`.
- **PR #212** was opened `2026-10-08T06:42:35Z` and merged `2026-10-08T09:10:45Z` as `9de0483e` (`gh pr view 212`).

What it does not do:
- It does not ratify the press. The other option, `รับรองย้อนหลัง`, was not chosen.
- It does not edit `work-packages/WP-0A-A0-004.json`. That package's own records PR cites this section.
- It does not write the governance PR that closes A1-R1. Whether that PR falls inside the Owner's 2026-10-08 standing
  direction is not decided here.

### 3.2 A0-005 and PR #190

**Question** (header `A0-005`, single choice):

> คำว่า `คุณทำเลย` (6 ต.ค.) ครอบคลุมการกด merge PR #190 (A0-005 cardholder-data scan) ด้วยหรือไม่?

Options, as shown:

- `ครอบคลุม #190 (Recommended)`: "บันทึก A0-005 ที่ merge ไปแล้ว (#224) ถือว่าถูก จะบันทึกคำยืนยันนี้เป็น Owner disposition"
- `ไม่ครอบคลุม`: "การตัดสินของ R0 เป็นโมฆะ ต้องถอย A0-005 กลับเป็น in_review ผ่าน PR แบบ full path"

**The Owner chose `ครอบคลุม #190 (Recommended)`.**

What it decides:
- The Owner's `คุณทำเลย` of 2026-10-06 covered the press of PR #190 (`WP-0A-A0-005`, merged `2026-10-06T11:43:05Z` as
  `5debf570`).
- The record merged as PR #224 (`c5c8155c`, `WP-0A-A0-005` `integration_verified`) stands as correct.

This is the Owner confirmation that two files on `main` named as owed or as a residual risk:
- `evidence/WP-0A-A0-005/r0-ruling-2026-10-09.md` §3, condition 5;
- `evidence/WP-0A-A0-005/a1-review-2026-10-09-pr224.md`, its "Residual risk stated" bullet.

What it does not do:
- It does not edit `WP-0A-A0-005`.
- It does not widen `คุณทำเลย` to any PR other than #190.

## 4. The First-Slice set and the declared-gap policy

### 4.1 What the Owner had in front of him

A0's message of `04:32:45Z`, verbatim (Thai):

> สำรวจเสร็จแล้ว ตอนนี้ยังไม่มี contract ตัวไหน **Frozen** เลย ทั้ง 14 ตัวเป็น Candidate 9 ตัว และ Draft 5 ตัว มีปัญหาโครงสร้าง 3 ข้อที่ต้องแก้ก่อนจะ freeze ได้:
>
> 1. **ยังไม่มี RFC กำหนดกติกา freeze:** ไม่มีที่ไหนบน main ระบุว่าชุด First Slice มี contract อะไรบ้าง ขั้นตอนตรวจก่อน freeze เป็นอย่างไร ใครต้องเซ็น และช่องว่างแบบไหนยอมให้ประกาศค้างไว้ได้ตอน freeze
> 2. **เทสต์ล็อกไว้ไม่ให้มีสถานะ Frozen:** `catalog-registry.test.mjs` อนุญาตแค่ `Draft` กับ `Candidate` ต้องแก้ไปพร้อมกับ RFC
> 3. **งานค้างก่อน freeze ประมาณ 20 รายการ:** เช่น A6 เซ็นค่า bound ของ AUD/OBS, bound ของ TEN/JOB/MOD, ให้ A5 รับรอง NTF และปิดหรือยอมรับช่องว่างของ API/MOD/FLG งานพวกนี้ agent ทำได้เกือบทั้งหมด
>
> **ส่วนที่ต้องใช้คุณ:**
> - เลือกชุด First Slice (คำถามด้านล่าง)
> - ทำ disposition ตาม RFC-2026-010 เพื่อเลื่อน SEC, AUD, OBS และ NTF จาก Draft เป็น Candidate
> - อนุมัติการ freeze แต่ละตัว
> - กด merge (หรือมอบให้ผมกด) PR ที่แก้ `CONTRIBUTING_AGENTS.md`
>
> **ภายนอก:** มีแค่ระยะเวลาเก็บ audit log ที่ต้องรอที่ปรึกษา PDPA ซึ่ง freeze ไปก่อนได้ถ้าประกาศเป็นช่องว่างไว้
>
> **ลำดับที่ผมเสนอ:**
> 1. ร่าง **RFC-2026-031 (กติกา freeze และชุด First Slice)** อยู่ในแผนที่คุณอนุมัติไว้แล้ว ผมจึงกดเองได้หลัง 4 role ผ่าน
> 2. คู่ขนานกันไป: PR แก้ `CONTRIBUTING_AGENTS.md` ตาม RFC-030 §7 ซึ่งไม่ต้องรอ freeze และทำให้เริ่มใช้ tier M/L ได้ ทำให้ PR ต่อจากนี้เร็วขึ้น
> 3. ทำงานแต่ละ package (CON-004, CON-003, CON-001, CON-002 และ A5 สำหรับ NTF) แล้ว Draft→Candidate, ตรวจก่อน freeze แล้ว Frozen ทีละตัว และสุดท้ายแก้ "Current gate constraint" ใน `CONTRIBUTING_AGENTS.md`
>
> ต้องการคำตอบจากคุณก่อนผมร่าง RFC:

The questions followed at `2026-10-09T04:33:16Z`, in one call, and were answered at `2026-10-09T04:33:21Z`.

### 4.2 Q1: which contracts make up the First Slice

**Question** (header `First Slice`, single choice):

> ชุด contract ของ First Slice ที่ต้อง freeze ให้ครบก่อนปิด G0 exit ควรเป็นชุดไหน?

Options, as shown:

- `12 ตัว + PAG (Recommended)`: "TEN, ERR, API, IDM, EVT, JOB, MOD, FLG, SEC, AUD, OBS, NTF ตามแผน §2 และเพิ่ม PAG ตามที่ g0-tracker ระบุไว้ เพราะหน้าจอแรกต้องใช้ pagination และ PAG ก็เป็น Candidate อยู่แล้ว"
- `12 ตัวตามแผน`: "เฉพาะ 12 ตัวที่แผน §2 และ CON-008 ระบุ ไม่รวม PAG"
- `ชุดเล็กที่สุด`: "เฉพาะ 9 ตัวที่เป็น Candidate อยู่แล้ว (ไม่รวม SEC, AUD, OBS, NTF) เร็วกว่า แต่หน้าที่ security/audit/notification จะยังเขียน implementation ไม่ได้"

**The Owner chose `12 ตัว + PAG (Recommended)`.**

What it decides: the First-Slice set is thirteen contracts, CTR-TEN-001, CTR-ERR-001, CTR-API-001, CTR-IDM-001,
CTR-EVT-001, CTR-JOB-001, CTR-MOD-001, CTR-FLG-001, CTR-SEC-001, CTR-AUD-001, CTR-OBS-001, CTR-NTF-001 and CTR-PAG-001.
This answers what the 2026-10-08 disposition §10.1 left open ("It does not say which contracts make up the First-Slice
set"). RFC-2026-031 §2 records it.

What it does not decide:
- It freezes nothing, and it signs nothing for A1, A5 or A6.
- It does not decide CTR-USG-001. That contract is not in the set. RFC-2026-031 §6 asks the Owner (Q-031-1) about
  register §7.2 (2)'s first clause, "Shared contracts เป็นอย่างน้อย `Candidate v1`", which USG, a Draft, does not meet.
- It does not decide the domain contracts of register §11.1. The Owner was not asked about them.

### 4.3 Q2: may a contract freeze with gaps declared

**Question** (header `Gap policy`, single choice):

> ช่องว่างที่ทดสอบด้วย fixture ไม่ได้ (พฤติกรรม runtime) และระยะเก็บ audit log ที่รอ PDPA จะให้ freeze ได้แบบประกาศเป็นช่องว่างได้ไหม?

Options, as shown:

- `ได้ ถ้าประกาศครบ (Recommended)`: "Frozen ได้เมื่อช่องว่างทุกข้อระบุเจ้าของ และ gate ที่ต้องปิดก่อน (เช่นระยะเก็บ audit ต้องปิดก่อนใช้ข้อมูลลูกค้าจริง) และการเปลี่ยนแบบ breaking ต้องทำ RFC"
- `ไม่ได้ ต้องปิดหมด`: "freeze ได้เมื่อปิดทุกข้อแล้วเท่านั้น ซึ่งจะต้องรอที่ปรึกษา PDPA และ G1 จะเริ่มช้าออกไปมาก"

**The Owner chose `ได้ ถ้าประกาศครบ (Recommended)`.**

What it decides, in the option's words:
- A contract may be Frozen while gaps stay open, but only when every gap names its owner and the gate that must close
  it.
- The audit retention period is an example: it must close before real customer data is used.
- A breaking change needs an RFC.

RFC-2026-031 §5 records it.

What it does not decide:
- Where or in what shape a gap is declared. RFC-2026-031 §5.2 proposes `declared_gaps` (Q-031-2).
- Whether any narrower limit applies. RFC-2026-031 §5.5 proposes three (Q-031-3).
- The retention period itself, which stays with legal/PDPA.
- Which gaps any contract will carry.

## 5. What A0 said it would do next, and the Owner's `ลุยต่อ`

A0's message of `04:34:20Z`, verbatim (Thai):

> รับคำตอบแล้ว และบันทึกไว้ใน memory ชุด First Slice มี 13 ตัว (12 ตัวตามแผนบวก PAG) และ freeze ได้โดยประกาศช่องว่างไว้ ถ้าระบุเจ้าของกับ gate ที่ต้องปิดก่อนครบทุกข้อ
>
> ตอนนี้กำลังร่าง 2 PR พร้อมกัน ทั้งคู่เป็น PR governance:
>
> 1. **RFC-2026-031 (กติกา freeze):**
>    - กำหนดชุด 13 ตัว ความหมายของ Frozen ขั้นตอนตรวจก่อน freeze และนโยบายประกาศช่องว่าง
>    - ระบุจุดที่ต้องแก้เทสต์ให้ยอมรับสถานะ Frozen
>    - มี Owner disposition บันทึกคำตอบทั้ง 4 ข้อของคุณวันนี้แบบตรงตัว (รวมเรื่อง A0-004 และ A0-005)
>    - อยู่ในอำนาจถาวร §10.2 ที่ระบุถึง "RFC เรื่อง freeze ที่จะตามมา" ไว้ ผมจึงกดเองได้หลัง 4 role ผ่าน
> 2. **แก้ `CONTRIBUTING_AGENTS.md` ตาม RFC-030 §7:**
>    - แทน 3 ข้อความตาม RFC-030 แบบตรงตัว และเพิ่มการอ้าง RFC-025 §6
>    - ไม่แตะ "Current gate constraint" ซึ่งต้องรอหลัง freeze
>    - ผมจะถามคุณก่อนกด merge เพราะไม่แน่ใจว่าอยู่ในอำนาจที่มอบไว้หรือไม่
>
> ร่างเสร็จแล้วจะเรียก 4 role ตรวจตามขั้นตอน

The Owner, `04:35:52Z`:

> ลุยต่อ

**What it does not do.**
- `ลุยต่อ` ("carry on") names no PR.
- It gives no merge direction beyond what was already on `main`.
- A0's statement that it may press the RFC-2026-031 PR rests on the Owner's 2026-10-08 standing direction, not on these
  words. That direction is `ให้ A0 กดทุกตัวในแผน (Recommended)`, to a question naming "RFC เรื่อง freeze ที่จะตามมา"
  (`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-08-g0-exit-and-g1-decisions.md` §10.2).
- A0's statement that it will ask the Owner before pressing the `CONTRIBUTING_AGENTS.md` PR is recorded as A0's
  undertaking.

## 6. Who presses the PR that carries this file

This file travels with RFC-2026-031 in one governance PR (RFC-2026-025 §5 item 6). The question behind the 2026-10-08
standing direction named the freeze RFC as one "ที่จะตามมา" (to follow). It was asked before this PR existed.
RFC-2026-025 §5 item 6 requires a delegation to be "given after the PR it names exists, or [to] name its sequence
explicitly".

A0 reads "RFC เรื่อง freeze ที่จะตามมา", in a list of the plan's governance PRs, as naming this PR's sequence. That reading
is A0's. Whether it meets §5 item 6 is for A1 and R0 to say on their review.

The record answers of §3 ride in the same PR. They are not a new governance subject. They transcribe answers to
questions the Owner was asked.

## 7. What this file is not

- Not a freeze, a promotion or a status change of any contract.
- Not an edit of `WP-0A-A0-004`, `WP-0A-A0-005`, the Decision Register, `CONTRIBUTING_AGENTS.md` or any RFC other than
  the new RFC-2026-031, which the same PR adds.
- Not a statement that G0 passed. The G0 exit stays "decided, conditional" (2026-10-08 disposition §4.1). RFC-2026-031
  §6 states when it closes.
- Not record-only under RFC-2026-025 §6. It is an Owner disposition, and it takes the full path.

## 8. RFC-2026-031 §10: the Owner's answers (appended 2026-10-09)

Appended by a subagent of `/claude/a0_atlas` (A0) at A0's direction, after §1 to §7 were committed at `d0c92447`.
Sections 1 to 7 above are unchanged. As there, A0 relayed the questions and answers to this run, and this run checked
every quoted string against the same session transcript (outside the repository, not committed). It quotes the
transcript, not the relay.

### 8.1 Context: PR #228, asked first

At `2026-10-09T04:45:47Z` A0 asked the Owner (header `PR #228`, single choice) who presses PR #228 (`WP-0A-A0-001`,
the `CONTRIBUTING_AGENTS.md` amendment under RFC-2026-030 §7). The Owner answered at `2026-10-09T04:46:03Z`:

> ให้ A0 กด #228 (Recommended)

That question, its options and the answer are transcribed in
`evidence/WP-0A-A0-001/product-owner-disposition-2026-10-09-pr228.md` on PR #228's branch
(`agent/root/WP-0A-A0-001-repository-bootstrap-2026-10-07`, commit `5bead76e`). It is noted here as context only. This
file does not decide anything about PR #228, and that disposition, not this section, is its record.

### 8.2 The questions and answers

Asked `2026-10-09T04:52:30Z`, in one call of four questions, and answered `2026-10-09T04:52:46Z`. The text the Owner
was asked to approve is RFC-2026-031 as committed at `d0c92447` (the last commit to touch it before the question; the
branch head was `72bd328a`, which does not change the RFC).

#### Q-031-1 (header `Q-031-1`, single choice)

> Q-031-1: อนุมัติข้อความ RFC-2026-031 รวมทั้งการตีความเรื่อง CTR-USG-001 ไหม? (register §7.2(2) กำหนดว่า shared contract ทุกตัวต้องเป็นอย่างน้อย Candidate — USG ไม่อยู่ใน First Slice แต่ต้องเลื่อนเป็น Candidate ก่อนปิด G0 exit)

Options, as shown:

- `อนุมัติ รวม USG (Recommended)`: "USG ต้องเป็น Candidate ก่อนปิด exit ไม่ต้อง Frozen — ไม่เปลี่ยน gate เพิ่ม"
- `อนุมัติ แต่ยกเว้น USG`: "ยกเว้น USG จากเงื่อนไข §7.2(2) — เป็นการเปลี่ยน gate เพิ่มอีกข้อ"

**The Owner chose `อนุมัติ รวม USG (Recommended)`.**

#### Q-031-2 and Q-031-5 (header `Q-031-2/5`, single choice)

> Q-031-2 + Q-031-5: บันทึกช่องว่างใน key ใหม่ `declared_gaps` (มีเจ้าของ + gate ที่ต้องปิดก่อน) และใช้นิยาม breaking change = การเปลี่ยนใดๆ ที่ทำให้ชุดเอกสารที่ schema ยอมรับเปลี่ยน (ทั้งแคบลงและกว้างขึ้น) หรือเปลี่ยนความหมาย/owner/consumers ต้องทำ RFC โดย C0 เป็นผู้จัดประเภท (สงสัย = breaking)

Options, as shown:

- `รับทั้งสองข้อ (Recommended)`: "ใช้ declared_gaps และนิยาม breaking change ตามที่ RFC เสนอ"
- `ขอดูข้อความก่อน`: "ส่งข้อความ §3.3 และ §5.2 มาให้อ่านก่อนตัดสิน"

**The Owner chose `รับทั้งสองข้อ (Recommended)`.**

#### Q-031-3 (header `Q-031-3`, single choice)

> Q-031-3: ห้ามประกาศช่องว่าง 3 ประเภท (ต้องปิดจริงก่อน freeze): (1) ขาด artifact ขั้นต่ำก่อน freeze ตาม register (2) finding ของ A1 ที่ยังเปิด ทุกระดับ (3) ช่องว่างเรื่อง tenant isolation — แคบกว่าคำตอบ 'ช่องว่างทุกข้อ' เมื่อเช้า

Options, as shown:

- `รับทั้ง 3 ข้อ (Recommended)`: "สามประเภทนี้ประกาศค้างไม่ได้ ต้องปิดก่อน freeze"
- `ไม่จำกัด`: "ประกาศได้ทุกช่องว่างตามคำตอบเดิม"

**The Owner chose `รับทั้ง 3 ข้อ (Recommended)`.**

#### Q-031-4 (header `Q-031-4`, single choice)

> Q-031-4: คุณจะอนุมัติ freeze ทีละตัวตามชื่อ (ถามครั้งเดียวหลายตัวได้) และให้ A0 กด merge PR ที่ freeze เมื่อ 4 role + ลายเซ็น co-owner + คำอนุมัติของคุณอยู่บน branch แล้ว ได้ไหม? (รวมทั้งให้ A0 กด PR #229 นี้เองหลัง 4 role ผ่าน)

Options, as shown:

- `ได้ ทั้งสอง + กด #229 (Recommended)`: "คุณอนุมัติตามชื่อต่อ contract; A0 กด freeze PR และ #229 เองเมื่อเงื่อนไขครบ"
- `อนุมัติตามชื่อ แต่ผมกดเอง`: "A0 เตรียม PR ให้พร้อม คุณกด merge freeze PR และ #229 เอง"

**The Owner chose `ได้ ทั้งสอง + กด #229 (Recommended)`.**

### 8.3 What the answers decide

- **Q-031-1.** The Owner approves the text of RFC-2026-031 as committed at `d0c92447`, with A0's CTR-USG-001 reading of
  §6: CTR-USG-001 must reach Candidate (not Frozen) before the G0 exit closes, and register §7.2 (2)'s first clause is
  not waived for it. The option's own words: no further gate change. RFC-2026-031's status line now reads Approved,
  citing this section.
- **Q-031-2 and Q-031-5.** Declared gaps are recorded in the new manifest key `declared_gaps` (RFC-2026-031 §5.2), and
  the breaking-change definition of §3.3 applies, as the RFC proposes.
- **Q-031-3.** The three kinds of gap of RFC-2026-031 §5.5 may not be declared and must close before a freeze: a missing
  pre-freeze artifact required by the register, an open A1 finding of any severity, and a tenant-isolation gap. This
  narrows §4.3's `ได้ ถ้าประกาศครบ (Recommended)`, by the Owner's word.
- **Q-031-4.**
  - The Owner approves each freeze by name, per contract (one question may list several).
  - A0 may press a freeze PR under RFC-2026-031 §4.4 once its four roles, the co-owner signature and the Owner's
    approval are on the branch.
  - A0 may press PR #229 itself once its four roles pass.

**The press direction and RFC-2026-025 §5 item 6.** Q-031-4 was asked while PR #229 exists, and it names #229. For
freeze PRs, it names their sequence: every freeze PR under RFC-2026-031 §4.4. It is a direction for PR #229 and for
those freeze PRs only. It is an exception to §5 item 6's rule that a governance PR is pressed by the Owner. **It does
not amend RFC-2026-025 §5 item 6**, which reads as before for every other governance PR. It does not widen the
2026-10-08 standing direction, and it does not answer whether that direction alone would have covered #229 (§6 of this
file left that to A1 and R0).

### 8.4 What the answers do not do

- They freeze no contract and promote none. They do not move CTR-USG-001.
- They sign nothing for A1, A5, A6 or any co-owner. They approve no freeze by name. Each freeze is asked when its
  PR is ready (RFC-2026-031 §4.4).
- They change no word of RFC-2026-031 §1 to §9. This PR changes only its status line and appends the answers to §10.
- They are not a role verdict. The roles re-read the commit that carries this section (RFC-2026-031 §10, "Order before
  the merge", step 3; RFC-2026-025 §5 item 2). CI must be green on a head that contains current `main`.
- They decide nothing about PR #228 (§8.1).
