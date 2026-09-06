// The batch 010 isolation suite, as data.
//
// Owner: A1 Identity. Every case names the identity it assumes, the statement it runs, and the
// OUTCOME KIND it demands.
//
//
// THE OUTCOME KINDS, AND A CORRECTION TO THE HELPER MODULE'S PREMISE
//
// db/foundation/test-helpers/rls-assertions.mjs opens by drawing the distinction this whole suite
// depends on:
//
//   * A SELECT that RLS filters returns ZERO ROWS. It is not an error.
//   * An INSERT, UPDATE or DELETE that RLS refuses raises an ERROR (SQLSTATE 42501).
//
// The first is exactly right. **The second is only true for half of the mutations**, and writing
// the suite is what surfaced it. Postgres refuses a write with 42501 when a WITH CHECK clause
// rejects the NEW row — every INSERT, and an UPDATE whose result would leave the policy's scope.
// When a USING clause simply does not admit the EXISTING row, the row is invisible to the
// statement: the UPDATE or DELETE matches nothing, reports zero rows affected, and RAISES
// NOTHING. That is the normal shape of a cross-tenant update and of a wrong-role update, which is
// to say the shape of most of §8.6's negative cases.
//
// So a suite that demanded `expectDenied` on every mutation would fail against a CORRECT database
// — and the natural repair, downgrading those cases to `expectNoRows`, walks straight into the
// trap the helper module was written to close: zero rows affected is also what an update returns
// when RLS is off and the row is not there.
//
// This suite takes the third path. A mutation RLS denies by filtering is asserted as `no-effect`,
// which is TWO assertions and not one:
//
//   1. the statement returns nothing — it carries RETURNING, so "affected no row" is observable
//      as an empty result set rather than inferred from a driver's row count; and
//   2. a WITNESS read, run as an identity that CAN see the target row, proves the row is still
//      there and still carries its original value.
//
// Half two is what an empty result cannot give you. With RLS off, the update succeeds, the
// witness sees the changed value, and the case fails. With the row absent, the witness sees
// nothing, and the case fails. `no-effect` is therefore strictly stronger than `expectNoRows` and
// makes a claim `expectDenied` cannot make here, because the database does not raise.
//
//   'rows'      the identity must see something, or must have written something. Without these,
//               every negative assertion beside them is vacuous.
//   'no-rows'   a READ that RLS filtered. The weak assertion, and it says so.
//   'denied'    the database REFUSED, with SQLSTATE 42501. Used where a refusal is what actually
//               happens: every INSERT, and every operation the role holds no privilege for.
//   'no-effect' a WRITE that RLS filtered. Empty result plus a witness. Never used for an INSERT,
//               where a refusal is available and is the stronger claim.
//   'rejected'  the database refused with a NAMED SQLSTATE THAT IS NOT 42501 — a CONSTRAINT
//               stopping a row every policy would have admitted. Added by batch 020, the first
//               batch whose tables have a scope path deep enough for §3.3's composite foreign key
//               to have anything to say. It REQUIRES a `sqlstate`, and the runner refuses 42501
//               there, because the whole value of the kind is that it cannot be satisfied by an
//               RLS refusal. rls-assertions.mjs opens by warning that treating any error as a
//               denial lets a typo in a fixture masquerade as a working policy; the converse is
//               as true, and it is what §4 invariant 10 turns on — "must fail AT THE DB" is a
//               claim about the CONSTRAINT, and a case that would also pass on a 42501 has not
//               made it.
//
// A 'denied' case may additionally name WHICH LAYER refused it and WHICH OBJECT was refused:
//
//   deniedBy    'grant' or 'policy'. Both raise 42501 and only the message tells them apart, so a
//               case that cannot distinguish them passes just as happily when the policy it exists
//               to prove was never written.
//   deniedOn    { kind, name } -- the exact object the refusal must name. A0 CORRECTION, on C0's
//               review D6: `permission denied` is a catch-all, and `permission denied for schema
//               private` -- the failure this harness actually produced -- classified as the same
//               'grant' layer as `permission denied for table workspace_invitations`. The layer was
//               attributed and the object was not, so a case could be satisfied by a privilege
//               problem in the scaffolding rather than on the object it names.
//
//               The kind is DECLARED, not inferred, because which object a refusal lands on is a
//               property of the privilege topology. `authenticated` holds USAGE on schema app
//               (010:390), so a read it may not make is refused on the TABLE. `anon` is granted
//               nothing anywhere (010:386) and PUBLIC holds no USAGE on app either (measured:
//               catalog-snapshot public_grants.usage_on_app is false), so an anonymous read never
//               reaches a table -- name resolution refuses it on the SCHEMA. Writing that down is
//               what makes the anonymous cases notice the day anon is granted a privilege, which
//               is the thing their own `why` says they exist to notice.
//
// Both are optional and both are checked when present: silence is not a claim, but a declaration
// is. `identity-isolation.test.mjs` asserts statically that no case declares one without the other.
//
// No case contains a uuid. Identities and rows are named by their fixture SYMBOL and resolved
// from db/foundation/seeds/fixture-catalog.json at run time, which is what makes the cross-tenant
// assertion mean anything: tenant A's identity attacks tenant B while HOLDING B's exact id.

// Which §12.6 smoke assertions this suite's tables can carry, and which they cannot.
//
// An honest coverage claim is worth more than a broad one, and this map is where a batch says
// which of its inherited debts it paid. Batch 010 wrote it with assertions 2, 3 and 7 owed to
// tables it was not allowed to create. Batch 020 creates two of those four families
// (business_profiles, page_context_profiles and their immutable versions) and therefore CHANGED
// three rows: 7 became covered, 2 became partial with the remaining half named and dated, and 3
// stayed false because content and knowledge are still other people's batches.
//
// Batch 021 creates app.workspace_member_scopes and moves ONE row: 2 from `partial` to `true`. It
// moves nothing else, and the two rows a reader might expect to move are worth naming. 3 stays
// false — it is about an approver editing CONTENT and KNOWLEDGE, which are batches 080 and 040, and
// member scope does not create either. 8 stays `negative-half`, because asserting the positive half
// would still require inventing a service permission §8.1 does not grant, and 021 grants the
// service nothing it did not already have.
//
// BATCH 030 MOVES NO ROW AT ALL, and that is the honest answer rather than a modest one. It creates
// three tables and extends six of the eight notes, because every §12.6 assertion it touches was
// already `true` and a note that grew is the only thing left to record. The two rows it might have
// been expected to move are worth naming: 3 stays false — an approver refused an INDUSTRY
// ASSIGNMENT is a third in-scope analogue and still not the content and knowledge tables §12.6/3
// names — and 8 stays `negative-half`, because 030's two GLOBAL tables give the service a grant and
// no policy, which is more negative evidence and not a positive.
//
// What 030 does add is a KIND of assertion §12.6 has no row for, and it is recorded inside the
// notes rather than as a ninth key nobody may invent: a row that belongs to NO tenant cannot carry
// a cross-tenant case, so the catalog is asserted by "both owners are refused identically, at the
// privilege layer" and by "the one role holding a grant reads zero rows". §12.6 was written about
// tenant rows and this batch is the first with any others.
//
// BATCH 040 MOVES ONE ROW, AND IT IS THE ROW THAT HAS READ `false` SINCE BATCH 010. §12.6/3 is
// "`user_approver_a` cannot edit content/knowledge", and 040 creates one of the two families that
// sentence names. Three batches have recorded in-scope ANALOGUES for it and refused to count them;
// these are not analogues, and the row moves from `false` to `knowledge-half`.
//
// IT DOES NOT MOVE TO `true`, and the reason is the whole discipline of this map: the sentence names
// content AND knowledge, content is batch 080, and half a claim reported as a whole one is exactly
// what the analogue rule was protecting against. `knowledge-half` is the same shape §12.6/8 has
// carried since batch 010 — a labelled partial, printed as a partial by `make db-rls-smoke` rather
// than counted as a pass. (It was NOT printed as one until 040: scripts/db/rls-smoke.mjs filtered on
// `!covered`, so a truthy label vanished from the report. That is fixed in the same change, because
// a partial nobody prints is a `true` with extra characters.)
//
// The three analogues stay recorded and stay labelled. They are still the only evidence about the
// workspace, the page context and the industry assignment, and 040 pays none of them.
//
// A row that moves must move for a case, not for a sentence: identity-isolation.test.mjs requires
// every assertion claimed `covered: true` to be cited by a case in this file.
//
// BATCH 041 MOVES NO ROW, AND IT IS THE FIRST BATCH THAT COULD NOT HAVE MOVED ONE. Every earlier
// batch created tables; 041 creates ONE FUNCTION — app.knowledge_scope_applies, the scope half of
// the resolution rule — and no table, no view and no policy, so there is no new family for a §12.6
// assertion to be about. The row a reader might expect to move is 3: it is `knowledge-half` because
// content is batch 080, and 041 creates no content table, so it stays exactly where 040 left it.
//
// What 041 does is extend FIVE notes — 1, 2, 5, 6 and 8 — for a reason that is worth stating rather
// than leaving as five paragraphs: A NEW WAY TO REACH A TABLE IS A NEW PLACE TO LOSE A CHECK. A
// filter written into a `where` clause is not a new object with rows, but it is a new path, and the
// path a resolution contract creates is the one somebody would most plausibly build a
// SECURITY DEFINER helper for. So every §12.6 assertion that can be asked through the contract is
// asked through it — the tenant boundary, member scope, the suspended member, the anonymous caller
// and the service — and in every one of those cases the PREDICATE ANSWERS TRUE for the row while
// the database still refuses. That is the claim 041 exists to make falsifiable, and no truth table
// inside the migration can make it.
export const SMOKE_COVERAGE = {
  1: { covered: true, note: 'workspaces, workspace_settings and workspace_invitations, in both directions '
                           + '(batch 010), and business_profiles, page_context_profiles and both version '
                           + 'tables, in both directions (batch 020) — every attack run while holding tenant '
                           + "B's REAL id, which on a version table is its business's or page's, because a "
                           + 'version is addressed by parent and ordinal.\n\n'
                           + 'ON ALL FOUR OF BATCH 020\'s TABLES THAT IS THREE CASES, not two: tenant A reads '
                           + 'its own row, tenant A cannot read tenant B\'s, AND TENANT B CAN — without the '
                           + 'third the negative is satisfied by a fixture that never loaded the row. Batch '
                           + '010 carries that third case on app.workspaces and not on workspace_settings or '
                           + 'workspace_invitations; those two rest on the A-side positive alone, which is a '
                           + 'weaker shape and is named here rather than covered by an average.\n\n'
                           + 'BATCH 030 ADDS app.industry_assignments WITH ALL THREE CASES — A reads its own, '
                           + "A cannot read B's while holding B's exact workspace and Business ids, and B CAN "
                           + '— plus a fourth the earlier tables had no occasion for: the two positives name '
                           + 'THE SAME GLOBAL pack version id, so the pair asserts that one catalog row is '
                           + 'pinned from both sides of the boundary while neither owner can see the other\'s '
                           + 'assignment.\n\n'
                           + 'BATCH 040 ADDS app.knowledge_items AND app.knowledge_item_versions WITH ALL '
                           + 'THREE CASES EACH — A reads its own, A cannot read B\'s while holding B\'s '
                           + 'exact knowledge id, and B CAN — and it is the first family where the content '
                           + 'behind that boundary is CONTENT-2 rather than a name: §9.1 classes knowledge '
                           + '"tenant isolated", so a cross-tenant read here would leak what another '
                           + "business says rather than what it is called. The write path is asserted too, "
                           + 'on both tables, and the version negative is not implied by the item one — a '
                           + 'version row holds what the item USED to say, so a boundary that held on the '
                           + 'current row and not on the history would leak the same content one table '
                           + 'over.\n\n'
                           + 'Batch 030\'s two GLOBAL tables are deliberately NOT counted here. '
                           + 'They belong to no tenant, so "A cannot reach B\'s row" is not a claim anyone can '
                           + 'make about them; what is asserted instead is that BOTH owners are refused '
                           + 'identically, at the privilege layer, which is a different assertion and is '
                           + 'labelled as one.\n\n'
                           + 'BATCH 041 ADDS NO TABLE AND ASSERTS THE SAME BOUNDARY THROUGH A NEW WAY OF '
                           + 'REACHING ONE. `app.knowledge_scope_applies` is a filter a caller writes into '
                           + 'a `where` clause, and a filter is a new path to a table whether or not it is '
                           + 'a new object with rows. So the boundary is re-asked THROUGH IT: '
                           + '`owner-a-cannot-resolve-the-knowledge-item-of-business-b1` runs the contract '
                           + "while holding tenant B's Business, Page and knowledge ids exactly, and the "
                           + 'PREDICATE ANSWERS TRUE FOR THAT ROW — it is business-level knowledge of '
                           + 'precisely the Business being asked about — so the empty result is row level '
                           + 'security and nothing else. `owner-b-resolves-the-knowledge-item-of-business-b1` '
                           + 'is the far side, run through the same contract, so the negative is not '
                           + 'satisfied by a predicate nobody can pass.\n\n'
                           + 'BATCH 050\'s THREE TABLES ARE NOT COUNTED EITHER, AND THE REASON IS NEW. '
                           + 'app.jobs, app.outbox_events and app.consumer_ledger ARE tenant tables — each '
                           + 'carries workspace_id NOT NULL with a foreign key to app.workspaces — and NO '
                           + 'IDENTITY CAN READ ANY OF THEM. §8.4\'s "Job redacted status SELECT" grants a '
                           + 'redacted status, which is a security_invoker view on a read allowlist that is '
                           + 'empty and grows only by RFC, so batch 050 grants no client role anything and '
                           + 'writes no policy. A table nobody can read has no OBSERVABLE tenant boundary: '
                           + 'both owners are refused identically at the privilege layer, exactly as they are '
                           + 'on batch 030\'s global rows, and for a completely different reason. Counting '
                           + 'that as isolation would be reporting a refusal that holds for everybody as a '
                           + 'boundary that holds for one tenant. The claim this batch DOES make with the pair '
                           + 'is narrower and is labelled as such: the refusal is uniform, so it is not one '
                           + 'tenant being unlucky.' },
  2: { covered: true, note: 'PAID IN FULL BY BATCH 021, and the half that was owed is the half that moved. '
                           + 'Batch 020 asserted "user_editor_a sees Business A1/Page A1" and the tenant-'
                           + 'boundary half — never business_b1, never page_b1, never their versions — on all '
                           + 'four of its tables. It could not assert "never A2/Page A2", because business_a2 '
                           + 'is in the SAME workspace and narrowing a member inside their own workspace is '
                           + 'MEMBER SCOPE, whose table is batch 021. So 020 asserted the wider state '
                           + 'POSITIVELY, in `editor-a-sees-business-a2-until-batch-021`, and said that the '
                           + 'day 021 narrowed it a test would change in a diff instead of a claim quietly '
                           + 'becoming false.\n\n'
                           + 'THAT CASE IS GONE AND `editor-a-scope-does-not-reach-business-a2` STANDS WHERE '
                           + 'IT STOOD, asserting the narrowed state just as positively. It is not alone: the '
                           + 'same boundary is asserted on page_a2 and on the version rows of both, and it is '
                           + 'paired with `owner-a-is-unscoped-and-sees-business-a2`, which is what stops the '
                           + 'new negative from being satisfied by business_a2 becoming unreadable to '
                           + 'everybody. §12.6/2 names four rows and this suite now asserts all four in both '
                           + 'directions.\n\n'
                           + 'BATCH 030 EXTENDS IT TO A TABLE CREATED AFTER 021 RATHER THAN BEFORE IT, which '
                           + 'is why the narrowing there is written into the batch that creates the table and '
                           + 'still as a RESTRICTIVE policy: a permissive conjunct inside each of the three '
                           + 'permissive policies would be three places to forget it and a fourth policy '
                           + 'added later would forget it for free. '
                           + '`editor-a-scope-does-not-reach-the-industry-assignment-of-business-a2` is the '
                           + 'negative, and it is paired with TWO positives — the unscoped owner and the '
                           + 'all_businesses viewer — so it cannot be satisfied by the row becoming '
                           + 'unreadable to everyone or by the helper answering "narrowed therefore '
                           + 'excluded".\n\n'
                           + 'BATCH 040 IS THE FIRST TO ASSERT IT AT TWO GRANULARITIES ON ONE FAMILY, '
                           + 'because a knowledge row is the first row in this schema that carries a Page '
                           + 'scope OF ITS OWN rather than inheriting one from its parent. '
                           + '`editor-a-scope-does-not-reach-the-knowledge-item-of-business-a2` is the '
                           + 'Business half and `page-editor-a-cannot-see-the-knowledge-item-of-the-sibling-'
                           + 'page` is the Page half — two rows in the SAME Business, distinguished by '
                           + 'nothing but their own page column — and each is paired with a positive: the '
                           + 'unscoped owner reads business_a2\'s, and user_editor_a reads the sibling '
                           + "page's, because §7 gives a business scope every Page beneath it.\n\n"
                           + 'BATCH 041 ASSERTS IT AT A THIRD GRANULARITY, AND IT IS THE ONE THAT SAYS THE '
                           + 'RESOLUTION CONTRACT IS A FILTER AND NEVER A PERMISSION. '
                           + '`page-editor-a-cannot-resolve-the-knowledge-item-of-the-sibling-page` names '
                           + 'the SIBLING Page in the request, so `app.knowledge_scope_applies` answers YES '
                           + '— `owner-a-resolves-the-sibling-page-knowledge-item-for-the-sibling-page` is '
                           + 'the identical statement under an unscoped identity and it returns the row — '
                           + "and 040's restrictive narrowing through app.member_scope_admits_page refuses "
                           + 'it anyway. A member cannot widen what they may read by asking the contract '
                           + 'for it, and `page-editor-a-resolves-the-business-level-knowledge-item-for-'
                           + 'page-a1` is the positive that keeps this from being about a page editor who '
                           + 'resolves nothing at all.' },
  3: { covered: 'knowledge-half',
       note: 'THE KNOWLEDGE HALF IS PAID BY BATCH 040 AND THE CONTENT HALF NAMES BATCH 080. §12.6/3 is '
           + '"user_approver_a cannot edit content/knowledge", and 040 creates app.knowledge_items and '
           + 'app.knowledge_item_versions — one of the two families that sentence names. §8.2 marks the '
           + 'approver `N` on "Knowledge current INSERT/UPDATE/archive" and `Y` on the SELECT beside it, '
           + 'which is exactly "cannot EDIT" rather than "cannot see", and five cases assert it: the '
           + 'approver READS the knowledge item of business_a1, and is refused the insert, the rename, '
           + 'the ARCHIVE and the version write. The archive is a separate case rather than a synonym for '
           + 'the rename because §8.2 spells the operation "INSERT/UPDATE/archive" and archiving moves a '
           + 'different column through a different grant — a schema refusing one and permitting the other '
           + 'would let an approver hide every knowledge item in the workspace.\n\n'
           + 'THE ROLE IS THE ONLY THING REFUSING, which is what makes these cases about §12.6/3 rather '
           + 'than about visibility: user_approver_a holds a `business` member scope on business_a1, so '
           + 'the restrictive narrowing ADMITS every row they are refused, and they read it one case '
           + 'earlier.\n\n'
           + 'WHAT IS STILL OWED, AND BY WHOM: content. app.content_items and its versions are batch '
           + '080\'s and no case here touches them, so this row is `knowledge-half` and not `true`. '
           + 'Flipping it would report half a sentence as a whole one, which is the thing the analogue '
           + 'rule below exists to refuse.\n\n'
           + 'THE THREE IN-SCOPE ANALOGUES REMAIN ANALOGUES AND REMAIN UNCOUNTED — an approver cannot '
           + 'update the workspace (010), cannot update a page context (020), and cannot re-pin the '
           + 'industry assignment of the very Business their member scope names (030). Batch 040 pays '
           + 'none of them; they are evidence about three other tables, and the sharpest of them is '
           + 'still the third, for the reason it was recorded: the approver\'s scope admits the row and '
           + 'their role still refuses the write.' },
  4: { covered: true, note: 'the VIEWER refused every write each table actually offers a client. On batch '
                           + '010 and on business_profiles and page_context_profiles that is insert, update '
                           + 'and delete. On the two version tables it is INSERT AND NOTHING ELSE, because '
                           + 'update and delete are granted to no role at all — so `viewer-a-cannot-write-a-'
                           + 'business-version` is the case that carries this assertion there, and the '
                           + 'update/delete cases on those tables belong to §8.6/9 instead: they are refused '
                           + 'for the OWNER and for the service, which says nothing about a viewer.\n\n'
                           + 'ON app.industry_assignments (030) it is insert and update AND NOT DELETE, and '
                           + 'the absence is the reason rather than an omission: no role holds DELETE on that '
                           + 'table at all, so a viewer refused a delete would be refused for want of a grant '
                           + 'and would say nothing about the viewer. That refusal is carried by '
                           + '`owner-a-cannot-delete-an-industry-assignment` instead, where "even the owner" '
                           + 'is the claim. The two GLOBAL tables offer a viewer nothing to be refused: they '
                           + 'grant no client role any verb, which `owner-a-cannot-read-the-industry-pack-'
                           + "catalog` asserts for every client identity at once.\n\n"
                           + 'ON BATCH 040 IT IS INSERT AND UPDATE ON THE ITEM AND INSERT ON THE VERSION, '
                           + 'and delete is again absent for the reason rather than by oversight: no role '
                           + 'holds DELETE on either knowledge table, so a viewer refused one would be '
                           + 'refused for want of a grant and would say nothing about a viewer. '
                           + '`owner-a-cannot-delete-a-knowledge-item` carries that refusal instead, where '
                           + '"even the owner" is the claim. The viewer here holds an `all_businesses` '
                           + 'member scope, so the narrowing ADMITS every row they are refused and the '
                           + 'role is the only thing refusing.\n\n'
                           + 'BATCH 041 RE-ASKS IT THROUGH THE RESOLUTION CONTRACT, for the reason a new '
                           + 'path to a table is a new place to lose a check: '
                           + '`suspended-a-resolves-zero-knowledge-items` runs a filter that answers TRUE '
                           + 'for the row, under an identity whose membership is suspended, and sees '
                           + 'nothing — because app.knowledge_scope_applies is `security invoker` and reads '
                           + 'no relation, so it cannot become a way around the batch 011 helper. A '
                           + 'SECURITY DEFINER predicate would have been exactly that way around, which is '
                           + 'why the migration asserts invoker mode against the catalog on every apply.' },
  5: { covered: true, note: 'suspended sees zero TENANT rows — and still sees their own user_profiles '
                           + 'row, which is user-scoped and not a tenant row (§5). Both halves are '
                           + 'asserted, because only the pair distinguishes a policy from an empty table. '
                           + 'Batch 011 adds a third: zero rows THROUGH THE HELPER. A SECURITY DEFINER '
                           + 'function now answers authorization questions in a context where '
                           + 'current_user is app_authz rather than the caller, so "sees zero rows" had '
                           + 'to be re-asked of a path that did not exist when this was first covered. '
                           + 'Batch 020 re-asks it of tables whose policies have no membership predicate of '
                           + 'their own at all: business and version visibility is the helper\'s answer and '
                           + 'nothing else, so a suspended member seeing a business row would mean the helper '
                           + 'had started answering for an inactive membership. Batch 021 gives that identity '
                           + 'a scope row ON PURPOSE so the claim is about a policy rather than about an '
                           + 'empty table, and batch 030 re-asks it of app.industry_assignments, whose '
                           + 'visibility is the same helper and nothing else. Batch 040 re-asks it of BOTH '
                           + 'knowledge tables — the item, whose only membership predicate is that helper, '
                           + 'and the version, which reaches the helper twice over: once through its own '
                           + 'permissive policy and once through the item its restrictive narrowing '
                           + 'resolves.\n\n'
                           + 'BATCH 050 IS THE FIRST FAMILY THIS ASSERTION CANNOT BE MADE ABOUT, and its '
                           + 'three cases are labelled ANALOGUES rather than counted. §12.6/5 is "a suspended '
                           + 'member sees zero tenant rows", and it says something only where an ACTIVE '
                           + 'member sees some: on every family above, the suspended identity is refused by a '
                           + 'policy that admits their active colleagues. On app.jobs, app.outbox_events and '
                           + 'app.consumer_ledger NOBODY holds a client grant, so the suspended member is '
                           + 'refused by the privilege system exactly as the owner is and the case says '
                           + 'nothing about suspension. The three cases exist so that the day this family '
                           + 'gains a client grant they start making the claim their names imply; until then '
                           + 'they carry `§12.6/5-analogue` and this row is unaffected by them.' },
  6: { covered: true, note: 'anonymous. Refused at the privilege layer rather than filtered by RLS, '
                           + 'because §8.5 gives anon no tenant policy and no batch grants anon '
                           + 'anything. Stronger than the assertion asks for; recorded as deniedBy, and '
                           + 'on the SCHEMA, so the day anon is granted USAGE on app the refusal moves to '
                           + 'the table and the case fails.\n\n'
                           + 'BATCH 030 IS WHERE THAT CASE STOPS BEING ROUTINE. A published industry catalog '
                           + 'is classified PUBLIC-0 and is the one family in this schema an anonymous reader '
                           + 'could plausibly be given, so `anonymous-cannot-read-the-industry-pack-catalog` '
                           + 'is asserting a REFUSAL SOMEBODY MIGHT WANT TO REMOVE. Removing it is a security '
                           + 'decision with an owner (A1 Security, through an RFC), and this case is what '
                           + 'makes that decision arrive as a failing test rather than as a grant inside a '
                           + 'migration.\n\n'
                           + 'BATCH 040 IS THE OPPOSITE END OF THE SAME SCALE and is asserted the same way: '
                           + 'knowledge is CONTENT-2, the class §9.1 describes as "tenant isolated; no '
                           + 'model training reuse by default", and it is the one family in this schema '
                           + 'nobody could argue for exposing anonymously. Both knowledge cases are '
                           + 'refused on the SCHEMA all the same, because the control is the same control '
                           + 'and stating it per table is what makes it checkable per table.\n\n'
                           + 'BATCH 041 ADDS THE FIRST ANONYMOUS CASE IN THIS SUITE THAT IS ABOUT A '
                           + 'FUNCTION RATHER THAN A TABLE, and it is honest about what it cannot see. '
                           + 'RFC-2026-021 §7/4 decides that anon holds no schema USAGE, no table or column '
                           + 'privilege AND NO FUNCTION EXECUTE anywhere our migrations reach; '
                           + '`anonymous-cannot-resolve-a-knowledge-item` is refused on the SCHEMA, before '
                           + 'either the function or the table is reached, so it proves the chokepoint and '
                           + 'NOT the function grant. That anon holds no EXECUTE on '
                           + 'app.knowledge_scope_applies itself is asserted by 041\'s apply-time block '
                           + 'against the live ACL, which is where a claim no case can reach belongs.\n\n'
                           + 'BATCH 050 ASSERTS IT ON ALL THREE ASYNC-KERNEL TABLES, and since 2026-09-06 the '
                           + 'refusal is an APPROVED DECISION rather than an inherited convention: '
                           + 'RFC-2026-021 §7/4 decides that anon is granted nothing anywhere our migrations '
                           + 'reach, and gives the structural reason these cases declare the SCHEMA as the '
                           + 'object — the first anon grant is `grant usage on schema app`, which moves the '
                           + 'denial layer of every object in app at once. 050\'s apply-time block asserts the '
                           + 'grant half against the live catalog, and these three cases assert the '
                           + 'behaviour.' },
  7: { covered: true, note: 'ALL THREE ID KINDS NOW FAIL, which batch 010 could only claim for one. A forged '
                           + 'workspace_id and a forged created_by fail on the INSERT path with 42501 (010, '
                           + 'and again on business_profiles in 020). A forged BUSINESS id — a page whose '
                           + 'business_profile_id names a business in another workspace — fails at the policy. '
                           + 'And a version attached to a business in another workspace fails at the COMPOSITE '
                           + 'FOREIGN KEY with 23503, which is §4 invariant 10 in its own words: an unrelated '
                           + 'Workspace/Business/Page triple must fail AT THE DATABASE. That last case is '
                           + 'asserted as `rejected` with its SQLSTATE named, so it cannot be satisfied by a '
                           + 'policy refusing first — which would be a different control passing under this '
                           + "one's name.\n\n"
                           + 'BATCH 030 ADDS A FOURTH KIND, and it is the first that is not about a tenant at '
                           + 'all: an id that names a REAL ROW OF THE WRONG TABLE. '
                           + '`owner-a-cannot-pin-business-a1-to-a-row-that-is-not-a-pack-version` passes the '
                           + 'industry PACK\'s id where a published VERSION is required — a row the caller '
                           + 'holds, in a table it may not read, admitted by every policy — and the foreign '
                           + 'key refuses it with 23503. It is asserted as `rejected` with the SQLSTATE named, '
                           + 'because a case that would also pass on 42501 would be satisfied by a policy '
                           + 'stopping the row on a database whose foreign key had been dropped.\n\n'
                           + 'BATCH 040 ADDS FORGERIES AND ADDS NO `rejected` CASE, and the absence is a '
                           + 'finding rather than an omission. A forged workspace_id, a forged created_by '
                           + 'naming another ACTIVE member of the same workspace, and a version forged onto '
                           + "another tenant's knowledge item all fail — every one of them with 42501, at "
                           + 'the POLICY. That is not a weaker schema: 040\'s INSERT policy checks the '
                           + 'Business and the Page with subqueries that are the composite foreign keys\' '
                           + 'own conditions evaluated under RLS, and the version\'s restrictive policy is '
                           + "the version FK's condition evaluated under RLS, so a caller who would violate "
                           + 'either constraint is refused by a policy FIRST. 020 could assert a raw 23503 '
                           + 'because its version INSERT policy checked only created_by and the role. A '
                           + '`rejected` case here would demand an outcome a correct database cannot '
                           + 'produce, so the constraints are held by 040_knowledge.sql\'s text and by its '
                           + 'apply-time block instead, and this note says which layer actually refuses.' },
  8: { covered: 'negative-half', note: 'RFC-2026-017 §7. The POSITIVE half — the server fixture '
                           + 'succeeds — is not asserted, because §8.1 marks no identity operation `S` '
                           + 'and batch 010 therefore writes the service no policy. Asserting a success '
                           + 'would have required inventing the permission first. The negative half is '
                           + 'the half that detects a regression, and it is asserted. Batch 020 extends it '
                           + 'to its own tables and adds the one cell where §8.1 marks the service `N` '
                           + 'rather than `P`: immutable version UPDATE/DELETE. BOTH VERBS are asserted, '
                           + 'not the pair as one — they are separate privileges, so a batch that granted '
                           + 'one of them would be caught by exactly one of the two cases. Both are refused '
                           + 'at the privilege layer, because app_worker is granted SELECT and INSERT there '
                           + 'and nothing else.\n\n'
                           + 'BATCH 030 IS WHERE THE NEGATIVE HALF DOES ITS MOST WORK, because on its two '
                           + 'GLOBAL tables the service is the ONLY identity holding a grant at all. '
                           + '`service-sees-zero-rows-in-the-industry-pack-catalog` and '
                           + '`service-sees-zero-published-pack-versions` are therefore the only two cases in '
                           + 'the whole suite where row level security is the sole thing refusing a read of a '
                           + 'row that belongs to nobody — and they are the two the CI negative control for '
                           + 'those tables breaks. The service version-mutation pair is asserted there too, '
                           + 'and at the GRANT layer, because a published pack version is §8.1\'s only `N` in '
                           + 'the service column.\n\n'
                           + 'BATCH 040 EXTENDS THE NEGATIVE HALF AND MOVES NOTHING. The service reads zero '
                           + 'rows from BOTH knowledge tables while holding grants on both; its UPDATE of a '
                           + 'knowledge item is FILTERED rather than refused — it holds that grant, so the '
                           + 'empty result is attributable to row level security and is witnessed rather '
                           + 'than merely observed — and its UPDATE and DELETE of a version are refused at '
                           + 'the GRANT layer, which is §8.2\'s only `N` in the service column. The positive '
                           + 'half is still not asserted, and asserting it would still require inventing '
                           + 'the `P` §8.2 leaves undefined.\n\n'
                           + 'BATCH 041 EXTENDS THE NEGATIVE HALF ONTO A FUNCTION AND IS THE FIRST BATCH '
                           + 'WHERE A SERVICE GRANT EXISTS TO PRESERVE THIS ASSERTION RATHER THAN TO ADD A '
                           + 'PERMISSION. app_worker is granted EXECUTE on app.knowledge_scope_applies '
                           + 'precisely so that `service-resolves-zero-knowledge-items` can be a filtered '
                           + 'read: without the grant the service would be refused 42501 ON THE FUNCTION, '
                           + 'and 040\'s attribution property — an empty service read is row level security '
                           + 'and not a forgotten GRANT — would hold for hand-written queries while quietly '
                           + 'failing for every query written against the contract. The positive half is '
                           + 'still not asserted and still would require inventing §8.2\'s `P`.\n\n'
                           + 'BATCH 050 IS THE BATCH BATCH 010 PREDICTED BY NAME, AND THE ROW STILL DOES NOT '
                           + 'MOVE. 010\'s header records that §8.1 contains no `S` cell at all and that "the '
                           + '`S` operations the amendment exists for live in §8.2-§8.4 — research rows, '
                           + 'publish delivery, JOB PAYLOADS, usage ledger, audit inserts — and belong to '
                           + 'batches 050, 061, 070, 120, 140. Their owners inherit the shape." §8.4\'s '
                           + '"Internal job/attempt/DLQ payload | N N N N N S" is the first `S` cell any batch '
                           + 'in this schema has owned, and 050 still writes the service NO POLICY. Three '
                           + 'reasons, argued in 050_async_kernel.sql\'s header: RFC-2026-016 §2 scopes the '
                           + 'service policy by "a server-set workspace GUC" and NAMES NONE; RFC-2026-019 §4/3 '
                           + '(approved, and newer) decides that app_worker\'s connection method is undecided '
                           + 'and nothing can yet be that role; and — the reason no earlier batch could have '
                           + 'found — a workspace-scoped GUC cannot express §3.4\'s lease claim, because a '
                           + 'claim query cannot name a workspace when reading the row is what tells you '
                           + 'which workspace it belongs to. A queue is the one family in §8 where the '
                           + 'service DISCOVERS the tenant context rather than arriving with it.\n\n'
                           + 'So the positive half stays unasserted for a SIXTH batch, and on these three '
                           + 'tables the negative half is the whole of the live evidence: no client role '
                           + 'holds anything, so `service-sees-zero-*` and `service-cannot-*` are the only '
                           + 'cases row level security decides, and they are the six the CI negative control '
                           + 'rests on.' },
};

