# Product Owner disposition — the branch-scope test's children read no git configuration of the machine's (A1-293-2, A1-294-3; 2026-10-18, session `325454ab`)

Recorded for A0 (`/claude/a0_atlas`, the Author), drafted by an author subagent of that run, on WP-0A-A0-004, the
package that owns `test-kits/branch-scope.test.mjs` (`ownership.writable_paths`). A0's question and the Owner's answer
below are copied by script from the raw transcript of session `325454ab`
(`~/.claude/projects/-Users-bank-ThinkBizThai/325454ab-eb14-4597-afd3-75b6b8c78ee8.jsonl`, lines 9353 and 9379) and
checked byte for byte against them by the same script. Times are the transcript's stamps (UTC), not a clock read.
Everything marked "A0's reading" is A0's, not the Owner's. This is a record of the Owner's words and of A0's reading of
them: it is not a role verdict, approves nothing, and moves no status on A0's behalf. It is modelled on
`evidence/WP-0A-A0-004/product-owner-disposition-2026-10-18-a1-292-2.md`.

## 1. Why it was asked

- **A1-293-2** (Info; `evidence/WP-0A-A0-004/a1-review-2026-10-18-pr293.md` §5): after PR #293 stripped every `GIT_*`
  from the children of `test-kits/branch-scope.test.mjs`, `HOME` and `XDG_CONFIG_HOME` still select the caller's global
  git configuration (a `core.hooksPath` there runs in the scratch repositories), and `runStep` passes `HOME` too. A1's
  optional fix: `GIT_CONFIG_GLOBAL=/dev/null` and `GIT_CONFIG_NOSYSTEM=1` set after the strip.
- **A1-294-3** (Info; `evidence/WP-0A-CON-008/a1-review-2026-10-18-pr294.md` §3): the same for the scenario repositories
  of WP-0A-CON-008's test files — `HOME`/`XDG_CONFIG_HOME` (a global `core.hooksPath`, `init.templateDir`) and the
  system gitconfig.
- `test-kits/branch-scope.test.mjs` is a top-level `test-kits/*.test.mjs` guard test, so a change to it is a governance
  pull request (RFC-2026-034 §2.2), which RFC-2026-025 §5 item 6's last bullet has the Owner merge personally unless he
  directs otherwise.

## 2. A0's question and the Owner's answer (verbatim)

A0 asked at transcript line 9353 (stamped `2026-10-18T11:44:43.153Z`), one question in an `AskUserQuestion` call, single choice.
Its header, verbatim:

```text
HOME/XDG
```

The question, verbatim:

```text
Info จาก A1 (A1-293-2, A1-294-3): เทสต์ที่สร้าง repo ชั่วคราวยังรับ git config ของเครื่อง (`HOME`, `XDG_CONFIG_HOME`, system gitconfig) อยู่ — ถ้าเครื่องใครตั้ง hook/config แปลก ๆ อาจทำให้เทสต์เพี้ยนหรือรันโค้ดได้ · แก้ด้วยการตั้ง `GIT_CONFIG_GLOBAL=/dev/null` + `GIT_CONFIG_NOSYSTEM=1` ในเทสต์ 4 ไฟล์ (ratchets-bite, ci-guard-behaviour, handoff-conformance ของ CON-008 และ branch-scope ของ A0-004) = PR governance 2 ตัว · จะให้ทำไหม และใครกด?
```

Its three options, labels verbatim, in the order shown:

```text
ทำ + A0 กดทีละ PR เมื่อ 4 role ผ่าน (Recommended)
```

```text
ทำ แต่ผมกดเอง
```

```text
ยังไม่ต้องทำ
```

A0's translation of the question: "Info from A1 (A1-293-2, A1-294-3): the tests that create temporary repositories
still take the machine's git config (`HOME`, `XDG_CONFIG_HOME`, system gitconfig) — if someone's machine sets an odd
hook/config, it could skew the tests or run code. Fix by setting `GIT_CONFIG_GLOBAL=/dev/null` +
`GIT_CONFIG_NOSYSTEM=1` in the tests of 4 files (ratchets-bite, ci-guard-behaviour, handoff-conformance of CON-008 and
branch-scope of A0-004) = 2 governance PRs. Do you want it done, and who presses?" Of the options: "Do it + A0 presses
each PR when the 4 roles pass (Recommended)"; "Do it, but I press"; "Not yet".

Lines 9354 to 9378 are queue-operation records and session metadata records (`last-prompt`, `custom-title`,
`agent-name`, `mode`, `atis-latch`, `pr-link`, `history-suppression`, `bridge-session`); no message lies between. The
answer is the tool result at transcript line 9379 (stamped `2026-10-18T12:07:58.209Z`), whose chosen option, verbatim:

