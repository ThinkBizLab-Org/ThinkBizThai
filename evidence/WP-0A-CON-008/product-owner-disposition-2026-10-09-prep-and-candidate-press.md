# Product Owner disposition, 2026-10-09: who presses the RFC-2026-031 §7.1 PR and the Draft→Candidate PRs

Scribe: `/claude/a0_atlas`. This file transcribes the Owner's chat answer verbatim. A0 decides nothing in it.

Asked at `2026-10-09T08:22:01Z` and answered at `2026-10-09T08:25:43Z`, in session `3ecec68b` (header "Prep PRs",
one question, single choice). The question, the options and the answer below were checked byte for byte against the
tool call and its result in that session's transcript, a file outside the repository. A reader on `main` sees the
quotes and their times, not the transcript.

## A0's question (multiple choice), verbatim

> ให้ A0 กด merge PR เตรียมการตาม RFC-031 §7.1 (WP-0A-CON-008: แก้เทสต์/registry ให้ยอมรับ Frozen และ declared_gaps — ไม่เปลี่ยน contract ใด) และ PR เลื่อน Draft→Candidate ของ SEC/AUD/OBS/NTF/USG (หลังคุณทำ disposition ตาม RFC-2026-010) เมื่อ 4 role ผ่านและ CI เขียวได้ไหม?

Options:
- `ให้ A0 กดทั้งสองแบบ (Recommended)`: "A0 กด PR §7.1 และ PR Draft→Candidate เมื่อ 4 role ผ่าน CI เขียว และ (สำหรับ Candidate) มี disposition ของคุณบน branch แล้ว"
- `กดเฉพาะ §7.1`: "A0 กด PR §7.1 ได้ ส่วน Draft→Candidate คุณกดเอง"
- `ผมกดเองทั้งหมด`: "A0 เตรียมให้พร้อม แล้วคุณกด merge เอง"

## The Owner's answer, verbatim

`ให้ A0 กดทั้งสองแบบ (Recommended)`

## What it means, and what it does not

- **It names two classes of PR.**
  - The RFC-2026-031 §7.1 preparatory PR of `WP-0A-CON-008`: the test and registry change that admits `Frozen` and
    `declared_gaps` and changes no contract.
  - The Draft→Candidate PRs of CTR-SEC-001, CTR-AUD-001, CTR-OBS-001, CTR-NTF-001 and CTR-USG-001.
- **When A0 may press one of them.**
  - C0, A1, Q0 and R0 have passed on its final head, with no security finding of any grade open.
  - CI is green on that exact head, and the head contains current `main`.
  - For a Draft→Candidate PR, also: the Owner's own disposition under RFC-2026-010 naming that contract is on the
    branch. This direction does not supply that disposition, and does not supply any co-owner's or owner's signature
    (A1 for SEC; A6 for AUD, OBS and USG; A5 for NTF).
- **It is an exception to RFC-2026-025 §5 item 6 for those two classes of PR.** It does not amend that rule.
- **It does not cover:**
  - the `CONTRIBUTING_AGENTS.md` "Current gate constraint" PR (RFC-2026-031 §6 item 2);
  - the closing record of the G0 exit (RFC-2026-031 §6);
  - a freeze PR, which already rests on the Owner's Q-031-4 answer and on his approval of each freeze by name
    (`product-owner-disposition-2026-10-09-first-slice-freeze-and-records.md` §8);
  - any other governance PR.
- **It was given before the §7.1 PR existed.** The question names the PR by its content and its package, not by
  number, because no number existed yet. The §7.1 PR is opened after this answer, on the branch
  `agent/claude/WP-0A-CON-008-merge-parent-order`. Whether naming a PR by its RFC section and package, before it is
  opened, meets RFC-2026-025 §5 item 6 is for A1 and R0 to say on that PR. For PR #229, R0 accepted Q-031-4's
  naming of a sequence of freeze PRs in the same way (`r0-review-2026-10-09-pr229.md` §4).