// The ten §8.6 authorization cases every tenant table family owes, and where this suite stands
// across batches 010, 011, 020, 021 and 030.
//
// §8.6 opens "ทุก table family ต้องมี test อย่างน้อย 10 cases", and batch 030 is the first to add a
// family the ten were not written about. `app.industry_assignments` is a tenant table and takes them
// as written. The two GLOBAL tables cannot: cases 3, 4, 5 and 6 are all about a Workspace, a
// Business, a Page or a membership, and a published catalog row has none of those. Where a case
// cannot apply the disposition says so and names what stands in its place, rather than counting a
// refusal that holds for everybody as a boundary that holds for one tenant.
export const AUTHORIZATION_CASE_COVERAGE = {
  1: 'covered — owner reads its workspace and inserts an invitation (010); owner reads its '
   + 'businesses, pages and versions, creates a business, a page and a new version (020); owner '
   + 'creates a member scope, and a SCOPED EDITOR reads and writes inside its scope (021); owner '
   + 'assigns an industry pack to the one live Business the fixture leaves unassigned, re-pins '
   + 'another to a second published version, and a scoped editor re-pins the Business its scope '
   + 'names (030); owner and EDITOR both create a knowledge item, rename one and append a version, '
   + 'and the same owner creates one at each of the two scope shapes — business-level and '
   + 'page-level (040). BATCH 041 ADDS THE READ SIDE OF THE SAME CELL AS A CONTRACT RATHER THAN '
   + 'AS A QUERY: the owner resolves a business-level item for a Page, a page-level item for its own '
   + 'Page, a sibling-page item for the sibling Page, and a business-level item for a request naming '
   + 'no Page at all — four positives, one per branch of app.knowledge_scope_applies, so that every '
   + 'predicate negative beside them differs from a passing case in exactly one argument.',
  2: 'covered — viewer, editor and approver are all refused the owner-only workspace update (010) '
   + 'and the owner-or-admin business and page writes (020). The editor is the one to read '
   + 'carefully, and batch 021 is where the reading changed. §8.1 marks Business/Page INSERT/UPDATE '
   + '`P` for editor; batch 020 denied it because `P` is conditional on a capability whose table did '
   + 'not exist. 021 creates that table and implements the cell as "an editor whose member scope '
   + 'EXPLICITLY covers the row", so the editor cases now split: an UNSCOPED editor is still refused '
   + '(`editor-a-cannot-create-a-business`, which passes for a new reason — a fresh Business id is '
   + 'covered by no scope row), and a scoped one passes on the row its scope names and is refused on '
   + 'every other. The default-deny is still asserted; what changed is that the grant beside it is '
   + 'now asserted too. Batch 030 repeats the split on app.industry_assignments and adds the case '
   + 'the earlier tables had no shape for: an APPROVER whose member scope covers the row is still '
   + 'refused the write, so role and scope are visibly two different tests rather than one. BATCH '
   + '040 IS WHERE THE EDITOR READS THE OTHER WAY, and the difference is §8.2 rather than a change '
   + 'of mind: that matrix marks "Knowledge current INSERT/UPDATE/archive" `Y` for the editor where '
   + '§8.1 marks the Business/Page equivalent `P`, so 040 names the editor in the permissive write '
   + 'policy unconditionally and lets the scope rule narrow it — `admits`, the treatment §8\'s '
   + 'legend gives every `Y`, and never `covers`, which belongs to a `P`. The pair that says so is '
   + '`editor-a-can-create-a-knowledge-item-under-business-a1` passing while '
   + '`editor-a-cannot-create-a-business` still fails for the same identity. The approver and the '
   + 'viewer are refused on both knowledge tables, each while holding a member scope that admits '
   + 'the row.',
  3: 'COVERED BY BATCH 021. business_a1 and business_a2 are both in workspace A, and '
   + '`workspace_member_scopes` now carries the row that narrows a member to one of them. '
   + 'user_editor_a holds a `business` scope on business_a1 and is refused business_a2, page_a2 and '
   + 'the version rows of both — four cases, each paired with a positive on the business_a1 side, '
   + 'and with `owner-a-is-unscoped-and-sees-business-a2` so that the negatives cannot be satisfied '
   + 'by business_a2 becoming unreadable to everyone. The refusal is a RESTRICTIVE policy, which is '
   + 'the only shape that can narrow what a merged batch already granted. BATCH 030 carries the '
   + 'same three shapes on app.industry_assignments — a filtered read, a filtered write with a '
   + 'witness, and a raised INSERT — and keeps the restrictive form even though it creates the '
   + 'table itself, because one policy per table means the scope rule has one home rather than one '
   + 'per permissive policy. BATCH 040 CARRIES THE SAME THREE SHAPES ON app.knowledge_items — a '
   + 'filtered read, a filtered write with a witness, and a raised INSERT — and adds them on '
   + 'app.knowledge_item_versions, where the narrowing is not a copy of the item\'s predicate but '
   + 'the item\'s own reachability, so the history of a Business outside the scope is refused for '
   + 'the same reason the Business is.',
  4: 'COVERED BY BATCH 021, and it needed two fixture rows §12.6 does not name. Case 4 is "same '
   + 'Business, allowed Page A, row Page B", and every identity §12.6 lists is scoped at BUSINESS '
   + 'level or not at all — a business scope admits every Page beneath it by §7\'s own definition, '
   + 'so none of them can be refused a Page inside their own Business. user_page_editor_a holds a '
   + '`page` scope on page_a1 and is refused page_a1_sibling, which is a second Page under '
   + 'business_a1; `page-editor-a-sees-page-a1-in-scope` and `owner-a-sees-page-a1-sibling` are the '
   + 'two positives that keep the negative from being about a missing row. BATCH 030 CARRIES NO '
   + 'CASE FOR IT AND SAYS SO: §4\'s ERD hangs INDUSTRY_ASSIGNMENT off BUSINESS_PROFILE and off '
   + 'nothing else, and §5 scopes the family "global/business", so this table has no Page level for '
   + 'case 4 to be about. What 030 does record is the consequence at the level it DOES have — '
   + '`page-editor-a-can-repin-the-industry-assignment-of-business-a1`, because 021\'s '
   + '`member_scope_covers_business` counts a page scope on its parent Business, which is 021\'s '
   + 'definition and not 030\'s to change. BATCH 040 IS THE FIRST TO ASK CASE 4 ABOUT A ROW\'S OWN '
   + 'PAGE SCOPE rather than about its parent\'s. Batch 021 could only refuse a member a PAGE ROW; '
   + 'a knowledge item carries `page_context_profile_id` itself (§4 invariant 3 — a nullable '
   + 'override on a row that always has a Business scope), so `knowledge_a1_page` and '
   + '`knowledge_a1_sibling_page` sit in the SAME Business and differ in nothing but that column. '
   + 'user_page_editor_a reads the first and is refused the second, on the item and on its version, '
   + 'for the read and for both writes. The same consequence of 021\'s definition appears here too '
   + 'and is asserted positively rather than left implicit: '
   + '`page-editor-a-can-update-the-business-level-knowledge-item-of-business-a1`, because a page '
   + 'scope counts on its parent Business and business-level knowledge reaches every Page beneath '
   + 'it. That is 021\'s to change, not 040\'s, and the case is what makes changing it visible. '
   + 'BATCH 041 ASKS CASE 4 A THIRD WAY, and it is the only one of the three where the request '
   + 'ITSELF names the wrong Page rather than the row doing so. '
   + '`page-editor-a-cannot-resolve-the-knowledge-item-of-the-sibling-page` resolves FOR the sibling '
   + 'Page — so the scope predicate admits the row and only the member scope refuses — and '
   + '`owner-a-does-not-resolve-the-sibling-page-knowledge-item-for-page-a1` is the same row refused '
   + 'by the PREDICATE for an identity that can read it. The two negatives look alike and fail for '
   + 'opposite reasons, which is why each is paired with the statement that differs from it in one '
   + 'argument and returns the row.',
  5: 'covered — the cross-tenant cases, run while holding workspace_b\'s exact id (010), and the '
   + 'same on business_profiles, page_context_profiles and both version tables while holding '
   + "business_b1's and page_b1's exact ids, which is also how the version rows beneath them are "
   + 'addressed (020); and on app.industry_assignments, in both directions and on both the read and '
   + 'the write path (030). Batch 030\'s two GLOBAL tables are excluded on purpose: a row that '
   + 'belongs to no workspace has no cross-tenant case, and pretending otherwise would be counting '
   + 'a refusal that holds for everybody as a tenant boundary. What is asserted there instead is '
   + 'that BOTH owners are refused identically. BATCH 040 adds it on both knowledge tables, in both '
   + 'directions, on the read and on the write path — and it is the first family where the row '
   + 'behind the boundary is CONTENT-2, so a failure here would leak what another tenant\'s '
   + 'business SAYS rather than what it is called. BATCH 041 re-asks it through the resolution '
   + 'contract, where the predicate answers TRUE for the far tenant\'s row and the near tenant\'s '
   + 'owner still sees nothing while holding its Business, Page and knowledge ids exactly — the '
   + 'boundary asserted on a PATH to the table rather than on the table.',
  6: 'covered — user_suspended_a, both halves, on all four batches\' tables. Batch 021 gives this '
   + 'identity a scope row ON PURPOSE so that `suspended-a-sees-zero-scope-rows` is about a policy '
   + 'rather than about a table with no row for them, and batch 030 re-asks it of the industry '
   + 'assignment, whose only membership predicate is the batch 011 helper. Batch 040 re-asks it of '
   + 'the knowledge item and of its version, which reaches the helper twice — once through its own '
   + 'permissive policy and once through the item its restrictive narrowing resolves. Batch 041 '
   + 're-asks it once more through app.knowledge_scope_applies, which is `security invoker` and '
   + 'reads no relation, so a suspended member gains nothing by going through the contract instead '
   + 'of writing the filter out.',
  7: 'covered — anonymous, refused at the privilege layer because anon holds no grant at all. On '
   + 'batch 030 that case is doing more than bookkeeping: the industry catalog is PUBLIC-0 and is '
   + 'the one family somebody might reasonably propose exposing anonymously, so the refusal is '
   + 'asserted on the SCHEMA and fails the day anon is granted USAGE on app. Batch 040 asserts the '
   + 'same refusal on the family at the other end of that scale — knowledge is CONTENT-2 and '
   + '"tenant isolated" by §9.1 — because the control is the same control and stating it per table '
   + 'is what makes it checkable per table. BATCH 041 ADDS THE FIRST ANONYMOUS CASE ABOUT A '
   + 'FUNCTION, and says what it does not prove: the refusal lands on the SCHEMA before either the '
   + 'function or the table is reached, so it proves the chokepoint RFC-2026-021 §7/4 decides and '
   + 'not the absence of the EXECUTE grant, which 041\'s apply-time block asserts against the live '
   + 'ACL instead.',
  8: 'covered — a forged created_by on the invitation insert (010), on the business insert (020) '
   + 'and on the industry assignment insert (030), all of which raise. On 030 the same statement '
   + "succeeds with the caller's own subject two cases earlier, so the case is about the forged "
   + 'column rather than about the caller being unable to write. On 040 the forged created_by names '
   + 'ANOTHER ACTIVE MEMBER OF THE SAME WORKSPACE, so nothing but that conjunct can refuse it, and '
   + 'the forged SCOPE columns are asserted three ways: a workspace_id naming the other tenant, a '
   + 'page from a Business the row does not name, and a version forged onto another tenant\'s '
   + 'knowledge item. ALL OF THEM RAISE 42501 AT THE POLICY and none of them reaches a constraint, '
   + 'which is stated in §12.6/7\'s note rather than dressed up as a `rejected` case: 040\'s scope '
   + "subqueries are the composite foreign keys' own conditions evaluated under RLS, so a caller "
   + 'who would violate one is refused by a policy first.\n\n'
   + 'BATCH 050 IS THE FIRST FAMILY WITH NOTHING TO FORGE, and the disposition says so rather than '
   + 'leaving the case silently uncounted. app.jobs, app.outbox_events and app.consumer_ledger carry '
   + 'NO created_by and NO updated_by: §3.2 adds the audit actor columns for a USER MUTATION, and §8 '
   + "grants no client any write on any of the three, so the columns would be two nullable uuids "
   + "nothing writes — 030's reading on the global catalog, applied to a tenant table for the first "
   + 'time. There is also no client INSERT to forge them on. What stands in the case\'s place is an '
   + 'assertion of the same kind one layer earlier: `owner-a-cannot-enqueue-a-job-row` and '
   + '`owner-a-cannot-publish-an-outbox-event`, because a client that cannot write the row at all is '
   + 'a client for whom forging a column on it is not a question.',
  9: 'COVERED BY BATCH 020, and this is the case 010 could only approximate. app.business_profile_'
   + 'versions and app.page_context_profile_versions are immutable by §3.2, §4 invariant 8 and '
   + "§8.1's `N N N N N N` row — the only row in §8.1 where the SERVICE column is N. SIX LIVE CASES, "
   + 'and the grid they cover is stated rather than rounded up: update and delete by the WORKSPACE '
   + 'OWNER on BOTH version tables, and update and delete by the SERVICE identity on '
   + 'business_profile_versions. Service-on-page_context_profile_versions has no live case; it is '
   + 'covered by 020_business.sql\'s own apply-time block, which walks the whole grid — five roles '
   + '(authenticated, anon, app_worker, app_command, app_maintenance) against both tables, through '
   + 'has_any_column_privilege and has_table_privilege — and raises if any cell holds either verb. '
   + 'That block is the stronger control of the two, because it also catches a grant made by a LATER '
   + 'batch, which no case in this file would see. Every live case declares the LAYER as `grant`: no '
   + 'role is granted UPDATE or DELETE on either table, so the refusal happens before RLS is '
   + 'consulted. That distinction is the assertion — a policy can be widened by an edit, an absent '
   + 'grant has to be granted.\n\n'
   + 'BATCH 030 ADDS A THIRD IMMUTABLE TABLE AND COMPLETES THE GRID ON IT. '
   + 'app.industry_pack_versions is "published immutable" by §5, §3.2 and §4 invariant 8, and all '
   + 'four cells are live: update and delete by the workspace OWNER and by the SERVICE identity, '
   + 'each at the grant layer. It is the first immutable table in the schema that belongs to no '
   + 'tenant, so the refusal cannot be mistaken for a tenant boundary — nobody can write it, and '
   + '030\'s own apply-time block walks six roles against it and raises if any holds either verb.\n\n'
   + 'BATCH 040 ADDS A FOURTH IMMUTABLE TABLE AND COMPLETES THE GRID ON IT TOO. '
   + 'app.knowledge_item_versions is immutable by §3.2, §4 invariant 8 and §8.2\'s "Knowledge '
   + 'version UPDATE/DELETE | N N N N N N", and all four cells are live: update and delete by the '
   + 'workspace OWNER and by the SERVICE identity, each declared at the GRANT layer because no role '
   + 'holds either verb. It is the first immutable table whose contents are CONTENT-2 — the others '
   + 'held names and catalog labels — so "history cannot be rewritten" here means the record of '
   + 'what a business said cannot be rewritten. 040\'s own apply-time block walks six roles against '
   + 'it through has_any_column_privilege and has_table_privilege and raises if any cell holds '
   + 'either verb, which catches a grant made by a LATER batch that no case in this file would '
   + 'see.\n\n'
   + 'BATCH 050 ADDS THE OTHER NOUN IN §8.6 CASE 9. That case reads "Immutable/LEDGER row → '
   + 'update/delete fail", and four batches have carried it on immutable VERSION tables only. '
   + 'app.consumer_ledger is the first LEDGER in this schema — §5 calls the family "state + '
   + 'append-only" and §10 gives it CONSUMER-LEDGER, "event dedupe keys ... retained for replay '
   + 'safety" — and all four cells are live: update and delete, by the WORKSPACE OWNER and by the '
   + 'SERVICE, each at the GRANT layer because no role holds either verb. The claim it carries is '
   + 'different from a version table\'s: a version row that could be edited would rewrite history, '
   + 'and a LEDGER row that could be edited or removed would make a redelivery replayable, which is '
   + 'the one thing the table exists to prevent. The outbox is immutable in a narrower sense and is '
   + 'asserted that way — `service-cannot-rewrite-an-outbox-event-envelope` is refused at the COLUMN '
   + 'privilege layer, because app_worker holds UPDATE on dispatched_at and on no other column, and '
   + "050's apply-time block walks every other column against six roles.",
  10: 'not applicable to batches 010-040 — no command function is specified for identity, for '
    + 'business.core, for industry.core or for knowledge.core, and audit (140) and outbox (050) do '
    + 'not exist yet. BATCH 040 MAKES THE GAP CONCRETE RATHER THAN LARGER: a client holding INSERT '
    + 'on app.knowledge_item_versions can write a version whose name never was the item\'s name, '
    + 'because nothing binds the two statements into one transaction. RLS cannot fix that — it is a '
    + 'property of a write path, not of a row — and the command surface owes it, which 040\'s header '
    + 'records rather than working around with a trigger nobody specified. Batch '
    + '030 makes the gap more visible rather than smaller: RFC-2026-012 §4 names SECURITY DEFINER '
    + 'command functions as the enforcement mechanism for the whole client/database boundary, and '
    + 'the industry catalog is the first family this repository has written that is unreadable '
    + 'without one. The command surface is owed to DATA-DEC-03 and the RFC that opens the read '
    + 'allowlist.\n\n'
    + 'BATCH 050 MAKES THE STATEMENT PRECISE RATHER THAN PAYING IT. §8.6 case 10 is "Authorized '
    + 'server command → pass + expected audit/OUTBOX", and batch 040\'s note above says the outbox '
    + '"does not exist yet". IT EXISTS NOW — app.outbox_events, with the envelope CTR-EVT-001 fixes '
    + '— and the case is still unpayable, because the half that is missing is the COMMAND. That is a '
    + 'sharper claim than 040 could make and it names exactly what remains: RFC-2026-012 §4 makes a '
    + 'SECURITY DEFINER function owned by app_command the enforcement mechanism, RFC-2026-019 §2 '
    + 'measured ZERO such functions on the instance, and §3.4 requires the domain state and its '
    + 'outbox event to be written in ONE TRANSACTION — which today would have to be a client\'s, '
    + 'because a client is the only thing that writes domain state. So batch 050 grants the client '
    + 'nothing on the outbox and `owner-a-cannot-publish-an-outbox-event` asserts it: a client that '
    + 'could write here would choose the event_type, the producer and the subject every consumer '
    + 'downstream routes on, and a forged domain event is not a leaked row but an instruction. The '
    + 'audit half is still 140\'s. When the first command function lands, this case becomes payable '
    + 'in one batch and not two.',
};

const WORKSPACE_A_NAME = 'fixture workspace a';
const WORKSPACE_A_TIMEZONE = 'Asia/Bangkok';

// The batch 020 fixture's own values, which the no-effect witnesses read back. They are here and
// not inline for the reason the witness exists at all: a witness that asserts "a row is still
// there" and not "it still says what it said" is expectNoRows wearing a different name, so the
// expected VALUE has one home and the fixture has the other.
const BUSINESS_A1_NAME = 'fixture business a1';
const BUSINESS_A2_NAME = 'fixture business a2';
const BUSINESS_B1_NAME = 'fixture business b1';
const PAGE_A1_NAME = 'fixture page a1';
const PAGE_B1_NAME = 'fixture page b1';
// Batch 021's own fixture value, for the same reason: a `no-effect` case against a row a scoped
// member must not touch needs a witness that reads the value back, and the value has one home.
const PAGE_A1_SIBLING_NAME = 'fixture page a1 sibling';
// Batch 040's fixture values, for the same reason again. Four of the five knowledge rows are read
// back by a witness after a write somebody was refused, and a witness that asserts "a row is still
// there" without asserting what it SAYS is expectNoRows wearing a different name.
const KNOWLEDGE_A1_BUSINESS_NAME = 'fixture knowledge a1 business';
const KNOWLEDGE_A1_SIBLING_PAGE_NAME = 'fixture knowledge a1 sibling page';
const KNOWLEDGE_A2_BUSINESS_NAME = 'fixture knowledge a2 business';
const KNOWLEDGE_B1_BUSINESS_NAME = 'fixture knowledge b1 business';

/**
 * @param {(symbol: string) => string} id  resolves a fixture symbol to its uuid. Passing a
 *        resolver rather than the ids themselves is what makes "a test never generates a uuid"
 *        a property of the shape instead of a rule someone has to remember.
 */