```text
ทำ + A0 กดทีละ PR เมื่อ 4 role ผ่าน (Recommended)
```

and that option's description as shown with the question (line 9353), verbatim:

```text
2 PR (CON-008, A0-004) · แต่ละตัวต้องผ่าน C0, A1, Q0, R0 บน head สุดท้าย, CI เขียว, ไม่มี security finding ค้าง
```

A0's translation of the description: "2 PRs (CON-008, A0-004) · each must pass C0, A1, Q0, R0 on the final head, CI
green, no security finding open".

## 3. What it directs

A0's reading, bounded to this package's file:

1. One governance pull request, on this package's branch `agent/claude/WP-0A-A0-004-ci-independent-guard-step`, that
   makes every child process of `test-kits/branch-scope.test.mjs` (scratchRepo's git, runStep's bash and what the
   cut-out CI step bodies run, laneEnv's sh, the GIT_* pin's victim git) start, after the existing strip of every
   `GIT_*`, with `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL=/dev/null`, applied last, and adds one test that
   reruns the file's other tests with `HOME` and `XDG_CONFIG_HOME` naming a configuration that installs hooks through
   `core.hooksPath` and requires that no hook ever runs. No existing test is removed or renamed.
2. Besides the test it changes `scripts/test-suite-contract.mjs` (WP-0A-A0-002's; the file's floors and name digest,
   under `ownership.amends_without_owning`), `evidence/VERIFICATION.md` (WP-0A-CON-008's; `npm run
   record:verification`, under the same field), the regenerated `test-kits/integrity-manifest.json`, and this package's
   records: this file, the manifest (`open_blockers`, `required_human_authorities`, `ownership.amends_without_owning`)
   and the author handoff.
3. A0 presses it only after C0, A1, Q0 and R0 pass on its final head, CI is green on both jobs (`bootstrap`,
   `application`) there, no security finding is left open against it, and the head contains current `main`.

The other three files the question names (`ratchets-bite`, `ci-guard-behaviour`, `handoff-conformance`) are
WP-0A-CON-008's; their pull request and its record belong to that package. It is not a standing delegation.

## 4. RFC-2026-025 §5 item 6

RFC-2026-025 §5 item 6 reads, in its third bullet, "The delegation must be given after the PR it names exists, or must
name its sequence explicitly.", and in its last, that a PR changing governance (an RFC, `CONTRIBUTING_AGENTS.md`, CI or a
gate) is merged by the Owner personally, never by delegation. A0's reading of the answer against both:

1. **An exception to the last bullet, for this pull request only**, in the form PR #211, PR #212, the lane-walk fix,
   PR #270, PR #279, PR #280, PR #281, PR #283, PR #287 and PR #293 received one. The Owner was shown a choice, and
   the option `ทำ แต่ผมกดเอง` ("do it, but I press") among it; he chose the option in which A0 presses each pull request.
2. **The third bullet, by naming the item before the pull request existed.** The answer was given at
   2026-10-18T12:07:58Z, before this pull request existed, to a question that names its content (A1-293-2, A1-294-3,
   the two variables, `branch-scope` of A0-004) and its count (two governance pull requests). A0 reads that as naming
   its sequence explicitly.
3. **The other conditions are kept:** current `main` in the head when pressed (the first bullet), no security finding
   of any grade open (the second; the chosen option's description says the same), the Integration Owner's verdict (the
   fourth; R0 among the four roles), and green CI on both jobs on the final head.

## 5. What it does not decide

- Whether the change is right and whether its residual is acceptable: C0's, A1's, Q0's and R0's reading. One residual
  stated here so nobody reads it as covered: the system gitconfig cannot be planted by a test without writing outside a
  temporary directory, so `GIT_CONFIG_NOSYSTEM=1` is pinned by the helper's own output, not by a hook that would run.
- WP-0A-CON-008's pull request for the other three files.
- WP-0A-A0-002's and WP-0A-CON-008's acknowledgements of the amendments to their files, owed from their Integration
  Owner (`/claude/r0_steward`).

## 6. Records

`work-packages/WP-0A-A0-004.json` `required_human_authorities` gains one entry at the end, gov-a004i, citing this file,
and `open_blockers` one at the end recording A1-293-2 and A1-294-3 fixed for `test-kits/branch-scope.test.mjs`; every
earlier entry of both is kept byte for byte (append-only). `ownership.amends_without_owning.paths` names
`scripts/test-suite-contract.mjs` and `evidence/VERIFICATION.md`, its rationale prefixed with this increment and the
earlier text kept after it.