export function buildCases(id) {
  const ownerA = { helper: 'as_user', subject: id('user_owner_a') };
  const editorA = { helper: 'as_user', subject: id('user_editor_a') };
  // Batch 021's identity, and the only one in the suite whose scope is a single Page. §8.6 case 4
  // cannot be carried by any identity §12.6 names, because all of them are scoped at Business level
  // or not at all and a business scope admits every Page beneath it.
  const pageEditorA = { helper: 'as_user', subject: id('user_page_editor_a') };
  const approverA = { helper: 'as_user', subject: id('user_approver_a') };
  const viewerA = { helper: 'as_user', subject: id('user_viewer_a') };
  const suspendedA = { helper: 'as_suspended_user', subject: id('user_suspended_a') };
  const ownerB = { helper: 'as_user', subject: id('user_owner_b') };
  const anonymous = { helper: 'as_anonymous' };
  const service = { helper: 'as_service' };

  const A = id('workspace_a');
  const B = id('workspace_b');

  // Batch 020's rows, by fixture SYMBOL. Every one is resolved here and never written, which is
  // what makes the cross-tenant cases below say something: tenant A's owner attacks business_b1 and
  // page_b1 while holding each one's EXACT id.
  const BUSINESS_A1 = id('business_a1');
  const BUSINESS_A2 = id('business_a2');
  const BUSINESS_A3_ARCHIVED = id('business_a3_archived');
  const BUSINESS_B1 = id('business_b1');
  const PAGE_A1 = id('page_a1');
  const PAGE_A2 = id('page_a2');
  const PAGE_B1 = id('page_b1');
  // Batch 021's row: a second Page under business_a1. page_a2 cannot serve — it is under
  // business_a2, so a member refused it has been refused by BUSINESS scope, which is §8.6 case 3.
  const PAGE_A1_SIBLING = id('page_a1_sibling');

  // A version row is addressed by its PARENT AND ITS ORDINAL, never by an id of its own. 020 makes
  // (business_profile_id, version_number) and (page_context_profile_id, version_number) unique, so
  // this pair names exactly one existing row — and the catalog therefore needs no symbol for a
  // version, which is six fewer derived constants to keep in step with the fixture.
  //
  // It costs the cross-tenant cases nothing. §12.6's control is that the attacker holds the target
  // tenant's REAL identifiers, and business_b1's and page_b1's ids are exactly that; asking for
  // "version 1 of business_b1" is as precise as asking for a uuid and is legible besides.
  const VERSION_1_OF_BUSINESS = 'business_profile_id = $1 and version_number = 1';
  const VERSION_1_OF_PAGE = 'page_context_profile_id = $1 and version_number = 1';

  // The witness for every attempted write against workspace A: its owner can see it, and its
  // name is untouched. Used by `no-effect` cases, which are only as strong as this half.
  const workspaceANameUnchanged = {
    as: ownerA,
    sql: 'select name from app.workspaces where id = $1',
    params: [A],
    column: 'name',
    equals: WORKSPACE_A_NAME,
  };

  // Workspace B is unreachable by every A-side identity, so its witness runs as ITS owner.
  const workspaceBNameUnchanged = {
    as: ownerB,
    sql: 'select name from app.workspaces where id = $1',
    params: [B],
    column: 'name',
    equals: 'fixture workspace b',
  };

  // sha256() from pg_catalog rather than pgcrypto's digest(): `public.digest` does not exist on the
  // provisioned instance, where pgcrypto lives in `extensions`. See the fixture's note; the two
  // produce the same bytes, so the invitation identities are unchanged.
  const invite = (workspace, tokenSymbol, createdBy) => ({
    sql: 'insert into app.workspace_invitations (workspace_id, role, token_hash, expires_at, created_by)'
       + " values ($1, 'editor', sha256(convert_to($2, 'utf8')), now() + interval '1 day', $3)"
       + ' returning id',
    params: [workspace, tokenSymbol, createdBy],
  });

  // -- Batch 020 builders. ---------------------------------------------------------------------
  //
  // None of the three passes an `id`: the column defaults to gen_random_uuid(), the row is rolled
  // back with its transaction, and no case has any reason to hold the id of a row it is creating.
  // The rows these cases READ are a different matter and are addressed by their catalog id.
  const createBusiness = (workspace, createdBy) => ({
    sql: 'insert into app.business_profiles (workspace_id, name, created_by, updated_by)'
       + " values ($1, 'attempted business', $2, $2) returning id",
    params: [workspace, createdBy],
  });

  const createPage = (workspace, business, createdBy) => ({
    sql: 'insert into app.page_context_profiles (workspace_id, business_profile_id, name, created_by, updated_by)'
       + " values ($1, $2, 'attempted page', $3, $3) returning id",
    params: [workspace, business, createdBy],
  });

  // version_number 2, never 1, and the reason is which constraint fires first. The fixture already
  // holds version 1 of every business, so a case reusing that number would hit the
  // (business_profile_id, version_number) unique index — which is checked DURING the insert, before
  // the foreign key's after-trigger runs — and the cross-workspace case below would come back 23505
  // instead of the 23503 it exists to observe. A case that can be satisfied by the wrong constraint
  // is not evidence about the right one.
  const createBusinessVersion = (workspace, business, createdBy) => ({
    sql: 'insert into app.business_profile_versions'
       + ' (workspace_id, business_profile_id, version_number, name, created_by)'
       + " values ($1, $2, 2, 'attempted business version', $3) returning id",
    params: [workspace, business, createdBy],
  });

  const businessA1NameUnchanged = {
    as: ownerA,
    sql: 'select name from app.business_profiles where id = $1',
    params: [BUSINESS_A1],
    column: 'name',
    equals: BUSINESS_A1_NAME,
  };

  const businessB1NameUnchanged = {
    as: ownerB,
    sql: 'select name from app.business_profiles where id = $1',
    params: [BUSINESS_B1],
    column: 'name',
    equals: BUSINESS_B1_NAME,
  };

  const pageA1NameUnchanged = {
    as: ownerA,
    sql: 'select name from app.page_context_profiles where id = $1',
    params: [PAGE_A1],
    column: 'name',
    equals: PAGE_A1_NAME,
  };

  const pageB1NameUnchanged = {
    as: ownerB,
    sql: 'select name from app.page_context_profiles where id = $1',
    params: [PAGE_B1],
    column: 'name',
    equals: PAGE_B1_NAME,
  };

  // -- Batch 021 witnesses and builders. -------------------------------------------------------
  //
  // Both witnesses run as user_owner_a, which is the UNSCOPED identity in workspace A: it is the
  // only A-side identity that can see every row a scoped member is refused, which is exactly what a
  // witness for a scoped member's blocked write has to do.
  const businessA2NameUnchanged = {
    as: ownerA,
    sql: 'select name from app.business_profiles where id = $1',
    params: [BUSINESS_A2],
    column: 'name',
    equals: BUSINESS_A2_NAME,
  };

  const pageA1SiblingNameUnchanged = {
    as: ownerA,
    sql: 'select name from app.page_context_profiles where id = $1',
    params: [PAGE_A1_SIBLING],
    column: 'name',
    equals: PAGE_A1_SIBLING_NAME,
  };

  // A scope row carries no id in any case, so a write builder passes none: the row is addressed by
  // the member and the target, which is what makes it unique, and the transaction is rolled back.
  const scopeAllBusinesses = (workspace, member, createdBy) => ({
    sql: 'insert into app.workspace_member_scopes'
       + ' (workspace_id, user_id, scope_type, created_by, updated_by)'
       + " values ($1, $2, 'all_businesses', $3, $3) returning id",
    params: [workspace, member, createdBy],
  });

  const scopeToBusiness = (workspace, member, business, createdBy) => ({
    sql: 'insert into app.workspace_member_scopes'
       + ' (workspace_id, user_id, scope_type, business_profile_id, created_by, updated_by)'
       + " values ($1, $2, 'business', $3, $4, $4) returning id",
    params: [workspace, member, business, createdBy],
  });

  // The scope of one member, read by member rather than by row id. Every scope-visibility case goes
  // through this shape, so "the caller sees its own rows and nobody else's" is asked the same way
  // of every identity.
  const scopesOf = 'select scope_type from app.workspace_member_scopes where workspace_id = $1 and user_id = $2';

  // -- Batch 030 builders and witnesses. -------------------------------------------------------
  //
  // The GLOBAL rows, by fixture SYMBOL. They carry no `_a` or `_b` suffix because they belong to no
  // tenant, and the cases below attack them from BOTH sides of the boundary: the assertion is never
  // "A cannot reach B's row", which would be meaningless about a catalog, but "no request-path
  // identity reaches it at all".
  const PACK = id('industry_pack_interior');
  const PACK_V1 = id('industry_pack_interior_v1');
  const PACK_V2 = id('industry_pack_interior_v2');
  // The live Business batch 030's fixture leaves unassigned, which is the only target a permitted
  // INSERT can use: every other live Business in workspace A must already carry an assignment for
  // the scope and cross-tenant negatives to be about a policy rather than about a missing row.
  const BUSINESS_A4 = id('business_a4_unassigned');

  // An assignment is addressed by the Business it belongs to, never by an id of its own: 030 makes
  // (workspace_id, business_profile_id) unique because §4's ERD makes it zero-or-one per Business,
  // so this pair names exactly one existing row and the catalog needs no symbol for it.
  const ASSIGNMENT_OF = 'workspace_id = $1 and business_profile_id = $2';

  // The pinned version of one Business, which is what every assignment positive reads and every
  // no-effect witness reads back. Naming the version in the WHERE clause rather than only selecting
  // it is what makes `owner-a-sees-...-the-global-pack-version` and
  // `owner-b-sees-...-the-same-global-pack-version` a claim about ONE row rather than two.
  const pinnedTo = `select id from app.industry_assignments where ${ASSIGNMENT_OF} and industry_pack_version_id = $3`;

  const repin = (workspace, business, version) => ({
    sql: `update app.industry_assignments set industry_pack_version_id = $3, updated_by = $4`
       + ` where ${ASSIGNMENT_OF} returning id`,
    params: [workspace, business, version, '__SELF__'],
  });

  const assign = (workspace, business, version, createdBy) => ({
    sql: 'insert into app.industry_assignments'
       + ' (workspace_id, business_profile_id, industry_pack_version_id, created_by, updated_by)'
       + ' values ($1, $2, $3, $4, $4) returning id',
    params: [workspace, business, version, createdBy],
  });

  // The witness for a blocked write against an assignment reads the PINNED VERSION back, not the
  // row's existence: `no-effect` is only stronger than an empty result because the witness proves
  // the value did not move, and business_a2 is pinned to a DIFFERENT version from business_a1 so a
  // write that had gone through would be visible rather than idempotent.
  const assignmentWitness = (as, workspace, business, version) => ({
    as,
    sql: `select industry_pack_version_id from app.industry_assignments where ${ASSIGNMENT_OF}`,
    params: [workspace, business],
    column: 'industry_pack_version_id',
    equals: version,
  });

  // -- Batch 040 builders and witnesses. --------------------------------------------------------
  //
  // Knowledge is the first family in this schema whose SCOPE IS TWO COLUMNS. §4 invariant 3 gives
  // every knowledge row a Business scope and makes the Page scope a nullable OVERRIDE, so the rows
  // below come in two shapes and every narrowing case has to say which one it is about: a
  // business-level item is narrowed by `member_scope_admits_business`, a page-level item by
  // `member_scope_admits_page`, and a suite holding only one of the two states would leave half of
  // that policy untested and green.
  const KNOWLEDGE_A1_BUSINESS = id('knowledge_a1_business');
  const KNOWLEDGE_A1_PAGE = id('knowledge_a1_page');
  const KNOWLEDGE_A1_SIBLING_PAGE = id('knowledge_a1_sibling_page');
  const KNOWLEDGE_A2_BUSINESS = id('knowledge_a2_business');
  const KNOWLEDGE_B1_BUSINESS = id('knowledge_b1_business');
  // An ARCHIVED Page under a LIVE Business, and the only row in the fixture where the two parents
  // disagree. 040's INSERT policy carries §11.3's archive clause twice — once per parent — and
  // business_a3_archived can only ever exercise the first of them.
  const PAGE_A1_ARCHIVED = id('page_a1_archived');

  // A knowledge item is addressed by its own id, which is why the catalog needed symbols for these
  // five and needed none for a version, a member scope or an industry assignment: those three have
  // a natural key some document fixes, and a knowledge item has none. Inventing a unique
  // (business_profile_id, kind) so a case could address a row without a symbol would be writing a
  // product decision into a constraint to save five constants.
  const KNOWLEDGE_BY_ID = 'select id from app.knowledge_items where id = $1';
  // A version is addressed by its PARENT AND ITS ORDINAL, exactly as batch 020's are, so the five
  // items above are the only knowledge ids this file holds.
  const VERSION_1_OF_KNOWLEDGE =
    'select id from app.knowledge_item_versions where knowledge_item_id = $1 and version_number = 1';

  const createBusinessKnowledge = (workspace, business, kind, createdBy) => ({
    sql: 'insert into app.knowledge_items'
       + ' (workspace_id, business_profile_id, page_context_profile_id, kind, name, created_by, updated_by)'
       + " values ($1, $2, null, $3, 'attempted knowledge', $4, $4) returning id",
    params: [workspace, business, kind, createdBy],
  });

  // The page column is a literal `null` above and a parameter here rather than one builder taking
  // either: the driver inlines every parameter as a SQL STRING literal, so a JavaScript null would
  // arrive as the text 'null' in a uuid column. The two shapes are also the two cases, and a reader
  // can see which one a case is about from the builder it calls.
  const createPageKnowledge = (workspace, business, page, kind, createdBy) => ({
    sql: 'insert into app.knowledge_items'
       + ' (workspace_id, business_profile_id, page_context_profile_id, kind, name, created_by, updated_by)'
       + " values ($1, $2, $3, $4, 'attempted knowledge', $5, $5) returning id",
    params: [workspace, business, page, kind, createdBy],
  });

  // version_number 2, never 1, for batch 020's reason: the fixture already holds version 1 of every
  // item, so a case reusing that number would hit the (knowledge_item_id, version_number) unique
  // index — checked DURING the insert — and every refusal below would come back 23505 instead of
  // the 42501 it exists to observe.
  const createKnowledgeVersion = (workspace, business, item, createdBy) => ({
    sql: 'insert into app.knowledge_item_versions'
       + ' (workspace_id, business_profile_id, knowledge_item_id, version_number, name, created_by)'
       + " values ($1, $2, $3, 2, 'attempted knowledge version', $4) returning id",
    params: [workspace, business, item, createdBy],
  });

  const renameKnowledge = (item, to) => ({
    sql: 'update app.knowledge_items set name = $2 where id = $1 returning id',
    params: [item, to],
  });

  // Archiving is an UPDATE of the typed lifecycle field §8.2 names in the operation itself
  // ("INSERT/UPDATE/archive"), which is why a refused archive is a different assertion from a
  // refused rename: it is the operation §12.6/3 is most directly about when it says an approver may
  // not EDIT knowledge, and its witness reads the lifecycle rather than the name.
  const archiveKnowledge = (item) => ({
    sql: 'update app.knowledge_items set archived_at = now() where id = $1 returning id',
    params: [item],
  });

  const knowledgeNameUnchanged = (as, item, name) => ({
    as,
    sql: 'select name from app.knowledge_items where id = $1',
    params: [item],
    column: 'name',
    equals: name,
  });

  // `coalesce(archived_at::text, 'live')` rather than the column itself, because the driver renders
  // SQL NULL and the empty string identically and this witness has to distinguish "still live" from
  // "the row came back with nothing in that column".
  const knowledgeStillLive = (as, item) => ({
    as,
    sql: "select coalesce(archived_at::text, 'live') as archive_state from app.knowledge_items where id = $1",
    params: [item],
    column: 'archive_state',
    equals: 'live',
  });

  // -- Batch 041 builders. ----------------------------------------------------------------------
  //
  // The resolution contract, exercised the only way that says anything: as a FILTER in a `where`
  // clause over app.knowledge_items, under a real identity. `app.knowledge_scope_applies` reads no
  // relation and returns a property of its four arguments, so a case that merely CALLED it would be
  // asserting arithmetic — which 041's own apply-time block already asserts on every apply, as a
  // nine-cell truth table on three generated uuids. What these cases add is the half a truth table
  // cannot reach: that the predicate NARROWS the row set batch 040's policies admit and never
  // widens it, and that the two are evaluated together rather than one instead of the other.
  //
  // The `id = $3` conjunct is what makes each case about ONE ROW rather than about a row count. A
  // case asserting "the resolved set is not empty" would pass against a predicate that returned
  // everything, which is precisely the regression a dropped `is null` branch produces.
  const resolveKnowledgeForPage = (business, page, item) => ({
    sql: 'select id from app.knowledge_items'
       + ' where app.knowledge_scope_applies(business_profile_id, page_context_profile_id, $1, $2)'
       + '   and id = $3',
    params: [business, page, item],
  });

  // A request that names NO Page. The page argument is a literal `null::uuid` and not a parameter,
  // for batch 040's reason one file over: the driver inlines every parameter as a SQL STRING
  // literal, so a JavaScript null would arrive as the text 'null' in a uuid position. The two
  // builders are also the two halves of §3.3, and a reader can see which one a case is about from
  // the builder it calls.
  const resolveKnowledgeForBusinessOnly = (business, item) => ({
    sql: 'select id from app.knowledge_items'
       + ' where app.knowledge_scope_applies(business_profile_id, page_context_profile_id, $1, null::uuid)'
       + '   and id = $2',
    params: [business, item],
  });

  // -- Batch 050 builders. The async kernel, and the first family no identity can read. ---------
  //
  // WHAT IS STRUCTURALLY DIFFERENT ABOUT THIS FAMILY, because it changes which OUTCOME KINDS are
  // available and a reader will otherwise look for the ones that are missing.
  //
  // app.jobs, app.outbox_events and app.consumer_ledger carry NO policy and grant NO client role
  // anything (050_async_kernel.sql's header argues both at length). Three consequences follow, and
  // each of them removes a shape this suite normally uses:
  //
  //   * NO `rows` CASE IS POSSIBLE. No identity can read these tables, so there is no positive to
  //     pair a negative against. What stands in its place is the SERVICE's filtered read: app_worker
  //     holds the SELECT grant and no policy, so `service-sees-zero-*` is the one case per table
  //     that row level security decides, and it is the case the CI negative control breaks.
  //   * NO `no-effect` CASE IS POSSIBLE, and this is the sharper one. `no-effect` is an empty result
  //     PLUS a witness read by an identity that can see the target row — and here there is no such
  //     identity, for any row, at all. So a filtered UPDATE cannot be asserted: it would be
  //     `expectNoRows` on a write, which identity-isolation.test.mjs refuses by name. The write path
  //     is carried by the INSERT instead, which is the mutation that RAISES.
  //   * NO `rejected` CASE IS POSSIBLE EITHER, which matters because the ledger's whole mechanism is
  //     a unique constraint. A duplicate insert never reaches the constraint: app_worker holds the
  //     INSERT grant, finds no permissive policy, and is refused with 42501 first. The natural key
  //     is therefore asserted where it CAN be — 050's apply-time block reads it out of pg_constraint
  //     as a column SET — rather than faked here, which is the treatment batch 040 gave §12.6/7.
  //
  // A job is addressed by (workspace_id, dedupe_key) and a ledger row by (workspace_id, consumer,
  // event_id), both unique constraints in 050_async_kernel.sql, so neither needs a fixture symbol.
  // An outbox event does: its identity IS `event_id`, and the ledger row names it.
  const OUTBOX_EVENT_A = id('outbox_event_a');
  const OUTBOX_EVENT_B = id('outbox_event_b');

  // The fixture's own text values, in one home, for the reason every other fixture constant is here:
  // a case that spelled them inline would drift from the file that loads them.
  const FIXTURE_JOB_DEDUPE_A = 'fixture-job-a';
  const FIXTURE_JOB_DEDUPE_B = 'fixture-job-b';
  const FIXTURE_CONSUMER = 'fixture.consumer';

  const JOB_BY_DEDUPE_KEY = 'select id from app.jobs where workspace_id = $1 and dedupe_key = $2';
  const OUTBOX_EVENT_BY_ID = 'select id from app.outbox_events where event_id = $1';
  const LEDGER_ROW_BY_KEY = 'select id from app.consumer_ledger'
    + ' where workspace_id = $1 and consumer = $2 and event_id = $3';

  // A dedupe key no fixture row holds, so the INSERT cases below are refused by the thing they name
  // rather than by (workspace_id, dedupe_key) already existing. Batch 040's version builder had to
  // make the same choice about version_number for the same reason.
  const enqueueJob = (workspace, dedupeKey) => ({
    sql: 'insert into app.jobs'
       + ' (workspace_id, job_type, job_version, priority, available_at, max_attempts,'
       + ' timeout_seconds, dedupe_key, input_ref, progress_stage)'
       + " values ($1, 'attempted.job', 1, 0, now(), 5, 30, $2, 'job:attempted.input', 'attempted')"
       + ' returning id',
    params: [workspace, dedupeKey],
  });

  // `event_id` is left to the column default rather than passed: a case may not contain a uuid, and
  // the two catalog symbols name rows that already exist, so an insert that reused one would be
  // refused by the unique constraint instead of by the layer the case is about.
  const publishOutboxEvent = (workspace, business) => ({
    sql: 'insert into app.outbox_events'
       + ' (event_type, event_version, occurred_at, producer_module_key,'
       + ' producer_implementation_version, workspace_id, subject_type, subject_id, subject_version,'
       + ' correlation_id, schema_ref)'
       + " values ('attempted.outbox.event', 1, now(), 'attempted.module', '0.0.0', $1,"
       + " 'business_profile', $2, 1, 'attempted-correlation', 'CTR-EVT-001@1.0.0') returning id",
    params: [workspace, business],
  });

  const recordConsumption = (workspace, event) => ({
    sql: 'insert into app.consumer_ledger (workspace_id, consumer, event_id)'
       + " values ($1, 'attempted.consumer', $2) returning id",
    params: [workspace, event],
  });

  return [
    // -- §12.6/1, §8.6/1 and §8.6/5. Both directions of the tenant boundary. -------------------
    {
      id: 'owner-a-sees-workspace-a',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerA,
      sql: 'select id from app.workspaces where id = $1',
      params: [A],
      expect: 'rows',
      why: 'The positive half. Without it the next case passes on an empty table and proves nothing.',
    },
    {
      id: 'owner-a-cannot-see-workspace-b',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: 'select id from app.workspaces where id = $1',
      params: [B],
      expect: 'no-rows',
      why: 'Tenant A\'s owner holds tenant B\'s exact id and the row is not there. A filtered SELECT '
         + 'is empty and not an error, so this is the weak assertion, paired with the case above '
         + 'and with the write cases below, which are not.',
    },
    {
      id: 'owner-a-cannot-update-workspace-b',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: 'update app.workspaces set name = $2 where id = $1 returning id',
      params: [B, 'reached across the tenant boundary'],
      expect: 'no-effect',
      witness: workspaceBNameUnchanged,
      why: 'The USING clause does not admit the row, so the statement matches nothing and Postgres '
         + 'raises nothing. The witness — run as B\'s own owner — is what turns "returned nothing" '
         + 'into "the row is still there and still says what it said".',
    },
    {
      id: 'owner-a-cannot-read-workspace-b-settings',
      covers: ['§12.6/1', '§8.6/5'],
      as: ownerA,
      sql: 'select workspace_id from app.workspace_settings where workspace_id = $1',
      params: [B],
      expect: 'no-rows',
      why: 'The tenant boundary holds on the settings table too, not only on the root.',
    },
    {
      id: 'owner-a-cannot-read-workspace-b-invitations',
      covers: ['§12.6/1', '§8.6/5'],
      as: ownerA,
      sql: 'select id from app.workspace_invitations where workspace_id = $1',
      params: [B],
      expect: 'no-rows',
      why: 'An invitation carries a token digest and a contact address. Reading another tenant\'s '
         + 'invitation list is the leak this table would cause.',
    },
    {
      id: 'owner-b-sees-workspace-b',
      covers: ['§8.6/1'],
      as: ownerB,
      sql: 'select id from app.workspaces where id = $1',
      params: [B],
      expect: 'rows',
      why: 'The far side of the boundary is a real, populated tenant. Otherwise every A-side '
         + 'negative above is satisfied by workspace B simply not existing.',
    },
    {
      id: 'owner-a-cannot-read-a-token-digest',
      covers: ['§9.2', '§9.3'],
      as: ownerA,
      sql: 'select token_hash from app.workspace_invitations where workspace_id = $1',
      params: [A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'workspace_invitations' },
      why: '§9.3 stores the hash only and §9.2 says a token is never returned after write. The '
         + 'client role holds INSERT on token_hash and not SELECT, so this is refused at the '
         + 'column-privilege layer even for the owner of the row.',
    },

    // -- §12.6/4 and §8.6/2. Same workspace, wrong role. ---------------------------------------
    {
      id: 'viewer-a-sees-workspace-a',
      covers: ['§12.6/4', '§8.6/1'],
      as: viewerA,
      sql: 'select id from app.workspaces where id = $1',
      params: [A],
      expect: 'rows',
      why: '§8.1 grants Workspace SELECT to viewer. A suite that only showed the viewer refused '
         + 'could not tell a correct policy from a broken grant.',
    },
    {
      id: 'viewer-a-cannot-update-workspace-a',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      sql: 'update app.workspaces set name = $2 where id = $1 returning id',
      params: [A, 'renamed by a viewer'],
      expect: 'no-effect',
      witness: workspaceANameUnchanged,
      why: '§8.1 Workspace UPDATE is N for viewer. Same workspace, wrong role — and the viewer can '
         + 'SEE this row, so the witness is proving the write was stopped and not that the row was '
         + 'invisible.',
    },
    {
      id: 'viewer-a-cannot-update-workspace-a-settings',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      sql: 'update app.workspace_settings set default_timezone = $2 where workspace_id = $1 returning workspace_id',
      params: [A, 'UTC'],
      expect: 'no-effect',
      witness: {
        as: ownerA,
        sql: 'select default_timezone from app.workspace_settings where workspace_id = $1',
        params: [A],
        column: 'default_timezone',
        equals: WORKSPACE_A_TIMEZONE,
      },
      why: 'Settings follow the workspace UPDATE rule, not the workspace SELECT rule.',
    },
    {
      id: 'viewer-a-cannot-invite',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...invite('__A__', 'thinkbizthai.fixture.attempted_invitation_by_viewer', '__SELF__'),
      expect: 'denied',
      why: '§8.1 Invite/change scope is N for viewer. An INSERT is the case where a refusal really '
         + 'is available: WITH CHECK rejects the new row and Postgres raises 42501.',
    },
    {
      id: 'viewer-a-cannot-delete-an-invitation',
      covers: ['§12.6/4', '§8.6/9'],
      as: viewerA,
      sql: 'delete from app.workspace_invitations where workspace_id = $1',
      params: [A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'workspace_invitations' },
      why: '§8.5: there is no broad user delete. No table in batch 010 carries a DELETE policy for '
         + 'any client role and none grants the privilege, so this is refused before RLS is '
         + 'consulted — which is why deniedBy records the layer.',
    },
    {
      id: 'approver-a-cannot-update-workspace-a',
      covers: ['§12.6/3-analogue', '§8.6/2'],
      as: approverA,
      sql: 'update app.workspaces set name = $2 where id = $1 returning id',
      params: [A, 'renamed by an approver'],
      expect: 'no-effect',
      witness: workspaceANameUnchanged,
      why: '§12.6 assertion 3 is about content and knowledge, which batch 010 does not create. This '
         + 'is the same rule — an approver approves and does not edit — on the only table in scope, '
         + 'and it is labelled an analogue rather than counted as that assertion.',
    },
    {
      id: 'editor-a-cannot-update-workspace-a',
      covers: ['§8.6/2'],
      as: editorA,
      sql: 'update app.workspaces set name = $2 where id = $1 returning id',
      params: [A, 'renamed by an editor'],
      expect: 'no-effect',
      witness: workspaceANameUnchanged,
      why: '§8.1 Workspace UPDATE is N for editor. Membership is not the permission.',
    },

    // -- §12.6/5. Suspended. Both halves, and the distinction the wording turns on. ------------
    {
      id: 'suspended-a-sees-zero-tenant-rows',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: 'select id from app.workspaces where id = $1',
      params: [A],
      expect: 'no-rows',
      why: '§7: only status=active grants access. The claim this identity carries is byte-identical '
         + 'to an active member\'s, so a policy that reads only the token admits it.',
    },
    {
      id: 'suspended-a-sees-zero-membership-rows',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: 'select id from app.workspace_members where workspace_id = $1',
      params: [A],
      expect: 'no-rows',
      why: 'Including the row recording their own suspension. status=active is inside the policy '
         + 'predicate, not a filter a caller is trusted to apply.',
    },
    {
      id: 'suspended-a-still-sees-their-own-profile',
      covers: ['§12.6/5'],
      as: suspendedA,
      sql: 'select user_id from app.user_profiles where user_id = $1',
      params: ['__SELF__'],
      expect: 'rows',
      why: '§12.6/5 says zero TENANT rows. app.user_profiles is user-scoped (§5), carries no '
         + 'workspace_id and is not one. This case exists so that a policy which OVER-denies — '
         + 'locking a suspended person out of their own PII-2 record and so out of any path to '
         + 'appeal or export it — fails a test instead of shipping.',
    },
    {
      id: 'suspended-a-cannot-mutate',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: 'update app.workspaces set name = $2 where id = $1 returning id',
      params: [A, 'renamed by a suspended member'],
      expect: 'no-effect',
      witness: workspaceANameUnchanged,
      why: '§12.6/5 requires both halves: sees nothing AND cannot mutate.',
    },
    {
      id: 'suspended-a-cannot-invite',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      ...invite('__A__', 'thinkbizthai.fixture.attempted_invitation_by_suspended', '__SELF__'),
      expect: 'denied',
      why: 'The half of §12.6/5 that raises. A suspended member is the identity most likely to be '
           + 'admitted by a policy that checks the token and not the membership row.',
    },

    // -- §12.6/6. Anonymous. ------------------------------------------------------------------
    {
      id: 'anonymous-cannot-read-workspaces',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: 'select id from app.workspaces where id = $1',
      params: [A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: '§8.5: anonymous has no tenant policy, and batch 010 grants anon nothing at all — so the '
         + 'refusal comes from the privilege system before RLS is reached. That is stronger than '
         + '§12.6/6 asks for, and the layer is recorded rather than blurred: if a later batch ever '
         + 'grants anon a privilege, this case starts returning zero rows instead of 42501 and the '
         + 'suite notices.',
    },
    {
      id: 'anonymous-cannot-read-members',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: 'select id from app.workspace_members where workspace_id = $1',
      params: [A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Membership is the table that answers "who is in this tenant". It is the one an '
         + 'unauthenticated caller most wants.',
    },

    // -- §12.6/7 and §8.6/8. Forgery, on the path that raises. --------------------------------
    {
      id: 'owner-a-cannot-invite-into-workspace-b',
      covers: ['§12.6/7', '§8.6/5'],
      as: ownerA,
      ...invite('__B__', 'thinkbizthai.fixture.forged_cross_tenant_invitation', '__SELF__'),
      expect: 'denied',
      why: 'A forged workspace_id, submitted by a real owner of a real workspace, naming a real '
         + 'other workspace. §3.3: workspace_id from a client is never trusted. WITH CHECK refuses '
         + 'and the database raises — an INSERT has no USING clause to filter it silently.',
    },
    {
      id: 'owner-a-cannot-forge-created-by',
      covers: ['§12.6/7', '§8.6/8'],
      as: ownerA,
      ...invite('__A__', 'thinkbizthai.fixture.forged_created_by_invitation', id('user_editor_a')),
      expect: 'denied',
      why: '§8.5 requires an INSERT policy to assert created_by = auth.uid(). Without it an owner '
         + 'can write an audit trail naming somebody else as the actor — the AUTH-3 attribution '
         + 'the trail exists to establish, forged at the moment of writing.',
    },
    {
      id: 'owner-a-can-invite-into-its-own-workspace',
      covers: ['§8.6/1'],
      as: ownerA,
      ...invite('__A__', 'thinkbizthai.fixture.permitted_invitation', '__SELF__'),
      expect: 'rows',
      why: 'The positive half of the two cases above. Without it, both pass against a policy that '
         + 'refuses every insert, including the one the matrix grants.',
    },

    // -- RFC-2026-017 §7. The assertion the data package's own smoke set does not contain. -----
    {
      id: 'service-identity-is-denied-a-read-rls-must-filter',
      covers: ['RFC-2026-017§7', '§12.6/8-negative'],
      as: service,
      sql: 'select id from app.workspaces where id = $1',
      params: [A],
      expect: 'no-rows',
      why: 'app_worker HOLDS select privilege on this table (batch 010 grants it deliberately) and '
         + 'holds no policy, so an empty result here can only have come from RLS. A service role '
         + 'that had acquired BYPASSRLS would return the row. This is the case that catches the '
         + 'defect RFC-2026-016 §5 records: assertion 8 as specified asserts only that the server '
         + 'helper SUCCEEDS, which is exactly what a bypassing role does.',
    },
    {
      id: 'service-identity-is-denied-a-write-with-an-error',
      covers: ['RFC-2026-017§7', '§12.6/8-negative', 'DB00-A03'],
      as: service,
      sql: 'insert into app.workspaces (id, name) values ($1, $2) returning id',
      params: [B, 'written by the service path'],
      expect: 'denied',
      why: 'THE assertion RFC-2026-017 §7 says is owed by whoever writes the first tenant table. '
         + 'The service identity attempts an operation §8.1 gives it no policy for and is DENIED '
         + 'WITH AN ERROR, not handed an empty result. It holds the INSERT privilege, so 42501 here '
         + 'is row level security refusing and nothing else. An INSERT is chosen over an UPDATE '
         + 'precisely because an INSERT is the mutation that raises: an UPDATE the USING clause '
         + 'filters would report zero rows and could not carry this claim.',
    },
    {
      id: 'service-identity-cannot-change-a-tenant-row',
      covers: ['RFC-2026-017§7', '§8.6/5'],
      as: service,
      sql: 'update app.workspaces set name = $2 where id = $1 returning id',
      params: [A, 'renamed by the service path'],
      expect: 'no-effect',
      witness: workspaceANameUnchanged,
      why: 'The service path is the identity forcing RLS was supposed to constrain and, until '
         + 'RFC-2026-017, did not. The write is stopped and the witness proves the row is intact.',
    },
    {
      id: 'service-identity-cannot-read-the-membership-table',
      covers: ['RFC-2026-017§7'],
      as: service,
      sql: 'select id from app.workspace_members where workspace_id = $1',
      params: [A],
      expect: 'no-rows',
      why: 'Membership is what an authorization bypass is worth. app_worker holds select on it and '
         + 'sees nothing.',
    },

    // -- Batch 011. §8.1 "Member list SELECT", and RFC-2026-020 §6.3. ---------------------------
    //
    // Batch 010 left this cell denied by default and said in its own header that its predicates
    // were written to be WIDENED rather than corrected. These are that widening, asserted. The
    // roster policy is PERMISSIVE, so it ORs with `workspace_members_select_own_active` — which is
    // why the viewer case below matters as much as the owner one: a widening that widened for
    // everybody would satisfy the positive and be a different decision entirely.
    {
      id: 'owner-a-sees-another-members-row',
      covers: ['§8.1/member-list', 'RFC-2026-020§6.3/10'],
      as: ownerA,
      sql: 'select user_id from app.workspace_members where workspace_id = $1 and user_id = $2',
      params: [A, id('user_editor_a')],
      expect: 'rows',
      why: '§8.1 "Member list SELECT: Owner Y", which batch 010 could not implement — a policy '
         + 'asking whether the reader is a member queries the table the policy is on, and Postgres '
         + 'raises 42P17. This is the cell, implemented through the app_authz helper. It asks for '
         + "ANOTHER member's row specifically: batch 010 already showed the owner their own, so a "
         + 'case reading only that would have passed before this batch existed.',
    },
    {
      id: 'viewer-a-cannot-see-another-members-row',
      covers: ['§8.1/member-list', '§12.6/4'],
      as: viewerA,
      sql: 'select user_id from app.workspace_members where workspace_id = $1 and user_id = $2',
      params: [A, id('user_editor_a')],
      expect: 'no-rows',
      why: 'The width of the widening. §8.1 gives the member list to Owner and Admin; Editor is `P` '
         + 'and viewer is nothing. An RLS policy set is permissive and ORs, so the roster policy '
         + 'could only ever grant more — this is the case that says how much more, and it fails if '
         + 'the predicate is ever loosened to "any active member".',
    },
    {
      id: 'owner-a-cannot-see-workspace-b-members',
      covers: ['§12.6/1', '§8.6/5', 'RFC-2026-020§6.3/10'],
      as: ownerA,
      sql: 'select user_id from app.workspace_members where workspace_id = $1',
      params: [B],
      expect: 'no-rows',
      why: 'The other half of §6.3/10, and the one the new policy could have broken: the helper is '
         + 'SECURITY DEFINER, so it runs as a role that is not the caller, and a helper that '
         + 'resolved membership from its OWN identity rather than from the JWT would hand every '
         + "workspace's roster to everyone. Tenant A's owner holds tenant B's exact id here.",
    },
    {
      id: 'owner-a-is-an-active-member-through-the-helper',
      covers: ['RFC-2026-020§6.3/12'],
      as: ownerA,
      sql: 'select 1 as member where app.is_active_member($1)',
      params: [A],
      expect: 'rows',
      why: 'The positive the two negatives below need. Without it, a helper that returned false for '
         + 'everyone — or that could not be called at all — satisfies them both.',
    },
    {
      id: 'suspended-a-is-no-member-through-the-helper',
      covers: ['§12.6/5', '§8.6/6', 'RFC-2026-020§6.3/11'],
      as: suspendedA,
      sql: 'select 1 as member where app.is_active_member($1)',
      params: [A],
      expect: 'no-rows',
      why: '§12.6 assertion 5, asked THROUGH the helper — the path batch 011 newly opens and which '
         + 'nothing had asked before. The suspended member already sees zero rows in the table; '
         + 'what is new is that a SECURITY DEFINER function now answers authorization questions '
         + 'about them, in a context where current_user is app_authz rather than the caller. '
         + '`status = active` is asserted in the helper body AND in app_authz\'s policy, and this '
         + 'case has to survive both.',
    },
    {
      id: 'helper-is-not-an-oracle-for-third-parties',
      covers: ['§8.6/5', 'RFC-2026-020§6.3/12'],
      as: ownerB,
      sql: 'select 1 as member where app.is_active_member($1)',
      params: [A],
      expect: 'no-rows',
      why: 'RFC-2026-020 §6.3/12. The helper is EXECUTE-granted to `authenticated` on purpose, so '
         + 'anyone holding a token can call it for any workspace id. It must answer about the '
         + 'CALLER and never become a way to ask who else is in a workspace. Workspace B\'s owner '
         + "asks about workspace A while holding A's exact id.",
    },
    {
      id: 'anonymous-cannot-call-the-helper',
      covers: ['§12.6/6', '§8.5', 'RFC-2026-020§6.3/13'],
      as: anonymous,
      sql: 'select 1 as member where app.is_active_member($1)',
      params: [A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: '§8.5: EXECUTE is revoked from PUBLIC and granted explicitly, and batch 010 grants anon '
         + 'nothing anywhere. A helper reachable by PUBLIC is reachable by anon, so the refusal is '
         + 'expected from the privilege system before the function is ever entered — on the SCHEMA, '
         + 'because anon holds no USAGE on app and name resolution stops there. The ACL itself is '
         + 'measured separately by scripts/db/authz-proofs.mjs; this is the reachability half.',
    },

    // =========================================================================================
    // Batch 020 — business/page and their immutable versions.
    // =========================================================================================
    //
    // Four tables, and the reason the list below is long is that they are the first tables in this
    // schema whose policies contain NO MEMBERSHIP PREDICATE OF THEIR OWN. Every one of them asks
    // `app.is_active_member(workspace_id)` or `app.workspace_member_role(workspace_id)` and nothing
    // else, so all four inherit whatever batch 011's helpers do — which is exactly the uniformity
    // RFC-2026-020 §5/5 wanted and exactly the reason each table has to be exercised separately.
    // A helper that broke would break them all at once and identically; a GRANT that is wrong
    // breaks one, and the grants are where the version tables' immutability lives.

    // -- §12.6/1, §8.6/5. The tenant boundary on the current rows, both directions. -------------
    {
      id: 'owner-a-sees-business-a1',
      covers: ['§12.6/1', '§12.6/2', '§8.6/1'],
      as: ownerA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_A1],
      expect: 'rows',
      why: '§8.1 "Business/Page SELECT" is Y for every built-in role, so the predicate tests active '
         + 'membership and not role. The positive half: without it every negative below is satisfied '
         + 'by a policy that hides everything, or by a fixture that never loaded.',
    },
    {
      id: 'owner-a-cannot-see-business-b1',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_B1],
      expect: 'no-rows',
      why: "Tenant A's owner holds tenant B's business id exactly, and the row is not there. The "
         + 'membership question is answered by app.is_active_member, which is SECURITY DEFINER and '
         + 'runs as app_authz — so this is also the case that fails if the helper ever resolved its '
         + 'answer from its own identity instead of from the JWT.',
    },
    {
      id: 'owner-a-cannot-update-business-b1',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: 'update app.business_profiles set name = $2 where id = $1 returning id',
      params: [BUSINESS_B1, 'renamed across the tenant boundary'],
      expect: 'no-effect',
      witness: businessB1NameUnchanged,
      why: 'The USING clause does not admit the row, so nothing is raised and nothing is changed. '
         + "The witness runs as B's own owner and is what turns \"returned nothing\" into \"the row is "
         + 'still there and still says what it said".',
    },
    {
      id: 'owner-a-cannot-create-a-business-in-workspace-b',
      covers: ['§12.6/7', '§8.6/5'],
      as: ownerA,
      ...createBusiness('__B__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'business_profiles' },
      why: 'A forged workspace_id, submitted by a real owner of a real workspace and naming a real '
         + 'other one. §3.3: a workspace_id from a client is never trusted. An INSERT has no USING '
         + 'clause to filter it silently, so WITH CHECK refuses and the database raises — and the '
         + 'layer is declared, because a missing INSERT grant would raise the same 42501 while '
         + 'proving nothing about the policy.',
    },
    {
      id: 'owner-b-sees-business-b1',
      covers: ['§8.6/1'],
      as: ownerB,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_B1],
      expect: 'rows',
      why: 'The far side of the boundary is a real, populated tenant. Otherwise every A-side negative '
         + 'above is satisfied by business_b1 simply not existing.',
    },
    {
      id: 'owner-a-sees-page-a1',
      covers: ['§12.6/2', '§8.6/1'],
      as: ownerA,
      sql: 'select id from app.page_context_profiles where id = $1',
      params: [PAGE_A1],
      expect: 'rows',
      why: 'The Page Context half of §8.1\'s "Business/Page SELECT". A page carries its own '
         + 'workspace_id, tied to its business\'s by a composite foreign key, so this is not implied '
         + 'by the business case above.',
    },
    {
      id: 'owner-a-cannot-see-page-b1',
      covers: ['§12.6/1', '§12.6/2', '§8.6/5'],
      as: ownerA,
      sql: 'select id from app.page_context_profiles where id = $1',
      params: [PAGE_B1],
      expect: 'no-rows',
      why: "The page one level below the business the previous cases could not reach, held by its "
         + 'exact id. §4 invariant 1 puts a page in one business and one workspace; this is the '
         + 'assertion that the RLS predicate agrees with that invariant rather than merely coexisting '
         + 'with it.',
    },
    {
      id: 'owner-a-cannot-update-page-b1',
      covers: ['§12.6/1', '§8.6/5'],
      as: ownerA,
      sql: 'update app.page_context_profiles set name = $2 where id = $1 returning id',
      params: [PAGE_B1, 'renamed across the tenant boundary'],
      expect: 'no-effect',
      witness: pageB1NameUnchanged,
      why: 'The write half of the page boundary, with B\'s owner as the witness.',
    },
    {
      id: 'owner-b-sees-page-b1',
      covers: ['§8.6/1'],
      as: ownerB,
      sql: 'select id from app.page_context_profiles where id = $1',
      params: [PAGE_B1],
      expect: 'rows',
      why: 'page_b1 exists and is reachable by its own tenant, so the two negatives above are about '
         + 'a policy rather than about an empty table.',
    },

    // -- §12.6/1 on the VERSION tables. Immutable history is still tenant data. -----------------
    {
      id: 'owner-a-sees-business-a1-version-1',
      covers: ['§12.6/2', '§8.6/1'],
      as: ownerA,
      sql: `select id from app.business_profile_versions where ${VERSION_1_OF_BUSINESS}`,
      params: [BUSINESS_A1],
      expect: 'rows',
      why: '§8.1 grants "Business/Page SELECT" and §11.3 says an archived Business is still readable '
         + 'by role — history is readable, and a version table nobody can read is a retention class '
         + 'with no reader. The positive half of the two version negatives below.',
    },
    {
      id: 'owner-a-cannot-see-business-b1-version-1',
      covers: ['§12.6/1', '§8.6/5'],
      as: ownerA,
      sql: `select id from app.business_profile_versions where ${VERSION_1_OF_BUSINESS}`,
      params: [BUSINESS_B1],
      expect: 'no-rows',
      why: 'A version row is where the OLD content of another tenant\'s business lives, so it is the '
         + 'row a boundary defect leaks most quietly: nothing in the current tables would look '
         + "different. Tenant A's owner holds business_b1's exact id and asks for its version 1, "
         + 'which names one row and is not a guess.',
    },
    {
      id: 'owner-a-sees-page-a1-version-1',
      covers: ['§12.6/2', '§8.6/1'],
      as: ownerA,
      sql: `select id from app.page_context_profile_versions where ${VERSION_1_OF_PAGE}`,
      params: [PAGE_A1],
      expect: 'rows',
      why: 'The page version table has a three-column scope path and its own policy; it is not '
         + 'covered by the business version case.',
    },
    {
      id: 'owner-a-cannot-see-page-b1-version-1',
      covers: ['§12.6/1', '§8.6/5'],
      as: ownerA,
      sql: `select id from app.page_context_profile_versions where ${VERSION_1_OF_PAGE}`,
      params: [PAGE_B1],
      expect: 'no-rows',
      why: "The deepest row in the batch, on the far side of the boundary, reached through page_b1's "
         + 'exact id.',
    },
    {
      id: 'owner-b-sees-business-b1-version-1',
      covers: ['§8.6/1', '§12.6/1'],
      as: ownerB,
      sql: `select id from app.business_profile_versions where ${VERSION_1_OF_BUSINESS}`,
      params: [BUSINESS_B1],
      expect: 'rows',
      why: 'THE ROW THE PREVIOUS NEGATIVE IS ABOUT, PROVED TO EXIST. Without it, '
         + '`owner-a-cannot-see-business-b1-version-1` is satisfied by a fixture that never inserted a '
         + "version for business_b1 — and the current-row positive does not cover it, because a "
         + 'business existing says nothing about its history existing. Both directions, on the version '
         + 'table itself, is what §12.6/1 asks for and what SMOKE_COVERAGE claims.',
    },
    {
      id: 'owner-b-sees-page-b1-version-1',
      covers: ['§8.6/1', '§12.6/1'],
      as: ownerB,
      sql: `select id from app.page_context_profile_versions where ${VERSION_1_OF_PAGE}`,
      params: [PAGE_B1],
      expect: 'rows',
      why: 'The same for the deepest table in the batch. Four tables, three cases each — the tenant '
         + 'sees its own, the other tenant does not, and the other tenant is holding the real id.',
    },

    // -- §8.6/9 and §8.1's version row. The immutability, as ABSENT GRANTS. ---------------------
    //
    // §8.1: "Immutable business/page version UPDATE/DELETE | N | N | N | N | N | N". Six N's, and
    // the sixth is the only N in the SERVICE column anywhere in that section. Batch 020 implements
    // it by granting no role UPDATE or DELETE on either version table at all, so every case below
    // declares `deniedBy: 'grant'` — the refusal happens before RLS is consulted, and that is a
    // stronger claim than a policy refusal, because a policy can be widened by an edit while an
    // absent privilege has to be granted.
    {
      id: 'owner-a-can-write-a-new-business-version',
      covers: ['§8.6/1', '§8.1/business-page-write'],
      as: ownerA,
      ...createBusinessVersion('__A__', BUSINESS_A1, '__SELF__'),
      expect: 'rows',
      why: 'The positive the four immutability cases need. §8.1 grants "Business/Page INSERT/UPDATE/'
         + 'archive" to owner and admin, and a version is the immutable record of that operation — '
         + 'the same shape §8.3 uses for approvals, where "Approve/reject" is granted and only '
         + '"Approval event UPDATE/DELETE" is denied. Without this case, every case below passes '
         + 'against a table no identity can touch in any way, which is a different design.',
    },
    {
      id: 'owner-a-cannot-update-a-business-version',
      covers: ['§8.6/9', '§3.2/immutable', '§4/8'],
      as: ownerA,
      sql: `update app.business_profile_versions set name = $2 where ${VERSION_1_OF_BUSINESS} returning id`,
      params: [BUSINESS_A1, 'history rewritten'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'business_profile_versions' },
      why: 'The workspace OWNER — the identity with the most authority §8.1 grants — attempts to '
         + 'rewrite history in their own tenant, on a row they can see, and is refused by the '
         + 'privilege system. This is §8.6 case 9, which batch 010 recorded as having no immutable '
         + 'table to assert it against.',
    },
    {
      id: 'owner-a-cannot-delete-a-business-version',
      covers: ['§8.6/9', '§8.5/no-broad-delete'],
      as: ownerA,
      sql: `delete from app.business_profile_versions where ${VERSION_1_OF_BUSINESS}`,
      params: [BUSINESS_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'business_profile_versions' },
      why: '§8.5: there is no broad user delete anywhere, and an immutable row has none at all. '
         + 'Purging history is the retention job (HISTORY, batch 160), which runs as neither of the '
         + 'identities in this suite.',
    },
    {
      id: 'owner-a-cannot-update-a-page-version',
      covers: ['§8.6/9', '§3.2/immutable'],
      as: ownerA,
      sql: `update app.page_context_profile_versions set name = $2 where ${VERSION_1_OF_PAGE} returning id`,
      params: [PAGE_A1, 'history rewritten'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'page_context_profile_versions' },
      why: 'Asserted separately from the business version because the grants are separate. One table '
         + 'having no UPDATE privilege says nothing about the other, and a batch that granted one by '
         + 'accident would be caught here and nowhere else.',
    },
    {
      id: 'owner-a-cannot-delete-a-page-version',
      covers: ['§8.6/9', '§8.5/no-broad-delete'],
      as: ownerA,
      sql: `delete from app.page_context_profile_versions where ${VERSION_1_OF_PAGE}`,
      params: [PAGE_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'page_context_profile_versions' },
      why: 'The fourth corner of §8.1\'s version row, on the deepest table in the batch.',
    },
    {
      id: 'service-path-cannot-update-a-business-version',
      // NOT labelled RFC-2026-017§7, deliberately. That clause asks for the service identity to be
      // denied BY ROW LEVEL SECURITY with an error, and this refusal comes from the privilege
      // system — which is a stronger denial and a different claim. Labelling it §7 would put a case
      // under a heading whose own static test requires an INSERT, for the good reason that only an
      // INSERT can carry an RLS refusal that raises. The §7 cases for this batch's tables are
      // `service-path-is-denied-a-business-read-rls-must-filter` and
      // `service-path-cannot-create-a-business`.
      covers: ['§8.6/9', '§12.6/8-negative', '§8.1/version-service-N'],
      as: service,
      sql: `update app.business_profile_versions set name = $2 where ${VERSION_1_OF_BUSINESS} returning id`,
      params: [BUSINESS_A1, 'history rewritten by the service path'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'business_profile_versions' },
      why: 'THE cell batch 010\'s header pointed at and could not test: "the one `N` in the service '
         + "column belongs to immutable business/page versions, which are batch 020's tables, not "
         + 'these". app_worker holds SELECT and INSERT on this table deliberately — so the refusal '
         + 'cannot be a forgotten grant on the table as a whole — and holds UPDATE on nothing, which '
         + 'is what §8.1 marks N. A service role that had acquired BYPASSRLS would still be refused '
         + 'here, because this refusal is the privilege system and not RLS; that is the point of '
         + 'implementing this cell as an absent grant.',
    },
    {
      id: 'service-path-cannot-delete-a-business-version',
      covers: ['§8.6/9', '§12.6/8-negative', '§8.1/version-service-N'],
      as: service,
      sql: `delete from app.business_profile_versions where ${VERSION_1_OF_BUSINESS}`,
      params: [BUSINESS_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'business_profile_versions' },
      why: 'The OTHER half of the cell. §8.1 spells the operation "Immutable business/page version '
         + 'UPDATE/DELETE" and marks it N for the service; the case above covers UPDATE and this one '
         + 'covers DELETE, because UPDATE and DELETE are separate privileges and a batch that granted '
         + 'one of them would be caught by exactly one of these two cases.',
    },

    // -- §12.6/4 and §8.6/2. Same workspace, wrong role. ---------------------------------------
    {
      id: 'viewer-a-sees-business-a1',
      covers: ['§12.6/4', '§8.6/1'],
      as: viewerA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_A1],
      expect: 'rows',
      why: '§8.1 grants Business/Page SELECT to viewer. A suite that only showed the viewer refused '
         + 'could not tell a correct policy from a broken grant.',
    },
    {
      id: 'viewer-a-cannot-update-business-a1',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      sql: 'update app.business_profiles set name = $2 where id = $1 returning id',
      params: [BUSINESS_A1, 'renamed by a viewer'],
      expect: 'no-effect',
      witness: businessA1NameUnchanged,
      why: '§8.1 marks Business/Page INSERT/UPDATE/archive N for viewer. The viewer can SEE this row, '
         + 'so the witness is proving the write was stopped rather than that the row was invisible.',
    },
    {
      id: 'viewer-a-cannot-create-a-business',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...createBusiness('__A__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'business_profiles' },
      why: 'An INSERT is the write where a refusal really is available: WITH CHECK rejects the new '
         + 'row and Postgres raises. The viewer holds the INSERT column privileges (they are granted '
         + 'to `authenticated`), so the declared layer is `policy` — which is the assertion that the '
         + 'predicate exists and does its job.',
    },
    {
      id: 'viewer-a-cannot-delete-a-business',
      covers: ['§12.6/4', '§8.5/no-broad-delete'],
      as: viewerA,
      sql: 'delete from app.business_profiles where id = $1',
      params: [BUSINESS_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'business_profiles' },
      why: '§8.5: no tenant table carries a broad user delete. Archiving is an UPDATE of a typed '
         + 'lifecycle field (§11.3) and hard deletion is batch 160, so DELETE is granted to nobody '
         + 'and this is refused before RLS is consulted.',
    },
    {
      id: 'viewer-a-cannot-write-a-business-version',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...createBusinessVersion('__A__', BUSINESS_A1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'business_profile_versions' },
      why: 'INSERT IS THE ONLY CLIENT-WRITABLE OPERATION A VERSION TABLE HAS, so §12.6/4 — "user_'
         + 'viewer_a cannot insert/update/delete" — is not carried on these two tables by the update '
         + 'and delete cases above, which are refused for every role including the owner. This is the '
         + 'one that is about the VIEWER: the row it writes would be admitted for an owner, and it is '
         + 'the INSERT policy\'s owner-or-admin test that refuses it. §8.1 grants the producing '
         + 'operation to owner and admin and marks it N for viewer.',
    },
    {
      id: 'approver-a-cannot-update-page-a1',
      covers: ['§12.6/3-analogue', '§8.6/2'],
      as: approverA,
      sql: 'update app.page_context_profiles set name = $2 where id = $1 returning id',
      params: [PAGE_A1, 'renamed by an approver'],
      expect: 'no-effect',
      witness: pageA1NameUnchanged,
      why: '§12.6 assertion 3 is about content and knowledge, which are batches 080 and 040. This is '
         + 'the same rule — an approver approves and does not edit — on a table that now exists, and '
         + 'it is labelled an analogue rather than counted as that assertion.',
    },
    {
      id: 'editor-a-cannot-create-a-business',
      covers: ['§8.6/2', '§8.1/editor-P'],
      as: editorA,
      ...createBusiness('__A__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'business_profiles' },
      why: 'THE DEFAULT-DENY, asserted so it cannot be mistaken for a decided N. §8.1 marks '
         + 'Business/Page INSERT/UPDATE `P` for editor — "ผ่านตาม policy/explicit capability" — and no '
         + 'document defines the capability set, so batch 020 refused to invent one, exactly as '
         + 'RFC-2026-020 §8 refused for the two `P` cells it met. When a later batch resolves the '
         + 'capability, this case is the one that has to change, and it will change in a diff.',
    },
    // THE CASE BATCH 020 WROTE TO BE CHANGED, CHANGED. It stood here as
    // `editor-a-sees-business-a2-until-batch-021`, expecting `rows`, and its own `why` said: "the
    // fixture calls user_editor_a 'editor scoped to business_a1 and page_a1', and that scope is a
    // row in `workspace_member_scopes` — batch 021. Asserting the current state positively is what
    // makes 021 a change to this file rather than a claim that quietly became false."
    //
    // 021 created that row. The case is replaced IN PLACE, by one that asserts the narrowed state
    // just as positively, so the substitution is one diff hunk rather than a deletion in one place
    // and an addition in another. What it is paired with matters as much: without
    // `owner-a-is-unscoped-and-sees-business-a2` and `viewer-a-all-businesses-scope-still-sees-
    // business-a2` below, this negative would be satisfied by business_a2 becoming unreadable to
    // everybody, which is a different and much worse batch.
    {
      id: 'editor-a-scope-does-not-reach-business-a2',
      covers: ['§12.6/2', '§8.6/3'],
      as: editorA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_A2],
      expect: 'no-rows',
      why: 'THE HALF OF §12.6/2 BATCH 020 COULD NOT CARRY: "user_editor_a sees Business A1/Page A1, '
         + 'never A2/Page A2". business_a2 is in the editor\'s OWN workspace and they hold an active '
         + 'membership in it, so 020\'s permissive policy admits the row and always will — the refusal '
         + 'comes from `business_profiles_scope_narrows_member`, a RESTRICTIVE policy, which is the '
         + 'only shape that can narrow what a merged batch already granted. The editor holds a '
         + '`business` scope on business_a1 and nothing else.',
    },

    // -- §12.6/5 and §12.6/6. Suspended and anonymous, on tables with no predicate of their own. -
    {
      id: 'suspended-a-sees-zero-business-rows',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: 'select id from app.business_profiles where workspace_id = $1',
      params: [A],
      expect: 'no-rows',
      why: '§7: only status=active grants access. These policies contain no status check of their '
         + "own — they ask app.is_active_member — so this case is the helper's `status = 'active'` "
         + 'being load-bearing for a whole table family. Workspace A has three businesses, so an '
         + 'empty result here is not an empty table.',
    },
    {
      id: 'suspended-a-sees-zero-business-version-rows',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: 'select id from app.business_profile_versions where workspace_id = $1',
      params: [A],
      expect: 'no-rows',
      why: 'Version rows are the ones a departed or suspended member most wants: they hold what the '
         + 'business used to say. The fixture loads two of them in workspace A.',
    },
    {
      id: 'suspended-a-cannot-create-a-business',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      ...createBusiness('__A__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'business_profiles' },
      why: 'The half of §12.6/5 that raises. A suspended member carries a claim byte-identical to an '
         + "active member's, so a predicate that reads the token rather than the membership row "
         + 'admits them — and here that predicate lives entirely inside the helper.',
    },
    {
      id: 'anonymous-cannot-read-businesses',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: 'select id from app.business_profiles where workspace_id = $1',
      params: [A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: '§8.5: anonymous has no tenant policy, and neither batch grants anon anything at all — so '
         + 'the refusal comes from the privilege system before RLS is reached, and on the SCHEMA, '
         + 'because anon holds no USAGE on app and name resolution stops there. If a later batch ever '
         + 'grants anon a privilege, this case starts failing, which is what it is for.',
    },

    // -- §12.6/7, §8.6/8 and §4 invariant 10. Forgery, and the constraint behind the policy. ----
    {
      id: 'owner-a-cannot-forge-created-by-on-a-business',
      covers: ['§12.6/7', '§8.6/8'],
      as: ownerA,
      ...createBusiness('__A__', id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'business_profiles' },
      why: '§8.5 requires an INSERT policy to assert created_by = auth.uid(). Without it an owner can '
         + 'write a row naming somebody else as its author — the AUTH-3 attribution forged at the '
         + 'moment of writing, on the table whose versions are the tenant\'s own history.',
    },
    {
      id: 'owner-a-cannot-put-a-page-under-a-business-in-another-workspace',
      covers: ['§12.6/7', '§4/1', '§8.6/5'],
      as: ownerA,
      ...createPage('__A__', BUSINESS_B1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'page_context_profiles' },
      why: 'A FORGED BUSINESS ID — the id kind batch 010 recorded as untestable until these columns '
         + "existed. The workspace_id is the caller's own, so the membership half of the predicate "
         + 'passes; what refuses is the clause requiring the named business to exist in THAT '
         + 'workspace and be unarchived. The layer is declared `policy` deliberately: the composite '
         + 'foreign key would also have refused this row, one step later, and a case that could not '
         + 'tell the two apart would pass whichever of them was removed.',
    },
    {
      id: 'owner-a-cannot-attach-a-version-to-a-business-in-another-workspace',
      covers: ['§12.6/7', '§4/10', '§3.3/composite-fk'],
      as: ownerA,
      ...createBusinessVersion('__A__', BUSINESS_B1, '__SELF__'),
      expect: 'rejected',
      sqlstate: '23503',
      why: '§4 invariant 10: an unrelated Workspace/Business/Page triple must fail AT THE DATABASE, '
         + 'even for an actor with rights over the entities separately. Here EVERY POLICY ADMITS THE '
         + "ROW — created_by is the caller, and the caller is owner of the workspace it names — and "
         + "the composite foreign key (workspace_id, business_profile_id) -> business_profiles"
         + '(workspace_id, id) is the only thing that refuses it. So the assertion demands 23503 and '
         + 'not 42501: if a policy ever refused first, this case would fail, and the constraint it '
         + 'exists to prove could be dropped without anything noticing. That is why `rejected` names '
         + 'its SQLSTATE instead of accepting any error.',
    },

    // -- §11.3. Archive closes new creation under a Business. -----------------------------------
    {
      id: 'owner-a-can-create-a-page-under-a-live-business',
      covers: ['§8.6/1', '§8.1/business-page-write'],
      as: ownerA,
      ...createPage('__A__', BUSINESS_A1, '__SELF__'),
      expect: 'rows',
      why: 'The positive §8.1 grants to owner and admin, and the control the archived case needs: '
         + 'without it, a policy refusing every page insert would satisfy the next case.',
    },
    {
      id: 'owner-a-cannot-create-a-page-under-an-archived-business',
      covers: ['§11.3'],
      as: ownerA,
      ...createPage('__A__', BUSINESS_A3_ARCHIVED, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'page_context_profiles' },
      why: '§11.3: "Archive ปิด creation/publish ใหม่ แต่ยังอ่าน history ตาม role". Creating a Page '
         + 'Context under an archived Business is new creation under it. This is a NARROWING of '
         + "§8.1's unconditional Y for owner and admin, taken because §11.3 is not silent, and it is "
         + 'the one predicate in batch 020 that reads another table — in the fail-closed direction, '
         + 'since app.business_profiles\'s own SELECT policy applies to that subquery.',
    },

    // -- RFC-2026-017 §7, extended to this batch's own tables. ----------------------------------
    {
      id: 'service-path-is-denied-a-business-read-rls-must-filter',
      covers: ['RFC-2026-017§7', '§12.6/8-negative'],
      as: service,
      sql: 'select id from app.business_profiles where workspace_id = $1',
      params: [A],
      expect: 'no-rows',
      why: 'app_worker HOLDS select on this table — batch 020 grants it deliberately, as 010 did — '
         + 'and holds no policy, so an empty result can only have come from RLS. A service role that '
         + 'had acquired BYPASSRLS would return three businesses.',
    },
    {
      id: 'service-path-cannot-create-a-business',
      covers: ['RFC-2026-017§7', '§12.6/8-negative'],
      as: service,
      ...createBusiness('__A__', id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'business_profiles' },
      why: 'The service identity attempts an operation §8.1 gives it no policy for and is DENIED WITH '
         + 'AN ERROR rather than handed an empty result. It holds the INSERT privilege on the whole '
         + 'table, so the refusal is row level security and nothing else — which the declared layer '
         + 'asserts rather than assumes. An INSERT is chosen because an INSERT is the mutation that '
         + 'raises.',
    },

    // =========================================================================================
    // Batch 021 — member business/page scope.
    // =========================================================================================
    //
    // One new table and, for the first time in this suite, a batch that NARROWS. Every case above
    // that a narrowing could have broken is left standing on purpose: user_owner_a holds no scope
    // row, so `member_scope_admits_*` is true for that identity and batch 020's cases assert, by
    // continuing to pass, the reading of §7 this batch had to choose — a member with no scope row
    // is not narrowed.
    //
    // The list below is organised as the boundary is: what the scope TABLE lets a caller see, what
    // the scope rows do to batch 020's four tables, and what the helpers answer for whom.

    // -- The scope table itself. Own rows and nobody else's, which is the whole security argument. -
    {
      id: 'editor-a-sees-their-own-member-scope',
      covers: ['§7/member-scope', '§8.6/1'],
      as: editorA,
      sql: scopesOf,
      params: ['__A__', '__SELF__'],
      expect: 'rows',
      why: 'The positive every negative below needs. `workspace_member_scopes_select_own` is the only '
         + 'policy the scope helpers read through, so a policy that returned nothing would make every '
         + 'caller look unscoped — which is FAIL-OPEN, not fail-closed, because an absent scope row '
         + 'means "not narrowed". This case is what notices.',
    },
    {
      id: 'editor-a-cannot-see-another-members-member-scope',
      covers: ['§7/member-scope', '§8.6/2', 'RFC-2026-020§5/5'],
      as: editorA,
      sql: scopesOf,
      params: ['__A__', id('user_page_editor_a')],
      expect: 'no-rows',
      why: 'A SCOPE ROW FOR ANOTHER MEMBER GRANTS THIS CALLER NOTHING, and this is the case that says '
         + 'so at the table. It is the load-bearing one: the scope helpers are SECURITY INVOKER and '
         + 'resolve the caller from THIS policy rather than by calling auth.uid(), so a policy that '
         + 'admitted a second member\'s rows would silently widen every narrowing in the batch — the '
         + 'editor would inherit whatever anyone else was scoped to. Both members are active in the '
         + 'same workspace, so nothing but the user_id conjunct refuses this.',
    },
    {
      id: 'owner-b-sees-their-own-member-scope',
      covers: ['§8.6/1', '§12.6/1'],
      as: ownerB,
      sql: scopesOf,
      params: ['__B__', '__SELF__'],
      expect: 'rows',
      why: 'The far side of the boundary holds a scope row, so the cross-tenant negative below is '
         + 'about a policy rather than about a workspace nobody scoped.',
    },
    {
      id: 'owner-a-cannot-see-workspace-b-member-scopes',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: scopesOf,
      params: ['__B__', id('user_owner_b')],
      expect: 'no-rows',
      why: "Tenant A's owner holds tenant B's workspace id and its owner's id exactly, and asks for "
         + 'the scope rows that say which Businesses that member reaches. Membership scope is the '
         + 'AUTH-3 row an attacker wants most, because it describes the shape of the other tenant.',
    },
    {
      id: 'suspended-a-sees-zero-scope-rows',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: scopesOf,
      params: ['__A__', '__SELF__'],
      expect: 'no-rows',
      why: '§7: only status=active grants access. THE FIXTURE GIVES THIS IDENTITY A SCOPE ROW ON '
         + 'PURPOSE, so the empty result is a policy refusing and not a table with nothing in it — '
         + 'and the conjunct that refuses is app.is_active_member, the batch 011 helper, which is '
         + 'how membership is read here rather than by joining app.workspace_members.',
    },
    {
      id: 'anonymous-cannot-read-member-scopes',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: 'select scope_type from app.workspace_member_scopes where workspace_id = $1',
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: '§8.5: anonymous has no tenant policy and no batch grants anon anything, so the refusal '
         + 'comes from the privilege system on the SCHEMA before RLS is reached. If a later batch '
         + 'ever grants anon USAGE on app, this moves to the table and the case fails, which is what '
         + 'it is for.',
    },

    // -- §8.1 "Invite/change scope": the owner Y, and the four ways it is not wider than that. ----
    {
      id: 'owner-a-can-scope-a-member',
      covers: ['§8.1/invite-change-scope', '§8.6/1'],
      as: ownerA,
      ...scopeAllBusinesses('__A__', '__SELF__', '__SELF__'),
      expect: 'rows',
      why: '§8.1 "Invite/change scope" is Y for owner, and this is the half of that cell that lives in '
         + 'this table. Without it every refusal below passes against a table no identity can write '
         + 'at all, which is a different design.\n\n'
         + 'THE SUBJECT IS THE CALLER, and that is a property of the batch rather than a convenience: '
         + '021 writes no roster policy on this table, so RETURNING on an INSERT for somebody ELSE '
         + 'would be refused by `workspace_member_scopes_select_own` — Postgres applies SELECT '
         + 'policies to a RETURNING clause. The limitation is recorded in the migration header; here '
         + 'it is the shape of the positive case.',
    },
    {
      id: 'editor-a-cannot-scope-a-member',
      covers: ['§8.1/invite-change-scope', '§8.6/2', '§12.6/4'],
      as: editorA,
      ...scopeAllBusinesses('__A__', '__SELF__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'workspace_member_scopes' },
      why: '§8.1 marks "Invite/change scope" N for editor. A member who could widen their own scope '
         + 'would make every narrowing in this batch advisory, so this is the case that says the '
         + 'INSERT policy tests the ROLE and not merely the membership. The layer is declared because '
         + 'the editor holds the INSERT column privileges — they are granted to `authenticated` — so '
         + 'a `grant` refusal here would mean something else broke.',
    },
    {
      id: 'owner-a-cannot-scope-a-member-into-workspace-b',
      covers: ['§12.6/7', '§8.6/5'],
      as: ownerA,
      ...scopeAllBusinesses('__B__', '__SELF__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'workspace_member_scopes' },
      why: 'A forged workspace_id, submitted by a real owner of a real workspace and naming a real '
         + 'other one. §3.3: a workspace_id from a client is never trusted. The INSERT policy asks '
         + 'app.workspace_member_role for THAT workspace, which is null for this caller, so WITH '
         + 'CHECK refuses before the composite foreign key is ever consulted.',
    },
    {
      id: 'owner-a-cannot-forge-created-by-on-a-member-scope',
      covers: ['§12.6/7', '§8.6/8'],
      as: ownerA,
      ...scopeAllBusinesses('__A__', '__SELF__', id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'workspace_member_scopes' },
      why: '§8.5 requires an INSERT policy to assert created_by = auth.uid(). On this table the actor '
         + 'and the subject are DIFFERENT PEOPLE by design — created_by is the owner granting the '
         + 'scope, user_id is the member receiving it — so an unasserted created_by would let an '
         + 'owner write an authorization grant attributed to somebody else, on the table that decides '
         + 'what everyone else can reach.',
    },
    {
      id: 'owner-a-cannot-scope-a-member-to-a-business-in-another-workspace',
      covers: ['§12.6/7', '§4/10', '§3.3/composite-fk'],
      as: ownerA,
      ...scopeToBusiness('__A__', '__SELF__', BUSINESS_B1, '__SELF__'),
      expect: 'rejected',
      sqlstate: '23503',
      why: '§4 invariant 10 on the table whose entire job is to say which rows a member reaches. EVERY '
         + 'POLICY ADMITS THIS ROW — the workspace is the caller\'s own, the caller is its owner, and '
         + 'created_by is the caller — and the composite foreign key (workspace_id, '
         + 'business_profile_id) -> business_profiles (workspace_id, id) is the only thing that '
         + 'refuses it. The SQLSTATE is named rather than "any error" because a policy refusing first '
         + 'would let the constraint be dropped with nothing noticing.',
    },
    {
      id: 'owner-a-cannot-update-a-member-scope',
      covers: ['§8.5/no-broad-delete', '§8.6/9'],
      as: ownerA,
      sql: 'update app.workspace_member_scopes set scope_type = $3 where workspace_id = $1 and user_id = $2 returning id',
      params: ['__A__', id('user_editor_a'), 'all_businesses'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'workspace_member_scopes' },
      why: 'THE LIMITATION THIS BATCH SHIPS, ASSERTED RATHER THAN LEFT AS A SENTENCE. §8.5 forbids a '
         + 'broad user delete and requires a soft delete through a typed lifecycle field; no document '
         + 'names one for a member scope, so batch 021 grants no role UPDATE rather than inventing '
         + 'the field. The workspace OWNER — the identity §8.1 grants "change scope" — is refused, at '
         + 'the PRIVILEGE layer, which is a stronger claim than a policy refusal because a policy can '
         + 'be widened by an edit and an absent grant has to be granted.',
    },
    {
      id: 'owner-a-cannot-delete-a-member-scope',
      covers: ['§8.5/no-broad-delete', '§8.6/9'],
      as: ownerA,
      sql: 'delete from app.workspace_member_scopes where workspace_id = $1 and user_id = $2',
      params: ['__A__', id('user_editor_a')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'workspace_member_scopes' },
      why: 'The other verb, asserted separately because UPDATE and DELETE are separate privileges and '
         + 'a batch that granted one of them would be caught by exactly one of these two cases.',
    },

    // -- RFC-2026-017 §7 on the new table. ------------------------------------------------------
    {
      id: 'service-path-is-denied-a-member-scope-read-rls-must-filter',
      covers: ['RFC-2026-017§7', '§12.6/8-negative'],
      as: service,
      sql: 'select scope_type from app.workspace_member_scopes where workspace_id = $1',
      params: ['__A__'],
      expect: 'no-rows',
      why: 'app_worker HOLDS select on this table — batch 021 grants it deliberately, as 010 and 020 '
         + 'did — and holds no policy, so an empty result can only have come from RLS. Workspace A '
         + 'carries five scope rows, so a service role that had acquired BYPASSRLS would return them.',
    },
    {
      id: 'service-path-cannot-create-a-member-scope',
      covers: ['RFC-2026-017§7', '§12.6/8-negative'],
      as: service,
      ...scopeAllBusinesses('__A__', id('user_owner_a'), id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'workspace_member_scopes' },
      why: 'The service identity attempts an operation §8.1 gives it no policy for and is DENIED WITH '
         + 'AN ERROR rather than handed an empty result. It holds the INSERT privilege on every column '
         + 'this statement names, so the refusal is row level security and nothing else. An INSERT is '
         + 'chosen because an INSERT is the mutation that raises — and a scope row written by an '
         + 'unpoliced service path would be an authorization grant nobody authorised.',
    },

    // -- §12.6/2 and §8.6/3. The Business boundary INSIDE one workspace. -------------------------
    //
    // The negative half of this block is `editor-a-scope-does-not-reach-business-a2`, which stands
    // above in the position batch 020's `editor-a-sees-business-a2-until-batch-021` occupied. These
    // are the rest of it: the positives that make it mean something, and the same boundary at Page
    // and version depth.
    {
      id: 'editor-a-sees-business-a1-in-scope',
      covers: ['§12.6/2', '§8.6/1', '§8.6/3'],
      as: editorA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_A1],
      expect: 'rows',
      why: '§12.6/2\'s first half: "user_editor_a sees Business A1". The restrictive policy admits the '
         + 'Business the editor\'s scope names, so the negative beside it is about SCOPE rather than '
         + 'about a policy that hides everything from an editor.',
    },
    {
      id: 'owner-a-is-unscoped-and-sees-business-a2',
      covers: ['§7/member-scope', '§8.6/1'],
      as: ownerA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_A2],
      expect: 'rows',
      why: 'THE CONTROL FOR THE WHOLE BATCH, and the assertion of the one thing §7 does not say. '
         + 'user_owner_a holds NO scope row, and batch 021 reads that as "not narrowed" rather than '
         + 'as "denied" — 010\'s own comment says scope narrows a ceiling and never widens it, and '
         + 'the fixture catalog describes this identity with no scope at all. Without this case, '
         + 'every scope negative in the batch would be satisfied by a restrictive policy that simply '
         + 'hid business_a2 from everybody.',
    },
    {
      id: 'viewer-a-all-businesses-scope-still-sees-business-a2',
      covers: ['§7/member-scope', '§8.6/1'],
      as: viewerA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_A2],
      expect: 'rows',
      why: '§7\'s third scope type, and the case that keeps app.member_scope_is_narrowed honest. This '
         + 'identity IS narrowed — it holds a scope row — and still sees every Business, because the '
         + 'row says all_businesses. A helper that read "has a scope row" as "is restricted to the '
         + 'rows it names" would pass every other case in this block and fail here.',
    },
    {
      id: 'editor-a-sees-page-a1-in-scope',
      covers: ['§12.6/2', '§8.6/1'],
      as: editorA,
      sql: 'select id from app.page_context_profiles where id = $1',
      params: [PAGE_A1],
      expect: 'rows',
      why: '§7: a `business` scope is one Business "รวม Page ใต้ Business" — including the Pages under '
         + 'it. The editor holds one row, naming business_a1, and page_a1 is beneath it. This is that '
         + 'sentence, asserted rather than assumed from the Business case.',
    },
    {
      id: 'editor-a-scope-does-not-reach-page-a2',
      covers: ['§12.6/2', '§8.6/3'],
      as: editorA,
      sql: 'select id from app.page_context_profiles where id = $1',
      params: [PAGE_A2],
      expect: 'no-rows',
      why: '"never A2/Page A2" — the Page half of §12.6 assertion 2, which batch 020 could carry in '
         + 'neither direction. page_a2 is under business_a2, which this editor\'s scope does not name.',
    },
    {
      id: 'editor-a-scope-does-not-reach-business-a2-version-1',
      covers: ['§12.6/2', '§8.6/3'],
      as: editorA,
      sql: `select id from app.business_profile_versions where ${VERSION_1_OF_BUSINESS}`,
      params: [BUSINESS_A2],
      expect: 'no-rows',
      why: 'A version row holds what a Business USED TO SAY, so a narrowing that stopped at the '
         + 'current row would leave the history of an out-of-scope Business readable — the quietest '
         + 'possible leak, because nothing in the current tables would look different. This is why '
         + 'batch 021 writes four restrictive policies rather than two.',
    },
    {
      id: 'editor-a-scope-does-not-reach-page-a2-version-1',
      covers: ['§12.6/2', '§8.6/3'],
      as: editorA,
      sql: `select id from app.page_context_profile_versions where ${VERSION_1_OF_PAGE}`,
      params: [PAGE_A2],
      expect: 'no-rows',
      why: 'The deepest row on the far side of the in-workspace boundary, reached by its parent and '
         + 'its ordinal exactly as the cross-tenant version cases reach theirs.',
    },

    // -- §8.6/4. Page scope, inside ONE Business, which needs two rows §12.6 does not name. -------
    {
      id: 'owner-a-sees-page-a1-sibling',
      covers: ['§8.6/1', '§8.6/4'],
      as: ownerA,
      sql: 'select id from app.page_context_profiles where id = $1',
      params: [PAGE_A1_SIBLING],
      expect: 'rows',
      why: 'page_a1_sibling exists and is a real Page under business_a1. Without this, §8.6 case 4 '
         + 'below is satisfied by a fixture row that never loaded.',
    },
    {
      id: 'page-editor-a-sees-page-a1-in-scope',
      covers: ['§8.6/1', '§8.6/4', '§7/member-scope'],
      as: pageEditorA,
      sql: 'select id from app.page_context_profiles where id = $1',
      params: [PAGE_A1],
      expect: 'rows',
      why: 'The positive §8.6 case 4 needs: this identity\'s scope is exactly one Page and it reaches '
         + 'that Page.',
    },
    {
      id: 'page-editor-a-sees-business-a1-because-a-page-scope-carries-it',
      covers: ['§7/member-scope', '§8.6/1'],
      as: pageEditorA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_A1],
      expect: 'rows',
      why: 'A DECISION MADE IN 021 AND ASSERTED HERE. A `page` scope row carries its Business as well '
         + 'as its Page, and app.member_scope_covers_business counts it — because a member who could '
         + 'not read the Business their Page hangs from would hold a Page that is addressable and '
         + 'unreachable. §7 says a page scope is "จำกัด Page Context เดียว" and does not say what '
         + 'happens to the parent; this is the reading, written as a case so it can be argued with.',
    },
    {
      id: 'page-editor-a-scope-does-not-reach-page-a1-sibling',
      covers: ['§8.6/4', '§12.6/2'],
      as: pageEditorA,
      sql: 'select id from app.page_context_profiles where id = $1',
      params: [PAGE_A1_SIBLING],
      expect: 'no-rows',
      why: '§8.6 CASE 4, WHICH THREE BATCHES HAVE OWED: "Same Business + allowed Page A แต่ row Page B '
         + '→ deny". Both Pages are under business_a1 and this caller can read business_a1, so nothing '
         + 'about Workspace or Business scope refuses this row — only the `page` scope does. No '
         + 'identity §12.6 names could have carried it: they are all scoped at Business level or not '
         + 'at all, and §7 gives a business scope every Page beneath it.',
    },

    // -- §8.1's editor `P`, which batch 020 recorded as this batch's to implement. ----------------
    //
    // `covers`, not `admits`: an editor who has never been scoped holds no EXPLICIT capability and
    // gains nothing here, which is what keeps `P` from arriving as an unconditional grant. The
    // default-deny batch 020 wrote — `editor-a-cannot-create-a-business`, above — still passes, and
    // now for the reason the matrix gives rather than for the absence of a table.
    {
      id: 'editor-a-can-update-business-a1-in-scope',
      covers: ['§8.1/editor-P', '§8.6/1'],
      as: editorA,
      sql: 'update app.business_profiles set name = $2 where id = $1 returning id',
      params: [BUSINESS_A1, 'renamed by the editor scoped to it'],
      expect: 'rows',
      why: 'THE CELL. §8.1 marks "Business/Page INSERT/UPDATE/archive" `P` for editor; batch 020 '
         + 'refused it because the table carrying the condition did not exist, and said so in its own '
         + 'header. The condition is a member scope that explicitly covers the row, and this is an '
         + 'editor whose scope names this Business. The write is real and the transaction is rolled '
         + 'back, as every permitted write in this suite is.',
    },
    {
      id: 'editor-a-cannot-update-business-a2',
      covers: ['§8.1/editor-P', '§8.6/3'],
      as: editorA,
      sql: 'update app.business_profiles set name = $2 where id = $1 returning id',
      params: [BUSINESS_A2, 'renamed outside the editor scope'],
      expect: 'no-effect',
      witness: businessA2NameUnchanged,
      why: 'The same editor, the same workspace, the same verb, a Business their scope does not name. '
         + 'The restrictive policy keeps the row out of the USING clause, so the statement matches '
         + 'nothing and Postgres raises nothing — and the witness runs as the UNSCOPED owner, which is '
         + 'the only A-side identity that can see the row and prove it still says what it said.',
    },
    {
      id: 'editor-a-can-create-a-page-under-business-a1',
      covers: ['§8.1/editor-P', '§8.6/1'],
      as: editorA,
      ...createPage('__A__', BUSINESS_A1, '__SELF__'),
      expect: 'rows',
      why: 'A `business` scope covers every Page beneath it, including one that does not exist yet, so '
         + 'a scoped editor may create a Page under the Business they are scoped to. §11.3 still '
         + 'applies: 021\'s editor policy repeats 020\'s archived-Business clause, because a '
         + 'permissive policy ORs and omitting it would have let the editor do the one thing 020 '
         + 'wrote that policy to prevent.',
    },
    {
      id: 'editor-a-cannot-create-a-page-under-business-a2',
      covers: ['§8.1/editor-P', '§8.6/3'],
      as: editorA,
      ...createPage('__A__', BUSINESS_A2, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'page_context_profiles' },
      why: 'The write half of §8.6 case 3. An INSERT has no USING clause to filter it silently, so '
         + 'this raises where the UPDATE above returns nothing — and the layer is declared because '
         + 'the editor holds every INSERT column privilege this statement names.',
    },
    {
      id: 'editor-a-can-write-a-business-a1-version',
      covers: ['§8.1/editor-P', '§8.6/1'],
      as: editorA,
      ...createBusinessVersion('__A__', BUSINESS_A1, '__SELF__'),
      expect: 'rows',
      why: 'A version is the immutable record of the operation §8.1 grants, which is 020\'s reading of '
         + 'the matrix and is unchanged here: the editor\'s version INSERT follows the editor\'s '
         + 'Business write. Without this case, the negative below passes against a table the editor '
         + 'cannot touch at all.',
    },
    {
      id: 'editor-a-cannot-write-a-business-a2-version',
      covers: ['§8.1/editor-P', '§8.6/3'],
      as: editorA,
      ...createBusinessVersion('__A__', BUSINESS_A2, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'business_profile_versions' },
      why: 'History is written inside the scope or not at all. An editor able to append a version to a '
         + 'Business they cannot read would be writing into another team\'s record — and the row would '
         + 'then be immutable, so nobody could remove it either.',
    },
    {
      id: 'page-editor-a-can-update-page-a1-in-scope',
      covers: ['§8.1/editor-P', '§8.6/1'],
      as: pageEditorA,
      sql: 'update app.page_context_profiles set name = $2 where id = $1 returning id',
      params: [PAGE_A1, 'renamed by the editor scoped to this page'],
      expect: 'rows',
      why: 'The editor `P` at Page granularity: this identity\'s capability is one Page and it reaches '
         + 'exactly that Page\'s write path.',
    },
    {
      id: 'page-editor-a-cannot-update-page-a1-sibling',
      covers: ['§8.6/4', '§8.1/editor-P'],
      as: pageEditorA,
      sql: 'update app.page_context_profiles set name = $2 where id = $1 returning id',
      params: [PAGE_A1_SIBLING, 'renamed outside the page scope'],
      expect: 'no-effect',
      witness: pageA1SiblingNameUnchanged,
      why: '§8.6 case 4 on the write path. Same Business, same role, same verb, a different Page — and '
         + 'the witness, run as the unscoped owner, is what turns "returned nothing" into "the row is '
         + 'still there and still says what it said".',
    },
    {
      id: 'page-editor-a-cannot-create-a-page-under-business-a1',
      covers: ['§8.1/editor-P', '§8.6/4'],
      as: pageEditorA,
      ...createPage('__A__', BUSINESS_A1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'page_context_profiles' },
      why: 'A `page` scope names one Page and a new Page is not it, so a page-scoped editor cannot '
         + 'create a sibling — which is the difference between §7\'s `page` and `business` types, '
         + 'asserted on the write path. The same statement succeeds for user_editor_a two cases up, '
         + 'so this is about the scope and not about the policy refusing every page insert.',
    },

    // -- The helpers, which must answer about the CALLER and about nobody else. -------------------
    {
      id: 'owner-a-is-not-narrowed-through-the-scope-helper',
      covers: ['§7/member-scope', 'RFC-2026-020§5/5'],
      as: ownerA,
      sql: 'select 1 as admitted where app.member_scope_admits_business($1, $2)',
      params: ['__A__', BUSINESS_A2],
      expect: 'rows',
      why: 'The positive the negative below needs, asked THROUGH the helper rather than through a '
         + 'table. Without it, a helper that returned false for everyone — or that could not be '
         + 'called at all — would satisfy every scope negative in this batch.',
    },
    {
      id: 'editor-a-is-narrowed-through-the-scope-helper',
      covers: ['§12.6/2', '§7/member-scope'],
      as: editorA,
      sql: 'select 1 as admitted where app.member_scope_admits_business($1, $2)',
      params: ['__A__', BUSINESS_A2],
      expect: 'no-rows',
      why: 'THE SAME QUESTION, THE SAME ARGUMENTS, A DIFFERENT ANSWER — which is the whole claim that '
         + 'these helpers are about the caller. The pair is what makes it a claim: one identity is '
         + 'narrowed and one is not, and nothing but who is asking distinguishes the two calls.',
    },
    {
      id: 'scope-helper-is-not-an-oracle-for-third-parties',
      covers: ['§8.6/5', 'RFC-2026-020§6.3/12'],
      as: ownerB,
      sql: 'select 1 as covered where app.member_scope_covers_business($1, $2)',
      params: ['__A__', BUSINESS_A1],
      expect: 'no-rows',
      why: 'The helpers are EXECUTE-granted to `authenticated` on purpose, so anyone holding a token '
         + 'can call one for any workspace id. Four members of workspace A ARE scoped to business_a1 '
         + 'and this caller is told nothing about them: the answer is about the CALLER\'s own scope '
         + 'rows, which is a property of `workspace_member_scopes_select_own` rather than of anything '
         + 'in the function body. Workspace B\'s owner asks while holding A\'s and business_a1\'s '
         + 'exact ids.',
    },
    {
      id: 'anonymous-cannot-call-the-scope-helper',
      covers: ['§12.6/6', '§8.5'],
      as: anonymous,
      sql: 'select 1 as admitted where app.member_scope_admits_business($1, $2)',
      params: ['__A__', BUSINESS_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: '§8.5: EXECUTE is revoked from PUBLIC and granted explicitly, and anon is granted nothing '
         + 'anywhere. The refusal is expected from the privilege system before the function is '
         + 'entered — on the SCHEMA, because anon holds no USAGE on app and name resolution stops '
         + 'there.',
    },

    // -- Batch 030. The GLOBAL catalog, whose control is not a tenant boundary. -------------------
    //
    // §9.1 classifies the published industry catalog PUBLIC-0 with "Client projection: allowed", and
    // RFC-2026-012 §2/3 puts that projection behind a named security_invoker view on an allowlist
    // that starts empty and grows only by RFC. The allowlist is still empty — `exposed_views` in
    // db/foundation/lint/catalog-snapshot.json measures `[]` — so batch 030 grants no client role
    // anything on either global table.
    //
    // THESE CASES ARE THAT ALLOWLIST, EXECUTED. A denial at the GRANT layer is what an empty
    // allowlist looks like from the request path, and the day a batch adds the grant without the
    // RFC, four of them fail. That is the point of asserting the layer rather than the refusal.
    {
      id: 'owner-a-cannot-read-the-industry-pack-catalog',
      covers: ['RFC-2026-012§2', 'RFC-2026-012§3', '§9.1/PUBLIC-0'],
      as: ownerA,
      sql: 'select pack_id from app.industry_packs where id = $1',
      params: [PACK],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_packs' },
      why: 'A workspace owner holding the catalog row\'s exact id is refused by the PRIVILEGE system, '
         + 'because RFC-2026-012 §2 puts every direct client read behind a named security_invoker '
         + 'view and §3 starts that allowlist empty. §9.1 says a PUBLIC-0 projection MAY be shown to '
         + 'a client; it names no object and no tier, and the object is what this case is about.',
    },
    {
      id: 'owner-b-cannot-read-the-industry-pack-catalog',
      covers: ['RFC-2026-012§3', '§5/global'],
      as: ownerB,
      sql: 'select pack_id from app.industry_packs where id = $1',
      params: [PACK],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_packs' },
      why: 'THE SAME REFUSAL FROM THE OTHER TENANT, and the pair is the assertion. On every table '
         + 'before this one, two owners get different answers because the row belongs to one of '
         + 'them. This row belongs to neither, so a cross-tenant case would prove nothing — the '
         + 'claim that means something is that the catalog is equally unreachable from both sides.',
    },
    {
      id: 'owner-a-cannot-read-a-published-pack-version',
      covers: ['RFC-2026-012§2', 'RFC-2026-012§3'],
      as: ownerA,
      sql: 'select version, checksum from app.industry_pack_versions where id = $1',
      params: [PACK_V1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_pack_versions' },
      why: 'The version table carries the checksum every consumer must pin, and it is behind the '
         + 'same empty allowlist. A client that needs it reads it through the server tier or through '
         + 'a view an RFC has named; neither exists, and this case is what says so.',
    },
    {
      id: 'anonymous-cannot-read-the-industry-pack-catalog',
      covers: ['§12.6/6', '§8.5', 'RFC-2026-012§3'],
      as: anonymous,
      sql: 'select pack_id from app.industry_packs where id = $1',
      params: [PACK],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'A published catalog is the one thing in this schema an anonymous reader could plausibly '
         + 'be given, which is exactly why the refusal is asserted rather than assumed. anon holds '
         + 'no USAGE on app, so name resolution stops at the SCHEMA — and the day somebody decides '
         + 'the product has an unauthenticated surface, this case fails and the decision arrives '
         + 'with an owner instead of inside a migration.',
    },
    {
      id: 'service-sees-zero-rows-in-the-industry-pack-catalog',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: 'select pack_id from app.industry_packs where id = $1',
      params: [PACK],
      expect: 'no-rows',
      why: 'THE ONE CASE ON THIS TABLE THAT ROW LEVEL SECURITY DECIDES, and the reason app_worker '
         + 'holds a SELECT grant at all. Without the grant this refusal would be 42501 either way '
         + 'and would prove only that somebody forgot a GRANT; with the grant and no policy, an '
         + 'empty read can only have come from RLS — and a service role that had quietly acquired '
         + 'BYPASSRLS would SUCCEED here. It is also the case the CI negative control for '
         + 'app.industry_packs exists to break: a global table has no tenant boundary to disable, so '
         + 'this is what disabling row level security on it makes visible.',
    },
    {
      id: 'service-sees-zero-published-pack-versions',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: 'select version from app.industry_pack_versions where id = $1',
      params: [PACK_V1],
      expect: 'no-rows',
      why: 'The same, one table over, and the same role for the CI negative control on '
         + 'app.industry_pack_versions. The Core Runtime will have to read published packs; the '
         + 'policy that lets it is owed to the batch that brings the resolver, and until then the '
         + 'service reads nothing and this case says so out loud.',
    },
    {
      id: 'owner-a-cannot-publish-an-industry-pack',
      covers: ['RFC-2026-012§1', '§8/no-row'],
      as: ownerA,
      sql: 'insert into app.industry_packs (pack_id, industry_key, publisher)'
         + " values ('th.sme.attempted', 'attempted', 'attempted') returning id",
      params: [],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_packs' },
      why: 'The catalog is platform-curated and written by the global seed. §8 has no row for an '
         + 'industry pack in any of its four matrices, so there is no cell granting this and the '
         + 'refusal is deny-by-default reaching the privilege layer.',
    },
    {
      id: 'owner-a-cannot-publish-a-pack-version',
      covers: ['RFC-2026-012§1', '§8/no-row'],
      as: ownerA,
      sql: 'insert into app.industry_pack_versions'
         + ' (industry_pack_id, version, display_name_th, checksum, released_at)'
         + " values ($1, '9.9.9', 'attempted', 'sha256:' || repeat('0', 64), now()) returning id",
      params: [PACK],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_pack_versions' },
      why: 'Publishing a version is what makes a pack real to every tenant at once. A workspace '
         + 'owner may not do it, and the refusal is a privilege-layer one so it cannot be widened by '
         + 'editing a policy.',
    },
    {
      id: 'owner-a-cannot-update-a-published-pack-version',
      covers: ['§8.6/9', '§4/invariant-8'],
      as: ownerA,
      sql: 'update app.industry_pack_versions set display_name_th = $2 where id = $1 returning id',
      params: [PACK_V1, 'renamed a published version'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_pack_versions' },
      why: '"Published version immutable; แก้ด้วย version ใหม่เท่านั้น", and §3.2 and §4 invariant 8 '
         + 'say the same of every published version. It is expressed as an ABSENT GRANT, so the '
         + 'refusal happens before RLS is consulted and cannot be undone by a policy edit.',
    },
    {
      id: 'owner-a-cannot-delete-a-published-pack-version',
      covers: ['§8.6/9', '§4/invariant-8'],
      as: ownerA,
      sql: 'delete from app.industry_pack_versions where id = $1 returning id',
      params: [PACK_V1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_pack_versions' },
      why: 'UPDATE and DELETE are separate privileges, so they are separate cases: a batch that '
         + 'granted one of them would be caught by exactly one of the two, and a pair asserted as '
         + 'one claim would catch neither.',
    },
    {
      id: 'service-cannot-update-a-published-pack-version',
      covers: ['§8.6/9', '§12.6/8'],
      as: service,
      sql: 'update app.industry_pack_versions set display_name_th = $2 where id = $1 returning id',
      params: [PACK_V1, 'renamed by the service'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_pack_versions' },
      why: '§8.1\'s only `N` in the SERVICE column is immutable version UPDATE/DELETE, and a '
         + 'published pack version is one. app_worker holds SELECT here and nothing else, so this is '
         + 'refused at the privilege layer while its READ is refused by RLS — two different layers '
         + 'on one table, each asserted as itself.',
    },
    {
      id: 'service-cannot-delete-a-published-pack-version',
      covers: ['§8.6/9', '§12.6/8'],
      as: service,
      sql: 'delete from app.industry_pack_versions where id = $1 returning id',
      params: [PACK_V1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_pack_versions' },
      why: 'The second verb, for the reason the owner pair gives.',
    },

    // -- Batch 030. The tenant assignment, which is where the boundary IS the control. ------------
    //
    // §8.1 has no row for an industry pack, and it has two for a Business. 020's header named the
    // industry assignment as part of a Business's attribute surface while deferring it here, so
    // "Business/Page SELECT" (Y for every role) and "Business/Page INSERT/UPDATE/archive" (Y owner
    // and admin, P editor) are the cells these cases exercise, through 011's membership helpers and
    // 021's scope helpers.
    {
      id: 'owner-a-sees-business-a1-pinned-to-the-global-pack-version',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerA,
      sql: pinnedTo,
      params: ['__A__', BUSINESS_A1, PACK_V1],
      expect: 'rows',
      why: 'The positive half, and the A side of the claim that the catalog is GLOBAL: this owner '
         + 'sees their Business pinned to a version id, and the case names that id rather than '
         + 'selecting whatever is there, so it is an assertion about one row.',
    },
    {
      id: 'owner-b-sees-business-b1-pinned-to-the-same-global-pack-version',
      covers: ['§12.6/1', '§8.6/1', '§5/global'],
      as: ownerB,
      sql: pinnedTo,
      params: ['__B__', BUSINESS_B1, PACK_V1],
      expect: 'rows',
      why: 'THE OTHER HALF, AND THE WHOLE OF WHAT "GLOBAL" MEANS HERE. Two tenants pin the SAME '
         + 'catalog row — the same uuid appears in both cases — and neither owner can see the '
         + "other's assignment. A catalog replicated per tenant would pass the case above and fail "
         + 'this one; a leaking assignment table would pass both and fail the negative below.',
    },
    {
      id: 'owner-a-cannot-read-the-industry-assignment-of-business-b1',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: `select id from app.industry_assignments where ${ASSIGNMENT_OF}`,
      params: ['__B__', BUSINESS_B1],
      expect: 'no-rows',
      why: "Tenant A's owner holds tenant B's exact workspace and Business ids, the row IS there — "
         + 'the case above proves it — and it is not visible. That is the tenant boundary doing its '
         + 'work on the one table in this batch that has one.',
    },
    {
      id: 'owner-a-cannot-repin-the-industry-assignment-of-business-b1',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      ...repin('__B__', BUSINESS_B1, PACK_V2),
      expect: 'no-effect',
      witness: assignmentWitness(ownerB, B, BUSINESS_B1, PACK_V1),
      why: 'The USING clause does not admit the row, so the statement matches nothing and Postgres '
         + "raises nothing. The witness — run as B's own owner — turns \"returned nothing\" into "
         + '"the row is still pinned to the version it was pinned to".',
    },
    {
      id: 'owner-a-cannot-assign-an-industry-pack-to-business-b1',
      covers: ['§8.6/5', '§8.6/8'],
      as: ownerA,
      ...assign('__B__', BUSINESS_B1, PACK_V2, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'industry_assignments' },
      why: 'The write half of the cross-tenant case. An INSERT has no USING clause to filter it '
         + 'silently, so this raises where the update above returns nothing — and the layer is '
         + 'declared because the caller holds every INSERT column privilege the statement names, so '
         + 'a grant-layer refusal here would mean the policy was never reached.',
    },
    {
      id: 'viewer-a-sees-the-industry-assignment-of-business-a1',
      covers: ['§8.6/1', '§8.1/business-select'],
      as: viewerA,
      sql: pinnedTo,
      params: ['__A__', BUSINESS_A1, PACK_V1],
      expect: 'rows',
      why: '§8.1 marks Business/Page SELECT `Y` for every built-in role, so the predicate tests '
         + 'active membership and not role. Without this the write refusals below are satisfied by a '
         + 'viewer who cannot see the table at all.',
    },
    {
      id: 'viewer-a-cannot-repin-the-industry-assignment-of-business-a1',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...repin('__A__', BUSINESS_A1, PACK_V2),
      expect: 'no-effect',
      witness: assignmentWitness(ownerA, A, BUSINESS_A1, PACK_V1),
      why: 'Same workspace, wrong role. §8.1 gives Business INSERT/UPDATE `N` to the viewer, so the '
         + 'row is outside every UPDATE policy\'s USING clause and the statement matches nothing. '
         + 'The witness proves business_a1 is still pinned to the version it was pinned to.',
    },
    {
      id: 'viewer-a-cannot-assign-an-industry-pack-to-business-a4',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...assign('__A__', BUSINESS_A4, PACK_V1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'industry_assignments' },
      why: 'The same role against the free Business slot, on the path that raises. The viewer holds '
         + 'the INSERT column grant — §12.6/4 is about a POLICY refusing a viewer, and a case that '
         + 'was refused for want of a grant would prove the grant instead.',
    },
    {
      id: 'approver-a-cannot-repin-the-industry-assignment-of-business-a1',
      covers: ['§8.6/2'],
      as: approverA,
      ...repin('__A__', BUSINESS_A1, PACK_V2),
      expect: 'no-effect',
      witness: assignmentWitness(ownerA, A, BUSINESS_A1, PACK_V1),
      why: '§8.1 gives Business INSERT/UPDATE `N` to the approver too, and an approver scoped to '
         + 'this very Business is the sharper test: their member scope ADMITS the row and their role '
         + 'still refuses the write, which is §7\'s "role sets the ceiling, scope narrows it" in the '
         + 'direction people forget.',
    },
    {
      id: 'owner-a-can-assign-an-industry-pack-to-business-a4',
      covers: ['§8.6/1', '§8.1/business-write'],
      as: ownerA,
      ...assign('__A__', BUSINESS_A4, PACK_V1, '__SELF__'),
      expect: 'rows',
      why: 'The permitted INSERT, without which every refusal above is satisfied by a table nobody '
         + 'can write. business_a4 is the fixture\'s only live unassigned Business, because §4\'s ERD '
         + 'makes an assignment zero-or-one per Business and every other live Business must already '
         + 'carry one. The write is real and the transaction is rolled back, as every permitted '
         + 'write in this suite is.',
    },
    {
      id: 'owner-a-can-repin-business-a1-to-the-second-pack-version',
      covers: ['§8.6/1', '§8.1/business-write'],
      as: ownerA,
      ...repin('__A__', BUSINESS_A1, PACK_V2),
      expect: 'rows',
      why: 'Re-pinning is how a Business moves to a newer published pack, which §4.5 activates by '
         + 'explicit approval for a minor version. It is the only mutation this table offers: '
         + 'un-pinning would be a DELETE, and no role holds one.',
    },
    {
      id: 'owner-a-cannot-assign-an-industry-pack-to-an-archived-business',
      covers: ['§11.3', '§8.6/2'],
      as: ownerA,
      ...assign('__A__', BUSINESS_A3_ARCHIVED, PACK_V1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'industry_assignments' },
      why: '§11.3: "Archive ปิด creation/publish ใหม่ แต่ยังอ่าน history ตาม role". Creating an '
         + 'assignment under an archived Business is new creation under it, and both INSERT policies '
         + 'carry the clause — the permissive one for the editor would OR past it otherwise, which '
         + 'is the mistake 021 records about its own page insert.',
    },
    {
      id: 'owner-a-cannot-forge-created-by-on-an-industry-assignment',
      covers: ['§12.6/7', '§8.6/8'],
      as: ownerA,
      ...assign('__A__', BUSINESS_A4, PACK_V1, id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'industry_assignments' },
      why: '§8.5: a user action asserts `created_by = (select auth.uid())`. The same statement '
         + 'succeeds two cases up with the owner\'s own subject, so this is about the forged column '
         + 'and not about the owner being unable to write at all.',
    },
    {
      id: 'owner-a-cannot-pin-business-a1-to-a-row-that-is-not-a-pack-version',
      covers: ['§4/invariant-10', '§4.3/pinning'],
      as: ownerA,
      ...repin('__A__', BUSINESS_A1, PACK),
      expect: 'rejected',
      sqlstate: '23503',
      why: 'THE CONSTRAINT, NOT THE POLICY, AND THE CASE DEMANDS THE CONSTRAINT\'S OWN SQLSTATE. The '
         + 'id passed is the industry PACK\'s — a real row in this database, held by the caller, and '
         + 'not a published version — so every policy admits the statement and the foreign key '
         + 'refuses it. A case that would also pass on 42501 would be satisfied by a policy stopping '
         + 'the row on a database whose foreign key had been dropped, which is the pinning rule this '
         + 'case exists to prove.',
    },
    {
      id: 'owner-a-cannot-move-an-industry-assignment-to-another-business',
      covers: ['§8.5', '§12.6/7'],
      as: ownerA,
      sql: `update app.industry_assignments set business_profile_id = $3 where ${ASSIGNMENT_OF} returning id`,
      params: ['__A__', BUSINESS_A1, BUSINESS_A4],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_assignments' },
      why: '§8.5 forbids moving a row across tenant OR scope with an update, and the UPDATE grant '
         + 'names only industry_pack_version_id and updated_by. So this is refused by the PRIVILEGE '
         + 'system rather than by a WITH CHECK a later edit could weaken — by the workspace owner, '
         + 'who may do everything else on this row.',
    },
    {
      id: 'owner-a-cannot-delete-an-industry-assignment',
      covers: ['§8.5', '§8.6/2'],
      as: ownerA,
      sql: `delete from app.industry_assignments where ${ASSIGNMENT_OF} returning id`,
      params: ['__A__', BUSINESS_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'industry_assignments' },
      why: '§8.5 has no broad user delete and requires a soft delete through a typed lifecycle '
         + 'field; no document names one for this row, so batch 030 grants the verb to nobody rather '
         + 'than inventing the field. A Business can be re-pinned and not un-pinned, which is stated '
         + 'in the migration header and asserted here.',
    },

    // -- Batch 030. The member scope narrowing, on a table created after 021 rather than before it.
    {
      id: 'editor-a-can-repin-the-industry-assignment-of-business-a1',
      covers: ['§8.1/editor-P', '§8.6/1'],
      as: editorA,
      ...repin('__A__', BUSINESS_A1, PACK_V2),
      expect: 'rows',
      why: '§8.1 marks Business INSERT/UPDATE `P` for the editor and 021 supplies the condition: an '
         + 'editor whose member scope EXPLICITLY covers the Business. This identity is scoped to '
         + 'business_a1, so it passes here and nowhere else.',
    },
    {
      id: 'editor-a-scope-does-not-reach-the-industry-assignment-of-business-a2',
      covers: ['§12.6/2', '§8.6/3'],
      as: editorA,
      sql: `select id from app.industry_assignments where ${ASSIGNMENT_OF}`,
      params: ['__A__', BUSINESS_A2],
      expect: 'no-rows',
      why: 'Same workspace, same role, a Business the editor\'s scope does not name. The RESTRICTIVE '
         + 'policy is what makes a SELECT this table already granted to every member narrower — a '
         + 'permissive one could not subtract — and the row IS there, which the two positives below '
         + 'prove.',
    },
    {
      id: 'owner-a-is-unscoped-and-sees-the-industry-assignment-of-business-a2',
      covers: ['§7/member-scope', '§8.6/3'],
      as: ownerA,
      sql: pinnedTo,
      params: ['__A__', BUSINESS_A2, PACK_V2],
      expect: 'rows',
      why: 'The control the negative above needs. user_owner_a holds NO scope row, and 021 reads §7 '
         + 'as "a member with no row is not narrowed", so this identity sees the assignment the '
         + 'editor cannot. Without it, a policy that hid business_a2\'s assignment from EVERYBODY '
         + 'would pass as a working narrowing.',
    },
    {
      id: 'viewer-a-all-businesses-scope-still-sees-the-industry-assignment-of-business-a2',
      covers: ['§7/member-scope'],
      as: viewerA,
      sql: pinnedTo,
      params: ['__A__', BUSINESS_A2, PACK_V2],
      expect: 'rows',
      why: 'The second control, and the one that keeps `member_scope_admits_business` honest on this '
         + 'table: user_viewer_a IS narrowed — it holds an all_businesses row — and still sees '
         + 'business_a2. A helper that answered "narrowed therefore excluded" would fail here rather '
         + 'than passing everywhere.',
    },
    {
      id: 'editor-a-cannot-repin-the-industry-assignment-of-business-a2',
      covers: ['§12.6/2', '§8.6/3'],
      as: editorA,
      ...repin('__A__', BUSINESS_A2, PACK_V1),
      expect: 'no-effect',
      witness: assignmentWitness(ownerA, A, BUSINESS_A2, PACK_V2),
      why: 'The write half of the same boundary. The restrictive policy keeps the row out of the '
         + 'USING clause, so the statement matches nothing and Postgres raises nothing — and the '
         + 'witness runs as the UNSCOPED owner, the only A-side identity that can see the row and '
         + 'prove it is still pinned where it was.',
    },
    {
      id: 'editor-a-cannot-assign-an-industry-pack-to-business-a4',
      covers: ['§8.1/editor-P', '§8.6/3'],
      as: editorA,
      ...assign('__A__', BUSINESS_A4, PACK_V1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'industry_assignments' },
      why: '`covers`, not `admits`, doing the work the letter `P` asks for: this editor is scoped to '
         + 'business_a1 and business_a4 is named by no scope row of theirs, so the explicit '
         + 'capability is absent and the permissive editor policy refuses. The owner performs the '
         + 'identical statement successfully, so the case is about the scope and not about the '
         + 'policy refusing every assignment.',
    },
    {
      id: 'page-editor-a-can-repin-the-industry-assignment-of-business-a1',
      covers: ['§7/member-scope', '§8.1/editor-P'],
      as: pageEditorA,
      ...repin('__A__', BUSINESS_A1, PACK_V2),
      expect: 'rows',
      why: 'A CONSEQUENCE OF 021 RECORDED RATHER THAN RE-DECIDED, because it is the one result here '
         + 'a reviewer should look at twice. `app.member_scope_covers_business` counts a `page` '
         + 'scope on the Business its Page hangs from — 021 says so in terms, so that a page-scoped '
         + 'member can reach the Business at all — and an industry assignment is a Business-level '
         + 'row. So an editor scoped to ONE PAGE can re-pin the whole Business. 021 already grants '
         + 'this identity UPDATE on app.business_profiles by the same predicate, so batch 030 '
         + 'inherits the semantics rather than widening them; narrowing it would mean a different '
         + '`covers` function, which is an amendment to a merged batch and not this one\'s to make.',
    },
    {
      id: 'suspended-a-sees-zero-industry-assignments',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: `select id from app.industry_assignments where ${ASSIGNMENT_OF}`,
      params: ['__A__', BUSINESS_A1],
      expect: 'no-rows',
      why: '§7: only status=active grants access. This table has no membership predicate of its own '
         + '— visibility is `app.is_active_member(workspace_id)` and nothing else — so a suspended '
         + 'member seeing an assignment would mean the batch 011 helper had started answering for an '
         + 'inactive membership. The row is there and the owner reads it, which is what makes this '
         + 'a claim about the predicate.',
    },
    {
      id: 'anonymous-sees-no-industry-assignment',
      covers: ['§12.6/6', '§8.5'],
      as: anonymous,
      sql: `select id from app.industry_assignments where ${ASSIGNMENT_OF}`,
      params: ['__A__', BUSINESS_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: '§8.5 gives anonymous no tenant policy and batch 030 grants anon nothing, so the refusal '
         + 'comes from the privilege system on the SCHEMA before a table is reached — stronger than '
         + '§12.6/6 asks for, and recorded as the layer and the object so it fails the day anon is '
         + 'granted USAGE on app.',
    },
    {
      id: 'service-sees-zero-industry-assignments',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: `select id from app.industry_assignments where ${ASSIGNMENT_OF}`,
      params: ['__A__', BUSINESS_A1],
      expect: 'no-rows',
      why: 'app_worker holds SELECT, INSERT and UPDATE on this table and no policy, so an empty read '
         + 'is attributable to row level security rather than to a forgotten grant — and a service '
         + 'role that had acquired BYPASSRLS would return the row instead.',
    },

    // =========================================================================================
    // Batch 040 — knowledge items, their immutable versions, and the two-column scope.
    // =========================================================================================
    //
    // Two tables, and the reason this block is the longest in the file is that it is the first
    // family whose ROWS DIFFER IN SHAPE. Every table before this one has a single scope column that
    // every row of it carries; §4 invariant 3 gives a knowledge row a mandatory Business scope AND
    // an optional Page override, so the narrowing decides per row which question to ask and every
    // scope assertion below has to be made twice — once about a business-level row and once about a
    // page-level one.
    //
    // THE OTHER NEW THING IS THE ROLE. §8.2 marks the editor `Y` on "Knowledge current
    // INSERT/UPDATE/archive" where §8.1 marked it `P` on the Business/Page equivalent, so this is
    // the first batch where an editor's write is asserted as a POSITIVE rather than as a
    // default-deny — and `editor-a-can-update-the-knowledge-item-of-business-a1` is the case that
    // says so. Without it the narrowing cases below would be satisfied by an editor who can write
    // nothing at all.
    //
    // WHAT THIS BLOCK DELIBERATELY DOES NOT CONTAIN IS A `rejected` CASE, and the absence is a
    // finding rather than an omission. Batch 020 could assert §4 invariant 10 as a raw 23503
    // because its version INSERT policy checked only `created_by` and the role, so a row naming an
    // unrelated Business passed every policy and reached the foreign key. Batch 040's INSERT policy
    // checks the Business and the Page with subqueries that are the composite foreign keys' own
    // conditions evaluated under RLS, and the version's restrictive policy is literally the
    // version FK's condition evaluated under RLS — so a caller who would violate either constraint
    // is refused by a POLICY first, with 42501, and a `rejected` case demanding 23503 could not be
    // satisfied by a correct database. The constraints are still there and are still the backstop
    // for a path no policy covers (the service, and whatever command function 041 brings); they are
    // asserted by 040_knowledge.sql's text and by its apply-time block, and pretending otherwise
    // with a case that passed for the wrong reason would be worse than saying this.

    // -- §12.6/1, §8.6/1 and §8.6/5. The tenant boundary, on both tables and both directions. ----
    {
      id: 'owner-a-sees-the-knowledge-item-of-business-a1',
      covers: ['§12.6/1', '§8.6/1', '§8.2/knowledge-select'],
      as: ownerA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'rows',
      why: '§8.2 "Knowledge/Research SELECT" is Y for every built-in role, so the predicate tests active '
         + 'membership and not role. The positive half: without it every negative below is satisfied by a '
         + 'policy that hides everything, or by a fixture that never loaded.',
    },
    {
      id: 'owner-a-sees-the-page-scoped-knowledge-item-of-page-a1',
      covers: ['§12.6/1', '§8.6/1', '§4/invariant-3'],
      as: ownerA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_PAGE],
      expect: 'rows',
      why: 'The OTHER shape, read by the same identity. A page-level row goes through '
         + 'app.member_scope_admits_page where the row above goes through '
         + 'app.member_scope_admits_business, so this is not implied by the case above it — it is the '
         + 'other branch of the same `case` expression, and an unscoped owner must pass both.',
    },
    {
      id: 'owner-a-cannot-see-the-knowledge-item-of-business-b1',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_B1_BUSINESS],
      expect: 'no-rows',
      why: "Tenant A's owner holds tenant B's knowledge id exactly, and the row is not there. Knowledge "
         + 'is CONTENT-2 — §9.1 classes it "tenant isolated" — so this is the first table in the schema '
         + 'where a cross-tenant read would be a leak of what another business actually says rather than '
         + 'of what it is called.',
    },
    {
      id: 'owner-a-cannot-update-the-knowledge-item-of-business-b1',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      ...renameKnowledge(KNOWLEDGE_B1_BUSINESS, 'renamed across the tenant boundary'),
      expect: 'no-effect',
      witness: knowledgeNameUnchanged(ownerB, KNOWLEDGE_B1_BUSINESS, KNOWLEDGE_B1_BUSINESS_NAME),
      why: 'The USING clause does not admit the row, so nothing is raised and nothing is changed. The '
         + "witness runs as B's own owner and is what turns \"returned nothing\" into \"the row is still "
         + 'there and still says what it said".',
    },
    {
      id: 'owner-b-sees-the-knowledge-item-of-business-b1',
      covers: ['§8.6/1'],
      as: ownerB,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_B1_BUSINESS],
      expect: 'rows',
      why: 'The far side of the boundary is a real, populated tenant. Otherwise every A-side negative '
         + 'above is satisfied by the row simply not existing.',
    },
    {
      id: 'owner-a-cannot-create-a-knowledge-item-in-workspace-b',
      covers: ['§12.6/7', '§8.6/5'],
      as: ownerA,
      ...createBusinessKnowledge('__B__', BUSINESS_B1, 'voice', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: 'A forged workspace_id, submitted by a real owner of a real workspace and naming a real other '
         + 'one, with that workspace\'s real Business beside it. §3.3: a workspace_id from a client is '
         + 'never trusted. An INSERT has no USING clause to filter it silently, so WITH CHECK refuses and '
         + 'the database raises — and the layer is declared, because a missing INSERT grant would raise '
         + 'the same 42501 while proving nothing about the policy.',
    },
    {
      id: 'owner-a-cannot-forge-created-by-on-a-knowledge-item',
      covers: ['§12.6/7', '§8.6/8'],
      as: ownerA,
      ...createBusinessKnowledge('__A__', BUSINESS_A1, 'voice', id('user_viewer_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: '§8.5: a user action asserts created_by = (select auth.uid()). The forged subject is ANOTHER '
         + 'ACTIVE MEMBER OF THE SAME WORKSPACE, so nothing but that conjunct refuses it — and the same '
         + 'statement with the caller\'s own subject succeeds two cases above, which is what makes this '
         + 'about the forged column rather than about the caller being unable to write.',
    },
    {
      id: 'owner-a-cannot-delete-a-knowledge-item',
      covers: ['§8.5', '§12.6/4'],
      as: ownerA,
      sql: 'delete from app.knowledge_items where id = $1 returning id',
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: '§8.5 has no broad user delete; archiving is the typed lifecycle field §8.2 names in the '
         + 'operation itself. No role holds DELETE, so EVEN THE OWNER is refused and the refusal is at '
         + 'the privilege layer — which is why §12.6/4 rests on the viewer\'s insert and update rather '
         + 'than on a delete that says nothing about a viewer.',
    },

    // -- §8.2's three `Y` cells, as writes that actually succeed. ------------------------------
    {
      id: 'owner-a-can-create-a-business-level-knowledge-item',
      covers: ['§8.6/1', '§8.2/knowledge-write', '§4/invariant-3'],
      as: ownerA,
      ...createBusinessKnowledge('__A__', BUSINESS_A1, 'voice', '__SELF__'),
      expect: 'rows',
      why: 'The permitted write, rolled back with its transaction. Without it every refusal in this block '
         + 'passes against a table nobody can write at all, which is a different design.',
    },
    {
      id: 'owner-a-can-create-a-page-scoped-knowledge-item',
      covers: ['§8.6/1', '§8.2/knowledge-write', '§4/invariant-3'],
      as: ownerA,
      ...createPageKnowledge('__A__', BUSINESS_A1, PAGE_A1, 'audience', '__SELF__'),
      expect: 'rows',
      why: 'The nullable OVERRIDE, written. §3.3 lists knowledge under the Page row conditionally — '
         + '"policy/knowledge/asset ที่จำกัดเฉพาะเพจ" — so a schema where only the business-level shape '
         + 'could be created would satisfy every read case above and implement half of §4 invariant 3.',
    },
    {
      id: 'editor-a-can-create-a-knowledge-item-under-business-a1',
      covers: ['§8.2/knowledge-write', '§7/editor', '§8.6/1'],
      as: editorA,
      ...createBusinessKnowledge('__A__', BUSINESS_A1, 'voice', '__SELF__'),
      expect: 'rows',
      why: 'THE CELL THIS BATCH TURNS ON. §8.2 marks "Knowledge current INSERT/UPDATE/archive" `Y` for '
         + 'the editor, where §8.1 marks the Business/Page equivalent `P` — §7 says the same in prose, '
         + '"editor: สร้าง/แก้ knowledge ... เมื่อ policy อนุญาต", and creating knowledge is the first '
         + 'thing on that list. So the write policy names the editor unconditionally and the scope rule '
         + 'narrows it, which is what §8\'s legend means by `Y`. Batch 021\'s `covers` treatment belongs '
         + 'to a `P` cell and is deliberately NOT used here; the difference is asserted by this case '
         + 'passing while `editor-a-cannot-create-a-business` (batch 020/021) still fails.',
    },
    {
      id: 'editor-a-can-update-the-knowledge-item-of-business-a1',
      covers: ['§8.2/knowledge-write', '§7/editor'],
      as: editorA,
      ...renameKnowledge(KNOWLEDGE_A1_BUSINESS, 'renamed by the editor inside its scope'),
      expect: 'rows',
      why: 'The UPDATE half of the same cell, and the positive every narrowing case below needs: without '
         + 'it, "the editor cannot reach business_a2" is satisfied by an editor who can reach nothing.',
    },

    // -- §11.3. Archive closes new creation, and this family has TWO parents that can be archived. -
    {
      id: 'owner-a-cannot-create-a-knowledge-item-under-an-archived-business',
      covers: ['§11.3', '§8.6/2'],
      as: ownerA,
      ...createBusinessKnowledge('__A__', BUSINESS_A3_ARCHIVED, 'voice', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: '§11.3: "Archive ปิด creation/publish ใหม่ แต่ยังอ่าน history ตาม role". Knowledge under an '
         + 'archived Business is new creation under it. The caller is the workspace OWNER, who is refused '
         + 'nothing else on this table, so the refusal is the archive clause and not the role.',
    },
    {
      id: 'owner-a-cannot-create-a-knowledge-item-under-an-archived-page',
      covers: ['§11.3', '§4/invariant-3'],
      as: ownerA,
      ...createPageKnowledge('__A__', BUSINESS_A1, PAGE_A1_ARCHIVED, 'audience', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: 'THE SECOND ARCHIVE CLAUSE, and the only case in the suite that can tell it from the first. '
         + 'page_a1_archived is an archived Page under a LIVE Business, so the Business half of the '
         + 'clause passes and only the Page half can refuse this — where business_a3_archived would have '
         + 'been refused by the first clause and proved nothing about the second. A knowledge row is the '
         + 'first row in this schema with two parents that can be archived independently.',
    },

    // -- §12.6/2, §8.6/3. Member scope, at BUSINESS granularity. -------------------------------
    {
      id: 'owner-a-is-unscoped-and-sees-the-knowledge-item-of-business-a2',
      covers: ['§12.6/2', '§7/member-scope'],
      as: ownerA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A2_BUSINESS],
      expect: 'rows',
      why: '§7: role sets the ceiling and member scope narrows it, so a member with NO scope row is not '
         + 'narrowed. This is the case that stops every negative below from being satisfied by '
         + 'business_a2\'s knowledge becoming unreadable to everybody, and it is the one that fails if '
         + 'the restrictive policy ever asked `covers` where it asks `admits`.',
    },
    {
      id: 'editor-a-sees-the-knowledge-item-of-business-a1',
      covers: ['§12.6/2', '§8.6/1'],
      as: editorA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'rows',
      why: 'The inside of the scope. §12.6/2 is "user_editor_a sees Business A1/Page A1, never A2/Page '
         + 'A2", and this is that sentence about the knowledge of A1 rather than about A1 itself.',
    },
    {
      id: 'editor-a-scope-does-not-reach-the-knowledge-item-of-business-a2',
      covers: ['§12.6/2', '§8.6/3'],
      as: editorA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A2_BUSINESS],
      expect: 'no-rows',
      why: 'Same Workspace, allowed Business A1, row in Business A2. The refusal is the RESTRICTIVE '
         + 'policy — the only shape that can narrow what the permissive SELECT already granted to every '
         + 'active member — and the owner reads the same row one case above, so this is about a policy '
         + 'rather than about a missing row.',
    },
    {
      id: 'editor-a-cannot-update-the-knowledge-item-of-business-a2',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      ...renameKnowledge(KNOWLEDGE_A2_BUSINESS, 'renamed outside the editor scope'),
      expect: 'no-effect',
      witness: knowledgeNameUnchanged(ownerA, KNOWLEDGE_A2_BUSINESS, KNOWLEDGE_A2_BUSINESS_NAME),
      why: 'The write path of the same boundary. §8.6 requires both the returned row count and the '
         + 'mutation error to be asserted, and a restrictive USING filters rather than raising — so the '
         + 'witness runs as the UNSCOPED owner, the only A-side identity that can see the row a scoped '
         + 'member was refused.',
    },
    {
      id: 'editor-a-cannot-create-a-knowledge-item-under-business-a2',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      ...createBusinessKnowledge('__A__', BUSINESS_A2, 'voice', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: 'THE CASE THAT SEPARATES THE ROLE FROM THE SCOPE. Every conjunct of the permissive write '
         + 'policy PASSES here — the caller is an editor, created_by is their own subject, business_a2 is '
         + 'live — and the RESTRICTIVE narrowing refuses. So the same identity that writes business_a1\'s '
         + 'knowledge four cases above is refused business_a2\'s, which is the whole of §7\'s "role sets '
         + 'the ceiling, member scope narrows it" in one pair.\n\n'
         + 'It is also the first case in this suite whose refusal is raised BY a restrictive policy, and '
         + 'Postgres words that differently: it names the policy before the table. The object attribution '
         + 'in rls-assertions.mjs could not read that form until batch 040 widened it, so before this '
         + 'case the only way to assert a restrictive refusal was to declare no layer and no object at '
         + 'all — the unattributed shape C0\'s review D6 removed.',
    },

    // -- §8.6/4. Member scope, at PAGE granularity, which is new at knowledge level. ------------
    //
    // §8.6 case 4 is "same Business, allowed Page A, row Page B". Batch 021 could only ask it about a
    // PAGE ROW; a knowledge item is the first thing in the schema that is itself scoped to a page, so
    // this is the first time the question is about a row's own scope rather than about its parent.
    {
      id: 'editor-a-sees-the-knowledge-item-of-the-sibling-page',
      covers: ['§7/member-scope', '§8.6/1'],
      as: editorA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_SIBLING_PAGE],
      expect: 'rows',
      why: '§7: a `business` scope is "จำกัด Business เดียว รวม Page ใต้ Business" — one Business '
         + 'INCLUDING the Pages under it. user_editor_a holds exactly that, so a knowledge item '
         + 'restricted to any Page of business_a1 is inside their scope. Without this, the page-editor '
         + 'negative below would be satisfied by the row being hidden from everybody.',
    },
    {
      id: 'page-editor-a-sees-the-page-scoped-knowledge-item-of-page-a1',
      covers: ['§8.6/1', '§4/invariant-3'],
      as: pageEditorA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_PAGE],
      expect: 'rows',
      why: 'The inside of a single-Page scope. §12.6 names no identity scoped to one Page, which is why '
         + 'batch 021 added this one; here it is what makes the next case a claim about PAGE scope '
         + 'rather than about a member who can see nothing.',
    },
    {
      id: 'page-editor-a-cannot-see-the-knowledge-item-of-the-sibling-page',
      covers: ['§8.6/4', '§4/invariant-3'],
      as: pageEditorA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_SIBLING_PAGE],
      expect: 'no-rows',
      why: 'SAME BUSINESS, ALLOWED PAGE A, ROW PAGE B. Both rows are page-level knowledge under '
         + 'business_a1, so nothing about the Business separates them and only '
         + 'app.member_scope_admits_page can. This is the case that fails if the narrowing ever asked '
         + 'the Business question about a page-level row — which would look exactly like a working '
         + 'policy from every other angle in this file.',
    },
    {
      id: 'page-editor-a-cannot-update-the-knowledge-item-of-the-sibling-page',
      covers: ['§8.6/4'],
      as: pageEditorA,
      ...renameKnowledge(KNOWLEDGE_A1_SIBLING_PAGE, 'renamed across the page boundary'),
      expect: 'no-effect',
      witness: knowledgeNameUnchanged(ownerA, KNOWLEDGE_A1_SIBLING_PAGE, KNOWLEDGE_A1_SIBLING_PAGE_NAME),
      why: 'The write path of the Page boundary, witnessed by the unscoped owner. §8.6 asks for the row '
         + 'count AND the mutation, and a filtered UPDATE raises nothing.',
    },
    {
      id: 'page-editor-a-cannot-create-a-knowledge-item-under-the-sibling-page',
      covers: ['§8.6/4'],
      as: pageEditorA,
      ...createPageKnowledge('__A__', BUSINESS_A1, PAGE_A1_SIBLING, 'offers', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: 'Every conjunct of the permissive write policy passes — an editor, their own subject, a live '
         + 'Business and a live Page — and the restrictive narrowing refuses because the Page is not the '
         + 'one this member is scoped to. An INSERT is chosen because an INSERT is the mutation that '
         + 'raises.',
    },
    {
      id: 'page-editor-a-can-update-the-business-level-knowledge-item-of-business-a1',
      covers: ['§7/member-scope', '§8.2/knowledge-write'],
      as: pageEditorA,
      ...renameKnowledge(KNOWLEDGE_A1_BUSINESS, 'renamed by the page-scoped editor'),
      expect: 'rows',
      why: 'A CONSEQUENCE OF BATCH 021 THAT BATCH 040 CONSUMES RATHER THAN RE-DECIDES, asserted '
         + 'positively so that changing it moves a test instead of quietly changing a boundary. '
         + '`app.member_scope_covers_business` counts a `page` scope row on its PARENT Business — 021 '
         + 'chose that so a member scoped to one Page can still read the Business their Page hangs from '
         + '— so `admits_business` is true here and a page-scoped editor may write BUSINESS-LEVEL '
         + 'knowledge, which reaches every Page under that Business. Batch 030 met the same consequence '
         + 'on the industry assignment and recorded the same answer: if it is wrong it is wrong in 021, '
         + 'and correcting it is a decision about the helper rather than an edit to a policy.',
    },

    // -- §12.6/3. THE APPROVER, on the tables §12.6/3 actually names. ---------------------------
    //
    // §12.6 assertion 3 is "`user_approver_a` cannot edit content/knowledge". It has read `covered:
    // false` since batch 010 with three in-scope ANALOGUES recorded and deliberately not counted —
    // an approver refused a workspace update (010), a page context (020) and an industry assignment
    // (030). These are not analogues. app.knowledge_items IS one of the two tables that sentence
    // names, and §8.2 marks the approver `N` on "Knowledge current INSERT/UPDATE/archive" and `Y` on
    // the SELECT beside it, which is exactly "cannot EDIT" rather than "cannot see".
    //
    // The content half is batch 080's and nothing here pays it. SMOKE_COVERAGE[3] therefore reads
    // `knowledge-half`, not `true`.
    {
      id: 'approver-a-sees-the-knowledge-item-of-business-a1',
      covers: ['§12.6/3', '§8.2/knowledge-select'],
      as: approverA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'rows',
      why: 'The half of the approver\'s row that is NOT a refusal. §8.2 gives the approver `Y` on '
         + 'Knowledge SELECT and `N` on the write, and §7 describes the role as "อ่านงานใน scope, '
         + 'approve/reject/request changes" — so an approver who could not READ knowledge would be a '
         + 'different bug wearing this assertion\'s name, and every refusal below would be satisfied by '
         + 'it.',
    },
    {
      id: 'approver-a-cannot-create-a-knowledge-item',
      covers: ['§12.6/3', '§8.6/2', '§8.2/knowledge-write'],
      as: approverA,
      ...createBusinessKnowledge('__A__', BUSINESS_A1, 'voice', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: '§8.2 marks the approver `N`. THE MEMBER SCOPE ADMITS THIS ROW — user_approver_a holds a '
         + '`business` scope on business_a1 — so the restrictive narrowing passes and the ROLE is the '
         + 'only thing refusing, which is §7\'s "role sets the ceiling" in the direction people forget. '
         + 'The layer is declared because the approver holds the INSERT column privileges: they are '
         + 'granted to `authenticated`, so a `grant` refusal here would mean something else broke.',
    },
    {
      id: 'approver-a-cannot-update-a-knowledge-item',
      covers: ['§12.6/3', '§8.6/2'],
      as: approverA,
      ...renameKnowledge(KNOWLEDGE_A1_BUSINESS, 'renamed by the approver'),
      expect: 'no-effect',
      witness: knowledgeNameUnchanged(ownerA, KNOWLEDGE_A1_BUSINESS, KNOWLEDGE_A1_BUSINESS_NAME),
      why: 'The approver reads this row two cases above, so the UPDATE is filtered by the write policy '
         + 'rather than by visibility — and the witness proves the row still says what it said, which is '
         + 'what an empty result cannot.',
    },
    {
      id: 'approver-a-cannot-archive-a-knowledge-item',
      covers: ['§12.6/3', '§8.6/2', '§11.3'],
      as: approverA,
      ...archiveKnowledge(KNOWLEDGE_A1_BUSINESS),
      expect: 'no-effect',
      witness: knowledgeStillLive(ownerA, KNOWLEDGE_A1_BUSINESS),
      why: '§8.2 spells the operation "INSERT/UPDATE/ARCHIVE", so the third verb is part of the cell and '
         + 'not a synonym for the second: archiving is an UPDATE of a different column, reachable '
         + 'through a different grant, and a schema that refused a rename while permitting an archive '
         + 'would let an approver hide every knowledge item in the workspace. The witness reads the '
         + 'lifecycle rather than the name, because that is the value this write would have moved.',
    },

    // -- §12.6/4. The viewer, refused every write this table offers a client. -------------------
    {
      id: 'viewer-a-cannot-create-a-knowledge-item',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...createBusinessKnowledge('__A__', BUSINESS_A1, 'voice', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: '§8.2 marks the viewer `N`, and §7 gives the role "อ่านเฉพาะ projection ที่ได้รับอนุญาต". This '
         + 'identity holds an `all_businesses` member scope, so the narrowing admits the row and the '
         + 'role is again the only thing refusing.',
    },
    {
      id: 'viewer-a-cannot-update-a-knowledge-item',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...renameKnowledge(KNOWLEDGE_A1_BUSINESS, 'renamed by the viewer'),
      expect: 'no-effect',
      witness: knowledgeNameUnchanged(ownerA, KNOWLEDGE_A1_BUSINESS, KNOWLEDGE_A1_BUSINESS_NAME),
      why: 'The second of the two verbs §12.6/4 can be asserted with on this table. Delete is not the '
         + 'third: no role holds it, so a viewer refused a delete would be refused for want of a grant '
         + 'and would say nothing about a viewer.',
    },

    // -- §12.6/5 and §12.6/6. Suspended and anonymous. ------------------------------------------
    {
      id: 'suspended-a-sees-zero-knowledge-items',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'no-rows',
      why: '§7: only status=active grants access. This table has no membership predicate of its own — '
         + 'visibility is app.is_active_member(workspace_id) and nothing else — so a suspended member '
         + 'seeing a knowledge item would mean the batch 011 helper had started answering for an '
         + 'inactive membership. The row is there and four other identities read it.',
    },
    {
      id: 'anonymous-sees-no-knowledge-item',
      covers: ['§12.6/6', '§8.6/7', '§8.5'],
      as: anonymous,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: '§8.5 gives anonymous no tenant policy and batch 040 grants anon nothing, so the refusal comes '
         + 'from the privilege system on the SCHEMA before a table is reached — stronger than §12.6/6 '
         + 'asks for, and recorded as the layer and the object so it fails the day anon is granted USAGE '
         + 'on app.',
    },

    // -- §12.6/8 and RFC-2026-017 §7. The service identity, granted and unpoliced. --------------
    {
      id: 'service-sees-zero-knowledge-items',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: KNOWLEDGE_BY_ID,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'no-rows',
      why: 'app_worker holds SELECT, INSERT and UPDATE on this table and NO policy, so an empty read is '
         + 'attributable to row level security rather than to a forgotten grant — and a service role '
         + 'that had quietly acquired BYPASSRLS would return the row instead. §8.2 marks the service `P` '
         + 'on knowledge, and a `P` nobody has defined is a permission nobody may write.',
    },
    {
      id: 'service-cannot-create-a-knowledge-item',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      // `created_by` is the WORKSPACE OWNER's subject and NOT `__SELF__`, because the service
      // identity has no subject to be: `as_service` sets the role and a `{"role":"app_worker"}`
      // claim set with no `sub`. CI found the first version of this case passing `__SELF__` —
      // which resolved to `undefined`, was inlined as the text 'undefined', and came back 22P02
      // instead of 42501. `resolvePlaceholders` now refuses that substitution outright, so the
      // mistake cannot be made again in a case nobody runs against a database.
      //
      // The value is arbitrary and the case says so: app_worker holds NO POLICY on this table, so
      // there is no WITH CHECK to compare a subject against and the refusal cannot be about this
      // column.
      ...createBusinessKnowledge('__A__', BUSINESS_A1, 'voice', id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_items' },
      why: 'THE RAISING HALF of RFC-2026-017 §7, which asks for the service identity to be "denied with an '
         + 'error, not an empty result". Only an INSERT can carry it: an UPDATE whose USING clause filters '
         + 'the row reports zero rows and raises nothing. app_worker HOLDS the INSERT grant and holds no '
         + 'policy on this table, so the refusal is row level security finding no permissive policy to '
         + 'admit the row — the declared layer is what says so, and a service role that had acquired '
         + 'BYPASSRLS would write the row instead.',
    },
    {
      id: 'service-cannot-update-a-knowledge-item',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      ...renameKnowledge(KNOWLEDGE_A1_BUSINESS, 'renamed by the service'),
      expect: 'no-effect',
      witness: knowledgeNameUnchanged(ownerA, KNOWLEDGE_A1_BUSINESS, KNOWLEDGE_A1_BUSINESS_NAME),
      why: 'The service HOLDS the UPDATE grant, so this reaches row level security and is filtered there '
         + 'rather than refused by the privilege system. That is the whole point of granting a role that '
         + 'has no policy: the refusal is attributable, and the witness proves the row is unchanged '
         + 'rather than merely unreturned.',
    },

    // -- The version table. Its narrowing is the ITEM's reachability, which is what these prove. -
    {
      id: 'owner-a-sees-the-knowledge-version-of-business-a1',
      covers: ['§12.6/1', '§8.6/1', '§8.2/knowledge-select'],
      as: ownerA,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'rows',
      why: 'A version is addressed by its parent and its ordinal, which is why the catalog holds no '
         + 'symbol for one. The positive every negative below needs.',
    },
    {
      id: 'owner-a-cannot-see-the-knowledge-version-of-business-b1',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_B1_BUSINESS],
      expect: 'no-rows',
      why: "Tenant A's owner holds tenant B's knowledge id exactly and asks for its history. A version "
         + 'row holds what the item USED to say, so a boundary that held on the current row and not on '
         + 'the history would leak the same content one table over.',
    },
    {
      id: 'owner-b-sees-the-knowledge-version-of-business-b1',
      covers: ['§8.6/1'],
      as: ownerB,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_B1_BUSINESS],
      expect: 'rows',
      why: 'The far side is populated, so the negative above is about a policy.',
    },
    {
      id: 'owner-a-is-unscoped-and-sees-the-knowledge-version-of-business-a2',
      covers: ['§7/member-scope'],
      as: ownerA,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_A2_BUSINESS],
      expect: 'rows',
      why: 'The unscoped control, one table over: without it the scope negative below is satisfied by '
         + "business_a2's history being unreadable to everybody.",
    },
    {
      id: 'editor-a-scope-does-not-reach-the-knowledge-version-of-business-a2',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_A2_BUSINESS],
      expect: 'no-rows',
      why: '021\'s own apply-time hint names the failure this prevents: "a version row holds what a '
         + 'Business or Page used to say, so a narrowing that skipped one would leave the history '
         + 'readable to a member the current row is hidden from".',
    },
    {
      id: 'page-editor-a-sees-the-knowledge-version-of-page-a1',
      covers: ['§8.6/1', '§4/invariant-3'],
      as: pageEditorA,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_A1_PAGE],
      expect: 'rows',
      why: 'A page-scoped member reads the history of the item their scope names. The version row itself '
         + 'carries NO page column, so this passing means the narrowing resolved the page through the '
         + 'item rather than through the version.',
    },
    {
      id: 'page-editor-a-cannot-see-the-knowledge-version-of-the-sibling-page',
      covers: ['§8.6/4', '§4/invariant-3'],
      as: pageEditorA,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_A1_SIBLING_PAGE],
      expect: 'no-rows',
      why: 'THE CASE THE VERSION TABLE\'S WHOLE DESIGN RESTS ON. Both version rows carry the same '
         + 'workspace_id and the same business_profile_id and neither carries a page at all, so nothing '
         + 'ON THE VERSION distinguishes them — the only thing that can is the item each one hangs from, '
         + 'which is exactly what `knowledge_item_versions_scope_narrows_member` asks. A narrowing '
         + 'written from the version\'s own columns would pass every other case in this block and fail '
         + 'this one.',
    },
    {
      id: 'owner-a-can-write-a-knowledge-version',
      covers: ['§8.6/1', '§8.2/knowledge-write'],
      as: ownerA,
      ...createKnowledgeVersion('__A__', BUSINESS_A1, KNOWLEDGE_A1_BUSINESS, '__SELF__'),
      expect: 'rows',
      why: '§8.2 names no INSERT operation for a knowledge version and denies only its UPDATE and DELETE, '
         + 'which is the shape it uses for approval events: the producing operation is granted and only '
         + 'mutation of the record is refused. Without this case the immutability assertions below pass '
         + 'against a table nobody can write at all.',
    },
    {
      id: 'editor-a-can-write-a-knowledge-version-for-business-a1',
      covers: ['§8.2/knowledge-write', '§7/editor'],
      as: editorA,
      ...createKnowledgeVersion('__A__', BUSINESS_A1, KNOWLEDGE_A1_BUSINESS, '__SELF__'),
      expect: 'rows',
      why: 'The version INSERT follows the producing operation exactly, including the editor: a version '
         + 'is the record of the edit §8.2 grants them, so a schema that let an editor change an item '
         + 'and refused them its history would produce history that is missing its author.',
    },
    {
      id: 'editor-a-cannot-write-a-knowledge-version-for-business-a2',
      covers: ['§8.6/3'],
      as: editorA,
      ...createKnowledgeVersion('__A__', BUSINESS_A2, KNOWLEDGE_A2_BUSINESS, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_item_versions' },
      why: 'The permissive write policy passes — an editor writing their own subject — and the '
         + 'restrictive narrowing refuses, because the ITEM this version would belong to is not '
         + 'reachable by this caller. It is the write-path proof that the version inherits the item\'s '
         + 'reach rather than merely reporting the same columns.',
    },
    {
      id: 'owner-a-cannot-write-a-knowledge-version-for-business-b1',
      covers: ['§12.6/7', '§8.6/5'],
      as: ownerA,
      ...createKnowledgeVersion('__B__', BUSINESS_B1, KNOWLEDGE_B1_BUSINESS, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_item_versions' },
      why: 'A real owner of a real workspace, naming another tenant\'s workspace, Business and knowledge '
         + 'item — every id exact. §3.3: a workspace_id from a client is never trusted, and here the '
         + 'permissive policy refuses before the restrictive one is reached because the caller holds no '
         + 'role in that workspace at all.',
    },
    {
      id: 'approver-a-cannot-write-a-knowledge-version',
      covers: ['§12.6/3', '§8.6/2'],
      as: approverA,
      ...createKnowledgeVersion('__A__', BUSINESS_A1, KNOWLEDGE_A1_BUSINESS, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_item_versions' },
      why: 'The other half of §12.6/3 on this family: an approver who could append a version could write '
         + 'knowledge history without touching the current row, which is editing knowledge by another '
         + 'route. Their member scope admits the item, so the role is the only thing refusing.',
    },
    {
      id: 'viewer-a-cannot-write-a-knowledge-version',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...createKnowledgeVersion('__A__', BUSINESS_A1, KNOWLEDGE_A1_BUSINESS, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'knowledge_item_versions' },
      why: '§12.6/4 asserted on the one write this table offers a client. Update and delete are granted '
         + 'to nobody, so they belong to §8.6/9 rather than here.',
    },

    // -- §8.6/9 and §12.6/8. Immutability, as ABSENT GRANTS on both verbs and both identities. --
    {
      id: 'owner-a-cannot-update-a-knowledge-version',
      covers: ['§8.6/9', '§8.2/knowledge-version-immutable'],
      as: ownerA,
      sql: 'update app.knowledge_item_versions set name = $2'
         + ' where knowledge_item_id = $1 and version_number = 1 returning id',
      params: [KNOWLEDGE_A1_BUSINESS, 'rewritten history'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'knowledge_item_versions' },
      why: '§8.2\'s "Knowledge version UPDATE/DELETE" is N for every role including the service. EVEN THE '
         + 'WORKSPACE OWNER is refused, and at the GRANT layer: no role holds UPDATE here, so the '
         + 'refusal happens before RLS is consulted. That distinction is the assertion — a policy can be '
         + 'widened by an edit, an absent grant has to be granted.',
    },
    {
      id: 'owner-a-cannot-delete-a-knowledge-version',
      covers: ['§8.6/9', '§8.2/knowledge-version-immutable'],
      as: ownerA,
      sql: 'delete from app.knowledge_item_versions'
         + ' where knowledge_item_id = $1 and version_number = 1 returning id',
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'knowledge_item_versions' },
      why: 'UPDATE and DELETE are separate privileges, so they are separate cases: a batch that granted '
         + 'one of them would be caught by exactly one of these two.',
    },
    {
      id: 'service-cannot-update-a-knowledge-version',
      // NOT labelled RFC-2026-017§7, following batch 020's own note one table over: that clause asks
      // for the service identity to be denied BY ROW LEVEL SECURITY with an error, and this refusal
      // comes from the privilege system, which is a stronger denial and a DIFFERENT claim. The §7
      // cases for this batch's tables are `service-sees-zero-knowledge-items`,
      // `service-sees-zero-knowledge-versions`, `service-cannot-update-a-knowledge-item` and
      // `service-cannot-create-a-knowledge-item`.
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      sql: 'update app.knowledge_item_versions set name = $2'
         + ' where knowledge_item_id = $1 and version_number = 1 returning id',
      params: [KNOWLEDGE_A1_BUSINESS, 'rewritten history by the service'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'knowledge_item_versions' },
      why: 'The service column of §8.2\'s version row is `N`, not `P`, which is the only place in that '
         + 'matrix where the service is denied outright — and app_worker holds SELECT and INSERT on this '
         + 'table, so the refusal is about the verb rather than about the table.',
    },
    {
      id: 'service-cannot-delete-a-knowledge-version',
      // Unlabelled for §7 for the reason above: a grant-layer refusal is not evidence about RLS.
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      sql: 'delete from app.knowledge_item_versions'
         + ' where knowledge_item_id = $1 and version_number = 1 returning id',
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'knowledge_item_versions' },
      why: 'The fourth cell of the grid, so all four are live on this table rather than three and an '
         + 'average.',
    },
    {
      id: 'suspended-a-sees-zero-knowledge-versions',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'no-rows',
      why: '§12.6/5 asked of the history as well as of the current row. The fixture gives this identity a '
         + 'member scope on purpose, so the empty result is a policy refusing and not a table with '
         + 'nothing in it for them.',
    },
    {
      id: 'anonymous-sees-no-knowledge-version',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused during name resolution, on the SCHEMA, because anon holds no USAGE on app and PUBLIC '
         + 'holds none either. The day that changes this case moves to the table and fails, which is '
         + 'what it is for.',
    },
    {
      id: 'service-sees-zero-knowledge-versions',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: VERSION_1_OF_KNOWLEDGE,
      params: [KNOWLEDGE_A1_BUSINESS],
      expect: 'no-rows',
      why: 'app_worker holds SELECT on this table and no policy, so the empty read is row level security '
         + 'and not a forgotten GRANT. It is one of the two cases the CI negative control for '
         + 'app.knowledge_item_versions rests on.',
    },
    // Batch 041 — the resolved knowledge contract, in the half of it that is decided.
    // =========================================================================================
    //
    // WHAT THESE CASES ARE ABOUT, AND WHAT THEY ARE DELIBERATELY NOT ABOUT.
    //
    // 041 creates one function: `app.knowledge_scope_applies(item_business, item_page, in_business,
    // in_page)`, the SCOPE half of the resolution rule at
    // docs/plans/core-database-and-rls-workstream-th.md:217 — "Industry base → Business override →
    // Page override → Content brief". It answers WHICH ROWS ARE IN SCOPE for a request naming a
    // Business and, optionally, a Page. It does not answer which of them WINS. The migration's
    // header says at length why: the merge needs a hard/soft level column batch 040 does not have,
    // a key on which an override binds that no document fixes, and the industry pack's rule content,
    // which is not in this database at all. So there is no case below asserting that a page-level
    // row beats a business-level one, and its absence is the finding rather than an omission.
    //
    // TWO KINDS OF NEGATIVE LIVE HERE AND THEY ARE NOT INTERCHANGEABLE, which is the thing a reader
    // of this block has to hold on to:
    //
    //   * A PREDICATE NEGATIVE — the row is visible to the caller and the REQUEST does not reach
    //     it. `owner-a-does-not-resolve-the-sibling-page-knowledge-item-for-page-a1` is one. These
    //     would still return nothing with row level security switched off, so they are NOT what the
    //     CI negative control for app.knowledge_items rests on, and each one is paired with a case
    //     that differs in exactly ONE argument and returns the row — same identity, same item, the
    //     other Page or the other Business. Without that pair a predicate that returned nothing at
    //     all would satisfy every one of them.
    //   * AN RLS NEGATIVE — the PREDICATE says yes and the database still refuses.
    //     `page-editor-a-cannot-resolve-the-knowledge-item-of-the-sibling-page` is the sharpest:
    //     the row IS in scope for the Page being asked about, and the member's own scope keeps it
    //     away. These are the cases that say the contract is a filter and never a permission, and
    //     they are the ones the negative control breaks.

    // -- The two shapes of §4 invariant 3, resolved for a Page. --------------------------------
    {
      id: 'owner-a-resolves-the-business-level-knowledge-item-for-page-a1',
      covers: ['§4.3/resolution-rule', '§4/invariant-3', '§8.6/1'],
      as: ownerA,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1, KNOWLEDGE_A1_BUSINESS),
      expect: 'rows',
      why: 'Business-level knowledge reaches every Page beneath it. §4.4 of the industry pack contract '
         + 'puts "Business policy/brand knowledge" at layer 4 and "Page-specific facts" at layer 5, both '
         + 'in play for one Page, which is only meaningful if the Business layer arrives there — and '
         + '040\'s own header states the consequence in those words. Without this positive every '
         + 'negative below is satisfied by a predicate that resolves nothing.',
    },
    {
      id: 'owner-a-resolves-the-page-scoped-knowledge-item-for-its-own-page',
      covers: ['§4.4/page-override-scope', '§4/invariant-3', '§8.6/1'],
      as: ownerA,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1, KNOWLEDGE_A1_PAGE),
      expect: 'rows',
      why: 'The other branch of the same predicate, and not implied by the case above it: a page-level '
         + 'row takes the `page = $2` branch where a business-level row takes `page is null`. The '
         + 'industry pack contract\'s "Page override/contact/footer ใช้ได้เฉพาะ target Page" is what '
         + 'makes this the ONLY request shape that reaches this row.',
    },
    {
      id: 'owner-a-resolves-the-sibling-page-knowledge-item-for-the-sibling-page',
      covers: ['§4.4/page-override-scope', '§8.6/1'],
      as: ownerA,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1_SIBLING, KNOWLEDGE_A1_SIBLING_PAGE),
      expect: 'rows',
      why: 'THE PAIR THAT MAKES THE NEXT CASE MEAN SOMETHING. Same identity, same row, and the only '
         + 'thing that changes below is the Page being asked about — so the refusal there is about the '
         + 'request and not about the row being unreadable, unloaded or hidden by a policy.',
    },
    {
      id: 'owner-a-does-not-resolve-the-sibling-page-knowledge-item-for-page-a1',
      covers: ['§4.4/page-override-scope', 'DB03/resolved-context', '§8.6/4'],
      as: ownerA,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1, KNOWLEDGE_A1_SIBLING_PAGE),
      expect: 'no-rows',
      why: 'A PREDICATE NEGATIVE, and it is the leak the whole two-column scope exists to prevent: a '
         + 'filter that kept only `business_profile_id = $1` would hand every Page of a Business the '
         + 'knowledge restricted to every other Page. The identity here is the UNSCOPED owner, who can '
         + 'read this row and does one case above, so nothing about membership or member scope is '
         + 'involved — this case would return nothing with row level security switched off, which is '
         + 'why it is not one of the cases the CI negative control rests on.',
    },

    // -- The request that names no Page, which is where a three-valued predicate would have gone
    // -- wrong. --------------------------------------------------------------------------------
    {
      id: 'owner-a-resolves-the-business-level-knowledge-item-with-no-page-requested',
      covers: ['§4.3/resolution-rule', 'DB03/resolved-context'],
      as: ownerA,
      ...resolveKnowledgeForBusinessOnly(BUSINESS_A1, KNOWLEDGE_A1_BUSINESS),
      expect: 'rows',
      why: 'A Business-level request. §3.3 puts knowledge under the Business row unconditionally, so '
         + 'business-level knowledge is in scope whether or not a Page is named.',
    },
    {
      id: 'owner-a-does-not-resolve-the-page-scoped-knowledge-item-with-no-page-requested',
      covers: ['§4.4/page-override-scope', 'DB03/resolved-context'],
      as: ownerA,
      ...resolveKnowledgeForBusinessOnly(BUSINESS_A1, KNOWLEDGE_A1_PAGE),
      expect: 'no-rows',
      why: 'THE CELL A PREDICATE WRITTEN THE OBVIOUS WAY WOULD ANSWER `NULL` FOR. `item_page is null or '
         + 'item_page = null` is unknown, which filters like false HERE and would pass like true in a '
         + 'CHECK constraint, so 041 guards every conjunct and its apply-time block asserts the answer '
         + 'is FALSE rather than merely not-true. This case is the same claim from the other side, run '
         + 'against a real row by an identity that reads it two cases above when it names the Page.',
    },

    // -- The Business half of the scope, which the Page branch must not be able to skip. --------
    {
      id: 'owner-a-resolves-the-knowledge-item-of-business-a2-under-business-a2',
      covers: ['§4/invariant-3', '§8.6/1'],
      as: ownerA,
      ...resolveKnowledgeForPage(BUSINESS_A2, PAGE_A2, KNOWLEDGE_A2_BUSINESS),
      expect: 'rows',
      why: 'The pair for the case below. The unscoped owner reaches business_a2 — asserted directly by '
         + '`owner-a-is-unscoped-and-sees-the-knowledge-item-of-business-a2` — so when the same '
         + 'statement with business_a1 returns nothing, the Business argument is the only thing that '
         + 'changed.',
    },
    {
      id: 'owner-a-does-not-resolve-the-knowledge-item-of-business-a2-under-business-a1',
      covers: ['§4/invariant-3', 'DB03/resolved-context'],
      as: ownerA,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1, KNOWLEDGE_A2_BUSINESS),
      expect: 'no-rows',
      why: 'A PREDICATE NEGATIVE about the mandatory half of the scope. §4 invariant 3 gives every '
         + 'knowledge row a Business scope, so a resolved context for business_a1 contains no row of '
         + 'business_a2 even for a caller who can read both. Like the other predicate negatives it '
         + 'would still be empty with row level security off.',
    },

    // -- §12.6/1 and §8.6/5: the contract does not cross the tenant boundary. -------------------
    {
      id: 'owner-a-cannot-resolve-the-knowledge-item-of-business-b1',
      covers: ['§12.6/1', '§8.6/5', '041/filter-not-permission', 'DB00-A03'],
      as: ownerA,
      ...resolveKnowledgeForPage(BUSINESS_B1, PAGE_B1, KNOWLEDGE_B1_BUSINESS),
      expect: 'no-rows',
      why: 'AN RLS NEGATIVE, and the first of the four this batch adds. The predicate answers TRUE for '
         + "this row — it is business-level knowledge of exactly the Business being asked about — and "
         + "tenant A's owner still sees nothing, while holding tenant B's Business, Page and knowledge "
         + 'ids exactly. A resolution contract that returned rows its caller may not read would be a '
         + 'leak wearing the shape of a helper, and DB-03\'s acceptance line says a resolved context '
         + 'returns only what was requested AND what the caller is entitled to.',
    },
    {
      id: 'owner-b-resolves-the-knowledge-item-of-business-b1',
      covers: ['§8.6/1', '§12.6/1'],
      as: ownerB,
      ...resolveKnowledgeForPage(BUSINESS_B1, PAGE_B1, KNOWLEDGE_B1_BUSINESS),
      expect: 'rows',
      why: 'The far side of that boundary is a real, populated tenant resolving its own knowledge '
         + 'through the same contract. Without it the case above is satisfied by a row that is not '
         + 'there or by a predicate nobody can pass.',
    },

    // -- §8.6/4 at the granularity only a knowledge row has: member scope narrows the contract. --
    {
      id: 'page-editor-a-resolves-the-business-level-knowledge-item-for-page-a1',
      covers: ['§7/member-scope', '§4.3/resolution-rule'],
      as: pageEditorA,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1, KNOWLEDGE_A1_BUSINESS),
      expect: 'rows',
      why: 'A member scoped to ONE Page resolves the Business layer for that Page, which is 021\'s '
         + 'definition of `member_scope_admits_business` meeting §4.4\'s layer 4 and is the positive '
         + 'that keeps the next case from being about a page editor who resolves nothing at all.',
    },
    {
      id: 'page-editor-a-cannot-resolve-the-knowledge-item-of-the-sibling-page',
      covers: ['§8.6/4', '§12.6/2', '041/filter-not-permission'],
      as: pageEditorA,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1_SIBLING, KNOWLEDGE_A1_SIBLING_PAGE),
      expect: 'no-rows',
      why: 'THE SHARPEST CASE IN THIS BLOCK. The request names the sibling Page, so the PREDICATE says '
         + 'yes — `owner-a-resolves-the-sibling-page-knowledge-item-for-the-sibling-page` is the same '
         + 'statement under an unscoped identity and it returns the row. What refuses here is 040\'s '
         + 'restrictive narrowing through `app.member_scope_admits_page`, and that is the whole claim: '
         + 'a caller cannot widen what they may read by asking the resolution contract for it. It is '
         + 'one of the four cases the CI negative control for app.knowledge_items now rests on that '
         + 'this batch added.',
    },

    // -- §12.6/5, /6 and /8 through the contract, because a helper is a new way to reach a table. -
    {
      id: 'suspended-a-resolves-zero-knowledge-items',
      covers: ['§12.6/5', '§8.6/6', '041/filter-not-permission'],
      as: suspendedA,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1, KNOWLEDGE_A1_BUSINESS),
      expect: 'no-rows',
      why: '§7: only `active` grants access. The predicate answers TRUE for this row and the suspended '
         + 'member still sees nothing, because `app.knowledge_scope_applies` is `security invoker` and '
         + 'reads no relation — it cannot become a way around batch 011\'s helper. The owner runs the '
         + 'identical statement successfully at the top of this block.',
    },
    {
      id: 'anonymous-cannot-resolve-a-knowledge-item',
      covers: ['§12.6/6', '§8.5', 'RFC-2026-021§7/4'],
      as: anonymous,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1, KNOWLEDGE_A1_BUSINESS),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'RFC-2026-021 §7/4 decides that anon holds no schema USAGE, no table or column privilege and '
         + 'NO FUNCTION EXECUTE anywhere our migrations reach. The refusal therefore lands on the '
         + 'SCHEMA, before either the function or the table is considered, and is recorded as the layer '
         + 'AND the object so that granting anon USAGE on app moves it to the function and fails this '
         + 'case. That anon holds no EXECUTE on the predicate ITSELF cannot be observed from here — a '
         + 'schema refusal comes first — so 041\'s apply-time block asserts it against the live ACL.',
    },
    {
      id: 'service-resolves-zero-knowledge-items',
      covers: ['§12.6/8', 'RFC-2026-017§7', '041/filter-not-permission'],
      as: service,
      ...resolveKnowledgeForPage(BUSINESS_A1, PAGE_A1, KNOWLEDGE_A1_BUSINESS),
      expect: 'no-rows',
      why: 'THE CASE THE app_worker GRANT EXISTS FOR. Batch 040 gives the service SELECT on '
         + 'app.knowledge_items and NO POLICY precisely so that an empty read is attributable to row '
         + 'level security rather than to a forgotten GRANT — and if the service could not EXECUTE this '
         + 'predicate, every service query written against the contract would come back 42501 on the '
         + 'FUNCTION instead, and 040\'s attribution property would hold for hand-written queries while '
         + 'quietly failing for contract ones. 041 grants app_worker EXECUTE so this case can be a '
         + 'no-rows and not a denial.',
    },
    // ==========================================================================================
    // Batch 050 — the async kernel. Three tables, no policy, and no reader.
    // ==========================================================================================
    //
    // §8.4 gives this family two rows and neither is implementable by a migration:
    //
    //   | Job redacted status SELECT       | Y | Y | O/P | O/P | O/P | P |
    //   | Internal job/attempt/DLQ payload | N | N | N   | N   | N   | S |
    //
    // The first grants a REDACTED STATUS, which is a security_invoker view on the read allowlist
    // RFC-2026-012 §3 and RFC-2026-021 give to an RFC, and the allowlist is empty. The second is the
    // schema's first `S` cell, whose shape RFC-2026-016 §2 describes with a workspace GUC no
    // document names, for a role RFC-2026-019 §4/3 says nothing can yet be. The outbox and the
    // consumer ledger have no row in §8 at all.
    //
    // So the cases below are almost all refusals, and the two per table that are NOT refusals are
    // the ones that matter: `service-sees-zero-*` is the only read row level security decides here,
    // and `service-cannot-*` is the only write it decides. Everything else is the privilege system,
    // and each case declares which layer and which object so that the day a grant appears the case
    // fails rather than passing more quietly.

    // -- app.jobs. §8.6's ten, as far as a table with no reader can carry them. -----------------
    {
      id: 'owner-a-cannot-read-a-job-row',
      covers: ['§8.4/job-status', 'RFC-2026-012§2', 'RFC-2026-021§7'],
      as: ownerA,
      sql: JOB_BY_DEDUPE_KEY,
      params: [A, FIXTURE_JOB_DEDUPE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'jobs' },
      why: 'THE CASE THIS BATCH IS MOST LIKELY TO BE ARGUED WITH, so it is first. §8.4 marks "Job '
         + 'redacted status SELECT" `Y` for the owner, and the owner is refused here — because the '
         + 'object that cell grants is a REDACTED STATUS and not a job row. §9.1 classes this family '
         + 'INTERNAL-3, whose client projection is "redacted status only", and the very next row of '
         + '§8.4 marks the internal job payload `N` for every client role; a base-table grant would '
         + 'hand a client both rows at once. The projection is a security_invoker view on an '
         + 'allowlist that starts empty and grows only by RFC, so this refusal is what an unopened '
         + 'allowlist looks like from the outside — and the day an RFC opens it, this case moves to '
         + 'the policy layer and fails until somebody rewrites it, which is the point.',
    },
    {
      id: 'owner-b-cannot-read-a-job-row',
      covers: ['§8.4/job-status', '§8.6/5'],
      as: ownerB,
      sql: JOB_BY_DEDUPE_KEY,
      params: [B, FIXTURE_JOB_DEDUPE_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'jobs' },
      why: 'THE SAME REFUSAL FROM THE OTHER TENANT, and the pair is the assertion — but it is a '
         + 'WEAKER assertion than the same shape on batch 030\'s global tables and the coverage map '
         + 'says so. app.jobs IS a tenant table: it carries workspace_id and a foreign key to '
         + 'app.workspaces. Nobody can read it, so the tenant boundary has nothing to be observed '
         + 'through, and §12.6/1 is NOT claimed for this family. What this pair does assert is that '
         + 'the refusal is uniform: it is not one tenant being unlucky.',
    },
    {
      id: 'viewer-a-cannot-read-a-job-row',
      covers: ['§8.4/job-status'],
      as: viewerA,
      sql: JOB_BY_DEDUPE_KEY,
      params: [A, FIXTURE_JOB_DEDUPE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'jobs' },
      why: '§8.4 marks the viewer `O/P` on the job status cell — BOTH SYMBOLS IN ONE CELL, which no '
         + 'document resolves: `O` would mean "the job I started", which needs an actor column this '
         + 'family does not have, and `P` needs a capability set nobody has defined. The owner and '
         + 'the viewer sit at the two ends of that row and both are refused identically, which is '
         + 'what an unresolved cell looks like when it is denied by default rather than guessed at.',
    },
    {
      id: 'suspended-a-cannot-read-a-job-row',
      covers: ['§12.6/5-analogue', '§8.6/6'],
      as: suspendedA,
      sql: JOB_BY_DEDUPE_KEY,
      params: [A, FIXTURE_JOB_DEDUPE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'jobs' },
      why: 'LABELLED AN ANALOGUE AND DELIBERATELY NOT COUNTED AS §12.6/5. That assertion is "a '
         + 'suspended member sees zero tenant rows", and it means something only where an ACTIVE '
         + 'member sees some: on every other family the suspended identity is refused by a policy '
         + 'that admits their active colleagues. Here they are refused by the privilege system, '
         + 'exactly as the owner is, so the case says nothing about suspension. It is here because '
         + 'the day this family gains a client grant, this case starts making the claim its name '
         + 'implies — and until then the coverage map records that it does not.',
    },
    {
      id: 'anonymous-cannot-read-a-job-row',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: JOB_BY_DEDUPE_KEY,
      params: [A, FIXTURE_JOB_DEDUPE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused during name resolution, on the SCHEMA, because anon holds no USAGE on app and '
         + 'PUBLIC holds none either. RFC-2026-021 §7/4 made that a decision rather than a '
         + 'convention on 2026-09-06, and gave the reason this case declares the object it does: the '
         + 'first anon grant is `grant usage on schema app`, which moves the denial layer of every '
         + 'object in app at once. The day that happens this case fails.',
    },
    {
      id: 'owner-a-cannot-enqueue-a-job-row',
      covers: ['§8.4/job-payload', '§8/no-row'],
      as: ownerA,
      ...enqueueJob(A, 'attempted-by-owner-a'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'jobs' },
      why: '§8 contains NO client write cell for a job, in any of its four matrices — the only write '
         + 'row is "Internal job/attempt/DLQ payload", which is `N` for every client role and `S` '
         + 'for the service. So enqueueing is deny-by-default reaching the privilege layer, and a '
         + 'workspace owner cannot put work into their own queue. That is a real consequence and it '
         + 'is owed to the command surface: RFC-2026-012 §4 names SECURITY DEFINER command functions '
         + 'as the mechanism, and none exists.',
    },
    {
      id: 'service-sees-zero-job-rows',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: JOB_BY_DEDUPE_KEY,
      params: [A, FIXTURE_JOB_DEDUPE_A],
      expect: 'no-rows',
      why: 'ONE OF THE TWO CASES ON THIS TABLE THAT ROW LEVEL SECURITY DECIDES, and the reason '
         + 'app_worker holds a SELECT grant at all. Without the grant this refusal would be 42501 '
         + 'either way and would prove only that somebody forgot a GRANT; with the grant and no '
         + 'policy, an empty read can only have come from RLS — and a service role that had quietly '
         + 'acquired BYPASSRLS would return the row. §8.4 marks the service `S` on the job payload, '
         + 'which is the FIRST `S` CELL IN THIS SCHEMA, and 050 writes it no policy: RFC-2026-016 §2 '
         + 'says a service policy is scoped by a workspace GUC no document names, RFC-2026-019 §4/3 '
         + 'says nothing can yet be app_worker, and a workspace-scoped predicate cannot express the '
         + 'cross-workspace claim query §3.4 specifies. It is also the case the CI negative control '
         + 'for app.jobs rests on.',
    },
    {
      id: 'service-cannot-enqueue-a-job-row',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.4/job-payload'],
      as: service,
      ...enqueueJob(A, 'attempted-by-the-service'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'jobs' },
      why: 'THE RAISING HALF of RFC-2026-017 §7, which asks for the service identity to be "denied '
         + 'with an error, not an empty result". Only an INSERT can carry it here, and for a reason '
         + 'stronger than usual: an UPDATE whose USING clause filters the row reports zero rows and '
         + 'raises nothing, and on THIS family a filtered update cannot even be asserted as '
         + '`no-effect`, because a witness has to be read by an identity that can see the row and no '
         + 'identity can. app_worker HOLDS the INSERT grant and holds no policy, so the refusal is '
         + 'row level security finding no permissive policy to admit the row — and this is the case '
         + 'that starts SUCCEEDING the moment the CI negative control disables RLS on app.jobs.',
    },
    {
      id: 'service-cannot-delete-a-job-row',
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      sql: 'delete from app.jobs where workspace_id = $1 and dedupe_key = $2 returning id',
      params: [A, FIXTURE_JOB_DEDUPE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'jobs' },
      why: 'NO ROLE holds DELETE on any table in this batch. §8.5 has no broad user delete, and hard '
         + 'deletion here is a retention sweep — §10 gives this family JOB-SHORT, OUTBOX-SHORT and '
         + 'CONSUMER-LEDGER, and batch 160 owns the job that acts on them through app_maintenance, '
         + 'which this batch grants nothing. The refusal is at the GRANT layer, so it cannot be '
         + 'undone by editing a policy.',
    },
    {
      id: 'owner-a-cannot-delete-a-job-row',
      covers: ['§8.6/9', '§8.5/no-broad-delete'],
      as: ownerA,
      sql: 'delete from app.jobs where workspace_id = $1 and dedupe_key = $2 returning id',
      params: [A, FIXTURE_JOB_DEDUPE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'jobs' },
      why: 'The client half of the same claim, because "even the owner" is a different assertion '
         + 'from "not even the service" and a schema could hold one without the other.',
    },

    // -- app.outbox_events. The table §3.4 specifies and this schema cannot write. ---------------
    {
      id: 'owner-a-cannot-read-an-outbox-event',
      covers: ['§8/no-row', '§9.1/INTERNAL-3'],
      as: ownerA,
      sql: OUTBOX_EVENT_BY_ID,
      params: [OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'outbox_events' },
      why: '§8 has NO ROW for an outbox event in any of its four matrices, so there is no cell to '
         + 'implement and every operation on it is denied by default. §9.1 classes the family '
         + 'INTERNAL-3 — "private; short retention", client projection "redacted status only" — so '
         + 'the silence and the classification point the same way.',
    },
    {
      id: 'owner-b-cannot-read-an-outbox-event',
      covers: ['§8/no-row', '§8.6/5'],
      as: ownerB,
      sql: OUTBOX_EVENT_BY_ID,
      params: [OUTBOX_EVENT_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'outbox_events' },
      why: 'The other tenant, refused identically. As on app.jobs this is a uniformity claim and not '
         + 'a tenant-boundary one, and the coverage map records the difference rather than counting '
         + 'a refusal that holds for everybody as an isolation proof.',
    },
    {
      id: 'suspended-a-cannot-read-an-outbox-event',
      covers: ['§12.6/5-analogue', '§8.6/6'],
      as: suspendedA,
      sql: OUTBOX_EVENT_BY_ID,
      params: [OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'outbox_events' },
      why: 'An analogue, for the reason the job-row case gives: a suspended member refused where '
         + 'every active member is also refused has been refused by the privilege system and not by '
         + 'suspension.',
    },
    {
      id: 'anonymous-cannot-read-an-outbox-event',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: OUTBOX_EVENT_BY_ID,
      params: [OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA, as every anonymous case in this suite is, and for RFC-2026-021 §7/4\'s '
         + 'structural reason rather than as a formality.',
    },
    {
      id: 'owner-a-cannot-publish-an-outbox-event',
      covers: ['§3.4/outbox-atomicity', '§8/no-row'],
      as: ownerA,
      ...publishOutboxEvent(A, BUSINESS_A1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'outbox_events' },
      why: 'THE CASE §3.4 TURNS ON. That section requires domain state and its outbox event to be '
         + 'written in the SAME TRANSACTION — and today the only transaction that writes domain '
         + 'state is a CLIENT\'s, because no command function exists for any module (020, 030 and '
         + '040 each record it, and RFC-2026-019 §2 measured zero functions owned by app_command). '
         + 'A client that could write here would choose event_type, producer and subject, which are '
         + 'the fields every consumer downstream routes and trusts on: a forged '
         + '`content.version.approved` is not a leaked row, it is an instruction. So the grant is '
         + 'absent, this case asserts it, and §3.4\'s atomicity is owed to the command surface '
         + 'rather than worked around with a trigger 050 may not write on another module\'s table.',
    },
    {
      id: 'owner-a-cannot-mark-an-outbox-event-dispatched',
      covers: ['§8/no-row', '§10/OUTBOX-SHORT'],
      as: ownerA,
      sql: 'update app.outbox_events set dispatched_at = now() where event_id = $1 returning id',
      params: [OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'outbox_events' },
      why: 'dispatched_at is the ONE mutable column on this table and it is granted to app_worker '
         + 'alone. A client that could set it would tell the relay an event had been published when '
         + 'it had not, and §10 retains an outbox row "until consumers ack + 30 days" — so the column '
         + 'is also what decides when the row is purged.',
    },
    {
      id: 'service-sees-zero-outbox-events',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: OUTBOX_EVENT_BY_ID,
      params: [OUTBOX_EVENT_A],
      expect: 'no-rows',
      why: 'The read row level security decides on this table, and one of the two cases the CI '
         + 'negative control for app.outbox_events rests on. app_worker holds SELECT on every column '
         + 'and no policy, so the empty result is RLS and not a forgotten grant.',
    },
    {
      id: 'service-cannot-publish-an-outbox-event',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§3.4/outbox-atomicity'],
      as: service,
      ...publishOutboxEvent(A, BUSINESS_A1),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'outbox_events' },
      why: 'The raising half, and the second case the negative control rests on. app_worker HOLDS '
         + 'the INSERT grant on every column this statement names and holds no policy, so row level '
         + 'security refuses it — and the same statement SUCCEEDS the moment RLS is disabled on this '
         + 'table, which is what makes the control bite rather than merely exit non-zero.',
    },
    {
      id: 'service-cannot-rewrite-an-outbox-event-envelope',
      covers: ['§8.6/9', '§3.2/immutable'],
      as: service,
      sql: 'update app.outbox_events set event_type = $2 where event_id = $1 returning id',
      params: [OUTBOX_EVENT_A, 'rewritten.by.the.service'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'outbox_events' },
      why: 'THE PER-COLUMN IMMUTABILITY OF THE ENVELOPE, live. app_worker holds UPDATE on '
         + 'dispatched_at and on NO OTHER COLUMN, so a statement naming event_type is refused at the '
         + 'COLUMN-privilege layer — before row level security is consulted and before the row is '
         + 'even looked for. A role that could re-aim an event after the transaction that produced '
         + 'it committed could redirect every consumer downstream. 050\'s apply-time block walks all '
         + 'sixteen other columns against six roles; this case is the one that shows the refusal '
         + 'happening.',
    },
    {
      id: 'service-cannot-delete-an-outbox-event',
      covers: ['§8.6/9', '§10/OUTBOX-SHORT'],
      as: service,
      sql: 'delete from app.outbox_events where event_id = $1 returning id',
      params: [OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'outbox_events' },
      why: 'UPDATE and DELETE are separate privileges, so they are separate cases. Purging an acked '
         + 'outbox row is §10\'s OUTBOX-SHORT sweep and belongs to batch 160 through app_maintenance, '
         + 'which this batch grants nothing.',
    },

    // -- app.consumer_ledger. The first LEDGER in the schema, which §8.6 case 9 names by that word. -
    //
    // The natural key — (workspace_id, consumer, event_id) — is what makes redelivery idempotent,
    // and NO CASE HERE CAN ASSERT IT. A duplicate insert never reaches the unique constraint:
    // app_worker holds the INSERT grant, finds no permissive policy and is refused with 42501 first,
    // so a `rejected` case demanding 23505 would assert an outcome a correct database cannot
    // produce. Batch 040 met the same shape on its forged-scope inserts and recorded it rather than
    // faking a case; the key is asserted instead by 050_async_kernel.sql's apply-time block, which
    // reads it out of pg_constraint as a COLUMN SET so that dropping workspace_id fails the apply.
    {
      id: 'owner-a-cannot-read-a-consumer-ledger-row',
      covers: ['§8/no-row', '§9.1/INTERNAL-3'],
      as: ownerA,
      sql: LEDGER_ROW_BY_KEY,
      params: [A, FIXTURE_CONSUMER, OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'consumer_ledger' },
      why: '§8 has no row for a consumer ledger anywhere, and §9.1 classes the family INTERNAL-3. '
         + 'The case addresses the row by its NATURAL KEY rather than by an id, which is the shape '
         + 'the fixture catalog admits without a symbol — and which is also the tuple the apply-time '
         + 'block asserts is unique.',
    },
    {
      id: 'owner-b-cannot-read-a-consumer-ledger-row',
      covers: ['§8/no-row', '§8.6/5'],
      as: ownerB,
      sql: LEDGER_ROW_BY_KEY,
      params: [B, FIXTURE_CONSUMER, OUTBOX_EVENT_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'consumer_ledger' },
      why: 'The other tenant, refused identically — and the pair is also the only place the fixture '
         + 'shows what workspace_id is doing in the natural key: ONE consumer, TWO workspaces, TWO '
         + 'rows. A key without workspace_id would have collapsed them the moment the two events '
         + 'shared an id, and one tenant\'s consumption would silently suppress the other\'s '
         + 'redelivery.',
    },
    {
      id: 'suspended-a-cannot-read-a-consumer-ledger-row',
      covers: ['§12.6/5-analogue', '§8.6/6'],
      as: suspendedA,
      sql: LEDGER_ROW_BY_KEY,
      params: [A, FIXTURE_CONSUMER, OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'consumer_ledger' },
      why: 'An analogue, for the reason the job-row and outbox cases give.',
    },
    {
      id: 'anonymous-cannot-read-a-consumer-ledger-row',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: LEDGER_ROW_BY_KEY,
      params: [A, FIXTURE_CONSUMER, OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA. Three tables, three anonymous cases, one control — stated per table '
         + 'because that is what makes it checkable per table.',
    },
    {
      id: 'service-sees-zero-consumer-ledger-rows',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: LEDGER_ROW_BY_KEY,
      params: [A, FIXTURE_CONSUMER, OUTBOX_EVENT_A],
      expect: 'no-rows',
      why: 'The read row level security decides, and the first of the two cases the CI negative '
         + 'control for app.consumer_ledger rests on. The row EXISTS — the fixture loads it '
         + 'administratively, because no policy could have — so the empty result is a refusal and '
         + 'not an empty table.',
    },
    {
      id: 'service-cannot-record-a-consumer-ledger-row',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      ...recordConsumption(A, OUTBOX_EVENT_A),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'consumer_ledger' },
      why: 'The raising half, and the second case the control rests on. It names a DIFFERENT '
         + 'consumer from the fixture row so that the refusal is row level security rather than the '
         + 'unique constraint — which is the same choice batch 040 made about version_number, and '
         + 'which matters more here because the constraint this insert avoids is the one the whole '
         + 'table exists for.',
    },
    {
      id: 'service-cannot-update-a-consumer-ledger-row',
      covers: ['§8.6/9', '§3.2/immutable'],
      as: service,
      sql: 'update app.consumer_ledger set consumer = $4'
         + ' where workspace_id = $1 and consumer = $2 and event_id = $3 returning id',
      params: [A, FIXTURE_CONSUMER, OUTBOX_EVENT_A, 'rewritten.consumer'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'consumer_ledger' },
      why: '§8.6 CASE 9 IS "Immutable/LEDGER row → update/delete fail" AND THIS IS THE FIRST LEDGER '
         + 'IN THE SCHEMA. Four batches have carried that case on immutable VERSION tables; this is '
         + 'the other noun in the sentence. A ledger row that can be edited makes a redelivery '
         + 'replayable, which is the one thing the table exists to prevent, so no role holds UPDATE '
         + 'and the refusal is at the GRANT layer.',
    },
    {
      id: 'service-cannot-delete-a-consumer-ledger-row',
      covers: ['§8.6/9', '§10/CONSUMER-LEDGER'],
      as: service,
      sql: 'delete from app.consumer_ledger'
         + ' where workspace_id = $1 and consumer = $2 and event_id = $3 returning id',
      params: [A, FIXTURE_CONSUMER, OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'consumer_ledger' },
      why: 'The second verb. Deleting a ledger row is how a consumer would process an event twice, '
         + 'and §10 keeps these rows for 180 days or the max replay window precisely so that it '
         + 'cannot. Purging by window is batch 160\'s, through app_maintenance, which holds nothing '
         + 'here.',
    },
    {
      id: 'owner-a-cannot-update-a-consumer-ledger-row',
      covers: ['§8.6/9'],
      as: ownerA,
      sql: 'update app.consumer_ledger set consumer = $4'
         + ' where workspace_id = $1 and consumer = $2 and event_id = $3 returning id',
      params: [A, FIXTURE_CONSUMER, OUTBOX_EVENT_A, 'rewritten by the owner'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'consumer_ledger' },
      why: 'The client half of §8.6/9 on this table, so all four cells of the grid are live: update '
         + 'and delete, by the workspace owner and by the service. A schema that granted one of the '
         + 'four would be caught by exactly one of these cases.',
    },
    {
      id: 'owner-a-cannot-delete-a-consumer-ledger-row',
      covers: ['§8.6/9'],
      as: ownerA,
      sql: 'delete from app.consumer_ledger'
         + ' where workspace_id = $1 and consumer = $2 and event_id = $3 returning id',
      params: [A, FIXTURE_CONSUMER, OUTBOX_EVENT_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'consumer_ledger' },
      why: 'The fourth cell, so the grid is four cases rather than three and an average.',
    },
  ].map((testCase) => resolvePlaceholders(testCase, { A, B }));
}

// `__A__`, `__B__` and `__SELF__` keep the shared `invite(...)` builder readable without letting a
// uuid literal into this file. `__SELF__` in particular is load-bearing: a case that forges
// created_by has to be visibly different from one that does not, and spelling both as explicit
// symbols makes the difference impossible to miss in review.
//
// A2 KNOWLEDGE CORRECTION, batch 040, found by CI rather than by argument. `__SELF__` means "the
// subject of the identity running this case", and TWO of the four identity helpers have no
// subject: `as_anonymous` and `as_service` set a role and a claim set with no `sub`. The
// substitution returned `undefined`, the driver inlined it as the literal text 'undefined', and
// Postgres answered 22P02 — "invalid input syntax for type uuid" — which `expectDenied` correctly
// refused as not-an-RLS-refusal. One case in 209.
//
// The value of that failure is entirely in where it was found: nothing static could see it,
// because `__SELF__` is a string and a missing subject is a runtime `undefined`. It is a build
// error now. A case that wants a subject for an identity that has none must name one, and say why
// it chose that one — which `service-cannot-create-a-knowledge-item` does.
// Exported so a test can exercise THE FUNCTION rather than a restatement of it. The first version
// of that test manufactured its own throw and asserted that; a test that produces the error it
// checks for has checked nothing.
export function resolvePlaceholders(testCase, { A, B }) {
  const swap = (value) => {
    if (value === '__A__') return A;
    if (value === '__B__') return B;
    if (value !== '__SELF__') return value;
    if (!testCase.as.subject) {
      throw new Error(`${testCase.id}: uses __SELF__ under ${testCase.as.helper}, which has no JWT `
        + 'subject to be. `as_anonymous` and `as_service` set a role and a claim set with no `sub`, so '
        + "__SELF__ resolves to undefined, is inlined as the text 'undefined', and comes back 22P02 "
        + 'instead of the refusal the case is about. Name the subject the case means and say why.');
    }
    return testCase.as.subject;
  };
  return { ...testCase, params: (testCase.params ?? []).map(swap) };
}

// The outcome kinds a case may demand. Kept as data so a test can check the runner's mapping
// instead of trusting its control flow.
export const OUTCOME_KINDS = ['rows', 'no-rows', 'denied', 'no-effect', 'rejected'];

// The SQLSTATE a `rejected` case may NOT name. 42501 is an RLS refusal and belongs to `denied`;
// allowing it here would let a case claiming "the constraint stopped it" pass on a database where
// a policy stopped it and the constraint had been dropped.
export const NOT_A_CONSTRAINT_CODE = '42501';

export const MUTATION_PREFIXES = ['insert', 'update', 'delete'];

export function isMutation(sql) {
  return MUTATION_PREFIXES.some((verb) => sql.trimStart().toLowerCase().startsWith(verb));
}
