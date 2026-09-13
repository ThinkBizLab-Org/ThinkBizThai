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
// BATCH 140 MOVES NO ROW AND CHANGES THE MEANING OF ONE, WHICH IS A THING NO EARLIER BATCH HAS
// DONE TO THIS MAP. §12.6's eight assertions are written about TENANT ROWS a member can reach, and
// batch 140's two tables are reachable by NO REQUEST-PATH IDENTITY AT ALL: no client role holds a
// privilege on app.audit_logs or app.security_events, and no policy is written for one. Batch 030
// met a version of that on its two GLOBAL tables and recorded the kind of assertion §12.6 has no row
// for; 140's tables ARE tenant-owned and are still unreachable, which is a different state again and
// is recorded in the notes rather than as a ninth key nobody may invent.
//
// So six notes grow, one of them substantially, and every `covered` value is untouched:
//
//   §12.6/1 gains "both owners are refused identically", which on a table nobody can read is what
//           stands in place of a cross-tenant claim — the same substitute 030 recorded for a row
//           that belongs to no tenant, arriving now for a row that belongs to one.
//   §12.6/4 gains the reason it is NOT extended: a viewer refused here is refused exactly as an
//           owner is, so the case says nothing about a viewer, which is 030's own finding.
//   §12.6/5 gains a suspended member refused at the GRANT layer rather than filtered to zero rows.
//   §12.6/6 gains the anonymous refusal on the family at the most restricted end of §9.1.
//   §12.6/7 gains the reason batch 140 asserts NO forged-id case at all, which is a finding about
//           the schema rather than a gap in the suite.
//   §12.6/8 CHANGES SUBSTANTIALLY, and it is the most useful thing this batch found: the positive
//           half stops being "unasserted because the matrix grants the service nothing" and becomes
//           "unasserted because the one `S` cell in the whole repository needs a workspace GUC that
//           does not exist". The row stays `negative-half`; what it is waiting for is now named.
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
                           + 'tenant being unlucky.\n\n'
                           + 'BATCH 060 ADDS NO CROSS-TENANT EVIDENCE AT ALL, AND THAT IS THE HONEST ROW '
                           + 'RATHER THAN A MODEST ONE. app.ai_model_policies IS a tenant table — it '
                           + 'carries workspace_id and the fixture loads a row on each side — and no '
                           + 'client identity can read it, because §8 has no row for a model policy and '
                           + 'the read allowlist is empty. So '
                           + '`owner-a-cannot-read-the-ai-model-policy-of-workspace-b` is asserted, and '
                           + 'it is asserted as a PRIVILEGE REFUSAL beside two cases showing each owner '
                           + "refused their OWN workspace's row at the same layer with the same message. "
                           + 'Counting that as a tenant boundary would be counting a refusal that holds '
                           + 'for everybody, which is the mistake batch 030 named about a global row and '
                           + 'is no less a mistake on a tenant one. The boundary on this table is owed '
                           + 'to the batch that gives it a policy.\n\n'
                           + 'BATCH 130 ADDS app.billing_subscriptions WITH ALL THREE CASES — A reads its '
                           + "own, A cannot read B's while holding B's exact workspace id, and B CAN — and "
                           + 'the pair of positives does a second job no earlier pair had to do. Both name '
                           + 'THE SAME GLOBAL PLAN REVISION id, which is batch 030\'s trick for proving a '
                           + 'catalog is global; here it is the ONLY available proof, because no identity '
                           + 'in the schema may read app.billing_plan_versions at all and the NOT NULL '
                           + 'foreign key is what makes the row they name a fact.\n\n'
                           + 'WHAT IS BEHIND THIS BOUNDARY IS DIFFERENT IN KIND from every family before '
                           + 'it. §12.6/1 has protected a name (010, 020), a catalog pin (030) and tenant '
                           + 'content (040); here it protects what another business is PAYING and until '
                           + 'when — FIN-3, which §9.1 describes as "restricted, immutable history".\n\n'
                           + 'BATCH 130\'s THREE GLOBAL TABLES ARE EXCLUDED for 030\'s reason, unchanged: '
                           + 'a row that belongs to no workspace has no cross-tenant case, and both owners '
                           + 'are refused identically at the privilege layer instead.\n\n'
                           + 'BATCH 140 ADDS TWO TENANT TABLES AND NO CROSS-TENANT CASE, which is new: '
                           + 'app.audit_logs and app.security_events both carry workspace_id, so they are '
                           + 'tenant-owned in a way 030\'s catalog is not — and no client role holds a '
                           + 'privilege on either, so "A cannot reach B\'s row" is unaskable for the same '
                           + 'reason it was unaskable of a global row and a different one. What is asserted '
                           + 'instead is the substitute 030 named: BOTH OWNERS ARE REFUSED IDENTICALLY, on '
                           + 'both tables, while each holds the exact id of a row in their OWN workspace. '
                           + 'That is a stronger statement than a tenant boundary and a narrower one, and '
                           + 'it is labelled rather than counted here.\n\n'
                           + 'BATCH 110 ADDS NO CROSS-TENANT EVIDENCE EITHER, AND THE HONEST ROW IS 060\'s. '
                           + 'app.meta_connections and app.social_accounts ARE tenant tables — each carries workspace_id '
                           + 'and the fixture loads a connection and a discovered account on each side — and no client '
                           + 'identity can read either, because §8.3 grants a HEALTH PROJECTION rather than a row and '
                           + 'RFC-2026-012 §3 with RFC-2026-021 puts a projection behind an allowlist that is empty. So '
                           + '`owner-a-cannot-read-the-meta-connection-of-tenant-b` and '
                           + '`owner-a-cannot-read-the-social-account-of-tenant-b` are asserted, and they are asserted as '
                           + 'PRIVILEGE REFUSALS beside cases showing each owner refused their OWN row at the same layer '
                           + 'with the same message. Counting that as a tenant boundary would be counting a refusal that '
                           + 'holds for everybody, which 030 named about a global row and 050 and 060 named about tenant '
                           + 'ones. The boundary on these two tables is owed to the batch that gives them a policy.\n\n'
                           + 'BATCH 061 ADDS app.quota_buckets WITH ALL THREE CASES -- A\'s owner reads A\'s bucket, A\'s owner cannot read B\'s while holding B\'s exact id, and B\'s owner CAN -- and what is behind this boundary is what a workspace is SPENDING and on which dimension, which is the FIN-3 half batch 130 protects from the price side. It carries one case with an identity §12.6 does not name: an ADMIN of workspace A reads the same row, because §8.4 gives the admin an unconditional `Y` here while §12.6\'s identity list has no admin at all -- so the second branch of the policy\'s role test had no caller until this batch added one.\n\nITS OTHER TWO TABLES ARE NOT COUNTED, FOR BATCH 050\'s REASON EXACTLY. app.usage_events and app.usage_reservations are tenant tables -- both carry workspace_id, and the fixture loads a ledger row on each side of the boundary -- and NO CLIENT IDENTITY CAN READ EITHER: §8.4 says nothing about who may SELECT a usage event, and a reservation has no §8 row at all. What is asserted instead is 030\'s substitute, both owners refused identically at the privilege layer, and it is labelled rather than counted.\n\n'
                           + 'BATCH 051 ADDS app.notifications WITH ALL THREE CASES — A reads its own, A '
                           + 'cannot read B\'s while holding B\'s exact notification id, and B CAN — and '
                           + 'ALSO WITH A FOURTH KIND OF CASE §12.6 HAS NO ROW FOR, which is recorded '
                           + 'inside this note rather than as a ninth key nobody may invent (030\'s rule). '
                           + '§5 scopes notification.core "workspace/USER", so the boundary this family '
                           + 'has is TWO boundaries, and the cross-tenant one is the weaker of them: '
                           + '`owner-a-cannot-see-the-notification-of-owner-b` is refused by BOTH terms of '
                           + 'the predicate independently, so a database that had lost either conjunct '
                           + 'would still pass it. The case that isolates the recipient term is '
                           + '`owner-a-cannot-see-the-notification-of-editor-a` — two ACTIVE MEMBERS OF '
                           + 'ONE WORKSPACE, the attacker being its OWNER, which §8.1 and §8.2 mark `Y` on '
                           + 'every SELECT row they contain.\n\n'
                           + 'A ROW-LEVEL SEPARATION BETWEEN TWO MEMBERS OF ONE WORKSPACE ALREADY EXISTS '
                           + 'IN THIS SUITE and the batch 051 pair is not offered as though it did not: '
                           + '`viewer-a-cannot-see-another-members-row` (010 and 011) and '
                           + '`editor-a-cannot-see-another-members-member-scope` (021) both carry it. What '
                           + 'batch 051 adds is the identity §8.4 refuses that §8.1 admits. §8.1 gives the '
                           + 'member list to owner and admin and 011\'s workspace_members_select_roster '
                           + 'implements it, so an OWNER reads another member\'s row there; §8.4 marks this '
                           + 'cell `O` for ALL FIVE built-in roles, so the owner is refused here. A '
                           + 'predicate copied from the roster shape passes every case in this suite '
                           + 'except that pair.\n\n'
                           + 'THE OTHER TWO BATCH 051 TABLES ARE NOT COUNTED HERE, for the two reasons '
                           + 'already on this row. app.notification_preferences is a TENANT TABLE NO '
                           + 'IDENTITY CAN READ — §8 has no row for a preference in any of its four '
                           + 'matrices — so both owners are refused identically at the privilege layer, '
                           + 'which is 050\'s shape. private.push_subscription_references is refused on '
                           + 'the SCHEMA for every identity alike, which is 060\'s.\n\n'
                           + 'it is labelled rather than counted here.\n\n'
                           + 'BATCH 131 ADDS THREE MORE TABLES IN THAT SAME STATE AND ONE CASE THAT LOOKS '
                           + 'LIKE A CROSS-TENANT PROOF AND IS NOT, which is why it is written down here '
                           + 'rather than counted. `owner-a-cannot-read-the-billing-invoice-of-tenant-b` '
                           + 'runs while holding tenant B\'s EXACT invoice id — the §12.6/1 control — and '
                           + 'is refused at the PRIVILEGE layer, because batch 131 grants no client role '
                           + 'anything. So it says "no client reads this table" and NOT "the tenant '
                           + 'boundary holds", and on a database whose policies had all been deleted it '
                           + 'would pass unchanged. The substitute 030 named carries the weight instead: '
                           + 'both owners are refused identically on all three tables, and the two '
                           + 'invoices are deliberately DIFFERENT rows — A\'s is settled and B\'s is not, '
                           + 'and B\'s only payment failed — so a boundary that failed would leak a fact '
                           + 'rather than a duplicate.\n\n'
                           + 'BATCH 132 ADDS NO CROSS-TENANT CASE, AND THAT IS A STATEMENT ABOUT WHAT '
                           + 'ITS CASES ARE FOR RATHER THAN A GAP. It creates no table, so it has no '
                           + 'tenant boundary of its own to attack, and its four cases are about '
                           + 'whether the effective limit question can be ASSEMBLED at all — a claim '
                           + 'about privileges over two families, which the tenant boundary is not the '
                           + 'control for. A case holding workspace_b\'s id here would have been '
                           + 'refused by batch 130\'s policy and batch 061\'s, both already asserted '
                           + 'above, and would have credited this batch with a boundary it did not '
                           + 'build.\n\n'
                           + 'BATCH 070 CARRIES THE THREE-CASE SHAPE ON FOUR OF ITS FIVE TABLES AND '
                           + 'DELIBERATELY NOT ON THE FIFTH. app.research_runs, app.research_sources, '
                           + 'app.research_evidence and app.research_suggestions each get A reads its own, A '
                           + 'cannot read B\'s while holding B\'s EXACT id, and B CAN — §8.2 marks '
                           + '"Knowledge/Research SELECT" `Y` for all five built-in roles, so the boundary '
                           + 'here is one a client can actually see and a failure would leak what another '
                           + 'business researched rather than what it is called. app.research_snapshots gets '
                           + 'NONE of it, and the reason is §9.1 rather than an omission: a research snapshot '
                           + 'is COPYRIGHT-3 with the client projection "approved excerpt only", nothing in '
                           + 'this repository defines an approval, and no client role is granted anything — '
                           + 'so both owners are refused IDENTICALLY at the privilege layer, which is 030\'s '
                           + 'substitute and says "no client reads this table" rather than "the boundary '
                           + 'holds". The two captures behind that refusal are different rows and not copies: '
                           + 'A\'s is live and B\'s has been PURGED, which is §10\'s "purge object + locator; '
                           + 'preserve permitted hash/citation metadata" as data.'
           + '\n\n'
           + 'BATCH 080 ADDS FIVE TABLES WITH ALL THREE CASES EACH — A reads its own, A cannot read '
           + 'B\'s while holding B\'s exact id, and B CAN. On app.content_ideas the id is a PAIR, '
           + '(workspace_id, client_request_id), because §4.6 makes the request key unique per '
           + 'workspace and a row addressed by its natural key is addressed as exactly as one '
           + 'addressed by a uuid. What is behind this boundary is the product itself: an idea is '
           + 'what a business intends to publish, a version is what it wrote, a variant is the text '
           + 'queued for a platform, and a quality review is the verdict reached on it.'
           + '\n\n'
           + 'BATCH 090 ADDS THREE TABLES WITH ALL THREE CASES EACH, and on two of them the id a '
           + 'case holds is not a uuid. An approval POLICY is held by (workspace_id, '
           + 'business_profile_id, policy_key, version), which is §5\'s "policy versioned" as a '
           + 'constraint; an approval EVENT is held by (approval_request_id, action, '
           + 'idempotency_key), which is §4.7\'s "unique idempotency key ต่อ action" used as an '
           + 'address. That matters here rather than only in the catalog: the strongest form this '
           + 'row takes is tenant A holding EVERY part of tenant B\'s address and still reading '
           + 'nothing, and on the trail that now includes the key whose whole purpose is to be '
           + 'unique. What is behind this boundary is who approved what, when, and why.' },
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
                           + 'resolves nothing at all.\n\n'
                           + 'BATCH 060 CARRIES NO CASE FOR IT AND THE REASON IS STRUCTURAL. §5 scopes '
                           + 'ai.gateway "global/workspace" and §7\'s three scope types are '
                           + 'all_businesses, business and page — every one of them names a Business or '
                           + 'a Page, and batch 021\'s own header says a WORKSPACE row is not inside any '
                           + 'of them. So there is no Business column on a model policy for a member '
                           + 'scope to narrow, no restrictive policy to write, and nothing for §12.6/2 '
                           + 'to be about. That is also why the migration registry gives 060 "011,020" '
                           + 'and not 021: the batch that would have supplied the narrowing has nothing '
                           + 'to narrow here.\n\n'
                           + 'BATCH 130 CARRIES NOTHING FOR THIS ASSERTION AND SAYS SO. app.billing_'
                           + 'subscriptions is a WORKSPACE row: it carries workspace_id and neither '
                           + 'business_profile_id nor page_context_profile_id, and §7\'s three scope types '
                           + '— all_businesses, business, page — every one of them names a Business or a '
                           + 'Page. That is 021\'s own sentence about "Workspace UPDATE: Admin P", and it '
                           + 'is why batch 130 writes no RESTRICTIVE policy at all while every batch since '
                           + '021 has written one. The three global tables have no tenant, so the same is '
                           + 'true of them one step further out. user_editor_a IS refused the subscription '
                           + 'of their own workspace, and their member scope has nothing to do with it: '
                           + '§8.3 marks the editor `N` on that row and the ROLE is the whole of the '
                           + 'refusal.\n\n'
                           + 'BATCH 110 CARRIES NO CASE FOR IT, AND THE REASON IS THE TABLE THIS BATCH REFUSES TO CREATE. '
                           + '§5 scopes connector.meta "workspace/business/page", so a reader will look for a Business and '
                           + 'a Page here — and the only entity in §4\'s ERD that has them is CHANNEL_BINDING, whose '
                           + 'defining foreign key §6\'s registry gives to batch 111 (A0 Integration, "business-channel/'
                           + 'social FK") and whose table §5 assigns to TWO module rows at once. A connection hangs off a '
                           + 'Workspace and a discovered account off a connection; neither carries a Business column for a '
                           + 'member scope to narrow, so 021\'s helpers are named in 110\'s header and called by nothing. '
                           + 'The scope half of this family arrives with the binding, and so does this row\'s case.\n\n'
                           + 'BATCH 061 CARRIES THIS ASSERTION ON A CALLER THE MATRIX ALLOWS, WHICH IS WHAT MAKES IT ABOUT SCOPE RATHER THAN ABOUT ROLE. Every table since 021 has narrowed an EDITOR, and on batch 061\'s one client-readable table §8.4 marks the editor `P` -- so an editor refused a quota bucket proves nothing about member scope. user_admin_a is an ADMIN, whose `Y` §8.4 gives unconditionally, holding a `business` scope on business_a1: they read quota_bucket_a1 and are refused quota_bucket_a2, while user_owner_a -- unscoped -- reads BOTH. The three cases together are 021\'s reading of §7 as an assertion: a scope narrows a caller the matrix already admits, and does not narrow a caller who holds no scope row.\n\n'
                           + 'BATCH 070 CARRIES IT AT A GRANULARITY THE ROW\'S OWN WORDS ASK FOR AND ONE '
                           + 'STEP FURTHER THAN THAT. §12.6/2 reads "user_editor_a sees Business A1/Page A1, '
                           + 'never A2/Page A2", and app.research_runs is a table whose scope is BOTH columns '
                           + '(§4 invariant 3 names Research beside Knowledge), so the Business half and the '
                           + 'Page half are separate cases with separate positives: the editor reads the run '
                           + 'of business_a1 and not the one under business_a2, and user_page_editor_a reads '
                           + 'the run pinned to page_a1 and not the one pinned to its sibling while still '
                           + 'reading the business-level run above both. THE STEP FURTHER IS THE CHILD: a '
                           + 'source, an evidence item and a suggestion carry no page column of their own, so '
                           + 'each one\'s narrowing resolves through its parent, and '
                           + '`pinned-editor-a-cannot-see-the-research-source-of-a-sibling-target-run` is the '
                           + 'case that proves the resolution rather than a copy of the predicate — it is the '
                           + 'only case that fails if the child\'s exists() is replaced by '
                           + 'member_scope_admits_business over the child\'s own columns.'
           + '\n\n'
           + 'BATCH 080 ASKS THE SAME QUESTION ONE LEVEL DEEPER THAN 070 COULD. The item carries both '
           + 'scope columns and asks the two questions itself; a version resolves through the item; '
           + 'and a VARIANT and a QUALITY REVIEW resolve through the version and then through the '
           + 'item — two links, where every family before this one had at most one. '
           + '`pinned-editor-a-cannot-see-the-content-variant-of-a-sibling-target-item` and its '
           + 'quality-review twin are the only cases in this suite that fail if the second link is '
           + 'replaced by member_scope_admits_business over the version\'s own columns, which is '
           + 'why the fixture loads a variant and a review under the sibling-page item at all.'
           + '\n\n'
           + 'BATCH 090 ASKS IT AT THE SAME DEPTH AND FROM A DIFFERENT DIRECTION. The POLICY '
           + 'carries both scope columns and asks the two questions itself. The REQUEST carries no '
           + 'page column AT ALL — a nullable copy of the item\'s page could not be held equal to '
           + 'it under MATCH SIMPLE — so it resolves through app.content_items, and the EVENT '
           + 'resolves through the request and then through that item: two links, like 080\'s '
           + 'variant, but with the first link landing in ANOTHER BATCH\'S TABLE. '
           + '`pinned-editor-a-cannot-see-the-approval-event-of-a-sibling-target-item` is the only '
           + 'case in this batch that fails if the second link is replaced by '
           + 'member_scope_admits_business over the request\'s own columns, and '
           + '`pinned-editor-a-sees-the-approval-event-of-a-reachable-item` is the same caller '
           + 'admitted two links down, which is what stops the refusal being read as a caller who '
           + 'reaches nothing.' },
  // FLIPPED BY BATCH 080, and it is the only value in this map that has ever moved. It read
  // `knowledge-half` from batch 040 until the tables the other half of §12.6/3 names existed; five
  // batches recorded in turn that they were not content and did not move it. The paragraphs they
  // wrote are kept rather than collapsed into the new value, because what this row says about the
  // analogue rule — six refusals weighed and none counted — is the reason the flip means anything.
  3: { covered: true,
       note: 'THE KNOWLEDGE HALF IS PAID BY BATCH 040 AND THE CONTENT HALF BY BATCH 080. §12.6/3 is '
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
           + 'WHAT WAS OWED, AND BY WHOM: content. Until batch 080 existed, app.content_items and '
           + 'its versions were a batch nobody had written and no case here touched them, so this '
           + 'row read `knowledge-half` and not `true`: flipping it then would have reported half a '
           + 'sentence as a whole one, which is the thing the analogue rule below exists to refuse. '
           + 'The batch-080 paragraph at the end of this note is what pays it.\n\n'
           + 'THE THREE IN-SCOPE ANALOGUES REMAIN ANALOGUES AND REMAIN UNCOUNTED — an approver cannot '
           + 'update the workspace (010), cannot update a page context (020), and cannot re-pin the '
           + 'industry assignment of the very Business their member scope names (030). Batch 040 pays '
           + 'none of them; they are evidence about three other tables, and the sharpest of them is '
           + 'still the third, for the reason it was recorded: the approver\'s scope admits the row and '
           + 'their role still refuses the write.\n\n'
           + 'BATCH 060 ADDS A FOURTH ANALOGUE AND IT IS THE WEAKEST OF THE FOUR, which is why it is '
           + 'recorded and not counted. `approver-a-cannot-read-the-ai-model-policy-of-workspace-a` is a '
           + 'refusal of a READ rather than of an edit, and it holds for the owner too — on that table '
           + 'every role is the wrong role, so the case says nothing about an approver in particular. It '
           + 'is listed here so the count of analogues stays honest rather than growing quietly.\n\n'
           + 'BATCH 130 ADDS A FOURTH ANALOGUE AND IT IS NOT COUNTED EITHER, and it is the weakest of '
           + 'the four rather than the sharpest: `approver-a-cannot-read-the-billing-subscription-of-'
           + 'tenant-a` is a refused READ, and §12.6/3 is about EDITING. It is recorded here because a '
           + 'reader who finds an approver case in batch 130 should be able to see that it was weighed '
           + 'and rejected rather than overlooked. Content is still batch 080\'s, and this row still '
           + 'reads `knowledge-half`.\n\n'
                           + 'BATCH 110 CARRIES NO CASE FOR IT AND WEIGHS THE SAME QUESTION 130 WEIGHED. An approver '
                           + 'refused a Meta connection would be a fifth in-scope analogue and still not the content and '
                           + 'knowledge tables this sentence names — and here it would be weaker than 130\'s, because the '
                           + 'approver is refused by the privilege system exactly as the owner is. §8.3 marks the approver '
                           + '`N` on both connector rows, which is counted under §8.6/2 rather than here. Content is still '
                           + 'batch 080\'s, and this row still reads `knowledge-half`.\n\n'
           + 'BATCH 061 MOVES NOTHING HERE AND THE REASON IS SHORT. §12.6/3 is about an approver EDITING content or knowledge; a quota bucket is neither, and `approver-a-sees-zero-quota-buckets` is a READ refusal counted under §8.6/2. Content is still batch 080\'s and this row still reads `knowledge-half`.\n\n'
           + 'BATCH 070 MOVES NOTHING HERE EITHER, AND A READER WILL EXPECT IT TO, so the reason is '
           + 'stated rather than left. §12.6/3 names CONTENT and KNOWLEDGE. Research is neither: §5 gives '
           + 'it its own module row, §8.2 gives it its own operations, and reading "Knowledge/Research '
           + 'SELECT" as licence to count a research refusal against a sentence that says "knowledge" '
           + 'would be the analogue rule this map has refused five times. What batch 070 DOES assert '
           + 'about the approver is that they cannot SAVE a research suggestion — §8.2 marks them `P` on '
           + '"Suggestion save/dismiss/use" while the other three are `Y` — and that is counted under '
           + '§8.6/2 where it belongs. Content is still batch 080\'s and this row still reads '
           + '`knowledge-half`.'
           + '\n\n'
           + 'BATCH 080 PAYS THE CONTENT HALF AND THIS ROW IS NOW `true`. §12.6/3 is "user_approver_a '
           + 'cannot edit content/knowledge"; 040 paid knowledge and this batch pays content. '
           + 'app.content_items and app.content_ideas are the two tables in the family a client may '
           + 'write at all, and the approver is refused on both: they cannot create a content item, '
           + 'cannot rename one, and cannot re-topic an idea. THE ROLE IS THE ONLY THING REFUSING, '
           + 'which is what makes these cases about this sentence rather than about visibility: '
           + 'user_approver_a holds a business scope on business_a1, the restrictive narrowing '
           + 'admits every row they are refused, and `approver-a-sees-the-content-item-of-a1` is '
           + 'the case that says so. The three immutable tables carry no approver case and should '
           + 'not: their writes are refused for the owner and the service too, which says nothing '
           + 'about an approver and is counted under §8.6/9.\n\n'
           + 'THE SIX ANALOGUES RECORDED ABOVE STAY ANALOGUES AND STAY UNCOUNTED. Flipping this row '
           + 'is not a relaxation of that rule — it is the rule being satisfied by the two tables '
           + 'the sentence actually names.' },
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
                           + 'why the migration asserts invoker mode against the catalog on every apply.\n\n'
                           + 'BATCH 060 OFFERS A VIEWER NOTHING TO BE REFUSED, and says so rather than '
                           + 'writing a case that would pass for the wrong reason. Its three tables grant '
                           + 'no client role any verb at all, so a viewer refused an insert there would '
                           + 'be refused for want of a grant that nobody holds — evidence about the '
                           + 'table and not about the viewer. What carries the "even the owner" claim on '
                           + 'this batch is `owner-a-cannot-delete-the-ai-model-policy-of-workspace-a` '
                           + 'and its three siblings, where the identity refused is the strongest one '
                           + 'there is.\n\n'
                           + 'ON BATCH 130 THE VIEWER IS REFUSED THE READ ITSELF, which no earlier family '
                           + 'could assert: §8.3 marks "Billing/subscription SELECT" `N` for the viewer '
                           + 'where every SELECT row in §8.1 and §8.2 is `Y` for all five built-in roles. '
                           + 'There is nothing else for a viewer to be refused there — NOBODY holds '
                           + 'INSERT, UPDATE or DELETE on any of batch 130\'s four tables, so a viewer '
                           + 'refused a write would be refused for want of a grant and would say nothing '
                           + 'about a viewer. `owner-a-cannot-create-a-billing-subscription`, '
                           + '`owner-a-cannot-extend-a-billing-subscription` and '
                           + '`owner-a-cannot-delete-a-billing-subscription` carry those refusals instead, '
                           + 'where "even the owner" is the claim and the thing being refused is a '
                           + 'client-asserted entitlement.\n\n'
                           + 'BATCH 140 ADDS NOTHING HERE AND THE ABSENCE IS THE ENTRY. A viewer refused '
                           + 'an audit row is refused by the same absent grant that refuses the workspace '
                           + 'OWNER, so the case would say nothing about a viewer — which is exactly what '
                           + '030 recorded about its two global tables and is why '
                           + '`owner-a-cannot-write-an-audit-log` carries the write refusal instead, where '
                           + '"even the owner" is the claim. §8.4 marks the viewer `N` on every audit row, '
                           + 'and `viewer-a-cannot-read-the-audit-log` asserts that cell; it is counted '
                           + 'under §8.6/2 (wrong role) rather than here, because a refusal that holds for '
                           + 'everyone is not evidence about a role.\n\n'
                           + 'ON BATCH 110 IT IS ABSENT IN EVERY VERB AND THE ROW SAYS SO RATHER THAN COUNTING THE SILENCE. '
                           + 'No client role holds SELECT, INSERT, UPDATE or DELETE on any of the four tables, so a viewer '
                           + 'refused one would be refused for want of a grant and would say nothing about a viewer. '
                           + '`owner-a-cannot-create-a-meta-connection`, `owner-a-cannot-revoke-the-meta-connection-of-'
                           + 'tenant-a` and `owner-a-cannot-rename-the-social-account-of-tenant-a` carry those refusals '
                           + 'instead, where "even the owner" is the claim — and on this family "even the owner" is the '
                           + 'sharper statement, because §8.3 marks the owner `Y` on connect/disconnect/re-auth and the '
                           + 'refusal is therefore of a cell the matrix GRANTS.\n\n'
                           + 'BATCH 061 ADDS `viewer-a-sees-zero-quota-buckets`, WHICH IS ALSO NOT THIS ROW. §12.6/4 is about a viewer refused an INSERT, an UPDATE or a DELETE, and that refusal on all three metering tables holds for every client role including the workspace OWNER, at the grant layer -- so it is not evidence about a viewer either. What batch 061 does contribute is the pairing that makes a viewer case legible at all: on app.quota_buckets the viewer is refused a READ that an owner and an admin of the same workspace both perform, so the refusal is attributable to the role, and it is counted under §8.6/2 where it belongs rather than here.\n\n'
                           + 'BATCH 070 ADDS TWO VIEWER WRITE REFUSALS THAT ARE THIS ROW RATHER THAN A '
                           + 'neighbouring one, and the property that makes them so is that the viewer READS '
                           + 'the row they cannot write. `viewer-a-cannot-cancel-a-research-run` and '
                           + '`viewer-a-cannot-save-a-research-suggestion` are `no-effect` cases against '
                           + 'tables where §8.2 marks the viewer `Y` on SELECT and gives them neither of the '
                           + 'write cells — so the refusal is about the OPERATION, not about the table being '
                           + 'out of reach, which is what separated 061\'s and 131\'s cases from this row. '
                           + 'Each is paired with a witness read as the workspace owner, because a filtered '
                           + 'UPDATE raises nothing and an empty result is also what an update returns when '
                           + 'the row is simply absent.'
           + '\n\n'
           + 'ON BATCH 080 IT IS INSERT AND UPDATE ON THE TWO CLIENT-WRITABLE TABLES AND NOTHING ON '
           + 'THE OTHER THREE, and the absence is §8.2 row 3 rather than a thin suite: a viewer '
           + 'refused a write to app.content_versions would be refused for want of a grant nobody '
           + 'holds, which says nothing about a viewer. The four cases that do carry it are '
           + '`viewer-a-cannot-create-a-content-item`, `-capture-a-content-idea` (both RAISE, '
           + 'because an INSERT policy has no row to filter) and `viewer-a-cannot-rename-a-content-'
           + 'item`, `-retopic-a-content-idea` (both `no-effect` with a witness).'
           + '\n\n'
           + 'ON BATCH 090 IT IS EVERY WRITE ALL THREE TABLES OFFER A CLIENT. '
           + '`viewer-a-cannot-write-an-approval-policy` and `-raise-an-approval-request` RAISE, '
           + 'because an INSERT policy has no row to filter; '
           + '`viewer-a-cannot-toggle-an-approval-policy`, `-cancel-an-approval-request` and '
           + '`-decide-an-approval-request` are `no-effect` with witnesses. The trail offers a '
           + 'client NO write at all, so it carries no viewer case and should not: a viewer refused '
           + 'an INSERT into app.approval_events is refused for want of a grant nobody holds, which '
           + 'says nothing about a viewer and is counted under §8.6/9.\n\n'
           + 'THE VIEWER\'S CANCEL IS ALSO THE CONTROL FOR THIS BATCH\'S SHARPEST PAIR. '
           + '`approver-a-cannot-cancel-an-approval-request` is `denied` where the viewer\'s is '
           + '`no-effect`, and the difference is that the approver holds the OTHER of §8.3\'s two '
           + 'write rows: their USING half admits the row, so the statement reaches the WITH CHECK '
           + 'halves and errors, while the viewer holds neither row and is filtered before any '
           + 'WITH CHECK is evaluated.' },
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
                           + 'they carry `§12.6/5-analogue` and this row is unaffected by them.\n\n'
                           + 'BATCH 060 RE-ASKS IT OF NOTHING, and the reason is worth stating because '
                           + 'app.ai_model_policies IS a tenant table and a reader will look for the '
                           + 'case. A suspended member sees zero rows there — and so does the workspace '
                           + 'owner, the approver, the viewer and the other tenant, because no client '
                           + 'role holds a grant. An assertion that is true of every identity alike is '
                           + 'not evidence about the one that is suspended, and adding it would grow the '
                           + 'count of cases without growing what the suite knows.\n\n'
                           + 'BATCH 130 RE-ASKS IT OF app.billing_subscriptions, where the helper is again '
                           + 'the only membership predicate — and asks it of the narrowest one in the '
                           + 'schema: app.workspace_member_role(workspace_id) = \'owner\'. A suspended '
                           + 'member sees zero rows there because the helper answers NULL for a membership '
                           + 'that is not active, which is §7 arriving through batch 011 and nothing '
                           + 'else.\n\n'
                           + 'BATCH 140 RE-ASKS IT AND GETS A STRONGER ANSWER THAN THE ASSERTION WANTS. '
                           + 'On both audit tables a suspended member is refused with an ERROR at the '
                           + 'GRANT layer rather than filtered to zero rows, because no client role holds '
                           + 'a privilege there — so the two cases declare `denied` and name the layer '
                           + 'and the object rather than claiming the weaker outcome. The pair with an '
                           + 'ACTIVE owner refused identically is what stops that being read as a '
                           + 'suspension control: on these two tables suspension is not what refuses '
                           + 'anybody.\n\n'
                           + 'BATCH 110 RE-ASKS IT AND RECORDS THE SAME LIMIT, ON TWO TABLES. '
                           + '`suspended-a-cannot-read-the-meta-connection-of-tenant-a` and '
                           + '`suspended-a-cannot-read-the-social-account-of-tenant-a` are ERRORS at the GRANT layer rather '
                           + 'than empty reads, because no client role holds a privilege there — and each sits beside an '
                           + 'ACTIVE owner refused identically, which is what stops the pair being read as a suspension '
                           + 'control. On this family suspension is not what refuses anybody either, and the cases declare '
                           + 'the layer and the object so the difference is recorded rather than inferred.\n\n'
                           + 'BATCH 061 GIVES THE ROW BACK A CASE WHERE SUSPENSION IS THE WHOLE OF THE REFUSAL. `suspended-a-sees-zero-quota-buckets` reads a row that an ACTIVE OWNER and an ACTIVE ADMIN of the same workspace both read in the cases immediately above it, through a policy whose predicate is `app.workspace_member_role(workspace_id)` -- which batch 011 defines to answer only for a membership whose status is `active`. That is the shape batch 140 could not produce and said so; the difference is that this table has a client read at all.\n\nON app.usage_events AND app.usage_reservations BATCH 061 IS IN 140\'s POSITION and does not pretend otherwise: no client identity can read either, so a suspended member is refused exactly as an active owner is, and no case there is written as a suspension control.\n\n'
                           + 'BATCH 051 IS WHERE THIS ASSERTION FINALLY BITES ON A ROW THE SUSPENDED '
                           + 'MEMBER OWNS. On every table since 010 the suspended member has been refused '
                           + 'rows that belong to somebody else or to nobody, and 050, 060 and 140 had to '
                           + 'label their suspended cases ANALOGUES because a refusal that holds for every '
                           + 'active member too is the privilege system rather than suspension. '
                           + 'app.notifications is different: the fixture ADDRESSES A NOTIFICATION TO '
                           + 'user_suspended_a, the recipient term of the policy admits them, and only '
                           + '`app.is_active_member(workspace_id)` refuses — while '
                           + '`editor-a-sees-their-own-notification` shows an active member with the same '
                           + 'relationship to their own row reading it. So `suspended-a-sees-zero-'
                           + 'notifications` is not an analogue and is not labelled one.\n\n'
                           + 'THE MUTATION HALF IS CARRIED AT A WEAKER GRANULARITY AND THAT IS SAID '
                           + 'RATHER THAN AVERAGED. §12.6/5 asks for zero rows AND no mutation, and the '
                           + 'strongest mutation case — the suspended member marking their OWN '
                           + 'notification read — cannot be written, because a `no-effect` case is an '
                           + 'empty result plus a WITNESS that reads the value back, and no identity in '
                           + 'this schema may read that row: the recipient is the suspended member, an '
                           + 'owner is refused by the recipient term, and the service holds no policy. '
                           + '`suspended-a-cannot-mark-a-notification-read` therefore targets another '
                           + 'member\'s row, which the row\'s own recipient can witness.\n\n'
                           + 'anybody.\n\n'
                           + 'BATCH 131 IS THE SAME ANSWER ON THREE MORE TABLES AND IS RECORDED RATHER '
                           + 'THAN REPEATED: a suspended member is refused a webhook receipt, an invoice '
                           + 'and a payment at the GRANT layer, identically to the ACTIVE OWNER beside '
                           + 'them. §7\'s "only status active grants access" is a statement about a '
                           + 'policy predicate, and there is no policy on any of these three, so the '
                           + 'cases declare `denied` with the layer and the object rather than claiming '
                           + 'a suspension control they do not exercise.\n\n'
                           + 'BATCH 070 CARRIES BOTH FORMS AT ONCE AND LABELS WHICH IS WHICH. On '
                           + 'app.research_runs, app.research_sources, app.research_evidence and '
                           + 'app.research_suggestions the suspended member is FILTERED to zero rows by '
                           + 'app.is_active_member, beside an active viewer of the same workspace who reads '
                           + 'the same row — which is the pairing that makes a suspension case a suspension '
                           + 'case. On app.research_snapshots they are refused at the GRANT layer, '
                           + 'identically to the active owner, so `suspended-a-cannot-read-a-research-'
                           + 'snapshot` says "no client reads this table" and is recorded as saying less.'
           + '\n\n'
           + 'BATCH 080 ADDS FOUR SUSPENDED READS, one per table a case addresses by a constant, and '
           + 'each is paired with an active member of the same workspace reading the same row. '
           + 'app.is_active_member is where §7 lives for all five policies here, and none of the '
           + 'predicates carries a `status` term of its own.'
           + '\n\n'
           + 'BATCH 090 ADDS THREE SUSPENDED READS, one per table, each paired with an active '
           + 'member of the same workspace reading the same row — and one suspended WRITE, '
           + '`suspended-a-cannot-toggle-an-approval-policy`, with a witness, because a read case '
           + 'alone cannot tell a suspended member from a member the narrowing subtracts. '
           + 'app.is_active_member is where §7 lives for all three SELECT policies here and '
           + 'app.workspace_member_role for the four write paths, and none of the predicates '
           + 'carries a `status` term of its own.' },
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
                           + 'behaviour.\n\n'
                           + 'BATCH 060 IS WHERE THIS ASSERTION STOPS BEING ABOUT ONE SCHEMA. '
                           + '`anonymous-cannot-read-the-ai-model-registry` is 030\'s case one family '
                           + 'over — §9.1 names "public model label" beside the published industry '
                           + 'catalog as its two examples of PUBLIC-0, so it is the second refusal '
                           + 'somebody might want to remove, and RFC-2026-021 §7/4 now decides against '
                           + 'it in terms rather than leaving it inherited. '
                           + '`anonymous-cannot-read-a-credential-reference` is the new shape: an '
                           + 'anonymous case whose declared object is `private` rather than '
                           + '`app`. (It said "the ONLY" such case until batch 110 added two more, and '
                           + 'the correction is recorded in this note\'s batch 110 paragraph rather than '
                           + 'made silently.) anon holds nothing anywhere, so the schema that refuses it is '
                           + 'whichever one the statement names — and declaring which is what makes the '
                           + 'two cases different assertions instead of one repeated.\n\n'
                           + 'BATCH 130 IS THE THIRD PLACE THE CASE STOPS BEING ROUTINE, AND THE MOST '
                           + 'ORDINARY-LOOKING. A pricing page is the most unremarkable unauthenticated '
                           + 'surface a product has, so `anonymous-cannot-read-the-billing-plan-catalog` '
                           + 'and `anonymous-cannot-read-a-published-plan-price` are asserting refusals '
                           + 'somebody will want removed for a perfectly good reason. RFC-2026-021 §7/4 is '
                           + 'now an APPROVED decision that anon holds nothing anywhere our migrations '
                           + 'reach, and the structural reason it gives is why these cases declare the '
                           + 'SCHEMA: the first anon grant is `usage on schema app`, which moves the denial '
                           + 'layer of every object in app at once. Four anonymous cases in this batch, on '
                           + 'the schema, so that day arrives as four failing tests.\n\n'
                           + 'BATCH 140 STATES IT ON THE TWO FAMILIES §9.1 RESTRICTS MOST. AUTH-3 is '
                           + '"restricted and append-only where needed" and SECURITY-4 is "hash/minimize; '
                           + 'restricted", with a client projection of "security/admin safe view only" — '
                           + 'so if 030\'s catalog is the one family somebody might argue for exposing '
                           + 'anonymously, a raw security event is the last. Both cases are refused on '
                           + 'the SCHEMA, which is RFC-2026-021 §7/4 as an assertion rather than as a '
                           + 'convention.\n\n'
                           + 'BATCH 110 FALSIFIES A SENTENCE THIS NOTE CARRIED, AND THE CORRECTION IS THE POINT RATHER THAN '
                           + 'THE BOOKKEEPING. Batch 060 wrote that `anonymous-cannot-read-a-credential-reference` was "the '
                           + 'ONLY anonymous case in the suite whose declared object is `private` rather than `app`", and a '
                           + 'static test pinned that word with assert.match. It was true of 060\'s branch and is false of '
                           + 'this tree: batch 110 adds `anonymous-cannot-read-a-meta-credential-reference` and '
                           + '`anonymous-cannot-read-a-meta-webhook-delivery`, both refused on `private`, and the pin would '
                           + 'have kept the false sentence alive exactly as three ordinals did in the parallel round. The '
                           + 'sentence now says WHAT THE SHAPE IS instead of how many there are, and the test pins the '
                           + 'shape. WHAT THE THREE NEW CASES ADD is the raw webhook inbox — §8.3 marks "Raw token/webhook '
                           + 'SELECT" N for all five built-in roles, §10 says "no tenant access" and §11.1/5 keeps it out '
                           + 'of a PDPA export, so if a raw security event is the last thing somebody would expose '
                           + 'anonymously, a raw provider delivery is beside it.\n\n'
                           + 'BATCH 061 ADDS THREE MORE, one per table, all declared on the SCHEMA. That is not repetition for its own sake: RFC-2026-021 §7/4\'s structural argument is that the first anon grant is `grant usage on schema app`, which changes the DENIAL LAYER of every object in `app` at once -- so the day somebody writes it, every anonymous case in this suite moves from the schema to the table together, and a batch that declared only one of its three would have one case failing and two quietly still passing for the wrong reason.\n\n'
                           + 'BATCH 051 ADDS THREE, AND ONE OF THEM NAMES A DIFFERENT SCHEMA. '
                           + '`anonymous-cannot-see-a-notification` and '
                           + '`anonymous-cannot-read-a-notification-preference` are refused on `app`; '
                           + '`anonymous-cannot-read-a-push-subscription-reference` is refused on '
                           + '`private`, which is the second table this suite has there and the reason '
                           + 'the declared OBJECT is worth carrying at all — the schema that refuses an '
                           + 'anonymous read is the schema its statement names, and a case that declared '
                           + 'only the layer would be satisfied by the harness failing to reach a '
                           + 'helper.\n\n'
                           + 'convention.\n\n'
                           + 'BATCH 131 ADDS THREE MORE, ON THE SCHEMA, and one of them is about the '
                           + 'class §9.2 forbids leaving the system at all. A billing webhook receipt is '
                           + 'PROVIDER-3 — "private, redact/log hash", client projection "safe projection '
                           + 'only" — and §11.1/5 excludes a raw webhook from a PDPA export even for the '
                           + 'owner who requested it. An anonymous read of one is the furthest thing from '
                           + 'a defensible client surface this schema contains, and it is refused where '
                           + 'every other anonymous case is refused: at name resolution, because anon '
                           + 'holds no USAGE on app.\n\n'
                           + 'BATCH 070 ADDS FIVE, ONE PER TABLE, AND ONE OF THEM IS AGAINST THE CLASS §9.2 '
                           + 'NAMES A FIXTURE IN. A research snapshot is COPYRIGHT-3 and §9.2\'s absolute '
                           + 'prohibitions end with "full research snapshot ที่ client ไม่มีสิทธิ์ทำซ้ำ", '
                           + 'listing `fixture` among the surfaces it may not reach — so '
                           + '`anonymous-cannot-read-a-research-snapshot` is the anonymous case against the '
                           + 'most restricted material this schema holds, and it is refused where every '
                           + 'other one is: at name resolution, on the SCHEMA, because anon holds no USAGE '
                           + 'on app.'
           + '\n\n'
           + 'BATCH 080 ADDS FOUR MORE ANONYMOUS CASES AND EVERY ONE IS REFUSED IN THE SAME PLACE, on '
           + 'the SCHEMA. There is no table in this family whose refusal is argued from a '
           + 'sensitivity class instead, which is the one way 070\'s set differed from every set '
           + 'before it.'
           + '\n\n'
           + 'BATCH 090 ADDS THREE MORE AND EVERY ONE IS REFUSED IN THE SAME PLACE, on the SCHEMA. '
           + 'That is worth a sentence rather than none, because app.approval_events holds the '
           + 'material an unauthenticated reader would most want and the refusal has nothing to do '
           + 'with what it holds: `anon` has no USAGE on app, so name resolution stops before a '
           + 'sensitivity class is ever consulted.' },
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
                           + 'apply-time block instead, and this note says which layer actually refuses.\n\n'
                           + 'BATCH 060 ADDS NO FORGERY CASE AND CANNOT, which is a fact about the batch '
                           + 'rather than a gap in it. §8.6 case 8 is about a forged created_by or scope '
                           + 'column on a write a caller is otherwise permitted; no client role holds '
                           + 'INSERT or UPDATE on any of 060\'s three tables, so there is no permitted '
                           + 'write for a forged column to ride in on, and a case that forged one would '
                           + 'be asserting the absent grant a different case already asserts. The '
                           + 'assertion arrives with the command surface, which is where §8.3\'s owner '
                           + 'cell arrives too.\n\n'
                           + 'BATCH 130 ADDS NO FORGERY CASE AT ALL, AND THE ABSENCE IS THE FINDING RATHER '
                           + 'THAN A GAP. §8.6/8 is about a forged `created_by` or a forged scope column '
                           + 'failing an insert or an update. Batch 130 grants NO ROLE insert or update on '
                           + 'any of its four tables, so there is no write path for a forged column to '
                           + 'travel down: a forged workspace_id and a well-formed one are refused '
                           + 'identically, at the privilege layer, and a case asserting the first would be '
                           + 'asserting the second under a misleading name. app.billing_subscriptions '
                           + 'carries no created_by at all, for the reason 030 gave about a '
                           + 'platform-curated catalog — §3.2 asks for the actor columns on a row a USER '
                           + 'mutates, and no user mutates this one. What CAN be forged here is a '
                           + 'commitment, and `owner-a-cannot-create-a-billing-subscription` is that '
                           + 'case.\n\n'
                           + 'BATCH 140 ADDS NO FORGERY CASE AT ALL, AND THAT IS A FINDING ABOUT THE '
                           + 'SCHEMA RATHER THAN A GAP IN THE SUITE. A forged id fails somewhere only if '
                           + 'something checks it, and on app.audit_logs and app.security_events nothing '
                           + 'does: neither table carries a foreign key — 140_audit.sql gives §11.4\'s '
                           + 'required order as the reason, because step 7 purges tenant content and step '
                           + '8 RETAINS audit, so an audit row must outlive the rows it names — and '
                           + 'neither carries a policy for a forged column to be refused by. So §4 '
                           + 'invariant 10 is NOT enforced for these two tables, the producer owes it '
                           + '(CTR-TEN-001\'s trust boundary is "Server-resolved only after membership '
                           + 'and Workspace→Business→Page relation validation"), and batch 141 is where '
                           + 'a producer able to violate it will exist. A case asserting a refusal this '
                           + 'schema does not perform would be the suite claiming a control nobody '
                           + 'built.\n\n'
                           + 'BATCH 110 ADDS NO FORGERY CASE AND CANNOT, FOR 060\'s REASON PLUS ONE OF ITS OWN. A forged '
                           + 'column rides in on a permitted write, and no client role holds one here. What is new is that '
                           + 'the CONSTRAINT a forgery would meet does exist and is unreachable: app.social_accounts and '
                           + 'private.meta_credential_references each reference their connection by the whole scope path, '
                           + 'so a mismatched (workspace, connection) pair fails at the database with 23503 — but the only '
                           + 'identity holding an INSERT grant is app_worker, and row level security refuses it at 42501 '
                           + 'before the constraint is consulted. A `rejected` case would demand an outcome a correct '
                           + 'database cannot produce, which 140 called the suite claiming a control nobody built. The '
                           + 'apply-time block asserts the constraint\'s column set instead.\n\n'
                           + 'BATCH 061 IS THE SAME FINDING IN A FINANCE FAMILY, AND ONE OF ITS THREE TABLES DIFFERS FROM THE OTHER TWO. app.usage_events carries NO FOREIGN KEY ON ANY COLUMN -- not to app.workspaces, not to app.business_profiles, not to app.jobs -- because §11.4 purges tenant content in step 7 and RETAINS finance records in step 8, and §10\'s FINANCE-HISTORY row says a ledger is \'not erased if legal basis requires\'. A ledger row that must outlive what it names cannot be constrained by it, so a forged Business on a usage event is refused by nothing in this schema and cannot be; §4 invariant 10 admits that outcome in its own words -- \'fail ที่ DB หรือ command boundary\' -- and CTR-TEN-001\'s trust boundary is the boundary that refuses it.\n\napp.quota_buckets AND app.usage_reservations DO CARRY §3.3\'s COMPOSITE FOREIGN KEY, because neither outlives the tenant: an aggregate is recomputable and a hold expires. AND NO CASE CAN EXERCISE IT, which is stated rather than left as an absence -- no role holds INSERT on either table through a policy, so there is no caller that could offer a Business of another Workspace and be refused by the constraint rather than by row level security, and a `rejected` case demanding 23503 would be a case a correct database cannot satisfy. Owed to the command surface, and it is one case each when that exists.\n\n'
                           + 'BATCH 051 ADDS NO CASE HERE EITHER, AND THE REASON IS A THIRD ONE. Its '
                           + 'three tables carry `workspace_id` with a foreign key to app.workspaces, so '
                           + 'a forged WORKSPACE id fails at the constraint — but that is 020\'s claim, '
                           + 'already asserted, and nothing new is learned by asserting it again on a '
                           + 'fourth family. The id this family could forge that no earlier one could is '
                           + '`user_id`, and NOTHING IN THIS SCHEMA REFUSES A FORGED ONE: it is not '
                           + 'FK-constrained, because §11.2 forbids cascade-deleting history when a '
                           + 'member is removed and requires the actor and contact fields be anonymized '
                           + 'in place — 010\'s own reason for app.user_profiles.user_id carrying no '
                           + 'foreign key to auth.users. What DOES refuse a forged recipient is the '
                           + 'policy rather than a constraint, and that is asserted as §8.6/2 and §12.6/5 '
                           + 'rather than here: a notification addressed to somebody else is invisible, '
                           + 'and no client role holds an INSERT to forge one with.\n\n'
                           + 'built.\n\n'
                           + 'BATCH 131 BUILDS THE CHECK 140 COULD NOT AND STILL ADDS NO CASE, which is a '
                           + 'different disposition from 140\'s and is worth the distinction. Its two '
                           + 'child tables DO carry composite foreign keys over the scope path — an '
                           + 'invoice must agree with its subscription about the workspace, and a payment '
                           + 'with its invoice about the workspace AND about `livemode` — so §4 invariant '
                           + '10 IS enforced here, and §5.2\'s "ห้าม map ข้าม mode" with it, which turns '
                           + '§13.1\'s LIVEMODE_MISMATCH from a reconciliation finding into a refusal. '
                           + 'What is missing is a CALLER: a `rejected` case needs an identity holding '
                           + 'INSERT so the constraint is what stops the row, and no role but app_worker '
                           + 'holds INSERT while row level security refuses app_worker first. So the pair '
                           + 'is asserted from the CATALOG at apply time — as column SETS, so a '
                           + 'reordering does not fail and a dropped column does — and not as a case. The '
                           + 'day an allowlist entry or a command surface gives some identity the verb, '
                           + 'the case becomes writable and is owed to that batch.\n\n'
                           + 'BATCH 070 ASSERTS THE FORGED-ACTOR HALF ON AN UPDATE, WHICH IS WHERE THIS '
                           + 'FAMILY CAN CARRY IT AT ALL. §8.2 marks "Research run/source/evidence INSERT" '
                           + '`N` for every client role, so there is no client INSERT to forge a scope '
                           + 'column on — a forged workspace or Business id is refused by an absent GRANT '
                           + 'here, which is a weaker statement than a policy refusal and is labelled as '
                           + 'one. What IS asserted is the other half of §8.5\'s user-action rule: '
                           + '`owner-a-cannot-forge-the-actor-on-a-research-run-cancel` and '
                           + '`owner-a-cannot-forge-the-actor-on-a-research-suggestion-save` set updated_by '
                           + 'to another member of the SAME workspace, so the USING half admits the row and '
                           + 'the WITH CHECK half is what refuses it.'
           + '\n\n'
           + 'BATCH 080 CARRIES THE FORGERY AT INSERT TIME AS WELL AS AT UPDATE TIME, which no batch '
           + 'since 030 has been able to do: §8.2 row 2 gives content a client INSERT, so '
           + '`owner-a-cannot-forge-the-actor-on-a-content-item` is the passing create above with '
           + '`created_by` changed to another member of the same workspace — one argument, one '
           + 'refusal, attributable to `created_by = (select auth.uid())`.'
           + '\n\n'
           + 'BATCH 090 CARRIES IT ON BOTH OF ITS CLIENT-WRITABLE TABLES, and on one of them the '
           + 'forged column is the answer to a question an auditor asks. '
           + '`owner-a-cannot-forge-the-actor-on-an-approval-policy` is the passing create with '
           + '`created_by` changed to another member of the SAME workspace: a forged author on an '
           + 'approval POLICY is the record of who decided the gate should be this shape. '
           + '`owner-a-cannot-forge-the-actor-on-an-approval-request` is its twin, and the builder '
           + 'sets `requested_by` from the same argument, so it forges the column §4.7 names by '
           + 'that word as well as the one §8.5 does.\n\n'
           + 'THE DECISION HALF IS HELD BY A DIFFERENT MECHANISM AND IT IS WORTH NAMING: '
           + '`decided_by` is held equal to auth.uid() by the decide policy\'s WITH CHECK half, '
           + 'and approval_requests_decision_has_a_decider makes the column mandatory on exactly '
           + 'the two status values that §8.3 row produces — so a decision cannot be recorded '
           + 'without naming a decider and cannot name one who is not the caller.' },
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
                           + 'rests on.\n\n'
                           + 'BATCH 060 EXTENDS THE NEGATIVE HALF IN TWO WAYS NO EARLIER BATCH COULD, and '
                           + 'moves nothing. FIRST, `service-cannot-set-an-ai-model-policy` is the only '
                           + 'case in the whole suite where the service is refused BY A POLICY rather '
                           + 'than by a grant: app_worker holds the INSERT and FORCE ROW LEVEL SECURITY '
                           + 'with an empty policy set is what stops the row, which is the shape every '
                           + 'other batch\'s service grant was written to make possible and none of them '
                           + 'had an INSERT grant to demonstrate it with — and it is the one `denied` '
                           + 'case in the suite that disabling row level security actually breaks. '
                           + 'SECOND, '
                           + 'private.ai_credential_references is the FIRST TABLE IN THIS SCHEMA WHERE '
                           + 'THE SERVICE HOLDS NO GRANT AT ALL — a deliberate departure from 010\'s '
                           + 'shape, because RFC-2026-012\'s inventory says "no read by anyone, INCLUDING '
                           + 'SERVICE" and §8.3\'s service column is N. Four cases assert it at the '
                           + 'privilege layer on the SCHEMA. The cost is stated where it is paid: the CI '
                           + 'negative control can have no entry for that table, because disabling row '
                           + 'level security restores no grant, and identity-isolation.test.mjs asserts '
                           + 'that absence in both directions.\n\n'
                           + 'BATCH 130 IS WHERE THE NEGATIVE HALF IS THE WHOLE OF THE SERVICE STORY, and '
                           + 'the shape is new. On every earlier family the service held the verbs a client '
                           + 'held and was refused by row level security; here it holds SELECT and NOTHING '
                           + 'ELSE on all four tables, because the verbs this family\'s writer needs belong '
                           + 'to the webhook projection and the webhook projection is batch 131 — 010\'s '
                           + 'rule that a grant issued ahead of the thing that needs it is a grant nobody '
                           + 'reviews against a caller, applied to the service for the first time. So the '
                           + 'four `service-sees-zero-*` reads are RLS-decided and carry RFC-2026-017 §7, '
                           + 'while ALL SIX service write cases are refused at the GRANT layer and are '
                           + 'deliberately NOT labelled §7: that clause asks for a denial BY ROW LEVEL '
                           + 'SECURITY, which needs a grant for RLS to then refuse, and there is none. '
                           + '020 drew that distinction first on an immutable version table; here it '
                           + 'covers a service\'s whole write surface.\n\n'
                           + 'THE CONSEQUENCE IS WORTH SAYING PLAINLY BECAUSE IT IS THE BATCH\'s HEADLINE: '
                           + 'nothing in this repository can create, change or end a subscription. That is '
                           + 'CONTRIBUTING_AGENTS.md\'s "payment entitlement is derived only from a '
                           + 'verified Stripe webhook projection" holding as an absence of grants rather '
                           + 'than as a convention, and `service-cannot-create-a-billing-subscription` is '
                           + 'where it is asserted. The positive half is still not asserted, and here it is '
                           + 'owed to a NAMED batch rather than to an undefined permission: 131 grants the '
                           + 'verbs when it brings the projection that needs them.\n\n'
                           + 'BATCH 140 IS WHERE THE POSITIVE HALF STOPS BEING A MATTER OF TASTE AND '
                           + 'BECOMES A BLOCKED DEPENDENCY, and it is the most useful thing this batch '
                           + 'found. Every batch from 010 to 040 said the same sentence — the positive '
                           + 'half is unasserted because the matrix marks no operation `S` and asserting '
                           + 'a success would mean inventing the permission first. **§8.4 MARKS '
                           + '"Audit/security INSERT" `S`.** This note said it was "the first and only `S` '
                           + 'cell any migration in this repository has reached"; that was true of batch '
                           + '140\'s own branch and false of the tree it merged into, because 050 reached '
                           + '§8.4\'s job payload cell in parallel and 051 has since reached its '
                           + 'notification cell. The sentence is corrected in place with the reason '
                           + 'recorded rather than deleted, which is what the 2026-09-07 integration did '
                           + 'with the other four sites of the same claim. Batch 010\'s own header named 140 '
                           + 'as one of the batches that would inherit RFC-2026-016 §2\'s service-policy '
                           + 'shape, and the policy is STILL not written — because §2 conditions it on "a '
                           + 'server-set workspace GUC derived from CTR-TEN-001" that has no name, no '
                           + 'setter and no contract, with DATA-DEC-03 open until G1.\n\n'
                           + 'So the row stays `negative-half` and what it is waiting for has changed '
                           + 'from a decision nobody has taken to a decision somebody has taken and '
                           + 'nobody has implemented. `service-cannot-write-an-audit-log` and '
                           + '`service-cannot-write-a-security-event` are the two cases that will have to '
                           + 'flip when it is, and they are POLICY-layer denials rather than grant-layer '
                           + 'ones precisely so that they flip rather than staying green: app_worker '
                           + 'holds the INSERT grant already. THE FINDING GENERALISES — until that GUC '
                           + 'exists no `S` cell anywhere in §8.2 to §8.4 can be implemented by any '
                           + 'batch, which reaches 050, 061, 070 and 120 as well as this one.\n\n'
                           + 'BATCH 110 REACHES THE SAME CELL FROM THE OTHER SIDE AND THE ANSWER IS DIFFERENT IN KIND. '
                           + '§8.3\'s "Raw token/webhook SELECT" is `S`, and RFC-2026-022 (approved 2026-09-08) classifies '
                           + 'that statement DISCOVERED — "an inbox row arrives from the provider; the workspace is what '
                           + 'reading it resolves" — where 140\'s audit INSERT is CARRIED. §5/5 gives a DISCOVERED cell NO '
                           + 'POLICY, PERMANENTLY, performed through a broker owned by a role that does not exist. So '
                           + '`service-cannot-read-a-meta-webhook-delivery` and `service-cannot-process-a-meta-webhook-'
                           + 'delivery` DO NOT FLIP: they are not waiting for the GUC, and a reader who takes them for '
                           + 'pending will "fix" them by writing the unscoped policy that RFC refuses. The classification '
                           + 'is recorded as data in db/foundation/lint/service-policy-map.json rather than argued here, '
                           + 'and 131 owns the same cell for the payment inbox. The negative half this row is about gains '
                           + 'four cases on the two `app` tables — two filtered reads and two POLICY-layer refused writes — '
                           + 'and gains nothing on the two `private` ones, where app_worker holds no grant at all and the '
                           + 'refusal is the privilege system for every identity alike.\n\n'
                           + 'BATCH 061 IS ONE OF THE BATCHES THAT SENTENCE NAMES, AND IT ARRIVES WITH THE DECISION MADE AND STILL NOT IN EFFECT. RFC-2026-022 (approved 2026-09-08) splits the nine §8 `S` cells by whether the statement CARRIES its workspace or DISCOVERS it, classes §8.4\'s \'Usage ledger INSERT\' CARRIED, names the setting and pins its one legal spelling -- and declares itself NOT IN EFFECT, because the only member of app_worker is `postgres`, which bypasses row level security. So this row is still `negative-half`, and the negative half is now larger and better labelled: batch 061 records the classification as DATA in db/foundation/lint/service-policy-map.json, writes NO service policy, and asserts the present refusal in `service-cannot-write-a-usage-event` at the POLICY layer.\n\nTWO THINGS A LATER READER MUST NOT DO WITH THESE CASES. The first is to read `service-sees-zero-usage-events` or `service-sees-zero-usage-reservations` as pending. RFC-2026-022 §8 records that batch 050\'s equivalents are PERMANENT, and a service SELECT on a metering table is no more an `S` cell than a service SELECT on a job is: §8.4 puts the `S` on the ledger\'s INSERT alone. The second is to cite the confinement term as tenant isolation. RFC-2026-022 §5/4 measured that app_worker can set the setting the policy would read; the term confines ONE TRANSACTION to one tenant, which catches a worker computing the wrong workspace for a row, and it is not a boundary against the service role. No case in this suite is named or worded as though it were.\n\nTHE POSITIVE HALF IS STILL UNPAYABLE, for the reason it has been since batch 010 and for a narrower one now: it needs an identity that can BE app_worker, which RFC-2026-019 §4/3 leaves open and RFC-2026-022 §5/8 gives to the RFC that creates the worker (DATA-DEC-03, due before G1).\n\n'
                           + 'BATCH 051 IS WHERE THAT GENERALISED FINDING WAS ANSWERED, AND THE ROW STILL '
                           + 'DOES NOT MOVE — for a reason that has changed shape a second time and is '
                           + 'now the narrowest it has been. RFC-2026-022 (approved 2026-09-08) took the '
                           + 'question 050 and 140 both dispatched and split the nine `S` cells by '
                           + 'whether the statement CARRIES its workspace or DISCOVERS it: a carried cell '
                           + 'gets a policy `TO <service role>` whose predicate is the cell\'s own AND a '
                           + 'pinned confinement term, and a discovered cell gets no policy, permanently, '
                           + 'performed through a broker. §8.4\'s "Notification insert/delivery state" is '
                           + 'CARRIED — the recipient and the workspace are inputs, because §8.4\'s other '
                           + 'notification row is `O` and an inbox row cannot be addressed without '
                           + 'knowing whose it is — and batch 051 records that classification, for BOTH '
                           + 'statements the cell names, in db/foundation/lint/service-policy-map.json.\n\n'
                           + 'SO THE BLOCKER IS NO LONGER "NO DOCUMENT NAMES THE GUC". It is that '
                           + 'RFC-2026-022 IS APPROVED AND NOT IN EFFECT: measured 2026-09-08, the only '
                           + 'member of app_worker is `postgres`, which BYPASSES row level security, so a '
                           + 'policy naming that role would be a control with no observable behaviour at '
                           + 'all — neither a denial nor a grant. The RFC\'s own §7 lists what must be '
                           + 'true first, and none of it is this batch\'s to build. '
                           + '`service-cannot-write-a-notification-row` is the POLICY-layer denial that '
                           + 'will have to flip when it is, exactly as 140\'s two will.\n\n'
                           + 'AND ONE SENTENCE THAT NO NOTE, COMMENT OR CASE IN BATCH 051 MAY CONTRADICT, '
                           + 'because RFC-2026-022 makes it a condition of the decision: the workspace '
                           + 'GUC is CONTAINMENT against defects in the service\'s own code and NEVER '
                           + 'tenant isolation of the service path. The RFC measured twice that the role '
                           + 'a service policy names can set the setting that policy reads. Nothing in '
                           + 'this suite cites it as the latter, and identity-isolation.test.mjs asserts '
                           + 'that absence rather than trusting it.\n\n'
                           + 'batch, which reaches 050, 061, 070 and 120 as well as this one.\n\n'
                           + 'BATCH 131 REACHES AN `S` CELL WITH RFC-2026-022 ALREADY APPROVED, AND THE '
                           + 'ANSWER IT GETS IS THAT ITS HALF OF THIS ROW WILL NEVER BE PAID. §8.3 marks '
                           + '"Raw token/webhook SELECT" `S` for the service, and '
                           + 'RFC-2026-022 §3 classifies that cell DISCOVERED — a provider event arrives '
                           + 'outside any session, §8.3 of the Stripe billing contract initialises '
                           + '`correlation_workspace_id` to null in its own field list, and adding the '
                           + 'confinement term to a claim excludes exactly the rows a processor exists to '
                           + 'resolve. §5/5 gives a discovered cell NO POLICY PERMANENTLY, so no policy '
                           + 'will ever admit app_worker to app.billing_webhook_receipts, and '
                           + '`service-sees-zero-billing-webhook-receipts` is a PERMANENT assertion. '
                           + 'RFC-2026-022 §8 says what flips instead: a NEW PAIR, in which a broker '
                           + 'claim succeeds while the direct statement still returns zero — and it warns '
                           + 'that a reader who takes the present case as pending will "fix" it by '
                           + 'writing the unscoped service policy §4 option B rejects.\n\n'
                           + 'THE TWO OTHER 131 TABLES ARE STILL PENDING AND ARE PENDING ON A DIFFERENT '
                           + 'THING, which is why they are not folded in with the receipt. §8 has no row '
                           + 'for an invoice or a payment in any of its four matrices, so what would move '
                           + '`service-sees-zero-billing-invoices` or `service-sees-zero-billing-payments` '
                           + 'is an RFC-2026-021 allowlist entry or a command surface, not RFC-2026-022. '
                           + 'The row therefore stays `negative-half` and is now waiting on THREE '
                           + 'different things across the batches that own it: a GUC plus a worker for '
                           + 'the CARRIED cells (140, 051, 061, 070, 120), a broker plus a worker for the '
                           + 'DISCOVERED ones (050, 110, 131), and an RFC for the tables §8 never '
                           + 'mentions. RFC-2026-022 §5/8 is the blocking dependency for the first two: '
                           + 'measured 2026-09-08, the only member of app_worker is postgres, which '
                           + 'bypasses RLS.\n\n'
                           + 'A CORRECTION THIS BATCH REPORTS AND DOES NOT MAKE. The paragraph above '
                           + 'about batch 140 still calls its cell "the first and only `S` cell any '
                           + 'migration in this repository has reached". That was true of 140\'s branch '
                           + 'and is false of this tree: 050 owns §8.4\'s job payload cell, 131 owns '
                           + '§8.3\'s webhook cell, and RFC-2026-022 §1 counts NINE `S` cells across '
                           + '§8.2-§8.4. It is left in place rather than rewritten by a batch that does '
                           + 'not own it — an assertion in identity-isolation.test.mjs pins that sentence '
                           + 'and editing prose out from under another batch\'s test is how a merge loses '
                           + 'a control — and it is recorded in this package\'s open blockers for the '
                           + 'owner of 140\'s section to dispose of.\n\n'
                           + 'BATCH 132 LEAVES THIS ROW WHERE IT IS AND ADDS THE ONE ANSWER IT CAN. '
                           + 'The row waits on a positive that needs a service identity, and batch 132 '
                           + 'measured that the identity still does not exist: RFC-2026-022 §5/8 and '
                           + 'its M9 record that the only member of app_worker is postgres, which '
                           + 'bypasses row level security, and RFC-2026-019 §4/3 leaves the connection '
                           + 'method open to DATA-DEC-03. What batch 132 adds to the NEGATIVE half is '
                           + '`service-reads-no-effective-limit`: the one identity holding every grant '
                           + 'a three-table statement needs — SELECT on app.billing_subscriptions and '
                           + 'app.plan_entitlements from 130, a column-scoped SELECT on '
                           + 'app.quota_buckets from 061 — and a policy on none of them, so the empty '
                           + 'result is row level security across two families at once rather than one '
                           + 'table\'s refusal. It is deliberately NOT a case a service policy would '
                           + 'flip. RFC-2026-022 classifies §8 `S` cells; §8 has no row for a '
                           + 'plan-catalog read, so batch 132 classifies nothing in '
                           + 'db/foundation/lint/service-policy-map.json and declines the policy batch '
                           + '130\'s own case `service-sees-zero-plan-entitlements` says is owed to it.\n\n'
                           + 'BATCH 070 KEEPS THE ROW AT `negative-half` AND ADDS THE NEGATIVE ON FIVE MORE '
                           + 'TABLES, WITH THE POSITIVE\'S ABSENCE NOW NAMED PRECISELY FOR THIS FAMILY. '
                           + '§8.2\'s "Research run/source/evidence INSERT" is the `S` cell, and '
                           + 'RFC-2026-022 §3\'s own table does NOT classify it — the RFC names 050, 051, '
                           + '061, 110, 120, 131 and the asset purge — so batch 070 applied §3\'s '
                           + 'operational test to its own three statements and recorded the result as data '
                           + 'in db/foundation/lint/service-policy-map.json: all three CARRIED, because a '
                           + 'run\'s workspace is what the requester asked about and a source\'s and an '
                           + 'evidence row\'s are copied from a run the worker already holds and held to it '
                           + 'by a composite foreign key. NO SERVICE POLICY IS WRITTEN, because §5/8 puts '
                           + 'the decision NOT IN EFFECT: the only member of app_worker is postgres, which '
                           + 'bypasses row level security. So the positive half is still unassertable, and '
                           + 'what it is waiting for is a service identity rather than a shape. The four '
                           + '`service-cannot-*` INSERT cases are the policy-layer denials that flip when '
                           + 'it exists; the snapshot and the suggestion have NO cell in that map at all, '
                           + 'because §8 has no row for either and inventing one would be a claim about the '
                           + 'access matrix made in a lint file.'
           + '\n\n'
           + 'BATCH 080 MAKES A DIFFERENT AND STRONGER CLAIM HERE, AND IT IS NOT AN IMPROVEMENT — IT '
           + 'IS A DIFFERENT SHAPE. Every batch above grants app_worker something and lets row '
           + 'level security refuse it, which is what makes a `service-sees-zero-*` case evidence '
           + 'about a POLICY. Batch 080 grants app_worker nothing on any of its five tables: the '
           + 'writer content needs is a SECURITY DEFINER function owned by app_command '
           + '(RFC-2026-017 §3), and a worker with grants would be a second path to the same act. '
           + 'So every service case in this batch is a PRIVILEGE refusal, none of them carries '
           + 'RFC-2026-017 §7 — which asks for a refusal BY row level security — and none of them '
           + 'is part of the CI negative control\'s basis, because a grant-layer refusal passes '
           + 'unchanged with row level security off. The positive half stays unpayable for the '
           + 'reason it has been since batch 010, and one further: there is no identity that could '
           + 'be the service here even if one could BE app_worker.'
           + '\n\n'
           + 'BATCH 090 MAKES BATCH 080\'S CLAIM AND HAS A SECOND REASON FOR IT. app_worker is '
           + 'granted nothing on any of the three tables, so every service case here is a PRIVILEGE '
           + 'refusal, none carries RFC-2026-017 §7, and none is in the CI negative control\'s '
           + 'basis. 080 argued that from the command boundary alone; this batch has that argument '
           + 'AND a matrix one: §8.3 marks the Service column `P` on three rows and `N` on the '
           + 'fourth, so there is no `S` cell anywhere in this family for a worker grant to '
           + 'anticipate, and db/foundation/lint/service-policy-map.json gets no entry from it.\n\n'
           + 'AND ONE SERVICE REFUSAL HERE IS A COST RATHER THAN A CONTROL. '
           + '`service-cannot-write-an-approval-event` refuses the natural producer of an approval '
           + 'event — a timed auto-approval, a policy evaluation — so nothing in this repository '
           + 'records a decision at all. §8.3 row 4 is `N` for the service too, so THAT half is the '
           + 'matrix being implemented rather than a gap; the gap is that the writer it points to '
           + 'does not exist, and it is in the open blockers.' },
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
//
// BATCH 140 IS THE THIRD SHAPE, and it is the one §8.6 fits worst. Its two tables ARE tenant tables
// — both carry workspace_id — and no request-path identity holds a privilege on either, so:
//
//   * CASE 1 HAS NO INSTANCE AT ALL. "Same Workspace + allowed role/scope → pass" needs a role the
//     matrix allows something, and §8.4 gives every client cell to an object this batch may not
//     create (RFC-2026-012's view, on RFC-2026-021's empty allowlist) or to a capability no
//     document defines. There is no passing client case on app.audit_logs or app.security_events,
//     and the disposition says so rather than counting a service grant as one.
//   * CASES 3 AND 4 have nothing to be about: member scope's three types are all_businesses,
//     business and page, and an audit record is addressed by its Workspace.
//   * CASE 8 has nothing to forge against: neither table carries a foreign key or a policy, for
//     §11.4's reason, so a forged scope column is refused by nothing here and is owed to the
//     producer and to CTR-TEN-001's trust boundary.
//   * CASE 9 IS THE ONE THIS FAMILY CARRIES BEST, and it is carried further than any earlier batch
//     could carry it: not only by absent grants and absent policies but by a TRIGGER, proven at
//     apply time against the table OWNER — the role every earlier immutable table is defenceless
//     against.
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
   + 'predicate negative beside them differs from a passing case in exactly one argument.\n\n'
   + 'page-level (040). BATCH 060 CARRIES NO CASE FOR IT, AND THAT IS THE FIRST TIME A BATCH HAS '
   + 'HAD TO SAY SO ABOUT CASE 1. Its three tables grant no client role any verb, because §8 has no '
   + 'row for a model registry or a model policy and RFC-2026-012 classifies the family "view only" '
   + 'behind an allowlist RFC-2026-021 keeps empty — so there is no "allowed role/scope" for a '
   + 'positive to be about. A case asserting a pass would have to invent the grant first, which is '
   + 'the move every refused `P` cell in this suite exists to refuse.\n\n'
   + 'page-level (040). ON BATCH 130 THE ONLY PASS IS A READ, and that is the family rather than a '
   + 'thin suite: §8.3 gives a client exactly one operation on billing — "Billing/subscription '
   + 'SELECT", `Y` for the owner — and every write on all four tables is refused to every role, '
   + 'including the service. The owner of each tenant reads its own subscription, and the two '
   + 'positives name the same global plan revision.\n\n'
   + 'page-level (040).\n\n'
   + 'BATCH 140 HAS NO CASE FOR THIS AT ALL AND THE ABSENCE IS THE DISPOSITION. §8.4 gives the '
   + 'client roles Y, P, O, "approval trail", N and P across two rows, and batch 140 implements '
   + 'none of them: the object that carries a client read of an audit trail is a named '
   + 'security_invoker view on RFC-2026-021\'s allowlist, the allowlist is empty, and C1 of that '
   + 'RFC — a named CLIENT caller exists — fails here as it failed for the industry catalog. So '
   + 'there is no "allowed role" on either table to pass, and the two identities that hold a grant '
   + 'or a privilege at all — app_worker, and the migration role — are asserted in cases 9 and 10 '
   + 'instead. Counting a service grant here would be reporting the absence of a client surface as '
   + 'coverage of one.\n\n'
   + 'BATCH 110 HAS NO INSTANCE OF THIS CASE EITHER, AND THE TWO CELLS THAT WOULD CARRY IT ARE '
   + 'NAMED. §8.3 marks "Meta connection health SELECT" `Y` for the owner and the admin and '
   + '"Connect/disconnect/re-auth Meta" `Y` for the owner — two granted cells, neither implemented. '
   + 'The first grants a PROJECTION whose object is a security_invoker view on an empty allowlist; '
   + 'the second is a COMMAND whose essential half is an OAuth exchange §3.4 forbids inside a '
   + 'transaction and a vault write no role can perform. There is no passing client case on any of '
   + 'this batch\'s four tables, and counting the app_worker grant would report the absence of a '
   + 'client surface as coverage of one.\n\n'
   + 'BATCH 061 HAS A PASSING CLIENT CASE AGAIN, ON ONE OF ITS THREE TABLES. §8.4 marks \'Usage/quota summary SELECT\' `Y` for the owner and `Y` for the admin, and the aggregate IS the summary, so app.quota_buckets carries four positives: the owner reads the workspace-level bucket, the ADMIN reads it, the admin reads the bucket inside their member scope, and the unscoped owner reads the one outside it. The admin cases exist because §12.6\'s identity list names no admin and half of the policy\'s role test would otherwise have gone unexercised. app.usage_events and app.usage_reservations have NO INSTANCE of this case at all, exactly as batch 140\'s two tables do not, and the disposition says so rather than counting a service grant as a pass.\n\n'
   + 'BATCH 051 CARRIES FOUR PASSING CASES, AND THE FOURTH IS A WRITE. §8.4\'s "Own notification '
   + 'SELECT/mark read" is `O` for owner, admin, editor, approver and viewer alike, with no `P` to '
   + 'resolve and no projection language attached — THE SAME SHAPE §8.1 GIVES "Own user profile '
   + 'SELECT/UPDATE", which batch 010 implemented as a column-scoped grant plus an own-row policy '
   + 'and which is therefore the precedent this batch follows. The difference is that a user profile '
   + 'is NOT a tenant row (010\'s header says so in terms) and a notification is, so the predicate '
   + 'here carries a membership term the profile\'s does not. So '
   + '`owner-a-sees-their-own-notification`, `owner-b-sees-their-own-notification` and '
   + '`editor-a-sees-their-own-notification` are the read half and '
   + '`owner-a-can-mark-their-own-notification-read` is the write half. THE EDITOR\'S READ IS NOT '
   + 'PADDING: without an identity that is not an owner passing, a policy that compared the reader\'s '
   + 'ROLE instead of their identity would satisfy the other two and the refusals beside them.\n\n'
   + 'coverage of one.\n\n'
   + 'BATCH 131 HAS NO CASE FOR IT EITHER, AND ITS ABSENCE IS THE ONE A DOCUMENT ARGUES AGAINST. On '
   + 'the receipt table §8.3 is `N` in all five client columns, so there is nothing to pass. On the '
   + 'invoice there IS a document saying the owner should: §6 of the Stripe billing contract gives '
   + 'the Workspace Owner "ขอใบเสร็จ/ข้อมูล billing" with a ✓ and §11.1 puts the invoice read model '
   + 'in the PDPA export minimum. It is still refused, because §9.1 makes the FIN-3 client '
   + 'projection an "owner/admin SUMMARY", a summary is a security_invoker view, RFC-2026-021 keeps '
   + 'that allowlist empty, and its C1 — a named CLIENT caller exists — fails while there is no '
   + '`src/`. RFC-2026-021 §8.5 adds a second, independent reason: the list of inherited '
   + 'base-table grants must be CLOSED, and a SELECT here would be another entry on it. '
   + '`owner-a-cannot-read-a-billing-invoice` is the case that will have to flip when the RFC opens '
   + 'it, and the column list such an entry would need is enumerated in 131_billing_projection.sql '
   + 'so that RFC starts from a reading rather than from a blank page.\n\n'
   + 'BATCH 132 PAYS CASE 1 IN THE ONLY FORM ITS SUBJECT ADMITS, AND THE FORM IS WORTH NAMING. '
   + '`owner-a-reads-a-consumed-total-beside-its-subscription` is "same Workspace + allowed role → '
   + 'pass" for a statement rather than for a table: §8.3 marks "Billing/subscription SELECT" `Y` for '
   + 'the owner and §8.4 marks "Usage/quota summary SELECT" `Y` for the owner, so one identity holds '
   + 'both cells and the two families join on the tenant scope both carry. It is the positive the '
   + 'three refusals beside it rest on — without it, a database where the owner could read neither '
   + 'table would satisfy every one of them — and it is the whole of what a client can assemble '
   + 'toward an effective limit, because the third join reaches app.plan_entitlements and is refused '
   + 'at the privilege layer.\n\n'
   + 'BATCH 070 CARRIES IT ON FOUR TABLES WITH READS AND ON TWO WITH WRITES, and the writes are the '
   + 'part worth naming: `editor-a-can-cancel-the-research-run-of-a1` and '
   + '`editor-a-can-save-the-research-suggestion-of-a1` are the two halves of §8.2 this schema can '
   + 'reach — "Start/CANCEL Research" and "Suggestion SAVE/dismiss/use" — performed by a SCOPED '
   + 'editor inside their own Business, which is what makes every refusal beside them a statement '
   + 'about the caller rather than about the table. The fifth table has no passing case of any kind, '
   + 'and that is §9.1 rather than a gap: app.research_snapshots is COPYRIGHT-3 and no client role '
   + 'is granted anything on it.'
   + '\n\n'
   + 'BATCH 080 ADDS FOUR PASSING CLIENT CASES ACROSS TWO OF ITS FIVE TABLES, AND THE THREE '
   + 'TABLES WITH NONE ARE THE POINT OF THE BATCH. The owner creates a content item and captures '
   + 'a content idea, the editor renames the item and re-topics the idea — §8.2 row 2\'s "Content '
   + 'create/edit/version" for three of its five `Y` roles. app.content_versions, '
   + 'app.content_variants and app.quality_reviews have NO passing case of any kind, and that is '
   + '§8.2 row 3 rather than a gap: the row is `N` for every role including the service, so there '
   + 'is no allowed caller for a positive to be about. The owner\'s SOFT DELETE is counted here '
   + 'too, because §8.5 names it as the verb a client holds where a delete is wanted at all — and '
   + 'it is what makes the DELETE refusal beside it a statement about the verb rather than about '
   + 'the caller.',
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
   + 'the row. BATCH 060 IS THE DEGENERATE CASE OF THIS ROW AND IS RECORDED AS ONE: on its three '
   + 'tables EVERY role is the wrong role, so `owner-a-...` and `approver-a-...` are refused '
   + 'identically and the pair proves the table has no cell rather than proving a role boundary. '
   + 'The approver case is there so that a later batch implementing a §8 row for one role has to '
   + 'come past an assertion written about another.\n\n'
   + 'the row. BATCH 130 IS THE FIRST FAMILY WHERE THE WRONG ROLE FAILS A READ RATHER THAN A '
   + 'WRITE. §8.3 marks "Billing/subscription SELECT" `Y` for the owner and `N` for editor, '
   + 'approver and viewer, where every SELECT row in §8.1 and §8.2 is `Y` for all five built-in '
   + 'roles — so the three cases assert zero rows for three ACTIVE members of the workspace, each '
   + 'paired with the owner\'s positive on the same row. Their member scopes are irrelevant and '
   + 'that is asserted rather than assumed: a subscription is a workspace row, and 021\'s reading '
   + 'of §7 puts no workspace row inside any scope type.\n\n'
   + 'the row.\n\n'
   + 'BATCH 140 CARRIES IT AS THE ONLY §8.6 CASE ITS CLIENT ROLES CAN CARRY, five times over on the '
   + 'audit log: the owner (`Y`), the editor (`O` — own rows, and the fixture makes that identity '
   + 'the ACTOR of the row), the approver ("approval trail"), the viewer (`N`) and the far tenant\'s '
   + 'owner are each refused separately, so the five cells of §8.4\'s read row are five cases rather '
   + 'than one refusal standing for all of them. Only the viewer\'s is a wrong-role refusal in the '
   + 'ordinary sense; the other four are refusals of cells the matrix GRANTS, which is why each names '
   + 'its own reason in `why` and why the day an allowlist entry opens one of them exactly one line '
   + 'changes here.\n\n'
   + 'BATCH 110 ADDS ONE, AND IT IS A REFUSAL OF A CELL THE MATRIX GRANTS RATHER THAN A '
   + 'WRONG-ROLE REFUSAL. `editor-a-cannot-read-the-meta-connection-of-tenant-a` is §8.3\'s `P` for '
   + 'the editor, and `P` is "ผ่านตาม policy/explicit capability" over a capability set no document '
   + 'defines (RFC-2026-020 §8) — the refusal 020 made about a Business and 030 about an industry '
   + 'assignment. It is asserted at the GRANT layer beside the owner refused identically, so it '
   + 'stays true on the day a later batch implements the owner\'s `Y` and leaves the editor\'s `P` '
   + 'unimplemented, which is the state that batch should ship.\n\n'
   + 'BATCH 061 CARRIES THIS CASE THREE TIMES ON ONE TABLE AND EACH IS A DIFFERENT CELL OF ONE MATRIX ROW. §8.4\'s \'Usage/quota summary SELECT\' reads `Y Y P N N P`, so the editor is refused a cell the matrix marks `P` -- refused because RFC-2026-020 §8 decides that no document defines the capability set -- while the approver and the viewer are refused cells it marks `N`. Three cases rather than one, because a single case would make the other two look like consequences of it, and because the day a capability set is defined exactly one of the three changes.\n\n'
   + 'BATCH 051 PUTS A WRONG-IDENTITY REFUSAL HERE RATHER THAN A WRONG-ROLE ONE. §5 scopes '
   + 'notification.core "workspace/USER" and §8.4 marks the cell `O`, so what a member meets on this '
   + 'family is a refusal about WHOSE ROW IT IS: `owner-a-cannot-see-the-notification-of-editor-a` '
   + 'and its mirror `editor-a-cannot-see-the-notification-of-owner-a` are two ACTIVE MEMBERS OF ONE '
   + 'WORKSPACE, one of them its OWNER, refused each other\'s rows. THAT SEPARATION IS NOT NEW — '
   + '`viewer-a-cannot-see-another-members-row` does it on app.workspace_members and '
   + '`editor-a-cannot-see-another-members-member-scope` on app.workspace_member_scopes — and the '
   + 'batch 051 pair is not offered as though it were. What differs is the identity: §8.1 gives the '
   + 'member list to owner and admin, so an OWNER succeeds on those tables, and §8.4 gives the owner '
   + 'no more than the viewer here. §8.6 case 2 reads "same Workspace + wrong role/capability", and '
   + '"wrong recipient" is the nearest thing this family has to it; both '
   + 'directions are asserted, because a predicate that admitted a row whenever the reader outranked '
   + 'its recipient would pass one and fail the other. THREE FURTHER CASES BELONG HERE AND ARE ABOUT '
   + 'COLUMNS RATHER THAN ROWS: `owner-a-cannot-read-the-delivery-state-of-their-own-notification`, '
   + '`owner-a-cannot-read-the-dedupe-key-of-their-own-notification` and '
   + '`owner-a-cannot-relabel-their-own-notification` are each refused on a row THE POLICY ADMITS, by '
   + 'a column grant, which is §8.4\'s second row ("Notification insert/delivery state | N N N N N S") '
   + 'implemented as a column list rather than as a projection.\n\n'
   + 'BATCH 070 CARRIES THE APPROVER AND THE VIEWER ON TWO WRITE CELLS AND THE `P` REFUSAL ON ONE OF '
   + 'THEM BY NAME. §8.2 marks the approver and the viewer `N` on "Start/cancel Research" and marks '
   + 'the approver `P` and the viewer `N` on "Suggestion save/dismiss/use" — so '
   + '`approver-a-cannot-save-a-research-suggestion` is a refusal of a cell the matrix leaves OPEN '
   + 'rather than one it closes, which is the distinction RFC-2026-020 §8 makes an approved decision: '
   + 'no document defines the capability set, so `P` cannot be implemented and refusing is the only '
   + 'honest state. All four are `no-effect` with a witness, because a filtered UPDATE raises '
   + 'nothing. AND ON app.research_snapshots THE EDITOR IS REFUSED A READ THE OWNER IS ALSO REFUSED, '
   + 'so that case says nothing about role and is labelled §9.1 rather than counted here.'
   + '\n\n'
   + 'ON BATCH 080 IT IS THE VIEWER AND THE APPROVER, ON BOTH CLIENT-WRITABLE TABLES, AND THE '
   + 'APPROVER IS THE SHARPER OF THE TWO: §8.2 marks them `Y` on "Content SELECT" and `N` on '
   + '"Content create/edit/version", and user_approver_a holds a business scope that ADMITS every '
   + 'row they are refused. Four cases — rename and re-topic for each of the two roles — are '
   + '`no-effect` with a witness, because a filtered UPDATE raises nothing; the two INSERT '
   + 'refusals RAISE, because a WITH CHECK has no row to filter. The three immutable tables carry '
   + 'no case here at all: their writes are refused for the owner too, which says nothing about a '
   + 'role and is counted under key 9.',
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
   + 'the same reason the Business is. BATCH 060 CANNOT CARRY IT: §5 scopes ai.gateway '
   + '"global/workspace", so none of its tables has a Business column for case 3 to be about, and '
   + '§7\'s scope types all name a Business or a Page (021\'s header). Nothing stands in its place '
   + 'and nothing is counted in its place.\n\n'
   + 'the same reason the Business is. BATCH 130 CARRIES NO CASE FOR IT AND SAYS WHY: this case is '
   + '"same Workspace, allowed Business A but row Business B", and none of batch 130\'s four '
   + 'tables has a Business at all — a subscription is scoped to the Workspace and the plan '
   + 'catalog is scoped to nothing. There is no Business boundary here to be inside or outside '
   + 'of.\n\n'
   + 'BATCH 110 CARRIES NO CASE FOR IT AND THE ABSENCE HAS AN OWNER. §5 scopes connector.meta '
   + '"workspace/business/page", so unlike 130 this family is SUPPOSED to have a Business level — '
   + 'and the entity that would carry it, CHANNEL_BINDING, is the one §4\'s ERD hangs off '
   + 'BUSINESS_PROFILE and PAGE_CONTEXT_PROFILE. Batch 110 does not create it: §6\'s registry gives '
   + '110 "connection/account/webhook inbox" and gives the "business-channel/social FK" to 111, and '
   + 'migration invariant 6 puts a cross-module foreign key in an integration batch. So this case '
   + 'is owed to 111 together with the table, and the gap is a registry gap rather than a coverage '
   + 'one — §5 names "bindings" in two module rows while §6 names one owner for its foreign key.\n\n'
   + 'BATCH 061 IS A FAMILY THAT CAN CARRY THIS CASE AGAIN, AND IT CARRIES IT ON A CALLER THE MATRIX ALLOWS. §5 scopes metering.core `workspace/business`, so app.quota_buckets has a nullable business_profile_id tied to app.business_profiles by §3.3\'s composite foreign key, and `admin-a-cannot-read-the-quota-bucket-outside-their-narrowing` is refused by quota_buckets_scope_narrows_member -- AS RESTRICTIVE, because permissive policies OR together and cannot subtract -- AFTER the caller has already passed the role test. The positive beside it and the unscoped owner reading the same row are what make the refusal about scope rather than about role or about an empty table.\n\napp.usage_events IS THE OPPOSITE CASE ON THE SAME QUESTION and is worth naming: it too carries business_profile_id, and no policy reads it, because no client role holds a privilege on the ledger at all.\n\n'
   + 'BATCH 051 CARRIES NO CASE FOR IT EITHER, and the reason is §5 rather than §4: notification.core '
   + 'is scoped "workspace/user", so this family has no Business level for case 3 to be about. What '
   + 'it has instead is a level §7\'s scope types do not describe — the RECIPIENT — and the cases '
   + 'that level produces are counted under case 2, because a member reading another member\'s '
   + 'notification is a wrong-identity refusal rather than a wrong-Business one.\n\n'
   + 'BATCH 070 CARRIES IT AS A READ AND AS A WRITE ON THE SAME ROW PAIR. '
   + '`editor-a-cannot-see-the-research-run-outside-their-narrowing` and '
   + '`editor-a-cannot-cancel-the-research-run-outside-their-narrowing` are both about '
   + 'research_run_a2, which is under business_a2 — the Business user_editor_a\'s scope deliberately '
   + 'excludes — and both are refused AFTER the caller has passed the permissive policy, because a '
   + 'restrictive one is the only shape that can subtract. The positives beside them '
   + '(`editor-a-sees-the-research-run-inside-their-narrowing`, and user_owner_a reading BOTH runs '
   + 'while holding no scope row) are what stop the pair being satisfied by a narrowing that denied '
   + 'the editor everything.'
   + '\n\n'
   + 'BATCH 080 REPEATS THE PAIR ON app.content_items AND THEN ASKS IT ONE TABLE DOWN. '
   + '`editor-a-cannot-see-the-content-item-outside-their-narrowing` is the read half and '
   + '`editor-a-cannot-rename-the-content-item-outside-their-narrowing` the write half — the '
   + 'second is not implied by the first, because a caller refused a write it could still read '
   + 'would have been refused by the role predicate instead. '
   + '`editor-a-cannot-see-the-content-version-outside-their-narrowing` is the step further: a '
   + 'version carries no scope question of its own and resolves through its item, so that case '
   + 'fails if the resolution is replaced by a predicate over the version\'s own columns.',
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
   + 'argument and returns the row.\n\n'
   + 'BATCH 060 CANNOT CARRY IT EITHER, for case 3\'s reason one level down: a family scoped '
   + '"global/workspace" has no Page level at all.\n\n'
   + 'BATCH 130 CARRIES NO CASE FOR IT, for the reason it carries none for case 3 and one level '
   + 'further out: §4\'s ERD hangs SUBSCRIPTION off WORKSPACE and off nothing else, so this family '
   + 'has no Page level for case 4 to be about and no Business level either. What it records '
   + 'instead is the consequence at the level it DOES have — user_page_editor_a and user_editor_a '
   + 'are refused the subscription of their own workspace by ROLE, and their scopes neither help '
   + 'nor hinder.\n\n'
   + 'BATCH 110 CARRIES NO CASE FOR IT FOR THE SAME REASON, ONE LEVEL DOWN: a Page scope needs a '
   + 'row with a page_context_profile_id, and the binding is the only row in this family that would '
   + 'have one. 020\'s page scope and 021\'s `member_scope_covers_page` are named in 110\'s header '
   + 'as what a binding policy would be written against, and called by nothing — which is what a '
   + 'declared dependency looks like when the batch that declares it refuses the table.\n\n'
   + 'BATCH 061 HAS NO INSTANCE OF THIS CASE AND THE ABSENCE IS THE DISPOSITION. §5 scopes metering.core `workspace/business` and stops there: no table in this batch carries a page_context_profile_id, §4\'s ERD hangs USAGE_EVENT off WORKSPACE and names no Page relation for the family, and inventing a Page column so that case 4 could be carried would be adding a scope level two source documents decline to give it. The narrowing policy therefore calls app.member_scope_admits_business and never app.member_scope_admits_page, and user_page_editor_a -- the identity batch 021 added for this case -- is refused a quota bucket by ROLE, which is case 2.\n\n'
   + 'BATCH 051 CARRIES NO CASE FOR IT, for the reason it carries none for case 3. §4\'s ERD reads '
   + 'WORKSPACE ||--o{ NOTIFICATION : receives and hangs it off nothing else, so this family has no '
   + 'Page level and no Business level; §7\'s three member-scope types all name a Business or a Page, '
   + 'so a scoped member is neither helped nor hindered here, and no policy in batch 051 calls one of '
   + '021\'s helpers. That is also why the batch writes no RESTRICTIVE policy: there is no narrowing '
   + 'to express, and a restrictive policy ANDed with nothing can only refuse what is already '
   + 'refused.\n\n'
   + 'BATCH 070 CARRIES IT ON A PARENT AND ON A CHILD, AND THE CHILD IS THE ONE THAT SAYS SOMETHING '
   + 'NEW. On app.research_runs it is 040\'s shape: user_page_editor_a reads the run pinned to page_a1 '
   + 'and is refused the run pinned to page_a1_sibling, both under business_a1, both inside a '
   + 'Business the caller IS admitted to — which is what separates this case from case 3. On '
   + 'app.research_sources the same caller is refused a source whose own columns say nothing about a '
   + 'Page at all: a source carries no page_context_profile_id, because a nullable copy of its run\'s '
   + 'could not be held equal to it under MATCH SIMPLE, so its restrictive policy resolves through '
   + 'the run and this case is what proves the resolution rather than a copied predicate. '
   + '`pinned-editor-a-sees-the-research-source-of-the-unpinned-run` is its control.'
   + '\n\n'
   + 'BATCH 080 CARRIES THE CASE AT THREE DEPTHS, WHICH IS ONE MORE THAN ANY BATCH BEFORE IT. '
   + 'The item asks the Page question itself; the version resolves through the item; and the '
   + 'variant and the quality review resolve through the version and then through the item. '
   + '`pinned-editor-a-cannot-see-the-content-variant-of-a-sibling-target-item` and its '
   + 'quality-review twin are the cases that fail if the SECOND link is cut — a narrowing that '
   + 'resolved through the version and then asked the Business question about the version\'s own '
   + 'columns passes every other case in this family and leaks a page-restricted item\'s '
   + 'publishable text. The fixture loads a variant and a review under the sibling-page item for '
   + 'no other purpose.',
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
   + 'boundary asserted on a PATH to the table rather than on the table.\n\n'
   + 'business SAYS rather than what it is called. BATCH 060 RUNS THE CASE AND REFUSES TO COUNT '
   + 'WHAT IT PROVES. `owner-a-cannot-read-the-ai-model-policy-of-workspace-b` holds tenant B\'s '
   + 'exact id and is refused — at the privilege layer, exactly as the same identity is refused its '
   + 'OWN workspace\'s row. A refusal indistinguishable from the one every identity gets is not a '
   + 'tenant boundary, and this row says so rather than banking it.\n\n'
   + 'business SAYS rather than what it is called. BATCH 130 adds it on app.billing_subscriptions '
   + 'in both directions on the read path, and there is no write path on that table for anybody, '
   + 'so the cross-tenant WRITE case has no shape here: an attempted write against the other '
   + 'tenant is refused by the same absent grant as an attempted write against your own, and a '
   + 'case naming the boundary would be claiming a control that is not the one doing the work. '
   + 'Batch 130\'s three GLOBAL tables are excluded on purpose, for the reason 030 gave.\n\n'
   + 'business SAYS rather than what it is called.\n\n'
   + 'BATCH 140 CARRIES THE SUBSTITUTE RATHER THAN THE CASE, for the reason 030 gave about a global '
   + 'row and a different one: the rows ARE tenant-owned and no client identity can read its own, so '
   + '"A cannot reach B\'s" would be satisfied by a table nobody can read. What is asserted is that '
   + 'BOTH OWNERS ARE REFUSED IDENTICALLY on both tables while each holds the exact id of a row in '
   + 'their OWN workspace — `owner-a-cannot-read-the-audit-log-of-workspace-a` beside '
   + '`owner-b-cannot-read-the-audit-log-of-workspace-b`, and the same pair on the security event.\n\n'
   + 'BATCH 110 CARRIES THE CASE AND REFUSES TO COUNT IT AS A BOUNDARY, which is 060\'s disposition '
   + 'and 050\'s. `owner-a-cannot-read-the-meta-connection-of-tenant-b` and '
   + '`owner-a-cannot-read-the-social-account-of-tenant-b` run while holding tenant B\'s exact '
   + 'connection id and tenant B\'s exact external account hash — the fixture loads the SAME hash on '
   + 'both sides so the second case names a real row — and both are refused at the privilege layer, '
   + 'identically to each owner being refused their OWN row. What the pair proves is that the '
   + 'refusal is uniform, not that a boundary holds.\n\n'
   + 'BATCH 061 CARRIES CASE 5 IN BOTH FORMS AT ONCE, WHICH A BATCH WITH ONE SHAPE OF TABLE CANNOT. On app.quota_buckets it is the case as written -- A\'s owner holds B\'s exact bucket id and reads nothing, B\'s owner reads it, and A\'s owner is refused in the other direction too. On app.usage_events it is 030\'s substitute, because no client identity can read the ledger: both owners are refused identically while each holds the id of a row in their OWN workspace. Having the two side by side in one batch is what makes the substitute legible AS a substitute rather than as a weaker version of the same claim.\n\n'
   + 'BATCH 051 CARRIES IT PROPERLY ON app.notifications AND NOT AT ALL ON THE OTHER TWO, and the '
   + 'three dispositions are three different things. On the inbox the boundary is OBSERVABLE, because '
   + 'a §8 client cell is implemented: `owner-a-cannot-see-the-notification-of-owner-b` runs while '
   + 'holding B\'s exact id, `owner-b-sees-their-own-notification` is the far side, and '
   + '`owner-a-cannot-mark-the-notification-of-owner-b-read` is the write. THAT CASE IS ALSO THE '
   + 'WEAKEST OF THE THREE BOUNDARY CASES THIS BATCH HAS, which is worth saying: both terms of the '
   + 'predicate refuse it independently, so a database that had lost either conjunct would still pass '
   + 'it — the cases that isolate a single term are under §8.6/2 and §12.6/5. On '
   + 'app.notification_preferences no identity can read a row, so both owners are refused identically '
   + 'at the privilege layer (050\'s shape on a tenant table). On '
   + 'private.push_subscription_references every identity is refused on the SCHEMA, so the far-side '
   + 'case is not a boundary claim at all and is labelled as 060 labelled its own.\n\n'
   + 'BATCH 070 CARRIES IT AS A REAL BOUNDARY ON FOUR TABLES AND AS THE WEAKER SUBSTITUTE ON ONE, '
   + 'AND LABELS WHICH IS WHICH. On the run, the source, the evidence and the suggestion, tenant A\'s '
   + 'owner holds tenant B\'s EXACT id, reads nothing, and tenant B\'s owner reads the same row — a '
   + 'three-case shape against a client-visible boundary, plus a WRITE half on two of them '
   + '(`owner-a-cannot-cancel-the-research-run-of-tenant-b` and '
   + '`owner-a-cannot-save-the-research-suggestion-of-tenant-b`, each `no-effect` with the witness '
   + 'run as B\'s own owner, because no A-side identity can see the row it has to prove unchanged). '
   + 'On app.research_snapshots there is no boundary claim to make: both owners are refused '
   + 'identically at the privilege layer, and on a database whose policies had all been deleted those '
   + 'two cases would pass unchanged.'
   + '\n\n'
   + 'ON BATCH 080 IT IS FIVE TABLES WITH THREE CASES EACH, and the content behind this '
   + 'boundary is the product: §9.1 classes content CONTENT-2, and a cross-tenant read here is a '
   + 'competitor reading a campaign before it runs, the verdict a quality gate reached on it, or '
   + 'the exact text queued for a platform. The write half is asserted twice — a rename of tenant '
   + 'B\'s item and a re-topic of tenant B\'s idea, each with a witness that runs as B\'s owner '
   + 'because no A-side identity can see the row it has to prove unchanged.',
  6: 'covered — user_suspended_a, both halves, on all four batches\' tables. Batch 021 gives this '
   + 'identity a scope row ON PURPOSE so that `suspended-a-sees-zero-scope-rows` is about a policy '
   + 'rather than about a table with no row for them, and batch 030 re-asks it of the industry '
   + 'assignment, whose only membership predicate is the batch 011 helper. Batch 040 re-asks it of '
   + 'the knowledge item and of its version, which reaches the helper twice — once through its own '
   + 'permissive policy and once through the item its restrictive narrowing resolves. Batch 041 '
   + 're-asks it once more through app.knowledge_scope_applies, which is `security invoker` and '
   + 'reads no relation, so a suspended member gains nothing by going through the contract instead '
   + 'of writing the filter out.\n\n'
   + 'permissive policy and once through the item its restrictive narrowing resolves. BATCH 060 '
   + 'DOES NOT RE-ASK IT, and the reason is that the answer would be free: no client role holds a '
   + 'grant on any of its tables, so a suspended member sees zero rows exactly as the workspace '
   + 'owner does. A case true of every identity is not evidence about the suspended one.\n\n'
   + 'permissive policy and once through the item its restrictive narrowing resolves. Batch 130 '
   + 're-asks it of app.billing_subscriptions, whose only membership predicate is that helper at '
   + 'its narrowest — a role equality rather than a membership test.\n\n'
   + 'permissive policy and once through the item its restrictive narrowing resolves.\n\n'
   + 'Batch 140 re-asks it of both audit tables and gets an ERROR rather than an empty read, because '
   + 'the suspended member is refused by the privilege system exactly as an active owner is. The '
   + 'case declares the layer and the object so the difference is recorded rather than smoothed: on '
   + 'these two tables suspension is not what refuses anybody, and the active-owner case beside it '
   + 'is what says so.\n\n'
   + 'BATCH 110 REPEATS THE SHAPE ON TWO MORE TABLES AND KEEPS THE SAME QUALIFIER. The suspended '
   + 'member is refused app.meta_connections and app.social_accounts by the privilege system, '
   + 'exactly as an active owner is, and each case declares the layer and the object so the '
   + 'distinction from a policy-filtered empty read is recorded rather than smoothed.\n\n'
   + 'BATCH 061 CARRIES CASE 6 AS A REAL SUSPENSION CONTROL ON app.quota_buckets: the policy resolves app.workspace_member_role, which batch 011 defines to answer only for an ACTIVE membership, and an active owner and an active admin read the same row in the cases above it. On its other two tables it is in 140\'s position -- no client identity reads them at all -- and no case there is written as though suspension were doing the work.\n\n'
   + 'BATCH 051 IS WHERE IT STOPS BEING AN ANALOGUE. The fixture addresses a notification TO '
   + 'user_suspended_a, so the recipient term of the policy ADMITS them and only '
   + '`app.is_active_member(workspace_id)` refuses — with `editor-a-sees-their-own-notification` '
   + 'beside it, showing an active member in exactly the same relationship to their own row reading '
   + 'it. On 050, 060 and 140 the suspended cases had to be labelled analogues because a refusal that '
   + 'holds for every active member too is the privilege system rather than suspension; this one is '
   + 'suspension and nothing else. The MUTATION half is carried one step out — '
   + '`suspended-a-cannot-mark-a-notification-read` targets another member\'s row — because a '
   + '`no-effect` case needs a witness and no identity in this schema may read the suspended member\'s '
   + 'own notification. That is stated in the case rather than averaged away.\n\n'
   + 'BATCH 070 ADDS FIVE, AND FOUR OF THEM ARE THE STRONGER FORM. On app.research_runs, '
   + 'app.research_sources, app.research_evidence and app.research_suggestions the suspended member '
   + 'is FILTERED to zero rows by app.is_active_member while an ACTIVE viewer of the same workspace '
   + 'reads the same row — the pairing that makes a suspension case about suspension. On '
   + 'app.research_snapshots the refusal is at the grant layer and holds for the active owner too, so '
   + 'it is recorded as saying less.'
   + '\n\n'
   + 'BATCH 080 ADDS THE SAME HALVES ON ITS FIVE TABLES, AND ON THREE OF THEM THE PAIRING IS '
   + 'WITH AN ACTIVE OWNER RATHER THAN AN ACTIVE VIEWER, because the immutable tables offer no '
   + 'write for a viewer to be refused. `suspended-a-sees-zero-content-items`, '
   + '`-content-ideas`, `-content-versions` and `-quality-reviews` are filtered reads against '
   + 'rows an active member of the same workspace reads one case earlier.',
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
   + 'ACL instead.\n\n'
   + 'is what makes it checkable per table. BATCH 060 ASSERTS IT ON THREE MORE TABLES AND ON A '
   + 'SECOND SCHEMA. Two are refused on `app`, and the third — the credential reference — is the '
   + 'first anonymous case in the suite refused on `private`, which is what declaring the object '
   + 'rather than only the layer buys: the two refusals are different assertions and would fail for '
   + 'different reasons.\n\n'
   + 'is what makes it checkable per table. Batch 130 asserts it FOUR TIMES, on the subscription '
   + 'and on all three catalog tables, and one of those is the most ordinary anonymous surface a '
   + 'product has: a price list. RFC-2026-021 §7/4 makes the refusal an approved decision rather '
   + 'than a convention, and all four declare the SCHEMA, so opening it fails four tests at once '
   + 'instead of being noticed on one.\n\n'
   + 'is what makes it checkable per table.\n\n'
   + 'Batch 140 asserts it on the two families §9.1 restricts most — AUTH-3 "restricted and '
   + 'append-only where needed" and SECURITY-4 "security/admin safe view only" — on the SCHEMA, '
   + 'which is RFC-2026-021 §7/4 as a check rather than as a convention.\n\n'
   + 'BATCH 110 ASSERTS IT ON FOUR TABLES ACROSS TWO SCHEMAS, and the split is the interesting '
   + 'half: the two `app` tables refuse anonymous on schema `app`, and private.meta_credential_'
   + 'references and private.meta_webhook_inbox refuse it on schema `private`. Batch 060 introduced '
   + 'the second shape and called its case the only one of its kind; it is not, and the note on '
   + '§12.6/6 records why that sentence could not have been checked by the branch that wrote it. '
   + 'What matters is unchanged: anon holds nothing anywhere, so the schema that refuses it is '
   + 'whichever one the statement names, and declaring which is what makes a widening fail a case '
   + 'instead of passing more quietly.\n\n'
   + 'BATCH 061 ADDS THREE MORE ANONYMOUS REFUSALS, one per table, all declared on the SCHEMA for the same structural reason: the first anon grant is `grant usage on schema app` and it moves the denial layer of every object in `app` at once, so the three fail together or the decision has not changed.\n\n'
   + 'Batch 051 asserts it three times and one of the three names a DIFFERENT schema. The two reads '
   + 'against `app` are refused there; `anonymous-cannot-read-a-push-subscription-reference` is '
   + 'refused on `private`, which is the second table this suite has in that schema. §9.1 gives '
   + 'SECRET-4 a client projection of "never returned after write" and lists "push token" as one of '
   + 'its four examples, so this is the row an anonymous reader is furthest from — and the case '
   + 'declares the schema so the day somebody writes `grant usage on schema private` the refusal '
   + 'moves to the table and the case fails rather than passing more quietly.\n\n'
   + 'BATCH 070 ADDS FIVE, ONE PER TABLE, ALL DECLARING THE SCHEMA. One of them is against '
   + 'COPYRIGHT-3 material — the class §9.2 forbids leaving the system at all, in a list that names '
   + '`client`, `API`, `event`, `job`, `log` and `fixture` — so `anonymous-cannot-read-a-research-'
   + 'snapshot` is refused at name resolution rather than by a policy, which is the furthest layer '
   + 'out this schema has.'
   + '\n\n'
   + 'BATCH 080 ADDS FOUR ANONYMOUS CASES AND EVERY ONE IS REFUSED ON THE SCHEMA, which is the '
   + 'ordinary shape rather than 070\'s: there is no COPYRIGHT-3 table here whose refusal would '
   + 'have to be argued from §9.2. `anon` holds no USAGE on app, so name resolution stops before '
   + 'a content table is reached, and the cases declare the SCHEMA so they notice the day that '
   + 'changes.',
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
   + 'a client for whom forging a column on it is not a question.\n\n'
   + 'who would violate one is refused by a policy first. BATCH 060 HAS NO FORGERY CASE AND COULD '
   + 'NOT HAVE ONE: a forged column rides in on a write the caller is otherwise permitted, and no '
   + 'client role holds INSERT or UPDATE on any of its three tables. The assertion arrives with the '
   + 'command surface, which is also where §8.3\'s "BYOK credential manage" arrives.\n\n'
   + 'who would violate one is refused by a policy first. ON BATCH 130 THERE IS NO CASE AND THE '
   + 'ABSENCE IS THE FINDING: no role holds INSERT or UPDATE on any of its four tables, so a '
   + 'forged column has no write path to travel down and a forged workspace_id is refused '
   + 'identically to a well-formed one — at the privilege layer, by the same absent grant. '
   + 'app.billing_subscriptions carries no created_by to forge, for the reason 030 gave about a '
   + 'platform-curated row. The forgery this family is actually exposed to is a forged '
   + 'COMMITMENT, and `owner-a-cannot-create-a-billing-subscription` is the case.\n\n'
   + 'BATCH 140 CARRIES NO FORGERY CASE AND SAYS WHY, because the honest answer is that nothing in '
   + 'this schema would refuse one. app.audit_logs and app.security_events carry NO FOREIGN KEY and '
   + 'NO POLICY: §11.4 purges tenant content in step 7 and RETAINS audit in step 8, so an audit row '
   + 'must be able to outlive every row it names, and a foreign key would make that impossible in '
   + 'both directions at once. §4 invariant 10 is therefore NOT enforced for this family, which '
   + 'CTR-TEN-001\'s own trust boundary covers instead ("Server-resolved only after membership and '
   + 'Workspace→Business→Page relation validation; client-supplied context is untrusted input"), and '
   + 'batch 141 is where a producer able to violate it will exist. What IS asserted is the half a '
   + 'forged column is usually asserted through: no client role can insert at all, so the party a '
   + 'record is about cannot compose one — `owner-a-cannot-write-an-audit-log` and '
   + '`owner-a-cannot-write-a-security-event`, both at the grant layer.\n\n'
   + 'BATCH 110 HAS NOTHING TO FORGE AGAINST AND THE REASON IS NEW. Its child tables DO carry the '
   + 'composite foreign key §3.3 asks for — app.social_accounts and private.meta_credential_'
   + 'references each reference their connection by the whole scope path — so a forged (workspace, '
   + 'connection) pair fails at the database with 23503, which is §4 invariant 10 exactly. Nobody '
   + 'can reach it: no client role holds an INSERT at all, and the one role that does, app_worker, '
   + 'is refused by row level security at 42501 before the constraint is consulted. So the '
   + 'constraint is asserted by the migration\'s apply-time block as a COLUMN SET rather than by a '
   + '`rejected` case, because a case demanding 23503 here would demand an outcome a correct '
   + 'database cannot produce.\n\n'
   + 'BATCH 061 CARRIES NO FORGERY CASE EITHER, AND FOR TWO DIFFERENT REASONS THAT ARE BOTH WORTH STATING. There is no `created_by` on any of its three tables -- §3.2 asks for the actor columns on a row a USER mutates, §8.4 gives no client any write here, and CTR-USG-001\'s attribution names a job and a provider rather than a person -- so the columns would be nullable uuids nothing writes. And a forged SCOPE column is refused by nothing on app.usage_events, which carries no foreign key at all (§11.4 steps 7 and 8; see §12.6/7), while on app.quota_buckets and app.usage_reservations, which DO carry §3.3\'s composite key, no role holds INSERT through a policy -- so no caller exists to offer a mismatched triple and be refused by the constraint. What batch 061 carries instead is the UPDATE half of this case, twice: `service-cannot-retarget-a-quota-bucket` and `service-cannot-retarget-a-usage-reservation` are §8.5\'s \'ห้ามย้าย row ข้าม tenant ด้วย update\' refused BY A COLUMN LIST rather than by an absent verb, which is the distinction batch 060 had to be corrected on.\n\n'
   + 'BATCH 051 CARRIES NEITHER HALF AND THE REASON IS THE COLUMN THAT WOULD BE FORGED. All three of '
   + 'its tables carry `workspace_id` with a foreign key to app.workspaces, so a forged WORKSPACE id '
   + 'fails at the constraint — but that is 020\'s claim, already asserted through a composite foreign '
   + 'key, and nothing is learned by re-asserting it on a fourth family. The id THIS family could '
   + 'forge that no earlier one could is `user_id`, and NOTHING IN THIS SCHEMA REFUSES A FORGED ONE: '
   + 'it is not FK-constrained, because §11.2 forbids cascade-deleting history when a member is '
   + 'removed and requires the actor and contact fields be anonymized in place — 010\'s own reason for '
   + 'app.user_profiles.user_id carrying no foreign key to auth.users. What IS asserted is the half a '
   + 'forged column is usually asserted through: no client role holds an INSERT on any table in this '
   + 'batch, so nobody can compose a notification addressed to somebody else — '
   + '`owner-a-cannot-write-a-notification` at the grant layer, on a row that names the caller '
   + 'themselves so that no scope check refuses it and only the absent grant does.\n\n'
   + 'BATCH 070 CARRIES THE ACTOR HALF ON AN UPDATE, WHICH IS THE ONLY PLACE THIS FAMILY HAS FOR IT. '
   + '§8.2 marks "Research run/source/evidence INSERT" `N` for every client role and §8 has no cell '
   + 'at all for creating a snapshot or a suggestion, so there is no client INSERT anywhere in the '
   + 'family and the scope half of this case is refused by an absent GRANT — a weaker statement, '
   + 'labelled as one. The actor half is real: §8.5\'s "user action ตรวจ created_by = (select '
   + 'auth.uid())" is written into the two UPDATE policies as `updated_by`, and '
   + '`owner-a-cannot-forge-the-actor-on-a-research-run-cancel` and its suggestion twin set that '
   + 'column to ANOTHER MEMBER OF THE SAME WORKSPACE — so the USING half admits the row, the WITH '
   + 'CHECK half refuses it, and the refusal is attributable to the second clause rather than to the '
   + 'first.'
   + '\n\n'
   + 'BATCH 080 CARRIES THE CASE AT INSERT TIME, WHICH 070 COULD NOT. 070 had no client INSERT '
   + 'anywhere in its family and had to assert the forgery on an UPDATE; §8.2 row 2 gives content '
   + 'a client INSERT, so `owner-a-cannot-forge-the-actor-on-a-content-item` is the PASSING case '
   + 'above with one argument changed — `created_by` set to another member of the same workspace '
   + '— and the refusal is attributable to `created_by = (select auth.uid())` and to nothing '
   + 'else. The UPDATE half is asserted too, on the idea.',
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
   + "050's apply-time block walks every other column against six roles."
   + '\n\n'
   + 'BATCH 060 ADDS NO IMMUTABLE TABLE AND SAYS SO RATHER THAN STRETCHING THE ROW TO FIT. §5 calls '
   + 'ai.gateway "catalog + run history", not "published immutable" as it calls industry.core, and '
   + '§3.2 lists the immutable families by name — version, evidence, decision, usage, audit and '
   + 'publish history — none of which is a model, a model policy or a credential reference. What '
   + '060 DOES carry is the neighbouring claim, and it is a different one: '
   + '`owner-a-cannot-relabel-an-ai-model-registry-row` is refused because no client role holds the '
   + 'grant, NOT because the row may not change — an administrative seed corrects a curated label, '
   + 'and 060_ai_gateway.sql spells out why that is not the industry catalog\'s rule. Reading it as '
   + 'immutability would report the wrong control as green.'
   + '\n\n'
   + 'BATCH 060 ADDS NO IMMUTABLE TABLE AND SAYS SO RATHER THAN STRETCHING THE ROW TO FIT. §5 calls '
   + 'ai.gateway "catalog + run history", not "published immutable" as it calls industry.core, and '
   + '§3.2 lists the immutable families by name -- version, evidence, decision, usage, audit and '
   + 'publish history -- none of which is a model, a model policy or a credential reference. What '
   + '060 DOES carry is the neighbouring claim, and it is a different one: '
   + '`owner-a-cannot-relabel-an-ai-model-registry-row` is refused because no client role holds the '
   + 'grant, NOT because the row may not change -- an administrative seed corrects a curated label, '
   + 'and 060_ai_gateway.sql spells out why that is not the industry catalog\'s rule. Reading it as '
   + 'immutability would report the wrong control as green.\n\n'
   + 'BATCH 130 ADDS TWO MORE IMMUTABLE TABLES AND COMPLETES THE GRID ON BOTH, AND IT DOES NOT COUNT THEM. The branch wrote \'a fifth and a sixth\', which was true of the tree it was cut from and false of the one it merged into: 050 landed an append-only ledger and an immutable outbox envelope in parallel. An ordinal is a claim about the whole schema that a batch cannot check, and three branches made one this week. '
   + 'app.billing_plan_versions is immutable by §3.2, §4 invariant 8 and §5.1\'s "immutable '
   + 'mapping หลังมีลูกค้า; สร้าง revision ใหม่"; app.plan_entitlements by §5.1\'s "versioned '
   + 'contract" and §5.3\'s requirement that changing an entitlement carry a version, a migration '
   + 'impact and an approval. Eight cases, all four cells live on each: update and delete by the '
   + 'workspace OWNER and by the SERVICE identity, every one at the GRANT layer because no role '
   + 'holds either verb. 020 left one cell of its grid to an apply-time block and said so; this '
   + 'batch leaves none, and the reason is what these rows hold — a price is the one value in the '
   + 'schema whose rewriting changes what somebody was charged, and an entitlement is what a '
   + 'paying customer was promised. 130\'s own apply-time block walks six roles against both '
   + 'tables and raises if any cell holds either verb, which catches a grant made by a later '
   + 'batch.\n\n'
   + 'BATCH 140 ADDS TWO MORE IMMUTABLE TABLES AND CARRIES THIS CASE AGAINST THE TABLE OWNER, WHICH IS THE PART NO EARLIER BATCH DID. It does not count them: the branch wrote \'the fifth and sixth\', which was true of the tree it was cut from and false of the one it merged into -- 050 landed an append-only ledger and an immutable outbox envelope in parallel, and 130 two published-plan tables. An ordinal is a claim about the whole schema that no batch can check. What IS this batch\'s alone is the mechanism: immutability here is enforced by a TRIGGER '
   + 'AGAINST THE ONE ADVERSARY THE OTHER FOUR ARE DEFENCELESS AGAINST. app.audit_logs and '
   + 'app.security_events are append-only by §5, §3.2, §4 invariant 8 and §8.4\'s "Audit/security '
   + 'UPDATE/DELETE | N N N N N N", and all four cells are live on each: update and delete by a '
   + 'workspace OWNER and by the SERVICE identity, eight cases, every one declared at the GRANT '
   + 'layer because no role holds either verb.\n\n'
   + 'WHAT IS NEW IS THE THIRD MECHANISM. Batches 020, 030 and 040 expressed immutability as absent '
   + 'grants and absent policies, which reaches every role our migrations can name and reaches '
   + 'NOBODY ELSE: `postgres` owns every table in `app` and holds BYPASSRLS, so FORCE ROW LEVEL '
   + 'SECURITY does not constrain it and neither does an absent grant it can issue to itself. On an '
   + 'audit log that is the adversary that matters, because the record exists to be read against the '
   + 'people who can reach the database. So 140 also carries a TRIGGER — §8.5\'s own "command/'
   + 'trigger/privilege defense" for an immutable table, which no earlier batch used — refusing '
   + 'UPDATE, DELETE and TRUNCATE for every role including the owner, and 140_audit.sql PROVES it by '
   + 'execution at apply time: it writes a probe row as the migration role, attempts all three, '
   + 'requires all three to raise, and rolls the probe back. No isolation case can carry that, '
   + 'because no identity this harness can assume gets past the privilege system to reach the '
   + 'trigger.\n\n'
   + 'AND THE LIMIT IS RECORDED WITH THE CLAIM: the owner can disable the trigger in one statement. '
   + 'It is tamper RESISTANCE and not tamper evidence, and CTR-AUD-001\'s freeze boundary leaves '
   + '"the audit STORE, its append-only or immutability mechanism, and any tamper evidence" open '
   + 'precisely because no source specifies a hash chain. This batch does not invent one.\n\n'
   + 'BATCH 110 ADDS NO IMMUTABLE TABLE AND SAYS SO RATHER THAN STRETCHING THE ROW TO FIT. §5 calls '
   + 'the connection family "mutable + history" and the inbox "append/process/purge", and §3.2 '
   + 'lists the immutable families by name — version, evidence, decision, usage, audit and publish '
   + 'history — none of which is a connection, a discovered account, a credential reference or a '
   + 'raw delivery. The neighbouring claim IS carried and is a different one: no role holds DELETE '
   + 'on any of the four tables and the apply-time block walks six roles to say so, because §8.5 '
   + 'has no broad user delete and every purge in this family is a retention sweep. Reading that as '
   + 'immutability would report the wrong control as green — a raw webhook row is MEANT to be '
   + 'purged, and §10\'s WEBHOOK-SHORT says when.\n\n'
   + 'BATCH 061 CARRIES CASE 9 ON THE TABLE §8.6 NAMES IT FOR. The case is \'Immutable/LEDGER row -> update/delete fail\', app.usage_events is a ledger by §8.4\'s own row heading, and §3.2 and §4 invariant 8 both name USAGE history immutable beside audit history. Four cases: the owner and the service each refused UPDATE and DELETE, every one at the GRANT layer because no role holds either verb at all -- and 061_metering.sql re-asserts it against the live ACL AND against the live policy catalog, so a grant made by a LATER batch is caught by a file that could not have named it.\n\nTHE TRIGGER HALF OF §8.5\'s \'command/trigger/privilege defense ตามความเหมาะสม\' IS NOT TAKEN HERE, and that is a decision with a reason rather than a gap. Batch 140 took it and recorded what it cost: private.refuse_mutation() raises for EVERY role including the table owner, and 140\'s own blocker states the consequence -- \'THE RETENTION JOB CANNOT RUN, and batch 160 cannot fix it with a grant\'. §10 gives this family FINANCE-HISTORY, whose rule is \'anonymize nonrequired PII; retain ledger integrity\' over a seven-year window that ENDS in a purge, so the same trigger here would create the same contradiction a second time, knowingly, in a family whose retention class names the sweep it would block. The adversary it would stop is `postgres`, which owns the table and can also `alter table ... disable trigger all` -- which 140\'s blocker calls tamper RESISTANCE rather than tamper evidence. Reusing 140\'s function would also make a refusal on a usage ledger report SQLSTATE ZZ140, and writing a second function doing the same thing with a different code would be two functions for one rule with nothing keeping them equal. **Owed to A1 Security, who owns the immutability-mechanism question, and to batch 160, which owns the sweep. §8.5\'s \'ตามความเหมาะสม\' is a judgement, and this batch says which way it went rather than letting the absence read as an oversight.**\n\n'
   + 'BATCH 051 CARRIES NO IMMUTABLE OR LEDGER ROW AT ALL, and says so rather than counting its four '
   + 'DELETE refusals as this case. None of its three tables is append-only: a notification is marked '
   + 'read and has its delivery state recorded, a preference is switched, a push subscription '
   + 'reference is rotated and revoked. §3.2 lists what is immutable — "version/evidence/decision/'
   + 'usage/audit/publish history" — and none of these is one, which is why all three carry '
   + '`updated_at` and its trigger; omitting the column would have been declaring the row immutable, '
   + 'which is a different claim (021\'s and 060\'s sentence). What the four DELETE cases assert is '
   + '§8.5\'s "no broad user delete" plus §10\'s purge-by-retention-job — NOTIFICATION-INBOX and '
   + 'PUSH-SECRET, both batch 160\'s — which is a different claim and is counted as §8.5.\n\n'
   + 'A DEFECT IN THIS MAP, FOUND WHILE APPENDING TO IT AND FIXED RATHER THAN REPORTED. This object '
   + 'carried the key `10` TWICE. In a JavaScript object literal the later wins silently, so the '
   + 'first block was dead at runtime and present in the file — and its body was a byte-for-byte '
   + 'duplicate of this entry\'s tail from BEFORE the 2026-09-07 integration corrected it, still '
   + 'carrying the two ordinal claims that integration recorded as fixed: "BATCH 130 ADDS A FIFTH AND '
   + 'A SIXTH IMMUTABLE TABLE" and "BATCH 140 ADDS THE FIFTH AND SIXTH IMMUTABLE TABLES". Nothing was '
   + 'lost by deleting it, which was verified by diff rather than assumed: every line of the dead '
   + 'block except one truncated clause appears in this entry in its corrected form. It is the seam '
   + 'that PARSES which the integration\'s §4 warned the next four batches about, and the reason it '
   + 'survived is that no rule read these keys as a set. One does now — see '
   + 'identity-isolation.test.mjs.\n\n'
   + 'precisely because no source specifies a hash chain. This batch does not invent one.\n\n'
   + 'BATCH 131 ADDS app.billing_payments AND DELIBERATELY DOES NOT ADD A TRIGGER, which is the '
   + 'reverse of 140\'s choice and turns on the ADVERSARY rather than on the strength of the '
   + 'control. 140 needed one because an audit log\'s adversary can OWN the table: the operator '
   + 'being audited is the operator who runs the migration. A payment ledger\'s adversary is the '
   + 'person §12.1 names — Support editing the database "เพื่อแก้เร็ว" — who reaches it through a '
   + 'GRANTED role, and the control that refuses that person is the absence of the verb. It is '
   + 'asserted in both directions at apply time: no UPDATE or DELETE for any of the six roles, read '
   + 'from the live ACL with has_any_column_privilege so a column-scoped grant is caught as well as '
   + 'a table-wide one, AND no UPDATE or DELETE policy in pg_policy — because a policy with no grant '
   + 'is inert and a grant with no policy is refused by RLS, which is weaker than immutability asks '
   + 'for. Four cases carry it: the owner and the service are each refused an amend and a delete. '
   + 'A REFUND IS A ROW AND NOT AN EDIT, which is what makes the immutability affordable rather than '
   + 'merely strict — §12.1\'s workflow ends "อัปเดต ledger projection" and the ledger-correct form '
   + 'of that update is another entry — and the fixture loads a charge and its partial refund so the '
   + 'claim is visible as data rather than only as a comment.\n\n'
   + 'AND THE RECEIPT IS THE OTHER SHAPE THIS ROW HAS: app.billing_webhook_receipts is immutable in '
   + 'ONE HALF, which is 050\'s outbox rather than a version table. §5.1 calls a receipt "immutable '
   + 'receipt metadata" while §8.3 gives the same row a processing state machine, and the boundary '
   + 'is a column-scoped UPDATE grant naming seven columns with the other nine walked against six '
   + 'roles at apply time. No isolation case can carry that half: a filtered UPDATE by the one role '
   + 'holding the grant needs a witness read, and no identity in this schema can see the row.\n\n'
   + 'BATCH 070 CARRIES THIS CASE ON THE ONE OBJECT §5 NAMES, AND ON A SECOND IT ARGUES FOR ITSELF. '
   + '§5\'s mutability column for research.core reads "mixed; evidence immutable", which names one of '
   + 'five objects and leaves four decisions to the batch — the same sentence shape 131 met in '
   + '"versioned + ledger-like". app.research_evidence is the named one: four cases, the owner and '
   + 'the service each refused an amend and a delete, every one at the GRANT layer because no role '
   + 'holds either verb, and 070_research.sql re-asserts it against the live ACL AND the live policy '
   + 'catalog so a grant made by a later batch is caught by a file that could not have named it. '
   + 'app.research_sources is APPEND-ONLY on batch 070\'s own reading and the reading is stated so a '
   + 'reviewer can refuse it: §10 preserves "permitted hash/citation metadata" after the captured '
   + 'object is purged, so a citation editable once its snapshot is gone is a claim about a document '
   + 'nobody can check. Three cases carry it — the owner refused an update and a delete, the SERVICE '
   + 'refused an update — and no trigger is written, for 131\'s reason rather than 140\'s: this '
   + 'family\'s adversary reaches the row through a granted role, not by owning the table.\n\n'
   + 'AND THE THIRD SHAPE IS 050\'s OUTBOX, ON A TABLE NO ISOLATION CASE CAN CARRY THE WHOLE OF. '
   + 'app.research_snapshots is append-only in every column but two: §10\'s "purge object + locator; '
   + 'preserve permitted hash/citation metadata" requires the row to LOSE its locator and record that '
   + 'it did, so `object_ref` and `purged_at` move and everything that says what was captured does '
   + 'not. The half a case can carry is asserted — `service-cannot-rewrite-the-digest-of-a-research-'
   + 'snapshot` and `service-cannot-extend-the-retention-of-a-research-snapshot`, both grant-layer, '
   + 'the second because DATA-DEC-07 is OPEN and a retention window a granted path could push forward '
   + 'would not be one. The half a case cannot carry is the same one 131 named: a filtered UPDATE by '
   + 'the one role holding the grant needs a witness read, and no identity in this schema can see a '
   + 'research snapshot. It is asserted per column at apply time instead.'
   + '\n\n'
   + 'BATCH 080 ADDS THREE MORE IMMUTABLE TABLES AND THE STRONGEST FORM OF THIS KEY IN THE '
   + 'SCHEMA SO FAR, and the reason is the matrix rather than this batch\'s taste: §8.2\'s '
   + '"Approved/published version UPDATE/DELETE" is `N` for owner, admin, editor, approver, '
   + 'viewer AND service, which no other row in §8 is. app.content_versions, '
   + 'app.content_variants and app.quality_reviews therefore carry NO insert, update or delete '
   + 'grant to any role and NO policy for any of those verbs — nine cases, every one a '
   + 'privilege-layer refusal held by the OWNER, which is what makes them about the operation '
   + 'rather than about the caller. The migration asserts the same thing against the live '
   + 'catalog both ways, as absent ACLs and as an absent policy set, because a policy with no '
   + 'grant is inert and a grant with no policy is a weaker refusal than immutability asks for. '
   + 'What no case can carry here is the positive: nothing in this repository may write a '
   + 'content version at all until a SECURITY DEFINER command function exists, and RFC-2026-021 '
   + '§10 records that none does.\n\n'
   + 'BATCH 090 ADDS THE SECOND ROW IN §8 OF THAT SHAPE, AND IT IS THE FIRST ONE OUTSIDE §8.2. '
   + '"Approval event UPDATE/DELETE" is `N` for owner, admin, editor, approver, viewer AND '
   + 'service. app.approval_events therefore carries no insert, update or delete grant to any '
   + 'role and no policy for any of those verbs, asserted both ways against the live catalog, '
   + 'and seven cases hold it — three from the WORKSPACE OWNER, one each from the approver and '
   + 'the editor, and three from the service. WHAT IS DIFFERENT FROM 080 IS WHAT THE EMPTY '
   + 'TABLE COSTS. A content version that cannot be written is a product that cannot generate; '
   + 'an approval event that cannot be written is §4 invariant 8\'s immutable decision trail '
   + 'holding nothing, so the integrity this row protects is the integrity of an empty record. '
   + 'The requests beside it CAN be decided, which means a decision can be taken and not '
   + 'recorded. That is in the work package\'s open blockers and is the one thing about this '
   + 'batch a reader should not be allowed to take for a control.\n\n'
   + 'THE POLICY AND THE REQUEST ARE NOT IMMUTABLE AND ARE COUNTED ELSEWHERE, except for one '
   + 'half of each that belongs here: `owner-a-cannot-raise-the-quorum-of-an-approval-policy` '
   + 'and `owner-a-cannot-renumber-an-approval-policy` are §4.7\'s "published policy version '
   + 'immutable" as a column allowlist, and `owner-a-cannot-repin-an-approval-request` is §4 '
   + 'invariant 6\'s "Version ใหม่ไม่ inherit approval" as a missing column grant. All three are '
   + 'privilege refusals held by the owner, which is the same evidence shape as the seven above '
   + 'applied to a column rather than to a table.',
  // A DEAD DUPLICATE `10:` KEY STOOD HERE, AND WHAT IT HELD IS WHY IT IS RECORDED RATHER THAN
  // QUIETLY DELETED. `AUTHORIZATION_CASE_COVERAGE` declared key 10 TWICE; JavaScript keeps the
  // last, so thirty-five lines were unreachable — and they were the pre-correction copies of
  // batch 130's and batch 140's case-9 paragraphs, still saying "A FIFTH AND A SIXTH IMMUTABLE
  // TABLE" and "THE FIFTH AND SIXTH IMMUTABLE TABLES": the exact ordinals the parallel-integration
  // round corrected in the live copy of key 9. The correction landed and the false sentences
  // survived beside it, in a key nothing reads.
  //
  // This is the defect class evidence/WP-0A-DB-00/parallel-integration-2026-09-07.md §4 exists to
  // record — a seam that falls INSIDE an expression, parses, runs, and reports nothing — landed
  // rather than predicted. Nothing was lost by deleting it: every paragraph it held is present,
  // corrected, in key 9. What is new is the guard, in tests/db/identity/identity-isolation.test.mjs:
  // each coverage map's SOURCE must declare each key exactly once, which is a property the parsed
  // object cannot be asked about.
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
    + 'in one batch and not two.\n\n'
    + 'allowlist. BATCH 060 IS WHERE THE MISSING COMMAND SURFACE STOPS BEING A GAP IN COVERAGE AND '
    + 'BECOMES AN UNIMPLEMENTED §8 CELL. §8.3 marks "BYOK credential manage" `Y` for the owner, and '
    + 'the only path §3.1 offers to a table in `private` is "Server/worker ผ่าน typed service '
    + 'เท่านั้น" — the SECURITY DEFINER command function RFC-2026-012 §4 names and RFC-2026-021 §10 '
    + 'records as absent. So this is the first batch whose refusal to implement a granted cell is '
    + 'caused by case 10 rather than merely uncovered by it, and '
    + '`owner-a-cannot-create-a-credential-reference` is that refusal asserted rather than assumed.\n\n'
    + 'BATCH 130 MAKES THE GAP AS LARGE AS IT GETS, and this is the case §8.6 most obviously wants '
    + 'and this schema most obviously cannot give. "Authorized server command → pass + expected '
    + 'audit/outbox" is, for billing, the ENTIRE WRITE PATH: no role holds INSERT, UPDATE or DELETE '
    + 'on a subscription, so a subscription can only ever be created by a command the repository '
    + 'does not have, fed by a webhook projection batch 131 owes, recorded in an audit event batch '
    + '140 owes and an outbox batch 050 owes. That is not a defect in this batch — it is '
    + 'RFC-2026-012 §4\'s mechanism being named and absent, and CONTRIBUTING_AGENTS.md\'s "payment '
    + 'entitlement is derived only from a verified Stripe webhook projection" being the reason the '
    + 'absence is correct rather than convenient. What batch 130 contributes is that the gap is now '
    + 'a set of PASSING CASES: six refusals that will have to change, in a named batch, in a diff a '
    + 'reviewer reads.\n\n'
   + 'BATCH 140 BUILDS THE HALF OF CASE 10 THAT WAS MISSING AND CANNOT REACH THE OTHER HALF. The '
   + 'case is "authorized server command → pass + EXPECTED AUDIT/OUTBOX", and until this batch there '
   + 'was no audit store for the second half to be about — the note above said "audit (140) and '
   + 'outbox (050) do not exist yet" and one of those two now does. What is still missing is a '
   + 'WRITER: §8.4 marks "Audit/security INSERT" `S`, RFC-2026-016 §2 conditions a service policy on '
   + '"a server-set workspace GUC derived from CTR-TEN-001", and no such GUC has a name, a setter or '
   + 'a contract (DATA-DEC-03, open until G1). So `service-cannot-write-an-audit-log` asserts the '
   + 'present state — the service holds the INSERT grant and is refused by row level security — and '
   + 'the day the GUC is decided that case flips, in a diff, rather than a claim quietly becoming '
   + 'true. **The finding is larger than this batch: until that GUC exists, no `S` cell anywhere in '
   + '§8.2 to §8.4 can be implemented, which reaches 050, 061, 070 and 120 as well.**\n\n'
   + 'BATCH 110 IS WHERE THE MISSING COMMAND SURFACE STOPS BEING ONE GAP AND BECOMES THREE, ONE PER '
   + 'VERB. §5 gives the raw webhook inbox the mutability "append/process/purge" — the only '
   + 'three-verb lifecycle in the inventory — and this batch grants no role any of them:\n\n'
   + 'APPEND has no writer. The route into `private` is "Server/worker ผ่าน typed service เท่านั้น" '
   + '(§3.1), the typed service is RFC-2026-012 §4\'s SECURITY DEFINER command function, and '
   + 'RFC-2026-021 §10 records that none exists.\n\n'
   + 'PROCESS has no actor, and this is the half that is NOT waiting for the GUC. RFC-2026-022 §3 '
   + 'classifies the statement DISCOVERED and §5/5 gives a discovered cell no policy permanently, '
   + 'performed through a broker owned by a fifth not-a-path role. That role does not exist and '
   + 'creating it belongs to the RFC that creates the worker (DATA-DEC-03, due before G1). Batch '
   + '050 refused to build a writer for its outbox on the same ground; here the owner of the '
   + 'missing writer is named rather than merely absent.\n\n'
   + 'PURGE has no scheduler. §10\'s WEBHOOK-SHORT is a retention rule with a purge in it, batch '
   + '160 owns the retention job, and §10\'s numbers need Product/Security/Legal approval (§15). So '
   + 'no window is encoded in a constraint, where it would read as ratified, and what the batch '
   + 'provides instead is the columns each sweep would read — processed_at, failed_at, redacted_at, '
   + 'and a body_ref that can be emptied while the dedupe hash §10 says to keep longer stays — with '
   + 'an index over each. `service-cannot-purge-a-meta-webhook-delivery` asserts the present state.\n\n'
   + 'BATCH 061 IS ONE OF THOSE BATCHES AND ARRIVES AFTER THE DECISION IT WAS WAITING FOR, WHICH CHANGES THE SHAPE OF THE DEBT WITHOUT PAYING IT. RFC-2026-022 (approved 2026-09-08) answers \'what does my `S` cell look like\' -- §8.4\'s \'Usage ledger INSERT\' is CARRIED, the setting is `app.workspace_id`, and it has exactly one legal spelling -- while its §5/8 declares the decision NOT IN EFFECT, because the only member of app_worker is `postgres`, which bypasses row level security. So case 10 is still unpayable and the reason has MOVED: it was \'no document names the GUC\' and it is now \'no identity can be the service\'.\n\nWHAT BATCH 061 PAYS TOWARD IT is the half a batch can pay: the cell is classified as DATA in db/foundation/lint/service-policy-map.json, which scripts/db/run.mjs reads in both directions, so the shape is a row a reviewer reads rather than an argument in a migration header. THE SECOND HALF OF CASE 10 -- \'+ expected audit/outbox\' -- is also still unreachable: a usage event that landed should announce itself, §3.4 requires an outbox row in the SAME TRANSACTION as the domain state, and batch 050 recorded that no write path in this schema can do that because no command function exists. **Owed to DATA-DEC-03, to RFC-2026-022 §7, and to the batch that brings the command surface; the AGGREGATE\'s writer is owed to batch 132 (§6: \'entitlement-metering resolver\', depending on 061 and 130), which is a named batch rather than \'a later batch\'.**\n\n'
   + 'BATCH 051 IS WHERE THAT FINDING WAS ANSWERED AND THE CASE STILL CANNOT BE PAID, AND THE '
   + 'DISTANCE IT MOVED IS WORTH RECORDING PRECISELY. RFC-2026-022 (approved 2026-09-08) took the '
   + 'question 050 and 140 both dispatched and split §8.2-§8.4\'s nine `S` cells by whether the '
   + 'statement CARRIES its workspace or DISCOVERS it. §8.4\'s "Notification insert/delivery state" '
   + 'is CARRIED — the recipient and the workspace are inputs, because the other notification row is '
   + '`O` and an inbox row cannot be addressed without knowing whose it is — and batch 051 records '
   + 'that classification for BOTH statements the cell names in '
   + 'db/foundation/lint/service-policy-map.json. So "no document names the GUC" is no longer the '
   + 'blocker; RFC-2026-022 names it and pins its spelling.\n\n'
   + 'WHAT BLOCKS IT NOW IS THAT THE DECISION IS APPROVED AND NOT IN EFFECT. Measured 2026-09-08, the '
   + 'only member of `app_worker` is `postgres`, which BYPASSES row level security — so a policy '
   + 'naming that role would be a control with no observable behaviour in either direction, and the '
   + 'RFC\'s own §7 lists what must be true first (a non-bypassing `app_queue` role, its pinned '
   + 'broker, the confinement literal appearing once in the tree). None of that is a migration\'s to '
   + 'build. `service-cannot-write-a-notification-row` is the POLICY-layer denial that flips when it '
   + 'is, exactly as 140\'s two are.\n\n'
   + 'AND THE OTHER HALF OF CASE 10 IS STILL MISSING FOR 050\'s AND 140\'s REASONS AT ONCE: the case '
   + 'reads "Authorized server command → pass + expected AUDIT/OUTBOX", and this schema now has an '
   + 'audit store nothing can write and an outbox nothing can write. A notification is the row those '
   + 'two would produce a side effect FOR, and it joins them: three stores, no writer, one command '
   + 'surface missing from all of them (RFC-2026-012 §4; RFC-2026-021 §10 records that no command '
   + 'function exists).\n\n'
   + 'ONE SENTENCE THAT NO NOTE, COMMENT, CASE OR TEST IN BATCH 051 MAY CONTRADICT, because '
   + 'RFC-2026-022 makes it a condition of the decision rather than a remark about it: the workspace '
   + 'GUC is CONTAINMENT against defects in the service\'s own code and NEVER tenant isolation of the '
   + 'service path. The RFC measured twice that the role a service policy names can set the setting '
   + 'that policy reads, and that the catalog cannot be asked who may. Nothing in this suite cites it '
   + 'as tenant isolation, and identity-isolation.test.mjs asserts that absence over the whole file '
   + 'rather than trusting this sentence.\n\n'
   + '§8.2 to §8.4 can be implemented, which reaches 050, 061, 070 and 120 as well.**\n\n'
   + 'BATCH 131 ANSWERS THE HALF OF THAT FINDING THAT WAS ABOUT ITS OWN CELL, AND THE ANSWER IS THAT '
   + 'THE SHAPE 140 WAS WAITING FOR IS NOT THE SHAPE THIS CELL GETS. RFC-2026-022 (approved '
   + '2026-09-08) settled what an `S` cell looks like by splitting the nine of them: a cell whose '
   + 'statement CARRIES its workspace gets a policy TO the service role whose predicate is the '
   + 'cell\'s own AND a pinned confinement term, and a cell that DISCOVERS its workspace gets no '
   + 'policy at all, permanently, with the operation performed through a SECURITY DEFINER broker '
   + 'owned by a role that is not a path. §8.3\'s "Raw token/webhook SELECT" — this batch\'s cell — '
   + 'is classified DISCOVERED by that RFC\'s own §3 table, and applying its operational test to the '
   + 'statement confirms it: adding the confinement term to "the next unprocessed receipt" excludes '
   + 'exactly the rows a processor exists to resolve, because §8.3 of the Stripe billing contract '
   + 'initialises correlation_workspace_id to NULL. So the classification is recorded in '
   + 'db/foundation/lint/service-policy-map.json, which the lint reads in both directions, and NO '
   + 'SERVICE POLICY IS WRITTEN — not as a deferral but as the decision.\n\n'
   + 'WHAT IS STILL MISSING IS THE SAME THING 140 IS MISSING AND IT IS NAMED RATHER THAN INFERRED. '
   + 'RFC-2026-022 §5/8 puts the whole decision NOT IN EFFECT until a service identity exists: '
   + 'measured 2026-09-08, the only member of app_worker is postgres, which bypasses RLS, so a '
   + 'policy TO app_worker is unreachable except from an identity for which it is moot and a broker '
   + 'has nobody to grant EXECUTE to. And the confinement term is a CONTAINMENT control against '
   + 'defects in the service\'s own code — never tenant isolation of the service path, since the '
   + 'role the policy names can set the setting the policy reads — so no case, comment or assertion '
   + 'in this batch cites it as the latter, and the migration names no GUC at all.\n\n'
   + 'THE SECOND HALF OF CASE 10 — "expected audit/outbox" — IS STILL UNPAID FOR BILLING AND THE '
   + 'DEBT IS NOW SPECIFIC. §14.3 of the billing contract lists eleven audit events this family owes '
   + '("checkout started, portal opened, subscription changed, entitlement changed, refund '
   + 'requested/approved/executed, manual grant, replay, reconciliation repair, config/price mapping '
   + 'change"), §6 fixes their content, and the store exists as of batch 140. What does not exist is '
   + 'the WRITER and the table that would call it: `billing_operations` is §5.1\'s and no registry '
   + 'row gives it to 130 or to 131, so this batch creates none and records the gap rather than '
   + 'reserving a table.\n\n'
   + 'BATCH 132 IS THE BATCH §6\'s REGISTRY NAMES FOR THE COMMAND THIS CASE IS ABOUT, AND IT WRITES '
   + 'NONE. §4 of the billing contract gives "effective access/limits per workspace" to an '
   + '`entitlement-service` module; RFC-2026-012 §4 names SECURITY DEFINER command functions as the '
   + 'mechanism and RFC-2026-021 §10 records that none exists; and the identity that would invoke one '
   + 'does not exist either (RFC-2026-022 §5/8). So case 10 stays not applicable for a third billing '
   + 'batch, and what batch 132 adds is the reason it will stay that way until three separate things '
   + 'land: a decision on the four reconciliation questions batch 061 recorded, a mapping between '
   + 'app.plan_entitlements.feature_key and app.quota_buckets.dimension, and a service identity. Each '
   + 'is in this package\'s open blockers with the owner named.\n\n'
   + 'BATCH 070 LEAVES BOTH HALVES OF CASE 10 UNPAID AND MAKES THE FIRST HALF\'S DEBT SPECIFIC IN A '
   + 'WAY EARLIER BATCHES COULD NOT. The "authorized server command" half: §8.2 marks "Start/cancel '
   + 'Research" `Y` for the owner, the admin and the editor, and this batch implements the CANCEL and '
   + 'not the START — because the row\'s own INSERT is `N` for every client column on the next line '
   + 'of the same matrix, so starting research is a command function\'s act and RFC-2026-021 §10 '
   + 'records that none exists. That is the sharpest form this debt has taken: a `Y` cell the matrix '
   + 'grants unconditionally, half implemented, with the missing half named as a mechanism rather '
   + 'than as a policy. The "expected audit/outbox" half is unpaid for the same reason it is unpaid '
   + 'everywhere: an audit store nothing can write and an outbox nothing can write.\n\n'
   + 'AND THE SERVICE HALF IS CLASSIFIED RATHER THAN IMPLEMENTED, WITH ONE DIFFERENCE FROM 051, 061, '
   + '110 AND 131. RFC-2026-022 §3\'s own table does NOT name §8.2\'s "Research run/source/evidence '
   + 'INSERT", so this batch applied §3\'s operational test to its own three statements instead of '
   + 'checking a verdict against them, and recorded all three as CARRIED in '
   + 'db/foundation/lint/service-policy-map.json with the derivation in each row\'s `why`. No service '
   + 'policy is written: §5/8 puts the decision NOT IN EFFECT because the only member of app_worker '
   + 'is postgres, which bypasses row level security. The workspace GUC is CONTAINMENT against '
   + 'defects in the service\'s own code and NEVER tenant isolation of the service path — no note, '
   + 'comment, case or test in batch 070 says otherwise, the migration names the expression exactly '
   + 'once and in the paragraph that derives the classification, and identity-isolation.test.mjs '
   + 'asserts both.'
   + '\n\n'
   + 'BATCH 080 IS THE FIRST BATCH FOR WHICH THIS KEY IS NOT ABOUT A COMMAND FUNCTION THAT '
   + 'MIGHT LATER EXIST, and the difference is worth stating because the sentence above would '
   + 'otherwise read as covering it. Content HAS no `S` cell: §8.2 marks the service `P` on rows '
   + '1 and 2 and `N` on row 3, and a `P` with no capability defined is not an `S`, so '
   + 'db/foundation/lint/service-policy-map.json gets no entry from this batch and no service '
   + 'policy is written. What batch 080 does that no earlier batch did is grant app_worker '
   + 'NOTHING AT ALL — not even the SELECT that makes an RLS-decided service case possible — '
   + 'because the writer this family needs is a SECURITY DEFINER function owned by app_command '
   + '(RFC-2026-017 §3) and a worker with grants would be a second path to the same act. Every '
   + '`service-cannot-*` case in this batch is therefore a PRIVILEGE refusal, which is stronger '
   + 'and is a different claim: none of them carries RFC-2026-017 §7, because §7 asks for a '
   + 'refusal BY row level security and there is no grant here for row level security to refuse.',
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
  // -- Batch 060 builders. -----------------------------------------------------------------------
  //
  // The GLOBAL curated model, by fixture SYMBOL. It carries no `_a` or `_b` suffix for batch 030's
  // reason, and — unlike 030's pack — it is the row BOTH workspaces' model policies pin, which is
  // the only way this batch can assert that the catalog is global: no client identity may read it,
  // so the pair of policies is the evidence and neither owner can see either policy.
  const AI_MODEL = id('ai_model_openai_text');

  // A model policy is addressed by the Workspace it belongs to, never by an id of its own: 060 makes
  // workspace_id the PRIMARY KEY, which is 010's shape for app.workspace_settings, so this names
  // exactly one existing row and the catalog needs no symbol for it.
  const MODEL_POLICY_OF = 'select ai_model_id from app.ai_model_policies where workspace_id = $1';

  // And a credential reference by its Workspace too. The statement names `private.` deliberately:
  // the refusal these cases assert lands on the SCHEMA, and a case that could not name the schema
  // could not say which object refused it.
  const CREDENTIAL_REFERENCE_OF =
    'select fingerprint from private.ai_credential_references where workspace_id = $1';
  // -- Batch 130 builders. -----------------------------------------------------------------------
  //
  // THE GLOBAL PLAN ROWS, by fixture SYMBOL. They carry no `_a` or `_b` suffix because they belong
  // to no tenant, and every case below attacks them from BOTH tenants, from anonymous and from the
  // service: the assertion is never "A cannot reach B's row", which is meaningless about a catalog,
  // but "no request-path identity reaches the plan catalog at all".
  const PLAN = id('billing_plan_starter');
  const PLAN_V1 = id('billing_plan_starter_v1');

  // A subscription is addressed by the WORKSPACE it belongs to, never by an id of its own: 130 makes
  // (workspace_id) unique among the states that are not `canceled`, which is §1 of the Stripe
  // billing contract — "หนึ่ง billable subscription ต่อหนึ่ง workspace" — so this names exactly one
  // live row and the catalog needs no symbol for it.
  //
  // The plan revision is named in the WHERE clause as well as selected, which is what makes
  // `owner-a-sees-the-billing-subscription-of-tenant-a` and its owner-B twin a claim about ONE
  // GLOBAL ROW rather than two unrelated rows: the same uuid appears on both sides of the tenant
  // boundary and neither owner can see the other's subscription. It is batch 030's shape for
  // proving a catalog is global, and here it is the ONLY shape available, because no identity in
  // this schema may read the plan revision itself.
  const subscribedTo =
    'select id from app.billing_subscriptions where workspace_id = $1 and billing_plan_version_id = $2';
  const SUBSCRIPTION_OF = 'select id from app.billing_subscriptions where workspace_id = $1';

  // The three writes, and each is a thing somebody would want. Creating a subscription is granting
  // yourself a plan; extending one is granting yourself another year; deleting one is erasing the
  // record of what you owed. All three are refused at the PRIVILEGE layer, because batch 130 grants
  // no role INSERT, UPDATE or DELETE on this table at all.
  //
  // `pending` is what a started checkout would project, and the case names it rather than `active`
  // so a reader can see which step of §9's state machine is being forged. THE ROW WOULD ALSO
  // COLLIDE with the one-live-per-workspace index, and that does not weaken the case — it
  // strengthens it. The privilege check runs before any constraint, so a correct database answers
  // 42501; a database that had been granted the INSERT would answer 23505, and `expectDenied`
  // refuses every SQLSTATE but 42501. The case cannot be satisfied by the constraint standing in
  // for the missing grant.
  const startSubscription = (workspace, version) => ({
    sql: 'insert into app.billing_subscriptions'
       + ' (workspace_id, billing_plan_version_id, local_access_state)'
       + " values ($1, $2, 'pending') returning id",
    params: [workspace, version],
  });

  const extendSubscription = (workspace) => ({
    sql: "update app.billing_subscriptions set current_period_end = current_period_end + interval '1 year'"
       + ' where workspace_id = $1 returning id',
    params: [workspace],
  });

  const endSubscription = (workspace) => ({
    sql: 'delete from app.billing_subscriptions where workspace_id = $1 returning id',
    params: [workspace],
  });

  // The catalog reads. The price read selects `unit_amount` by name on purpose: it is the one value
  // in this schema whose disclosure or alteration is a commercial fact rather than a data one, and a
  // case that selected `id` would be refused identically while saying less about what it protects.
  const readPlanCatalog = 'select plan_code from app.billing_plans where id = $1';
  const readPlanPrice = 'select currency, unit_amount from app.billing_plan_versions where id = $1';
  const readPlanEntitlement =
    'select entitlement_kind, limit_value from app.plan_entitlements'
    + " where billing_plan_version_id = $1 and feature_key = 'workspace_users'";

  // The catalog writes. Publishing a plan or a price is deciding what the product charges every
  // tenant at once; raising an entitlement is deciding what a plan includes. `revision 9` and
  // `attempted_*` keys are values no fixture row holds, so nothing below can be satisfied by a
  // unique constraint firing first.
  const publishPlan = {
    sql: "insert into app.billing_plans (plan_code) values ('attempted_plan_code') returning id",
    params: [],
  };

  const publishPlanPrice = (plan) => ({
    sql: 'insert into app.billing_plan_versions'
       + ' (billing_plan_id, revision, display_name_th, currency, unit_amount, billing_interval, effective_from)'
       + " values ($1, 9, 'attempted revision', 'THB', 0, 'month', now()) returning id",
    params: [plan],
  });

  const rewritePlanPrice = (version) => ({
    sql: 'update app.billing_plan_versions set unit_amount = 0 where id = $1 returning id',
    params: [version],
  });

  const deletePlanPrice = (version) => ({
    sql: 'delete from app.billing_plan_versions where id = $1 returning id',
    params: [version],
  });

  const writePlanEntitlement = (plan, version) => ({
    sql: 'insert into app.plan_entitlements'
       + ' (billing_plan_id, billing_plan_version_id, feature_key, entitlement_kind, limit_value)'
       + " values ($1, $2, 'attempted_feature_key', 'limit', 999999) returning id",
    params: [plan, version],
  });

  const raisePlanEntitlement = (version) => ({
    sql: 'update app.plan_entitlements set limit_value = 999999'
       + " where billing_plan_version_id = $1 and feature_key = 'workspace_users' returning id",
    params: [version],
  });

  const deletePlanEntitlement = (version) => ({
    sql: 'delete from app.plan_entitlements'
       + " where billing_plan_version_id = $1 and feature_key = 'workspace_users' returning id",
    params: [version],
  });

  // -- Batch 140 builders and witnesses. --------------------------------------------------------
  //
  // THIS BLOCK IS SHAPED UNLIKE EVERY BLOCK ABOVE IT, and the shape is the finding rather than a
  // stylistic drift. There is no `rows` case anywhere in it: batch 140 grants no client role
  // anything on either table and writes no policy for one, so no request-path identity has an
  // operation to succeed at. Batch 030 met that state first on its two GLOBAL tables and said what
  // stands in place of a positive — "both owners are refused identically, at the privilege layer" —
  // and these two tables are the same shape for a different reason: 030's rows belong to NO tenant,
  // and these belong to one and are still unreachable by it.
  //
  // So there is no witness function here either. A `no-effect` case pairs an empty write with a
  // witness read; every write below is REFUSED rather than filtered, because the privilege is
  // absent rather than the policy, and `denied` is the stronger assertion the helper module reserves
  // for exactly that.
  const AUDIT_A1 = id('audit_log_a1');
  const AUDIT_B1 = id('audit_log_b1');
  const SECURITY_A1 = id('security_event_a1');
  const SECURITY_B1 = id('security_event_b1');

  const AUDIT_BY_ID = 'select id from app.audit_logs where id = $1';
  const SECURITY_EVENT_BY_ID = 'select id from app.security_events where id = $1';

  // The write §8.4 marks `N` for every client role and `S` for the service. Its columns are the ones
  // CTR-AUD-001 makes required and no more: the three redaction flags are `true` because the
  // constraint refuses a record that does not assert redaction, and the outcome is `succeeded`
  // because the biconditional constraint would otherwise demand an error_code beside it.
  //
  // A statement that a correct database refuses at the PRIVILEGE layer would be refused whatever it
  // contained, so it is written to be otherwise VALID on purpose: a case whose row would have been
  // rejected by a CHECK anyway proves nothing about the grant.
  const writeAuditLog = (workspace, actor) => ({
    sql: 'insert into app.audit_logs'
       + ' (workspace_id, occurred_at, actor_kind, actor_id, action_category, action_name,'
       + ' outcome, reason_key, request_id, correlation_id,'
       + ' secret_redacted, content_redacted, pii_redacted, retention_policy_ref)'
       + " values ($1, now(), 'user', $2, 'role', 'identity.workspace_member.role_changed',"
       + " 'succeeded', 'audit.case.attempted_write', 'attempted-request', 'attempted-correlation',"
       + " true, true, true, 'retention.audit') returning id",
    params: [workspace, actor],
  });

  const writeSecurityEvent = (workspace) => ({
    sql: 'insert into app.security_events (workspace_id, occurred_at, event_type)'
       + " values ($1, now(), 'auth.session.attempted_write') returning id",
    params: [workspace],
  });

  // `reason_key` and not `outcome`, deliberately. An UPDATE setting `outcome` would be refused by
  // `audit_logs_outcome_matches_error` on a database that had wrongly GRANTED the verb — 23514 where
  // the case demands 42501 — so the case would fail for the right reason and report the wrong one.
  // The column a rewrite would actually reach for is the one that says why the action was recorded.
  const rewriteAuditLog = (auditId) => ({
    sql: 'update app.audit_logs set reason_key = $2 where id = $1 returning id',
    params: [auditId, 'audit.case.rewritten'],
  });

  const rewriteSecurityEvent = (eventId) => ({
    sql: 'update app.security_events set event_type = $2 where id = $1 returning id',
    params: [eventId, 'auth.session.rewritten'],
  });

  // -- Batch 110 builders. -----------------------------------------------------------------------
  //
  // THE TWO META CONNECTIONS, by fixture SYMBOL, one per Workspace. A connection is a tenant-owned
  // row (§4: WORKSPACE ||--o{ META_CONNECTION), so unlike 030's pack and 130's plan it carries an
  // `_a`/`_b` suffix — and unlike 020's business it is a tenant row NO CLIENT IDENTITY MAY READ, so
  // the pair is not a cross-tenant boundary and is never offered as one. What the pair asserts is
  // that both owners are refused their OWN connection, at the same layer, with the same message.
  const META_CONNECTION_A = id('meta_connection_a');
  const META_CONNECTION_B = id('meta_connection_b');

  const CONNECTION_BY_ID = 'select display_name from app.meta_connections where id = $1';

  // A social account is addressed by (workspace_id, external_account_hash), which
  // 110_meta_connector.sql makes unique — a natural key spelled out of an id this catalog fixes plus
  // text the fixture and this file share, exactly as a version row, a member scope, an industry
  // assignment and a billing subscription are addressed. So the catalog needs no symbol for one.
  //
  // `sha256(convert_to(...))` from pg_catalog rather than pgcrypto's digest(), for the reason the
  // invitation builder above records: `public.digest` does not exist on the provisioned instance.
  const SOCIAL_ACCOUNT_KEY = 'social_account_a1';
  const SOCIAL_ACCOUNT_IN =
    'select display_name from app.social_accounts'
    + " where workspace_id = $1 and external_account_hash = sha256(convert_to($2, 'utf8'))";

  // THE SAME KEY TEXT ON BOTH SIDES OF THE TENANT BOUNDARY, which is what makes the workspace-scoped
  // natural key legible: the fixture loads one account per Workspace carrying the SAME hash, so a
  // key that had lost `workspace_id` would fail to LOAD rather than fail a case.

  // The credential reference and the raw delivery both live in `private`, and both statements name
  // `private.` deliberately: the refusal these cases assert lands on the SCHEMA, and a case that
  // could not name the schema could not say which object refused it. 060 established the shape and
  // identity-isolation.test.mjs holds a case naming `private` to naming a `private.` table a
  // migration creates, so no scaffolding failure can wear this label.
  const META_REFERENCE_OF =
    'select fingerprint from private.meta_credential_references where meta_connection_id = $1';

  const DELIVERY_A1 = 'meta_webhook_delivery_a1';
  const DELIVERY_BY_HASH =
    'select body_ref from private.meta_webhook_inbox'
    + " where delivery_hash = sha256(convert_to($1, 'utf8'))";

  // The writes, and each is a thing somebody would want. Connecting is granting yourself a
  // publishing destination; discovering an account is adding one; revoking is claiming a credential
  // was withdrawn. Every one is refused, and WHICH LAYER refuses is the whole of what separates
  // them: a client is refused by the privilege system on tables it holds nothing on, and the service
  // is refused by row level security on the two tables where it holds a grant.
  //
  // The two service INSERTs name only columns app_worker is actually granted. That is not tidiness:
  // a statement naming an ungranted column would be refused at the privilege layer and would report
  // `grant` where the case demands `policy`, so it would fail for the right reason and say the wrong
  // thing — and the CI negative control that rests on it would rest on nothing.
  const connectMeta = (workspace, actor) => ({
    sql: 'insert into app.meta_connections (workspace_id, display_name, created_by, updated_by)'
       + " values ($1, 'attempted connection', $2, $2) returning id",
    params: [workspace, actor],
  });

  const discoverSocialAccount = (workspace, connection) => ({
    sql: 'insert into app.social_accounts'
       + ' (workspace_id, meta_connection_id, account_kind, display_name, external_account_hash)'
       + " values ($1, $2, 'ig', 'attempted account',"
       + " sha256(convert_to('social_account_attempted', 'utf8'))) returning id",
    params: [workspace, connection],
  });

  const revokeConnection = (connection) => ({
    sql: 'update app.meta_connections set revoked_at = now() where id = $1 returning id',
    params: [connection],
  });

  const renameSocialAccount = (workspace) => ({
    sql: 'update app.social_accounts set display_name = $2'
       + " where workspace_id = $1 and external_account_hash = sha256(convert_to($3, 'utf8'))"
       + ' returning id',
    params: [workspace, 'attempted rename', SOCIAL_ACCOUNT_KEY],
  });

  const createMetaReference = (workspace, connection, actor) => ({
    sql: 'insert into private.meta_credential_references'
       + ' (workspace_id, meta_connection_id, credential_reference, created_by, updated_by)'
       + " values ($1, $2, 'vault://fixture/attempted', $3, $3) returning id",
    params: [workspace, connection, actor],
  });

  // The middle verb of "append/process/purge", written as the statement a processor would issue:
  // stamp the delivery and record which Workspace it resolved to. It is the statement RFC-2026-022
  // §3 classifies as DISCOVERED, and the case asserting its refusal is PERMANENT rather than pending
  // — §5/5 gives a discovered cell no policy, ever, and performs it through a broker instead.
  const processDelivery = (hash, workspace) => ({
    sql: 'update private.meta_webhook_inbox set processed_at = now(), workspace_id = $2'
       + " where delivery_hash = sha256(convert_to($1, 'utf8')) returning id",
    params: [hash, workspace],
  });

  const purgeDelivery = (hash) => ({
    sql: 'delete from private.meta_webhook_inbox'
       + " where delivery_hash = sha256(convert_to($1, 'utf8')) returning id",
    params: [hash],
  });

  // -- Batch 051 builders and witnesses. --------------------------------------------------------
  //
  // THIS BLOCK HAS WITNESSES AGAIN, AND THAT IS THE FAMILY RATHER THAN A CHANGE OF STYLE. Batches
  // 050, 060 and 140 needed none: every write on their tables is REFUSED at the privilege layer,
  // and `denied` is the stronger assertion the helper module reserves for exactly that. Batch 051
  // implements a §8 client cell — §8.4's "Own notification SELECT/mark read", `O` for all five
  // built-in roles — so there is a client UPDATE that a policy FILTERS rather than refuses, which is
  // the shape `no-effect` exists for: an empty result plus a witness that reads the value back.
  const NOTIFICATION_OWNER_A = id('notification_owner_a');
  const NOTIFICATION_EDITOR_A = id('notification_editor_a');
  const NOTIFICATION_SUSPENDED_A = id('notification_suspended_a');
  const NOTIFICATION_OWNER_B = id('notification_owner_b');

  // The read the client cell grants, selecting a column the client MAY reach. `message_key` and not
  // `delivery_state`: §8.4's second row marks delivery state `N` for every client role and batch 051
  // implements that as a column list, so a case selecting it would be refused by the GRANT on every
  // database — including one whose policy had been deleted — and would report a column-privilege
  // finding under the name of a tenant boundary.
  const NOTIFICATION_BY_ID = 'select message_key from app.notifications where id = $1';

  // The two columns §8.4 row 2 marks `N`, read by name. These cases are the other direction of the
  // same claim: not "the policy filtered me" but "the grant does not reach this column at all", so
  // they are `denied` at the GRANT layer and would fail if a later batch widened the SELECT grant to
  // the table.
  const NOTIFICATION_DELIVERY_BY_ID =
    'select delivery_state, delivery_failure_class from app.notifications where id = $1';
  const NOTIFICATION_DEDUPE_BY_ID = 'select dedupe_key from app.notifications where id = $1';

  const PREFERENCE_OF = 'select enabled from app.notification_preferences'
    + ' where workspace_id = $1 and user_id = $2';

  // The statement names `private.` deliberately, for the reason batch 060's does: a case may declare
  // `deniedOn: { kind: 'schema', name: 'private' }` only when it names a private TABLE a migration
  // creates, which no scaffolding failure can do.
  const PUSH_SUBSCRIPTION_OF =
    'select fingerprint from private.push_subscription_references where workspace_id = $1';

  // "mark read", which is the one write §8.4 gives a client on this family. It sets a FIXED
  // timestamp rather than now(): a witness that asserts a value has to know what value to expect,
  // and a case whose content depends on when it ran is one whose failures depend on when they ran
  // (030's rule about released_at, applied to a write instead of to a fixture).
  const MARKED_READ_AT = '2026-08-01 00:00:00+00';
  const markRead = (notificationId) => ({
    sql: 'update app.notifications set read_at = $2 where id = $1 returning id',
    params: [notificationId, MARKED_READ_AT],
  });

  // The witnesses for the two `no-effect` cases. Each runs as an identity that CAN see the target
  // row — its own recipient — and reads `read_at` back, so "affected nothing" becomes "the row is
  // still there and is still unread". A witness that only asserted the row exists would be
  // expectNoRows wearing a different name.
  //
  // `read_at` is null on every notification the fixture loads, and STILL NULL is the assertion.
  // That is the value the write would have changed, which is what makes the witness bite: if a
  // policy ever admitted the row, the witness reads a timestamp and the case fails.
  //
  // THE DATABASE ANSWERS "IS IT NULL", AND THE HARNESS DOES NOT. These two witnesses were written
  // as `column: 'read_at', equals: null` and every one of the four cases that use them FAILED IN
  // CI while the whole suite was green on this machine, because the driver reads psql's CSV and
  // CSV HAS NO NULL: an unset timestamp arrives as the empty string, so `'' !== null` and the
  // witness reported "the write was NOT stopped" about a write that was stopped. Comparing to `''`
  // instead would have made the case pass and made it wrong -- it would then hold equally for a
  // read_at somebody set to the empty string, which is a different fact. So the predicate is
  // evaluated where NULL exists, in Postgres, and the harness compares two booleans it can encode.
  // No local run could have caught this: the isolation suite needs a database, and the database is
  // in CI.
  //
  // THE WITNESS IDENTITY IS THE ROW'S OWN RECIPIENT AND IT HAS TO BE. On every earlier table a
  // witness runs as the workspace's owner, because a workspace owner can read every row in it; here
  // an owner cannot read another member's notification, so `workspaceANameUnchanged`'s shape does
  // not transfer. The recipient is the only identity in this suite that can see one of these rows,
  // which is the same fact the negatives are about, arriving on the other side.
  const editorANotificationStillUnread = {
    as: editorA,
    sql: 'select (read_at is null) as still_unread from app.notifications where id = $1',
    params: [NOTIFICATION_EDITOR_A],
    column: 'still_unread',
    equals: 't',
  };
  const ownerBNotificationStillUnread = {
    as: ownerB,
    sql: 'select (read_at is null) as still_unread from app.notifications where id = $1',
    params: [NOTIFICATION_OWNER_B],
    column: 'still_unread',
    equals: 't',
  };

  // The writes §8.4's SECOND row marks `N` for every client role and `S` for the service. Each is
  // written to be otherwise VALID — every CHECK the table carries is satisfied, the deep link
  // matches CTR-NTF-001's grammar and asserts its permission flag, the delivery state is one of the
  // contract's four — because a statement a correct database refuses at the privilege or policy
  // layer would be refused whatever it contained, and a case whose row a CONSTRAINT would have
  // rejected anyway proves nothing about the grant (140's rule).
  //
  // `dedupe_key` is unique per (workspace_id, user_id, dedupe_key) and every one of these uses a key
  // no fixture row holds, so nothing below can come back 23505 where it demands 42501.
  const writeNotification = (workspace, recipient, dedupeKey) => ({
    sql: 'insert into app.notifications'
       + ' (workspace_id, user_id, channel, message_key, dedupe_key,'
       + ' deep_link_target_ref, deep_link_requires_permission, delivery_state)'
       + " values ($1, $2, 'in_app', 'notification.case.attempted_write', $3,"
       + " 'app:fixture/attempted', true, 'queued') returning id",
    params: [workspace, recipient, dedupeKey],
  });

  // The delivery-state UPDATE, which is the other statement §8.4's `S` cell names and the one
  // RFC-2026-022 classifies CARRIED beside the insert. It targets a column no client grant reaches
  // and the service's own column-scoped grant does, so the layer that refuses it differs by identity
  // — which is the whole point of asserting both.
  const recordDelivery = (notificationId) => ({
    sql: "update app.notifications set delivery_state = 'delivered' where id = $1 returning id",
    params: [notificationId],
  });

  const setPreference = (workspace, user) => ({
    sql: 'insert into app.notification_preferences (workspace_id, user_id, channel, enabled)'
       + " values ($1, $2, 'line', false) returning workspace_id",
    params: [workspace, user],
  });

  // -- Batch 131 builders. ------------------------------------------------------------------------
  //
  // THE ROWS ARE ADDRESSED BY DIGEST, WHICH NO EARLIER BLOCK HAS HAD TO DO, and it follows from the
  // batch rather than from a preference. Batch 131 stores §9.3's "stable hash for uniqueness" and
  // refuses the raw provider identifier, so a webhook receipt and a payment have no id a document
  // fixes and no id another row must name — their natural keys are `(provider, livemode, <digest>)`.
  // The digest is COMPUTED here with the same `sha256(convert_to(…, 'utf8'))` the fixture uses and
  // batch 010's invitation cases already use, so the case and the fixture agree by construction
  // rather than by a pasted hex constant, which is what the fixture catalog exists to refuse.
  //
  // AN INVOICE IS DIFFERENT AND CARRIES A SYMBOL, because app.billing_payments reaches it through two
  // composite foreign keys — one over the tenant path and one over the mode — so its id is a value
  // another row must name. That is the catalog's own rule, recorded when batch 050 needed a symbol
  // for an outbox event and not for a job or a ledger row.
  const INVOICE_A = id('billing_invoice_a');
  const INVOICE_B = id('billing_invoice_b');

  const RECEIPT_BY_EVENT =
    'select id from app.billing_webhook_receipts'
    + " where provider = 'stripe' and livemode = false"
    + " and provider_event_hash = sha256(convert_to($1, 'utf8'))";
  const INVOICE_BY_ID = 'select id from app.billing_invoices where id = $1';
  // `amount_due` and `settled_at` by name, for batch 130's reason about `unit_amount`: they are the
  // values whose disclosure is a commercial fact about another business rather than a data one — what
  // a competitor owes and whether they have paid — and a case selecting `id` would be refused
  // identically while saying less about what it protects.
  const INVOICE_AMOUNT_BY_ID =
    'select amount_due, settled_at from app.billing_invoices where id = $1';
  const PAYMENTS_OF_INVOICE =
    'select direction, amount from app.billing_payments where billing_invoice_id = $1';

  // THE WRITES, AND EACH IS A THING SOMEBODY WOULD WANT. Recording a webhook receipt is asserting
  // that a provider said something; projecting an invoice is asserting that a workspace owes money;
  // recording a payment is asserting that money moved. All three are refused, and WHICH LAYER refuses
  // them differs by role, which is the whole of what these cases distinguish: for a client role the
  // privilege is absent, and for the service the privilege is present and row level security refuses.
  //
  // Each statement is written to be OTHERWISE VALID — a correct provider name, a well-formed event
  // type, digests of the right length, a whole period, a positive amount — because a statement a
  // CHECK would have rejected anyway proves nothing about the grant. `expectDenied` refuses every
  // SQLSTATE but 42501, so a database that had wrongly granted the verb answers 23505 or 23514 and
  // the case still fails; it simply cannot be SATISFIED by a constraint standing in for a grant.
  const recordWebhookReceipt = (workspace) => ({
    sql: 'insert into app.billing_webhook_receipts'
       + ' (provider, livemode, provider_event_hash, payload_hash, provider_event_type,'
       + ' provider_created_at, correlation_workspace_id)'
       + " values ('stripe', false, sha256(convert_to($2, 'utf8')),"
       + " sha256(convert_to($3, 'utf8')), 'invoice.paid', now(), $1) returning id",
    params: [workspace, 'attempted-billing-event', 'attempted-billing-payload'],
  });

  // The one write a receipt's PROCESSING half would make: claim the row by resolving its workspace.
  // It is asserted against the UNRESOLVED fixture row, because that is the row RFC-2026-022 §3's test
  // is about — the one a confinement predicate would exclude.
  const resolveWebhookReceipt = (workspace) => ({
    sql: 'update app.billing_webhook_receipts set correlation_workspace_id = $1,'
       + ' processed_at = now(), attempt_count = attempt_count + 1'
       + " where provider = 'stripe' and livemode = false"
       + " and provider_event_hash = sha256(convert_to($2, 'utf8')) returning id",
    params: [workspace, 'fixture-billing-event-unresolved'],
  });

  // THE SUBSCRIPTION ID HERE IS A WORKSPACE ID AND THAT IS DELIBERATE, so it is explained rather
  // than left to look like a mistake. An `insert … select` reading app.billing_subscriptions would
  // be WRONG for this case: the service holds SELECT and no policy on that table, so the select
  // returns zero rows, the insert writes nothing, and the statement SUCCEEDS having done nothing —
  // a case demanding a refusal would fail while reporting the wrong thing. So the row is built from
  // VALUES, and the one column no catalog symbol can supply is filled with a uuid that is real and
  // is not a subscription. Every CHECK and NOT NULL on the row is satisfied, so nothing is refused
  // before row level security is reached; the only thing wrong with it is the composite FOREIGN KEY,
  // which Postgres enforces with an AFTER ROW trigger and therefore never reaches. On a database
  // that had wrongly granted the INSERT the answer is 23503, and `expectDenied` refuses every
  // SQLSTATE but 42501 — so the case cannot be satisfied by a constraint standing in for a grant.
  const projectInvoice = (workspace) => ({
    sql: 'insert into app.billing_invoices'
       + ' (workspace_id, billing_subscription_id, provider, livemode, provider_invoice_hash,'
       + ' currency, amount_due, issued_at, provider_revision)'
       + " values ($1, $1, 'stripe', false, sha256(convert_to($2, 'utf8')),"
       + " 'THB', 0, now(), 1) returning id",
    params: [workspace, 'attempted-billing-invoice'],
  });

  // Writing an invoice off is the update somebody with a database console and a sympathetic customer
  // would make, and §12.1 forbids exactly that person: "ห้าม Support ปรับ subscription/entitlement
  // โดยแก้ DB เพื่อ 'แก้เร็ว'". `voided_at` rather than `amount_due` because a void is the whole of
  // the debt rather than part of it, and because a row that is already settled would then carry both
  // timestamps — which the CHECK refuses, so a database that had granted the verb answers 23514 and
  // the case still fails rather than passing for the constraint's reason.
  const voidInvoice = (invoice) => ({
    sql: 'update app.billing_invoices set voided_at = now() where id = $1 returning id',
    params: [invoice],
  });

  const deleteInvoice = (invoice) => ({
    sql: 'delete from app.billing_invoices where id = $1 returning id',
    params: [invoice],
  });

  const recordPayment = (workspace, invoice) => ({
    sql: 'insert into app.billing_payments'
       + ' (workspace_id, billing_invoice_id, provider, livemode, provider_payment_hash,'
       + ' direction, currency, amount, occurred_at, succeeded_at)'
       + " values ($1, $2, 'stripe', false, sha256(convert_to($3, 'utf8')),"
       + " 'charge', 'THB', 1, now(), now()) returning id",
    params: [workspace, invoice, 'attempted-billing-payment'],
  });

  // The amendment §8.6 case 9 is about. `amount` and not `failure_code`, because the amount is the
  // number a finance record exists to be right about, and because a payment whose amount can be
  // edited after the fact is the defect the append-only shape is for.
  const amendPayment = (invoice) => ({
    sql: 'update app.billing_payments set amount = 0'
       + " where billing_invoice_id = $1 and direction = 'charge' returning id",
    params: [invoice],
  });

  const deletePayment = (invoice) => ({
    sql: 'delete from app.billing_payments where billing_invoice_id = $1 returning id',
    params: [invoice],
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
    // ==================================================================================    //
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
    // ===================================================================================    // Batch 050 — the async kernel. Three tables, no policy, and no reader.
    // ===================================================================================    //
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
      why: 'anon holds nothing in app: no schema USAGE, so the refusal lands on the SCHEMA and not on '
         + 'the table. Naming the object is what separates this from a harness that could not reach '
         + 'the table for some other reason.',
    },

    // -- Batch 060. The AI gateway, and the first family in this schema with NO CLIENT SURFACE AT --
    // -- ALL. --------------------------------------------------------------------------------------
    //
    // Every case below is a refusal, and the batch that produced them writes no policy. That is not
    // an incomplete implementation: §8's four matrices contain NO ROW for a model registry and NO
    // ROW for a model policy, so there is no cell to implement (030's reading of the same silence);
    // RFC-2026-012's inventory marks this family "view only" and its credential references "no read
    // by anyone, including service"; and RFC-2026-021 fixes what an allowlist entry is, keeps the
    // allowlist empty, and gives adding one to an RFC rather than to a pull request.
    //
    // THESE CASES ARE THAT STATE, EXECUTED, and the layer each one declares is the assertion. Three
    // different refusals live here and a suite that could not tell them apart would be reporting one
    // number for three controls:
    //
    //   grant / table app.ai_models or app.ai_model_policies   — the empty read allowlist, from the
    //                                                            request path. Four of these fail the
    //                                                            day a batch adds a grant without the
    //                                                            RFC.
    //   grant / schema app                                     — anonymous, which RFC-2026-021 §7/4
    //                                                            decides rather than defers: the first
    //                                                            anon grant is `usage on schema app`
    //                                                            and moves this refusal to the table.
    //   grant / SCHEMA private                                 — the credential references, for EVERY
    //                                                            identity including the service. This
    //                                                            is the first subject this suite has
    //                                                            in `private`, and the refusal moves
    //                                                            to the table the day anybody is
    //                                                            granted USAGE there.
    //
    // And exactly two cases in the whole batch are decided by ROW LEVEL SECURITY rather than by the
    // privilege system — `service-sees-zero-rows-in-the-ai-model-registry` and
    // `service-sees-zero-ai-model-policy-rows`, plus the service INSERT the policy layer refuses.
    // They are the cases the CI negative control for these two tables rests on, and they exist
    // because app_worker holds a grant and no policy, which is batch 010's shape and 010's reason.

    // --- app.ai_models: the GLOBAL curated catalog. ------------------------------------------------
    {
      id: 'owner-a-cannot-read-the-ai-model-registry',
      covers: ['RFC-2026-012§2', 'RFC-2026-012§3', 'RFC-2026-021§4', '§9.1/PUBLIC-0'],
      as: ownerA,
      sql: 'select label from app.ai_models where id = $1',
      params: [AI_MODEL],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_models' },
      why: 'A workspace owner holding the catalog row\'s exact id is refused by the PRIVILEGE system. '
         + '§9.1 gives "public model label" as its own example of PUBLIC-0 and says a client '
         + 'projection is allowed — it names no object, no tier and no mechanism, and the OBJECT is '
         + 'what this case is about. RFC-2026-012 §2 puts every direct client read behind a named '
         + 'security_invoker view, §3 starts that allowlist empty, and RFC-2026-021 C1 keeps it empty '
         + 'until a client caller exists. There is no client.',
    },
    {
      id: 'owner-b-cannot-read-the-ai-model-registry',
      covers: ['RFC-2026-012§3', '§5/global'],
      as: ownerB,
      sql: 'select label from app.ai_models where id = $1',
      params: [AI_MODEL],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_models' },
      why: 'THE SAME REFUSAL FROM THE OTHER TENANT, and the pair is the assertion. This row belongs to '
         + 'neither owner, so a cross-tenant case would prove nothing; the claim that means something '
         + 'is that the catalog is equally unreachable from both sides. Both workspaces\' model '
         + 'policies pin THIS id, which is what makes it a shared catalog rather than two rows.',
    },
    {
      id: 'anonymous-cannot-read-the-ai-model-registry',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: 'select label from app.ai_models where id = $1',
      params: [AI_MODEL],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'A curated model label is, with the published industry catalog, one of only two things in '
         + 'this schema an anonymous reader could plausibly be given — §9.1 classes both PUBLIC-0. '
         + 'RFC-2026-021 §7/4 decides against it and gives the structural reason: the first anon grant '
         + 'is `grant usage on schema app`, which moves the denial layer of every object at once. The '
         + 'refusal is asserted on the SCHEMA so that the day somebody widens it, this case fails '
         + 'rather than passing more quietly.',
    },
    {
      id: 'service-sees-zero-rows-in-the-ai-model-registry',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: 'select label from app.ai_models where id = $1',
      params: [AI_MODEL],
      expect: 'no-rows',
      why: 'THE ONE CASE ON THIS TABLE THAT ROW LEVEL SECURITY DECIDES, and the reason app_worker holds '
         + 'a SELECT grant at all. Without the grant this refusal would be 42501 either way and would '
         + 'prove only that somebody forgot a GRANT; with the grant and no policy, an empty read can '
         + 'only have come from RLS — and a service role that had quietly acquired BYPASSRLS would '
         + 'SUCCEED here. It is also the case the CI negative control for app.ai_models exists to '
         + 'break: a global table has no tenant boundary to disable, so this is what disabling row '
         + 'level security on it makes visible. That entry therefore rests on ONE case, which is said '
         + 'here and pinned in identity-isolation.test.mjs rather than left to be counted.',
    },
    {
      id: 'owner-a-cannot-add-to-the-ai-model-registry',
      covers: ['RFC-2026-012§1', '§8/no-row', 'OPEN-004'],
      as: ownerA,
      sql: 'insert into app.ai_models (provider, model_key, label)'
         + " values ('openai', 'attempted-model', 'attempted') returning id",
      params: [],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_models' },
      why: 'The catalog is platform-curated and written by an administrative seed. §8 has no row for a '
         + 'model in any of its four matrices, so there is no cell granting this and the refusal is '
         + 'deny-by-default reaching the privilege layer. It is also OPEN-004\'s stop condition as a '
         + 'control — "ห้ามให้ user ใส่ model ID อิสระ", a user may not type a free model id — expressed '
         + 'where a user cannot type one at all.',
    },
    {
      id: 'owner-a-cannot-relabel-an-ai-model-registry-row',
      covers: ['RFC-2026-012§1', '§8/no-row'],
      as: ownerA,
      sql: 'update app.ai_models set label = $2 where id = $1 returning id',
      params: [AI_MODEL, 'relabelled by a tenant'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_models' },
      why: 'THE CASE THAT SAYS THIS CATALOG IS NOT THE INDUSTRY CATALOG. app.industry_pack_versions is '
         + 'IMMUTABLE by §5 ("published immutable"), so nobody may update it and that is a property of '
         + 'the row. §5 calls this family "catalog + run history", so a curated label CAN be corrected '
         + '— by the seed, administratively — and what refuses a tenant here is the absence of a '
         + 'grant rather than the immutability of the row. Two different reasons, asserted as two '
         + 'different claims.',
    },
    {
      id: 'service-cannot-relabel-an-ai-model-registry-row',
      // NOT labelled `RFC-2026-017§7`, and the label was on it until the static suite refused it.
      // That rule requires every service case claiming §7 and demanding an ERROR to be an INSERT,
      // and the reason reaches further than its own wording: §7's claim is that the service is
      // denied BY ROW LEVEL SECURITY, and 010's header says a refusal without a grant "proves only
      // that somebody forgot a GRANT". This case is exactly that — app_worker holds no UPDATE here
      // — so it is evidence about the grant set and not about §7, and the label came off rather
      // than the rule being widened to fit it.
      covers: ['§12.6/8-negative', '§8/no-row'],
      as: service,
      sql: 'update app.ai_models set label = $2 where id = $1 returning id',
      params: [AI_MODEL, 'relabelled by the service'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_models' },
      why: 'app_worker holds SELECT on this table and NOTHING ELSE, so its read is refused by row level '
         + 'security and its write by the privilege system — two different layers on one table, each '
         + 'asserted as itself. A batch that widened the service grant to `select, insert, update` '
         + 'without a §8 row to justify it fails here.',
    },
    {
      id: 'service-cannot-delete-an-ai-model-registry-row',
      covers: ['§12.6/8-negative', '§8.5'],
      as: service,
      sql: 'delete from app.ai_models where id = $1 returning id',
      params: [AI_MODEL],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_models' },
      why: 'UPDATE and DELETE are separate privileges, so they are separate cases: a batch that granted '
         + 'one of them would be caught by exactly one of the two. No role holds DELETE here at all — '
         + '§8.5 has no broad delete and no document names a lifecycle field for a model row, so a '
         + 'curated model can be corrected and not retired, which 060_ai_gateway.sql records as owed.',
    },

    // --- app.ai_model_policies: a TENANT table whose boundary is not what refuses anyone. ----------
    {
      id: 'owner-a-cannot-read-the-ai-model-policy-of-workspace-a',
      covers: ['RFC-2026-012§2', 'RFC-2026-012§3', '§8/no-row'],
      as: ownerA,
      sql: MODEL_POLICY_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_model_policies' },
      why: 'THE OWNER OF THE WORKSPACE THE ROW BELONGS TO, refused on its own tenant\'s row. That is the '
         + 'shape a reader should stop at: on every tenant table before this one, an owner reads its '
         + 'own workspace\'s row and the case is a positive. Here §8 has no row for a model policy in '
         + 'any of its four matrices, so there is no cell to implement, and RFC-2026-012 classifies '
         + 'the family "view only" behind an allowlist RFC-2026-021 keeps empty. The refusal is the '
         + 'privilege layer, so it cannot be widened by editing a policy — there is none.',
    },
    {
      id: 'owner-b-cannot-read-the-ai-model-policy-of-workspace-b',
      covers: ['RFC-2026-012§3', '§8/no-row'],
      as: ownerB,
      sql: MODEL_POLICY_OF,
      params: ['__B__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_model_policies' },
      why: 'The same refusal from the other tenant, on the other tenant\'s own row. The pair is what '
         + 'stops the case above being read as a tenant boundary: both rows exist, both owners hold '
         + 'their own workspace\'s exact id, and neither reaches anything.',
    },
    {
      id: 'owner-a-cannot-read-the-ai-model-policy-of-workspace-b',
      covers: ['§12.6/1', '§8.6/5', 'RFC-2026-012§3'],
      as: ownerA,
      sql: MODEL_POLICY_OF,
      params: ['__B__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_model_policies' },
      why: 'THE CROSS-TENANT CASE, AND THE REASON IT IS NOT EVIDENCE ABOUT THE TENANT BOUNDARY. Tenant '
         + "A's owner holds tenant B's exact workspace id and is refused — at the same layer, with the "
         + 'same message, as they are refused their OWN row one case earlier. §12.6/1 is claimed here '
         + 'as a REFUSAL and never as an isolation proof: this table has no policy, so nothing about '
         + 'it distinguishes one workspace from another and the coverage note says so rather than '
         + 'counting a privilege refusal as a boundary.',
    },
    {
      id: 'anonymous-cannot-read-the-ai-model-policy-of-workspace-a',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: MODEL_POLICY_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'anon holds no USAGE on app, so the refusal lands on the schema rather than on the table.',
    },

    // =========================================================================================
    // Batch 130 — billing. The commitment, and the catalog that prices it.
    // =========================================================================================
    //
    // FOUR TABLES AND ONE POLICY, WHICH IS THE SMALLEST POLICY SET ANY BATCH HAS WRITTEN AND IS THE
    // point. §8.3 gives a client exactly one operation on this family — "Billing/subscription
    // SELECT", `Y` for the owner — and everything else is an absence asserted at the privilege
    // layer:
    //
    //   * NOBODY MAY WRITE A SUBSCRIPTION. Not the owner, not the service. CONTRIBUTING_AGENTS.md
    //     derives payment entitlement only from a verified webhook projection and that projection is
    //     batch 131, so the six write cases below are the batch's headline and every one of them is
    //     `deniedBy: 'grant'` — the refusal happens before row level security is consulted and
    //     cannot be undone by editing a policy.
    //   * THE PLAN CATALOG IS UNREACHABLE. Three global tables, no client grant, no policy, for
    //     030's reason under RFC-2026-021's empty allowlist. §9.1 licenses an owner/admin SUMMARY of
    //     FIN-3 content; a summary is a projection, a projection is an allowlist entry, and an entry
    //     is an RFC's to add.
    //
    // THIS IS ALSO THE FIRST FAMILY WHERE AN ACTIVE MEMBER SEES NONE OF ITS TENANT'S ROWS. Every
    // SELECT row in §8.1 and §8.2 is `Y` for all five built-in roles; §8.3's is `Y` for the owner and
    // `N` for editor, approver and viewer. Three cases assert that, each paired with the owner's
    // positive so the refusal is a policy and not an empty table — and each identity holds a member
    // scope, which does nothing here: a subscription is a WORKSPACE row and §7's three scope types
    // all name a Business or a Page (021's own sentence about "Workspace UPDATE: Admin P").

    // -- §12.6/1, §8.6/1 and §8.6/5. The tenant boundary, and the proof the catalog is global. ----
    {
      id: 'owner-a-sees-the-billing-subscription-of-tenant-a',
      covers: ['§12.6/1', '§8.6/1', '§8.3/billing-select'],
      as: ownerA,
      sql: subscribedTo,
      params: [A, PLAN_V1],
      expect: 'rows',
      why: 'The positive half, and the only thing a client may do in this batch. §8.3 marks '
         + '"Billing/subscription SELECT" `Y` for the owner, and the case names the pinned plan '
         + 'revision rather than selecting whatever is there, so it is an assertion about one row.',
    },
    {
      id: 'owner-b-sees-the-billing-subscription-of-tenant-b-on-the-same-plan-revision',
      covers: ['§12.6/1', '§8.6/1', '§5/global'],
      as: ownerB,
      sql: subscribedTo,
      params: [B, PLAN_V1],
      expect: 'rows',
      why: 'THE OTHER HALF, AND THE WHOLE OF WHAT "GLOBAL" MEANS HERE. Two tenants are subscribed to '
         + 'the SAME plan revision — the same uuid appears in both cases — and neither owner can see '
         + "the other's subscription. A plan catalog replicated per tenant would pass the case above "
         + 'and fail this one. It is also the only way this suite can say anything about the catalog '
         + 'at all: no identity may read app.billing_plan_versions, and the NOT NULL foreign key is '
         + 'what makes the row it names a fact rather than an assumption.',
    },
    {
      id: 'owner-a-cannot-read-the-billing-subscription-of-tenant-b',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: SUBSCRIPTION_OF,
      params: [B],
      expect: 'no-rows',
      why: "Tenant A's owner holds tenant B's exact workspace id, the row IS there — the case above "
         + 'proves it — and it is not visible. This is the tenant boundary on the one table in this '
         + 'batch that has one, and what it protects is what another business is paying and until '
         + 'when.',
    },

    // -- §12.6/4 and §8.6/2. The first SELECT row in §8 that an active member fails. --------------
    //
    // Each of the three identities below holds a member scope in workspace A and an ACTIVE
    // membership. Neither helps: §8.3 marks this cell `N` for their role, and a subscription is a
    // workspace row that no scope type reaches. The role is the only thing refusing, which is what
    // makes these cases about §8.3 rather than about visibility.
    {
      id: 'viewer-a-cannot-read-the-billing-subscription-of-tenant-a',
      covers: ['§12.6/4', '§8.6/2', '§8.3/billing-select'],
      as: viewerA,
      sql: SUBSCRIPTION_OF,
      params: [A],
      expect: 'no-rows',
      why: '§8.3: "Billing/subscription SELECT | Y | P | N | N | N | P". The viewer is an `N`, and '
         + 'this is the first table in the schema where an ACTIVE member of a workspace sees none of '
         + 'its rows — every SELECT row in §8.1 and §8.2 is `Y` for all five built-in roles. The '
         + 'owner reads the same row two cases earlier, so the refusal is a policy and not an empty '
         + 'table.',
    },
    {
      id: 'editor-a-cannot-read-the-billing-subscription-of-tenant-a',
      covers: ['§12.6/4', '§8.6/2', '§8.3/billing-select'],
      as: editorA,
      sql: SUBSCRIPTION_OF,
      params: [A],
      expect: 'no-rows',
      why: 'The editor is an `N` here where §8.2 makes them a `Y` on knowledge — the same identity, '
         + 'the same workspace, a different matrix row. Their member scope on business_a1 reaches '
         + 'nothing: §7\'s scope types all name a Business or a Page, and a subscription names '
         + 'neither, so 021\'s sentence about "Workspace UPDATE" applies here unchanged.',
    },
    {
      id: 'approver-a-cannot-read-the-billing-subscription-of-tenant-a',
      covers: ['§12.6/4', '§8.6/2', '§8.3/billing-select'],
      as: approverA,
      sql: SUBSCRIPTION_OF,
      params: [A],
      expect: 'no-rows',
      why: 'The third `N`. All three are asserted separately rather than as one claim about '
         + '"non-owners", because a policy written `role in (...)` with one role too many would be '
         + 'caught by exactly one of them.',
    },

    // -- §12.6/5, §12.6/6 and §12.6/8 on the subscription. ----------------------------------------
    {
      id: 'suspended-a-sees-no-billing-subscription',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: SUBSCRIPTION_OF,
      params: [A],
      expect: 'no-rows',
      why: '§12.6/5 asked of the billing surface. This identity was an owner-equivalent member before '
         + 'suspension only in the sense that the fixture gives it a scope row on purpose; what '
         + 'refuses it is app.workspace_member_role returning NULL for a membership that is not '
         + 'active, which is §7 through the batch 011 helper and nothing else.',
    },
    {
      id: 'anonymous-sees-no-billing-subscription',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: SUBSCRIPTION_OF,
      params: [A],
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
      why: 'The fourth cell, so the grid is four cases rather than three and an average.\n\n'
         + 'PUBLIC holds none either. Stated per table because the control is checkable per table: the '
         + 'day anon is granted USAGE this refusal moves to the table and the case fails.',
    },
    {
      id: 'approver-a-cannot-read-the-ai-model-policy-of-workspace-a',
      covers: ['§8.6/2', '§8/no-row'],
      as: approverA,
      sql: MODEL_POLICY_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_model_policies' },
      why: 'A THIRD ROLE, refused identically, which is what makes "there is no cell" a claim about the '
         + 'table rather than about the owner. §8.6 case 2 is "wrong role → deny"; on this table every '
         + 'role is the wrong role, and the case is here so that a batch implementing a §8 row for '
         + 'one role has to come past a case written about another.',
    },
    {
      id: 'owner-a-cannot-set-the-ai-model-policy-of-workspace-a',
      covers: ['RFC-2026-012§1', '§8/no-row'],
      as: ownerA,
      sql: 'insert into app.ai_model_policies (workspace_id, ai_model_id, created_by, updated_by)'
         + ' values ($1, $2, $3, $3) returning workspace_id',
      params: ['__A__', AI_MODEL, '__SELF__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_model_policies' },
      why: 'RFC-2026-012 decision 1 is "server-only mutation for every table family in §5, zero '
         + 'exceptions at G0", and on this family it is not an inherited debt but the state of the '
         + 'schema: no client role holds INSERT. The privilege check precedes execution, so this is '
         + '42501 and not the 23505 the existing row would eventually raise — and the case demands '
         + '42501, so it fails rather than passes if that ever stops being true.',
    },
    {
      id: 'owner-a-cannot-repin-the-ai-model-policy-of-workspace-a',
      covers: ['RFC-2026-012§1', '§8/no-row'],
      as: ownerA,
      sql: 'update app.ai_model_policies set ai_model_id = $2, updated_by = $3 where workspace_id = $1'
         + ' returning workspace_id',
      params: ['__A__', AI_MODEL, '__SELF__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_model_policies' },
      why: 'Re-pinning a workspace to a different curated model is the operation the AI settings screen '
         + 'exists for, and it has no path through the database today. It is refused at the privilege '
         + 'layer rather than filtered, which is a stronger refusal and a different one: a filtered '
         + 'UPDATE returns nothing and raises nothing.',
    },
    {
      id: 'owner-a-cannot-delete-the-ai-model-policy-of-workspace-a',
      covers: ['§8.5', '§8.6/9'],
      as: ownerA,
      sql: 'delete from app.ai_model_policies where workspace_id = $1 returning workspace_id',
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'ai_model_policies' },
      why: '"Even the owner", which is the claim §8.5 makes when it says there is no broad user delete. '
         + 'No role holds DELETE on this table — not the owner, not the service — and no document '
         + 'names a typed lifecycle field that would replace it, which is the refusal 021, 030 and 040 '
         + 'each recorded about their own tables.',
    },
    {
      id: 'service-sees-zero-ai-model-policy-rows',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: MODEL_POLICY_OF,
      params: ['__A__'],
      expect: 'no-rows',
      why: 'app_worker holds SELECT, INSERT and UPDATE on this table and NO POLICY, so the empty read is '
         + 'row level security and not a forgotten GRANT — and a service role that had quietly acquired '
         + 'BYPASSRLS would SUCCEED here. It is the first of the two cases the CI negative control for '
         + 'app.ai_model_policies rests on.',
    },
    {
      id: 'service-cannot-set-an-ai-model-policy',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: 'insert into app.ai_model_policies (workspace_id, ai_model_id, created_by, updated_by)'
         + ' values ($1, $2, $3, $3) returning workspace_id',
      // as_service has no JWT subject, so __SELF__ would resolve to undefined and come back 22P02
      // (batch 040's build error). The acting user named here is workspace A's owner, because §8.3
      // makes AI settings an owner operation and a service writing on someone's behalf records the
      // person it acted for.
      params: ['__A__', AI_MODEL, id('user_owner_a')],
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'ai_model_policies' },
      why: 'THE ONLY CASE IN THIS BATCH REFUSED BY THE POLICY LAYER, and the second the CI negative '
         + 'control for this table rests on. app_worker HOLDS the INSERT grant, so the privilege '
         + 'system admits the statement and FORCE ROW LEVEL SECURITY with an empty policy set is what '
         + 'refuses the row. That makes it the one `denied` case in this batch that DISABLING ROW '
         + 'LEVEL SECURITY BREAKS: without the policy layer the 42501 this case demands is gone, and '
         + 'the statement is then stopped — if at all — by the primary key, with a different '
         + 'SQLSTATE. Every other refusal here is a grant-layer one and would pass unchanged.\n\n'
         + 'THE PRIMARY KEY IS ALSO WHY THE ORDER MATTERS AND WHY THE CASE IS SELF-PROTECTING. '
         + 'workspace_a already holds a model policy, so this row would collide; PostgreSQL evaluates '
         + 'the RLS WITH CHECK before the heap insert, so the answer is 42501 and not 23505. The case '
         + 'demands 42501, which `expectDenied` enforces by SQLSTATE — so if that order ever changed, '
         + 'this fails loudly rather than passing on a constraint doing the policy\'s job.',
    },

    // --- private.ai_credential_references: no read by anyone, including the service. ---------------
    //
    // The first subject this suite has in `private`, and the reason every case below declares
    // `deniedOn: { kind: 'schema', name: 'private' }`. That declaration used to be forbidden outright
    // — C0's review D6 found `permission denied for schema private` satisfying a claim about a table,
    // because the HARNESS reaches `private.as_user` and a scaffolding failure looked like the object
    // under test being refused. The rule is now narrower rather than gone: a case may name `private`
    // only when its own statement names a `private.` TABLE a migration creates, which no scaffolding
    // failure can do. identity-isolation.test.mjs holds it to that.
    {
      id: 'owner-a-cannot-read-a-credential-reference',
      covers: ['§8.3/plain-credential', '§9.2', 'RFC-2026-012/credential-refs'],
      as: ownerA,
      sql: CREDENTIAL_REFERENCE_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'The owner of the workspace whose credential this is, refused before the table is reached. '
         + '§8.3 marks "Plain credential SELECT" N for every role including the service, and §3.1 puts '
         + 'secret references in `private` with no direct grant. The refusal lands on the SCHEMA '
         + 'because that is where the first missing privilege is, and asserting the schema rather than '
         + 'the table is what makes this case notice the day somebody writes `grant usage on schema '
         + 'private to authenticated` — which is the grant that would have to come first.',
    },
    {
      id: 'owner-b-cannot-read-a-credential-reference',
      covers: ['§8.3/plain-credential', '§9.2'],
      as: ownerB,
      sql: CREDENTIAL_REFERENCE_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: "The other tenant's owner, holding workspace A's exact id, refused identically. On this "
         + 'table the pair is not a tenant boundary and is not offered as one: nothing here '
         + 'distinguishes the two owners, which is exactly the claim — a credential reference is '
         + 'unreadable, not tenant-scoped-readable.',
    },
    {
      id: 'service-cannot-read-a-credential-reference',
      // NOT labelled `RFC-2026-017§7` either, for the same reason and more sharply: §7's claim is
      // that the service is denied by ROW LEVEL SECURITY, and this table deliberately grants it
      // nothing, so the refusal is the privilege system. That is the STRONGER refusal and it is a
      // DIFFERENT one, which is the whole distinction the layer declaration exists to keep.
      covers: ['§8.3/plain-credential', 'RFC-2026-012/credential-refs', '§12.6/8-negative'],
      as: service,
      sql: CREDENTIAL_REFERENCE_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'THE CASE THAT DEPARTS FROM THE app_worker SHAPE EVERY OTHER BATCH USES, deliberately. '
         + 'Everywhere else the service holds a grant and no policy so that a denial is attributable '
         + 'to RLS; here RFC-2026-012\'s inventory says in terms "no read by anyone, INCLUDING '
         + 'SERVICE" and §8.3\'s service column is N, so it holds no grant and the refusal is the '
         + 'privilege system on the schema. The price is that the CI negative control can have no '
         + 'entry for this table — disabling row level security restores no grant — and that absence '
         + 'is asserted in both directions in identity-isolation.test.mjs rather than left to be '
         + 'noticed.',
    },
    {
      id: 'anonymous-cannot-read-a-credential-reference',
      covers: ['§12.6/6', '§8.6/7', '§9.2'],
      as: anonymous,
      sql: CREDENTIAL_REFERENCE_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'Anonymous is refused on `private` rather than on `app`, which is what declaring the object '
         + 'is for: anon holds nothing anywhere, so the schema that refuses it is the schema the '
         + 'statement names. This said "the one anonymous case in the suite whose declared object is a '
         + 'different schema" until batch 110 added two more on its own `private` tables — a claim '
         + 'about the whole suite that the branch making it could not check.',
    },
    {
      id: 'owner-a-cannot-create-a-credential-reference',
      covers: ['§8.3/byok-manage', 'RFC-2026-012§1', '§9.2'],
      as: ownerA,
      sql: 'insert into private.ai_credential_references'
         + ' (workspace_id, provider, credential_reference, created_by, updated_by)'
         + " values ($1, 'openai', 'vault://fixture/attempted', $2, $2) returning id",
      params: ['__A__', '__SELF__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: '§8.3 MARKS "BYOK credential manage" `Y` FOR THE OWNER, AND THIS CASE ASSERTS THAT IT IS NOT '
         + 'IMPLEMENTED. That is a refusal with a reason rather than an omission: a client grant on a '
         + 'table in `private` is not one grant, it is `grant usage on schema private` first, which '
         + 'would put private.as_user and every future worker payload table inside the reach of every '
         + 'end user — RFC-2026-021 §7/4\'s structural argument about anon and schema app, one schema '
         + 'over. §3.1 says the owner reaches it through a typed service; RFC-2026-012 §4 says what '
         + 'that is; RFC-2026-021 §10 records that no command function exists. The day one does, this '
         + 'case is the one that has to change.',
    },
    {
      id: 'owner-a-cannot-revoke-a-credential-reference',
      covers: ['§8.3/byok-manage', '§11.4/revoke'],
      as: ownerA,
      sql: 'update private.ai_credential_references set revoked_at = now(), updated_by = $2'
         + ' where workspace_id = $1 returning id',
      params: ['__A__', '__SELF__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: '§11.4 step 2 requires API and connector credentials to be revoked during workspace closure, '
         + 'and `revoked_at` is the column that records it. No role can set it today, which means the '
         + 'closure lifecycle §11.4 describes has no path on this table either — stated as a case '
         + 'rather than as a comment, so the batch that brings the retention job (160) or the command '
         + 'surface arrives at a failing assertion instead of an empty one.',
    },
    {
      id: 'service-cannot-rotate-a-credential-reference',
      covers: ['§8.3/plain-credential', 'RFC-2026-012/credential-refs'],
      as: service,
      sql: 'update private.ai_credential_references set rotated_at = now()'
         + ' where workspace_id = $1 returning id',
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'Rotation is the operation a service performs and this one cannot. It is a separate case '
         + 'from the read for the reason every immutability pair in this suite is two cases: SELECT '
         + 'and UPDATE are separate privileges, and a batch that granted the service one of them would '
         + 'be caught by exactly one of the two.',
    },
    {
      id: 'owner-a-cannot-delete-a-credential-reference',
      covers: ['§8.5', '§8.6/9'],
      as: ownerA,
      sql: 'delete from private.ai_credential_references where workspace_id = $1 returning id',
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'The fourth verb, so the grid on this table is complete rather than three cells and an '
         + 'average. §8.5 has no broad user delete; deleting a credential reference is a revocation, '
         + 'which is a typed lifecycle field this table has and no role can write.\n\n'
         + 'PUBLIC holds none either. RFC-2026-021 §7/4 makes that an approved decision rather than '
         + 'an inherited convention, and declaring the SCHEMA is what makes this case fail the day '
         + 'somebody widens it.',
    },
    {
      id: 'service-sees-zero-billing-subscriptions',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: SUBSCRIPTION_OF,
      params: [A],
      expect: 'no-rows',
      why: 'app_worker holds SELECT on this table and no policy, so the empty read is row level '
         + 'security and not a forgotten GRANT, and a service role that had quietly acquired '
         + 'BYPASSRLS would SUCCEED here. It is one of the six cases the CI negative control for '
         + 'app.billing_subscriptions rests on.',
    },

    // -- THE HEADLINE. §8.3's "Plan/payment action", read the way RFC-2026-012's crux reads it. ---
    //
    // "Plan/payment action | Y | N | N | N | N | P" marks the OWNER `Y`, and none of the six cases
    // below implements that cell as a table write, because a plan/payment action is a Checkout
    // session created by a server handler and this row is the projection of what the provider then
    // confirmed. RFC-2026-012's crux section is the reading: a policy "constrains the content of the
    // row and the identity of the session; it says nothing about the tier, and RLS has no predicate
    // that could".
    //
    // So all six are refused at the GRANT layer — no role holds INSERT, UPDATE or DELETE on this
    // table — and the OWNER and the SERVICE are asserted separately at each verb, because they are
    // refused for two different reasons that a single claim would blur: the owner because
    // CONTRIBUTING_AGENTS.md and the billing contract forbid a client-asserted entitlement, and the
    // service because the writer is the webhook projection and the webhook projection is batch 131.
    {
      id: 'owner-a-cannot-create-a-billing-subscription',
      covers: ['§8.3/plan-payment-action', 'RFC-2026-012§1', '§8.6/2'],
      as: ownerA,
      ...startSubscription(A, PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_subscriptions' },
      why: 'THE CASE THIS BATCH EXISTS FOR. A workspace owner — the role §8.3 marks `Y` on '
         + '"Plan/payment action" — cannot bring a subscription into existence by writing a row. '
         + 'CONTRIBUTING_AGENTS.md: "Payment entitlement is derived only from a verified Stripe '
         + 'webhook projection. Checkout redirects are never proof of payment." The refusal is a '
         + 'privilege-layer one, so it cannot be widened by editing a policy — and it cannot be '
         + 'satisfied by the one-live-per-workspace index either, because expectDenied refuses every '
         + 'SQLSTATE but 42501 and a granted INSERT would answer 23505.',
    },
    {
      id: 'owner-a-cannot-extend-a-billing-subscription',
      covers: ['§8.3/plan-payment-action', 'RFC-2026-012§1'],
      as: ownerA,
      ...extendSubscription(A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_subscriptions' },
      why: 'Granting yourself another year, which is what an UPDATE on this table is. It is a '
         + 'separate case from the INSERT because UPDATE is a separate privilege: a batch that '
         + 'granted one of them would be caught by exactly one of these.',
    },
    {
      id: 'owner-a-cannot-delete-a-billing-subscription',
      covers: ['§8.3/plan-payment-action', '§8.5/no-broad-delete'],
      as: ownerA,
      ...endSubscription(A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_subscriptions' },
      why: 'Erasing the record of what was owed. §8.5 has no broad user delete anywhere, and here the '
         + 'absence is doubled: there is no soft-delete path either, because §9\'s state machine '
         + 'ENDS a subscription (`canceled`) rather than removing it and §10 keeps the finance record '
         + 'seven years by default. "Even the owner" is the claim, which is what makes this case '
         + 'carry §12.6/4 on this table rather than a viewer case doing so.',
    },
    {
      id: 'service-cannot-create-a-billing-subscription',
      // NOT labelled RFC-2026-017§7, deliberately, and for the opposite reason to every earlier
      // batch's service INSERT. §7 asks for the service to be denied BY ROW LEVEL SECURITY with an
      // error, which needs a GRANT for RLS to then refuse — 010's whole shape. Batch 130 grants
      // app_worker no INSERT at all, so this refusal is the privilege system: stronger, and a
      // different claim. The §7 cases for this batch's tables are the four `service-sees-zero-*`
      // reads, where the grant exists and the empty result can only be RLS.
      covers: ['§12.6/8-negative', '§8.3/plan-payment-action'],
      as: service,
      ...startSubscription(A, PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_subscriptions' },
      why: 'AND THE SERVICE CANNOT EITHER, WHICH IS THE PART THAT SURPRISES. §8.3 marks the service '
         + '`P` and nothing defines that permission, so batch 130 grants app_worker SELECT and '
         + 'nothing else — 021\'s rule, that "a verb no client and no policy holds would be a '
         + 'privilege nobody reviewed against a caller". The verbs this table\'s writer needs belong '
         + 'to the webhook projection, which is batch 131, and 131 grants them in the change that '
         + 'brings the thing that needs them. Until then NOTHING IN THIS REPOSITORY CAN CREATE A '
         + 'SUBSCRIPTION, and that is the claim, asserted rather than described.',
    },
    {
      id: 'service-cannot-extend-a-billing-subscription',
      covers: ['§12.6/8-negative'],
      as: service,
      ...extendSubscription(A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_subscriptions' },
      why: 'The second verb, at the grant layer, for the reason the owner pair gives. Its READ two '
         + 'cases up is refused by row level security instead — two different layers on one table, '
         + 'each asserted as itself.',
    },
    {
      id: 'service-cannot-delete-a-billing-subscription',
      covers: ['§12.6/8-negative'],
      as: service,
      ...endSubscription(A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_subscriptions' },
      why: 'The third verb, so all three cells of the grid are live for the service as well as for '
         + 'the owner rather than three and an average.',
    },

    // -- The GLOBAL plan catalog, whose control is not a tenant boundary. -------------------------
    //
    // §9.1 classifies a price FIN-3 with the client projection "owner/admin summary", and
    // RFC-2026-012 §2/3 puts every summary behind a named security_invoker view on an allowlist that
    // starts empty and grows only by RFC. RFC-2026-021 then decided the mechanism and added no
    // entry. These cases are that allowlist, executed: a denial at the GRANT layer is what an empty
    // allowlist looks like from the request path, and the day a batch adds the grant without the RFC
    // they fail.
    //
    // The plan catalog is the strongest candidate this repository has produced — §7.1 of the billing
    // contract already describes the screen that would read it — and it fails RFC-2026-021's C1 for
    // exactly the reason the industry catalog fails it: there is no client, because there is no
    // `src/`. Which batch would create the entry is NOT ASSIGNED, and naming one here would create a
    // batch number by citation.
    {
      id: 'owner-a-cannot-read-the-billing-plan-catalog',
      covers: ['RFC-2026-012§2', 'RFC-2026-012§3', '§9.1/FIN-3'],
      as: ownerA,
      sql: readPlanCatalog,
      params: [PLAN],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plans' },
      why: 'A workspace owner holding the plan row\'s exact id is refused by the PRIVILEGE system. '
         + '§9.1 says an owner/admin SUMMARY of FIN-3 content may be shown to a client; it names no '
         + 'object and no tier, and the object is what this case is about. The owner can read their '
         + 'own subscription and cannot resolve the plan it names — which is what the empty allowlist '
         + 'costs, stated by a passing case rather than by a comment.',
    },
    {
      id: 'owner-b-cannot-read-the-billing-plan-catalog',
      covers: ['RFC-2026-012§3', '§5/global'],
      as: ownerB,
      sql: readPlanCatalog,
      params: [PLAN],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plans' },
      why: 'THE SAME REFUSAL FROM THE OTHER TENANT, and the pair is the assertion. This row belongs '
         + 'to neither of them, so a cross-tenant case would prove nothing; the claim that means '
         + 'something is that the catalog is equally unreachable from both sides.',
    },
    {
      id: 'anonymous-cannot-read-the-billing-plan-catalog',
      covers: ['§12.6/6', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: readPlanCatalog,
      params: [PLAN],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'A pricing page is the most ordinary unauthenticated surface a product has, which is '
         + 'exactly why the refusal is asserted rather than assumed. anon holds no USAGE on app, so '
         + 'name resolution stops at the SCHEMA — and RFC-2026-021 §7/4 says why that is structural: '
         + 'the first anon grant is `usage on schema app`, which moves the denial layer of every '
         + 'object in app at once. A public price list is a decision about the product having an '
         + 'unauthenticated surface, and this case makes it arrive as a failing test.',
    },
    {
      id: 'service-sees-zero-rows-in-the-billing-plan-catalog',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: readPlanCatalog,
      params: [PLAN],
      expect: 'no-rows',
      why: 'THE ONE CASE ON THIS TABLE THAT ROW LEVEL SECURITY DECIDES, and the reason app_worker '
         + 'holds a SELECT grant at all. Without the grant the refusal would be 42501 either way and '
         + 'would prove only that somebody forgot a GRANT; with the grant and no policy, an empty '
         + 'read can only have come from RLS. It is also the case the CI negative control for '
         + 'app.billing_plans exists to break, and that control therefore rests on exactly one case, '
         + 'which is stated in the workflow beside it.',
    },
    {
      id: 'owner-a-cannot-add-a-row-to-the-billing-plan-catalog',
      covers: ['RFC-2026-012§1', '§8/no-row'],
      as: ownerA,
      ...publishPlan,
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plans' },
      why: 'The plan catalog is platform-curated and written by the global seed. §8 has no row for a '
         + 'plan catalog in any of its four matrices — §8.3\'s two rows are about a SUBSCRIPTION and '
         + 'about a plan/payment ACTION — so there is no cell granting this and the refusal is '
         + 'deny-by-default reaching the privilege layer.',
    },

    // -- The published price. Global, immutable, and the one row whose content is money. ----------
    {
      id: 'owner-a-cannot-read-a-published-plan-price',
      covers: ['RFC-2026-012§2', '§9.1/FIN-3', '§3.2/money'],
      as: ownerA,
      sql: readPlanPrice,
      params: [PLAN_V1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plan_versions' },
      why: 'The price of the plan this owner is subscribed to, refused to that owner. It reads '
         + 'strangely and it is the empty read allowlist working exactly as RFC-2026-012 §3 designed '
         + 'it: what a client may be SHOWN is a projection, and there is none. §9.1 classes price '
         + 'FIN-3 — "restricted, immutable history" — which is a classification and not an object.',
    },
    {
      id: 'owner-b-cannot-read-a-published-plan-price',
      covers: ['RFC-2026-012§3', '§5/global'],
      as: ownerB,
      sql: readPlanPrice,
      params: [PLAN_V1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plan_versions' },
      why: 'The pair again, on the table that matters most: both tenants are subscribed to this '
         + 'revision and neither may read what it costs.',
    },
    {
      id: 'anonymous-cannot-read-a-published-plan-price',
      covers: ['§12.6/6', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: readPlanPrice,
      params: [PLAN_V1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA, for the reason §7/4 gives. Asserted per table rather than once, because '
         + 'the control is the same control and stating it per table is what makes it checkable per '
         + 'table.',
    },
    {
      id: 'service-sees-zero-published-plan-prices',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: readPlanPrice,
      params: [PLAN_V1],
      expect: 'no-rows',
      why: 'The same shape one table over, and the single case the CI negative control for '
         + 'app.billing_plan_versions rests on. The entitlement resolver will have to read prices; '
         + 'the policy that lets it is owed to batch 132, and until then the service reads nothing '
         + 'and this case says so out loud.',
    },
    {
      id: 'owner-a-cannot-publish-a-plan-price',
      covers: ['RFC-2026-012§1', '§8/no-row'],
      as: ownerA,
      ...publishPlanPrice(PLAN),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plan_versions' },
      why: 'Publishing a revision is deciding what the product charges every tenant at once. The '
         + 'refusal is a privilege-layer one so it cannot be widened by editing a policy, and '
         + 'revision 9 is a number no fixture row holds so nothing here can be satisfied by the '
         + '(billing_plan_id, revision) unique index firing first.',
    },
    {
      id: 'owner-a-cannot-rewrite-a-published-plan-price',
      covers: ['§8.6/9', '§4/invariant-8'],
      as: ownerA,
      ...rewritePlanPrice(PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plan_versions' },
      why: 'Setting the price to zero, which is the shape of the attack this table\'s immutability '
         + 'exists to refuse. §3.2 and §4 invariant 8 make a published version immutable and §5.1 '
         + 'says a price mapping changes by publishing a new revision; it is expressed as an ABSENT '
         + 'GRANT, so the refusal happens before RLS is consulted.',
    },
    {
      id: 'owner-a-cannot-delete-a-published-plan-price',
      covers: ['§8.6/9', '§4/invariant-8'],
      as: ownerA,
      ...deletePlanPrice(PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plan_versions' },
      why: 'UPDATE and DELETE are separate privileges, so they are separate cases: a batch that '
         + 'granted one of them would be caught by exactly one of the two, and a pair asserted as '
         + 'one claim would catch neither.',
    },
    {
      id: 'service-cannot-rewrite-a-published-plan-price',
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      ...rewritePlanPrice(PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plan_versions' },
      why: 'The service holds SELECT here and nothing else, so this is refused at the privilege layer '
         + 'while its READ is refused by row level security. A service that could rewrite a published '
         + 'price could change what every tenant is charged without a migration.',
    },
    {
      id: 'service-cannot-delete-a-published-plan-price',
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      ...deletePlanPrice(PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_plan_versions' },
      why: 'The fourth cell, so all four are live on this table rather than three and an average.',
    },

    // -- What a plan grants. Global, immutable, and batch 132's input. ----------------------------
    {
      id: 'owner-a-cannot-read-a-plan-entitlement',
      covers: ['RFC-2026-012§2', 'RFC-2026-012§3'],
      as: ownerA,
      sql: readPlanEntitlement,
      params: [PLAN_V1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'plan_entitlements' },
      why: 'What a plan includes is behind the same empty allowlist as what it costs. The row a '
         + 'CLIENT would eventually read is not this one anyway: §5.1 puts the effective, resolved '
         + 'answer in app.workspace_entitlements, which §6\'s registry gives to batch 132 and which '
         + 'this batch deliberately does not create.',
    },
    {
      id: 'anonymous-cannot-read-a-plan-entitlement',
      covers: ['§12.6/6', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: readPlanEntitlement,
      params: [PLAN_V1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA, the third of three, so the day anon is granted USAGE on app all three fail '
         + 'together rather than one of them being noticed.',
    },
    {
      id: 'service-sees-zero-plan-entitlements',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: readPlanEntitlement,
      params: [PLAN_V1],
      expect: 'no-rows',
      why: 'The single case the CI negative control for app.plan_entitlements rests on. Batch 132 is '
         + 'the resolver that will have to read this table, and the policy that lets it is owed to '
         + 'that batch — 010\'s rule, that a grant issued ahead of the thing that needs it is a grant '
         + 'nobody reviews against a caller.',
    },
    {
      id: 'owner-a-cannot-write-a-plan-entitlement',
      covers: ['RFC-2026-012§1', '§8/no-row'],
      as: ownerA,
      ...writePlanEntitlement(PLAN, PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'plan_entitlements' },
      why: 'Adding an entitlement to your own plan is granting yourself a feature. The key is one no '
         + 'fixture row holds, so the refusal cannot be the (billing_plan_version_id, feature_key) '
         + 'unique index standing in for a missing grant.',
    },
    {
      id: 'owner-a-cannot-raise-a-plan-entitlement',
      covers: ['§8.6/9', '§4/invariant-8'],
      as: ownerA,
      ...raisePlanEntitlement(PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'plan_entitlements' },
      why: 'Raising your own seat limit from three to nine hundred thousand. §5.1 calls this table a '
         + '"versioned contract", so what a plan grants changes by publishing a new revision and '
         + 'never by updating a row — and §5.3 requires that change to carry a version, a migration '
         + 'impact and an approval, none of which an UPDATE would have.',
    },
    {
      id: 'owner-a-cannot-delete-a-plan-entitlement',
      covers: ['§8.6/9', '§4/invariant-8'],
      as: ownerA,
      ...deletePlanEntitlement(PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'plan_entitlements' },
      why: 'The second verb. Deleting a limit is a subtler upgrade than raising one, because whatever '
         + 'resolves entitlements has to decide what an ABSENT row means — which is 021\'s question '
         + 'about an absent scope row, arriving in batch 132\'s inbox rather than in this one.',
    },
    {
      id: 'service-cannot-raise-a-plan-entitlement',
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      ...raisePlanEntitlement(PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'plan_entitlements' },
      why: 'And the service is refused the same two verbs, so this table\'s grid is complete rather '
         + 'than resting on the apply-time block for half of it.',
    },
    {
      id: 'service-cannot-delete-a-plan-entitlement',
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      ...deletePlanEntitlement(PLAN_V1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'plan_entitlements' },
      why: 'The fourth cell. 020 left one cell of its own grid to an apply-time block and said so; '
         + 'this batch leaves none, because a plan entitlement is what a paying customer was '
         + 'promised.',
    },

    // -- BATCH 140. The audit log, which nobody may read and nobody may write. ------------------
    //
    // §8.4's four audit rows, as denials. Every case below is `denied` rather than `no-rows`, and
    // the difference is the whole reason this block reads as it does: `authenticated` holds NO
    // PRIVILEGE AT ALL on either table, so a read is refused by the privilege system before row
    // level security is reached, and an empty result would be a weaker outcome than the database
    // actually produces. Each declares the LAYER and the OBJECT, so a case cannot be satisfied by a
    // refusal somewhere else in the scaffolding.
    //
    // THE FIVE CLIENT CELLS OF "Tenant audit SELECT" ARE FIVE SEPARATE CASES — Y, P, O, "approval
    // trail" and N — and that is not padding. 140_audit.sql refuses all five for five different
    // reasons, two of which are refusals of things that COULD have been implemented (the owner's `Y`
    // and the editor's `O`), and a single case would leave the other four looking like consequences
    // of it. The day the RFC that opens the read allowlist lands, exactly the cells it opens change
    // here, in a diff, one line each.
    {
      id: 'owner-a-cannot-read-the-audit-log-of-workspace-a',
      covers: ['§8.4/tenant-audit-select', 'RFC-2026-012§2', 'RFC-2026-021§7'],
      as: ownerA,
      sql: AUDIT_BY_ID,
      params: [AUDIT_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'THE STRONGEST CLIENT CELL IN THE MATRIX, REFUSED. §8.4 marks "Tenant audit SELECT" `Y` for '
         + 'the owner, unconditionally, and this batch implements it nowhere — RFC-2026-012 decision 2 '
         + 'puts a client read behind a named security_invoker view, its inventory classifies audit '
         + '"safe view only", and RFC-2026-021 §7/3 keeps that allowlist EMPTY. The refusal is at the '
         + 'GRANT layer because no client role holds a privilege here at all, which is stronger than a '
         + 'policy filtering to zero rows and is why the case demands an error.',
    },
    {
      id: 'owner-b-cannot-read-the-audit-log-of-workspace-b',
      covers: ['§8.4/tenant-audit-select', '§8.6/5'],
      as: ownerB,
      sql: AUDIT_BY_ID,
      params: [AUDIT_B1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'BOTH OWNERS ARE REFUSED IDENTICALLY, which is batch 030\'s shape and is what stands in place '
         + 'of a cross-tenant claim on a table no tenant can read. Without it the case above would be '
         + 'satisfied by a tenant boundary rather than by the absent grant it is actually about: A '
         + 'cannot read B\'s audit log AND B cannot read B\'s own.',
    },
    {
      id: 'editor-a-cannot-read-their-own-audit-log',
      covers: ['§8.4/tenant-audit-select', '§9.1/AUTH-3'],
      as: editorA,
      sql: AUDIT_BY_ID,
      params: [AUDIT_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'THE ONE CELL IN THE WHOLE MATRIX WHERE THE READER IS THE SUBJECT OF THE RECORD. §8.4 marks '
         + '"Tenant audit SELECT" `O` for the editor — own rows — and the fixture makes user_editor_a '
         + 'the ACTOR of audit_log_a1 on purpose, so this case is about that cell and not about a role '
         + 'the matrix denies anyway. It would have been implementable: `actor_kind = \'user\' and '
         + 'actor_id = (select auth.uid())::text`. It is refused because §9.1 gives AUTH-3 a "minimum '
         + 'role projection" and a base-table grant projects nothing, and because the object that '
         + 'carries a client read is an allowlist entry this batch may not add.',
    },
    {
      id: 'approver-a-cannot-read-the-audit-log',
      covers: ['§8.4/tenant-audit-select'],
      as: approverA,
      sql: AUDIT_BY_ID,
      params: [AUDIT_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: '§8.4 gives the approver neither Y nor N but the words "approval trail" — a subset scoped by '
         + 'the approval tables, which are batch 090 and do not exist. There is no trail to scope to, '
         + 'so the cell is not merely unimplemented here: it is unimplementable until 090 lands, and '
         + 'this case is where that becomes visible rather than staying a note.',
    },
    {
      id: 'viewer-a-cannot-read-the-audit-log',
      covers: ['§8.4/tenant-audit-select', '§8.6/2'],
      as: viewerA,
      sql: AUDIT_BY_ID,
      params: [AUDIT_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'The only client cell §8.4 marks `N`, and the only one this batch refuses for the reason the '
         + 'matrix gives rather than for a reason about objects and allowlists. It is the control for '
         + 'the four cases above: they are refused identically to a role the document says must be, '
         + 'which is what makes "no client role reaches this table" a statement about the table.',
    },
    {
      id: 'suspended-a-cannot-read-the-audit-log',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: AUDIT_BY_ID,
      params: [AUDIT_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: '§12.6/5 asks for zero TENANT rows and gets an error instead, which is strictly stronger and '
         + 'is recorded as the layer rather than smoothed into the weaker claim. On every other table '
         + 'in this schema a suspended member is filtered by a policy; here they are refused by the '
         + 'privilege system exactly as an active owner is, because the table distinguishes no client '
         + 'identity from another.',
    },
    {
      id: 'anonymous-cannot-read-the-audit-log',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: AUDIT_BY_ID,
      params: [AUDIT_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused during name resolution, on the SCHEMA, because anon holds no USAGE on app — which '
         + 'RFC-2026-021 §7/4 makes an approved decision rather than an inherited convention. The day '
         + 'somebody grants it, this refusal moves to the table and the case fails, which is the whole '
         + 'reason the object is declared.',
    },
    {
      id: 'owner-a-cannot-write-an-audit-log',
      covers: ['§8.4/audit-insert', '§8.6/8'],
      as: ownerA,
      ...writeAuditLog('__A__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'THE CASE THIS BATCH EXISTS FOR, ON THE WRITE SIDE. §8.4 marks "Audit/security INSERT" `N` '
         + 'for every client role including the workspace owner, so the party an audit record is about '
         + 'cannot forge one about themselves — the row it attempts is otherwise VALID, so nothing but '
         + 'the absent grant refuses it. At the privilege layer, which is what makes it a refusal a '
         + 'later policy edit cannot widen.',
    },
    {
      id: 'owner-a-cannot-rewrite-an-audit-log',
      covers: ['§8.4/audit-mutation', '§8.6/9', '§4/invariant-8'],
      as: ownerA,
      ...rewriteAuditLog(AUDIT_A1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'An audit record\'s value is that the party it is about cannot alter it. §8.4\'s '
         + '"Audit/security UPDATE/DELETE | N N N N N N" is the only row in §8 where every column '
         + 'including the service is N, and it is expressed as an absent grant, an absent policy AND a '
         + 'trigger. The refusal here is the FIRST of those three: the privilege system, which never '
         + 'reaches the trigger. The trigger is proven against the one identity that gets past the '
         + 'privilege system — the table owner — by 140_audit.sql\'s own apply-time probe, because no '
         + 'identity this harness can assume ever does.',
    },
    {
      id: 'owner-a-cannot-delete-an-audit-log',
      covers: ['§8.4/audit-mutation', '§8.6/9', '§8.5'],
      as: ownerA,
      sql: 'delete from app.audit_logs where id = $1 returning id',
      params: [AUDIT_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'UPDATE and DELETE are separate privileges, so they are separate cases: a batch that granted '
         + 'one of them would be caught by exactly one of these two. §8.5 has no broad user delete and '
         + 'this table has no lifecycle field to soft-delete through either — an audit record has no '
         + 'lifecycle at all, which is what append-only means.',
    },
    {
      id: 'service-sees-zero-audit-logs',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.4/tenant-audit-select'],
      as: service,
      sql: AUDIT_BY_ID,
      params: [AUDIT_A1],
      expect: 'no-rows',
      why: 'app_worker holds SELECT on this table and NO POLICY, so an empty read is attributable to row '
         + 'level security rather than to a forgotten GRANT — and a service role that had quietly '
         + 'acquired BYPASSRLS would return the row instead. §8.4 marks the service `P` here, and a `P` '
         + 'nobody has defined is a permission nobody may write. It is ONE OF THE TWO CASES the CI '
         + 'negative control for app.audit_logs rests on: every other case on this table is a '
         + 'privilege-layer refusal that disabling row level security would not restore.',
    },
    {
      id: 'service-cannot-write-an-audit-log',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.4/audit-insert'],
      as: service,
      // The actor is the workspace owner's subject and NOT `__SELF__`: `as_service` sets a role and a
      // claim set with no `sub`, and CI found the cost of forgetting that once already. No policy on
      // this table reads the column, so the value is arbitrary and the case says so.
      ...writeAuditLog('__A__', id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'THE SECOND `S` CELL IN THIS REPOSITORY, DENIED — batch 050 reached the other one in parallel. §8.4 marks "Audit/security INSERT" `S` — '
         + 'service only — and batch 010 named 140 as one of the batches that would inherit '
         + 'RFC-2026-016 §2\'s service-policy shape. It is not written, because §2 conditions that '
         + 'policy on "a server-set workspace GUC derived from CTR-TEN-001" and NO SUCH GUC EXISTS: no '
         + 'name, no setter, no contract, and DATA-DEC-03 open until G1. So app_worker holds the INSERT '
         + 'grant and no policy, the refusal is row level security finding no permissive policy, and '
         + 'the declared POLICY layer is what says so. It is the second of the two cases the negative '
         + 'control rests on: with row level security off, this write SUCCEEDS and the case fails.',
    },
    {
      id: 'service-cannot-rewrite-an-audit-log',
      // NOT labelled RFC-2026-017§7, following batch 020's note and 040's: that clause asks for the
      // service to be denied BY ROW LEVEL SECURITY with an error, and this refusal comes from the
      // privilege system, which is a stronger denial and a DIFFERENT claim.
      covers: ['§8.4/audit-mutation', '§8.6/9'],
      as: service,
      ...rewriteAuditLog(AUDIT_A1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: '§8.4\'s mutation row marks the SERVICE `N` alongside every client role, which almost nothing '
         + 'else in §8 does. app_worker holds SELECT and INSERT here, so the refusal is about the VERB '
         + 'rather than about the table — which is what distinguishes this from a role that was simply '
         + 'granted nothing.',
    },
    {
      id: 'service-cannot-delete-an-audit-log',
      covers: ['§8.4/audit-mutation', '§8.6/9'],
      as: service,
      sql: 'delete from app.audit_logs where id = $1 returning id',
      params: [AUDIT_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'audit_logs' },
      why: 'The fourth cell of the grid, so all four are live on this table rather than three and an '
         + 'average: update and delete by a client identity and by the service, each at the grant '
         + 'layer. TRUNCATE is the fifth verb and no identity this harness can assume holds it either; '
         + 'it is asserted by the migration\'s apply-time block, against the role that does.',
    },

    // -- BATCH 140. The security event, which §8 gives the least to of anything in the schema. ---
    //
    // SECURITY-4 is the highest class in §9.1 that is not a secret, its client projection is
    // "security/admin safe view only", and RFC-2026-012's inventory marks the family SERVER-ONLY.
    // Every case below is therefore a refusal, and the pairs are chosen so that each says something
    // the audit cases above do not: the owner's cell here is `P` rather than `Y`, the editor's is `N`
    // rather than `O`, and the service's read cell is `S` rather than `P` — the strongest read
    // permission in the matrix, and still refused, because the policy that would carry it needs the
    // same workspace GUC the INSERT does.
    {
      id: 'owner-a-cannot-read-the-security-event',
      covers: ['§8.4/security-event-details', 'RFC-2026-012§2'],
      as: ownerA,
      sql: SECURITY_EVENT_BY_ID,
      params: [SECURITY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: '§8.4 marks "Security event details" `P` for the owner and `N` for everybody else, and `P` is '
         + '"passes per policy/EXPLICIT capability" over a capability set no document defines — the '
         + 'refusal 011, 020, 021 and 030 each recorded and RFC-2026-020 §8 ratified. RFC-2026-012 '
         + 'classifies the family server-only besides. Two independent reasons, one refusal, at the '
         + 'privilege layer.',
    },
    {
      id: 'owner-b-cannot-read-the-security-event',
      covers: ['§8.4/security-event-details', '§8.6/5'],
      as: ownerB,
      sql: SECURITY_EVENT_BY_ID,
      params: [SECURITY_B1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: 'The far side, refused identically. The two security events differ in the one column §9.1 '
         + 'cares about — this one names an actor and the A-side one does not — and neither owner '
         + 'reaches either, so the refusal cannot be read as a tenant boundary.',
    },
    {
      id: 'editor-a-cannot-read-the-security-event',
      covers: ['§8.4/security-event-details', '§8.6/2'],
      as: editorA,
      sql: SECURITY_EVENT_BY_ID,
      params: [SECURITY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: 'The same identity that is `O` on the audit log is `N` here, which is the difference between '
         + 'the two families in one pair of cases. §9.1 puts a raw security event and an IP or user '
         + 'agent hash in SECURITY-4 and the audit actor in AUTH-3; the matrix follows, and so does '
         + 'this suite.',
    },
    {
      id: 'suspended-a-cannot-read-the-security-event',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: SECURITY_EVENT_BY_ID,
      params: [SECURITY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: 'Asked of the second table because a control stated per table is a control checkable per '
         + 'table. It is an error rather than an empty read for the same reason as on the audit log: '
         + 'no client role holds a privilege here at all.',
    },
    {
      id: 'anonymous-cannot-read-the-security-event',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: SECURITY_EVENT_BY_ID,
      params: [SECURITY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA, as every anonymous case in this suite is. Batch 030 recorded that its '
         + 'PUBLIC-0 catalog was the family somebody might argue for exposing anonymously and 040 '
         + 'recorded that CONTENT-2 knowledge was the family nobody would; this is the family at the '
         + 'far end of that scale, and the control is the same control.',
    },
    {
      id: 'owner-a-cannot-write-a-security-event',
      covers: ['§8.4/audit-insert', '§8.6/8'],
      as: ownerA,
      ...writeSecurityEvent('__A__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: '"Audit/security INSERT | N N N N N S" covers both tables in one row, so the client write is '
         + 'refused here exactly as it is on the audit log. A workspace owner who could write their '
         + 'own security events could manufacture the record of an incident they caused.',
    },
    {
      id: 'owner-a-cannot-rewrite-a-security-event',
      covers: ['§8.4/audit-mutation', '§8.6/9', '§4/invariant-8'],
      as: ownerA,
      ...rewriteSecurityEvent(SECURITY_A1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: 'Append-only, by absent grant, absent policy and trigger — the same three mechanisms as the '
         + 'audit log, asserted separately because they are separate tables and a batch that protected '
         + 'one and forgot the other would pass every case written about the first.',
    },
    {
      id: 'owner-a-cannot-delete-a-security-event',
      covers: ['§8.4/audit-mutation', '§8.6/9', '§8.5'],
      as: ownerA,
      sql: 'delete from app.security_events where id = $1 returning id',
      params: [SECURITY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: 'The second verb, separately. §10 gives this family a 2-year retention and "hash/anonymize '
         + 'PII; retain active investigation/legal hold" — every one of which is an UPDATE or a DELETE '
         + 'no role holds, which is the conflict between §8.4 and §10 that 140_audit.sql records and '
         + 'batch 160 inherits.',
    },
    {
      id: 'service-sees-zero-security-events',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.4/security-event-details'],
      as: service,
      sql: SECURITY_EVENT_BY_ID,
      params: [SECURITY_A1],
      expect: 'no-rows',
      why: 'THE STRONGEST READ CELL IN §8.4 — the service is `S` on "Security event details", not `P` — '
         + 'and it is still an empty read, because the policy that would carry it needs the workspace '
         + 'GUC RFC-2026-016 §2 requires and nothing defines. app_worker HOLDS the SELECT grant, so '
         + 'this is row level security and not a forgotten GRANT, and it is one of the two cases the CI '
         + 'negative control for app.security_events rests on.',
    },
    {
      id: 'service-cannot-write-a-security-event',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.4/audit-insert'],
      as: service,
      ...writeSecurityEvent('__A__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: 'The `S` INSERT cell on the second table, denied for the same missing GUC. It is the RAISING '
         + 'half of RFC-2026-017 §7 here — only an INSERT can carry it, because an UPDATE a USING '
         + 'clause filters reports zero rows and raises nothing — and the second case the negative '
         + 'control rests on: with row level security off, app_worker holds the grant and the write '
         + 'lands.',
    },
    {
      id: 'service-cannot-rewrite-a-security-event',
      covers: ['§8.4/audit-mutation', '§8.6/9'],
      as: service,
      ...rewriteSecurityEvent(SECURITY_A1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: 'The service is `N` on mutation here as on the audit log, and holds SELECT and INSERT, so the '
         + 'refusal is about the verb. Not labelled for RFC-2026-017 §7: a grant-layer refusal is not '
         + 'evidence about row level security.',
    },
    {
      id: 'service-cannot-delete-a-security-event',
      covers: ['§8.4/audit-mutation', '§8.6/9'],
      as: service,
      sql: 'delete from app.security_events where id = $1 returning id',
      params: [SECURITY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'security_events' },
      why: 'The fourth cell of the second grid. Both tables now carry the whole of §8.4\'s mutation row '
         + 'as live cases rather than one table carrying it and the other inheriting the claim.',
    },

    // =========================================================================================
    // Batch 110 — the Meta connector. Four tables, no policy, and a scope the statement discovers.
    // =========================================================================================
    //
    // §8.3 gives this family three rows and not one of them becomes a policy, so every case below
    // is a refusal and the only question each one answers is WHICH LAYER refused:
    //
    //   | Meta connection health SELECT   | Y | Y | P | N | N | P |
    //   | Connect/disconnect/re-auth Meta | Y | P | N | N | N | P |
    //   | Raw token/webhook SELECT        | N | N | N | N | N | S |
    //
    //   * The first grants a HEALTH PROJECTION, whose object is a security_invoker view on the read
    //     allowlist RFC-2026-012 §3 and RFC-2026-021 give to an RFC. So no client grant, and every
    //     client case on the two `app` tables is a privilege-layer refusal.
    //   * The second is a COMMAND whose essential half is an OAuth exchange §3.4 forbids inside a
    //     transaction and a vault write no role can perform.
    //   * The third is the `S` cell, classified DISCOVERED by RFC-2026-022 §3 and given NO POLICY
    //     PERMANENTLY by §5/5. Its cases do not flip. A later reader who takes them for
    //     waiting-to-flip will "fix" them by writing the unscoped policy that RFC refuses, which is
    //     the mistake the work package records about batch 050's `service-sees-zero-*` cases.
    //
    // WHAT ROW LEVEL SECURITY ACTUALLY DECIDES HERE IS FOUR CASES, and they are the four the CI
    // negative control rests on: `service-sees-zero-meta-connection-rows` and
    // `service-sees-zero-social-account-rows` are filtered reads, and
    // `service-cannot-create-a-meta-connection` and `service-cannot-discover-a-social-account` are
    // POLICY-layer refused writes — app_worker holds the INSERT grant, so with row level security
    // off the write LANDS. Everything else on these tables is a grant-layer refusal that would pass
    // unchanged with RLS disabled, which is why it is not counted.
    //
    // ON THE TWO `private` TABLES ROW LEVEL SECURITY DECIDES NOTHING AT ALL, and that is 060's
    // situation followed rather than a weakness discovered: no role holds a grant there, so the
    // refusal is the privilege system on the SCHEMA for every identity alike, and the CI negative
    // control can have no entry for either — disabling row level security restores no grant. The
    // absence is asserted in both directions in identity-isolation.test.mjs.
    //
    // NO CASE ID BELOW CONTAINS `workspace`, `business`, `page` OR `scope`. That is deliberate and
    // it is measured: those four are the patterns of pre-existing control entries, the work package
    // records sixteen entry-pairs sharing cases before batches 060 and 140 made it eighteen, and a
    // batch whose ids matched another entry's pattern would make an entry satisfiable by a
    // regression it did not cause. The cross-tenant cases say `of-tenant-b` for that reason.

    // --- app.meta_connections. -------------------------------------------------------------------
    {
      id: 'owner-a-cannot-read-the-meta-connection-of-tenant-a',
      covers: ['§8.3/meta-connection-health', 'RFC-2026-012§2', 'RFC-2026-021§4'],
      as: ownerA,
      sql: CONNECTION_BY_ID,
      params: [META_CONNECTION_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'meta_connections' },
      why: 'The owner of the workspace whose connection this is, holding its exact id, refused by the '
         + 'PRIVILEGE system. §8.3 marks "Meta connection health SELECT" `Y` for the owner and the '
         + 'object it grants is a HEALTH PROJECTION — §9.1 gives INTEGRATION-2 the client projection '
         + '"health projection only" and the storage rule "redact external identifiers". A projection '
         + 'is a security_invoker view (RFC-2026-012 §2), a view is an allowlist entry (§3), and '
         + 'RFC-2026-021 keeps the allowlist empty until a client caller exists. There is no client.',
    },
    {
      id: 'owner-b-cannot-read-the-meta-connection-of-tenant-b',
      covers: ['§8.3/meta-connection-health', 'RFC-2026-012§3'],
      as: ownerB,
      sql: CONNECTION_BY_ID,
      params: [META_CONNECTION_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'meta_connections' },
      why: 'THE SAME REFUSAL FROM THE OTHER TENANT, ON THAT TENANT\'S OWN ROW, and the pair is the '
         + 'assertion this batch can actually make. Neither owner reaches their own connection, at '
         + 'the same layer with the same message, so the refusal is a property of the table rather '
         + 'than of one workspace being unlucky.',
    },
    {
      id: 'owner-a-cannot-read-the-meta-connection-of-tenant-b',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: CONNECTION_BY_ID,
      params: [META_CONNECTION_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'meta_connections' },
      why: 'THE CROSS-TENANT CASE, AND THE REASON IT IS NOT EVIDENCE ABOUT THE TENANT BOUNDARY. '
         + "Tenant A's owner holds tenant B's exact connection id and is refused — at the same layer, "
         + 'with the same message, as they are refused their OWN connection two cases earlier. '
         + '§12.6/1 is claimed here as a REFUSAL and never as an isolation proof: this table has no '
         + 'policy, so nothing about it distinguishes one workspace from another, and the coverage '
         + 'note says so rather than counting a privilege refusal as a boundary.',
    },
    {
      id: 'editor-a-cannot-read-the-meta-connection-of-tenant-a',
      covers: ['§12.6/4', '§8.6/2', '§8.3/meta-connection-health'],
      as: editorA,
      sql: CONNECTION_BY_ID,
      params: [META_CONNECTION_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'meta_connections' },
      why: '§8.3 marks this cell `P` for the editor — "ผ่านตาม policy/explicit capability" — and the '
         + 'capability set §7 names is defined by no document (RFC-2026-020 §8), which is the refusal '
         + '020 made about the editor\'s `P` on a Business and 030 about an industry assignment. The '
         + 'editor is refused at the same layer as the owner here, so this case is about the CELL '
         + 'rather than about the row: it would still fail if a later batch implemented the owner\'s '
         + '`Y` and left the editor\'s `P` unimplemented, which is the state that batch should ship.',
    },
    {
      id: 'suspended-a-cannot-read-the-meta-connection-of-tenant-a',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: CONNECTION_BY_ID,
      params: [META_CONNECTION_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'meta_connections' },
      why: '§12.6/5 asked of the connector surface. It is an ERROR rather than an empty read, and the '
         + 'distinction is worth keeping: on a table with a policy a suspended member reads zero rows '
         + 'because app.workspace_member_role returns NULL, and here there is no policy to consult '
         + 'because no client role holds a privilege at all. Asserting the layer is what stops the '
         + 'two being read as the same control.',
    },
    {
      id: 'anonymous-cannot-read-the-meta-connection-of-tenant-a',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: CONNECTION_BY_ID,
      params: [META_CONNECTION_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused during name resolution, on the SCHEMA, because anon holds no USAGE on app. '
         + 'RFC-2026-021 §7/4 decides that as a negative and gives the structural reason: the first '
         + 'anon grant is `grant usage on schema app`, which moves the denial layer of every object '
         + 'in app at once. Declaring the schema is what makes this case fail rather than pass more '
         + 'quietly the day somebody widens it.',
    },
    {
      id: 'service-sees-zero-meta-connection-rows',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.3/meta-connection-health'],
      as: service,
      sql: CONNECTION_BY_ID,
      params: [META_CONNECTION_A],
      expect: 'no-rows',
      why: 'ONE OF THE TWO CASES ON THIS TABLE THAT ROW LEVEL SECURITY DECIDES, and the reason '
         + 'app_worker holds a SELECT grant at all. Without the grant this refusal would be 42501 '
         + 'either way and would prove only that somebody forgot a GRANT; with the grant and no '
         + 'policy, an empty read can only have come from RLS — and a service role that had quietly '
         + 'acquired BYPASSRLS would SUCCEED here. §8.3 marks the service `P` on this row, so what is '
         + 'refused is a cell the matrix does not deny outright; what refuses it is the empty policy '
         + 'set, and the policy that would open it is owed to the command surface.',
    },
    {
      id: 'owner-a-cannot-create-a-meta-connection',
      covers: ['§8.3/connect-meta', 'RFC-2026-012§4', '§3.4'],
      as: ownerA,
      ...connectMeta('__A__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'meta_connections' },
      why: 'THE OWNER `Y` THIS BATCH REFUSES, AND THE REFUSAL HAS A REASON A POLICY COULD NOT FIX. '
         + '§8.3 marks "Connect/disconnect/re-auth Meta" `Y` for the owner. Connecting means an OAuth '
         + 'exchange with Meta, and §3.4 forbids calling an external provider while holding a '
         + 'database transaction — so a client INSERT here could only ever write a connection row for '
         + 'a credential that does not exist, in a transaction that may not go and get one. The cell '
         + 'is owed to RFC-2026-012 §4\'s command surface and to DATA-DEC-03.',
    },
    {
      id: 'owner-a-cannot-revoke-the-meta-connection-of-tenant-a',
      covers: ['§8.3/connect-meta', '§11.4/step-2', '§8.5'],
      as: ownerA,
      ...revokeConnection(META_CONNECTION_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'meta_connections' },
      why: 'THE THIRD VERB OF THAT CELL, AND THE ONE THAT LOOKS IMPLEMENTABLE. "disconnect" reduces in '
         + 'this schema to setting one timestamp, so a reviewer will ask why it is not an UPDATE '
         + 'policy. §11.4 step 2 spells the operation "Revoke browser sessions, push tokens, '
         + 'invitations, API/connector credentials": the timestamp is the RECORD of a revocation, not '
         + 'the revocation, and a path that let a client stamp it without revoking anything would '
         + 'produce a row asserting something that did not happen. Refused at the privilege layer, so '
         + 'no policy edit can open it.',
    },
    {
      id: 'service-cannot-create-a-meta-connection',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.3/connect-meta'],
      as: service,
      ...connectMeta('__A__', ownerA.subject),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'meta_connections' },
      why: 'THE SECOND CASE THE CI NEGATIVE CONTROL FOR THIS TABLE RESTS ON, and the only shape that '
         + 'proves anything a filtered read cannot: app_worker HOLDS the INSERT grant on exactly '
         + 'these columns, so with row level security ON the empty policy set refuses the row at the '
         + 'POLICY layer, and with it OFF the write LANDS. It is the RAISING half of RFC-2026-017 §7 '
         + '— only an INSERT can carry it, because an UPDATE a USING clause filters reports zero rows '
         + 'and raises nothing.\n\n'
         + '`created_by` names the workspace owner\'s subject rather than `__SELF__`, and the value is '
         + 'arbitrary: `as_service` sets a role and a claim set with no `sub`, and app_worker holds NO '
         + 'POLICY on this table, so there is no WITH CHECK to compare a subject against and the '
         + 'refusal cannot be about that column. Batch 040 learned that from CI rather than from '
         + 'argument.',
    },

    // --- app.social_accounts. --------------------------------------------------------------------
    {
      id: 'owner-a-cannot-read-the-social-account-of-tenant-a',
      covers: ['§8.3/meta-connection-health', '§9.1/INTEGRATION-2', 'RFC-2026-021§4'],
      as: ownerA,
      sql: SOCIAL_ACCOUNT_IN,
      params: ['__A__', SOCIAL_ACCOUNT_KEY],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'social_accounts' },
      why: 'The second table of the same family and the same refusal, asserted separately because a '
         + 'batch that withheld the grant on one and forgot the other would pass every case written '
         + 'about the first. What is behind this boundary is what §9.1 calls "account display" beside '
         + 'a stand-in for an external identifier the same row tells the schema to redact.',
    },
    {
      id: 'owner-a-cannot-read-the-social-account-of-tenant-b',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: SOCIAL_ACCOUNT_IN,
      params: ['__B__', SOCIAL_ACCOUNT_KEY],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'social_accounts' },
      why: "Tenant A's owner holds tenant B's exact workspace id AND the exact external account hash "
         + 'that identifies the row — the fixture loads the same hash on both sides on purpose — and '
         + 'is refused. Claimed as a refusal and not as an isolation proof, for the reason the '
         + 'connection\'s cross-tenant case gives: with no policy on the table, nothing distinguishes '
         + 'one workspace from another.',
    },
    {
      id: 'owner-b-cannot-read-the-social-account-of-tenant-b',
      covers: ['§8.3/meta-connection-health', 'RFC-2026-012§3'],
      as: ownerB,
      sql: SOCIAL_ACCOUNT_IN,
      params: ['__B__', SOCIAL_ACCOUNT_KEY],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'social_accounts' },
      why: 'The far side, refused identically on its own row. Without it the case above would be '
         + 'satisfied by a fixture that never loaded tenant B\'s account, which is the shape this '
         + 'suite refuses everywhere else and refuses here.',
    },
    {
      id: 'suspended-a-cannot-read-the-social-account-of-tenant-a',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: SOCIAL_ACCOUNT_IN,
      params: ['__A__', SOCIAL_ACCOUNT_KEY],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'social_accounts' },
      why: '§12.6/5 asked of the second table, because a control stated per table is a control '
         + 'checkable per table.',
    },
    {
      id: 'anonymous-cannot-read-the-social-account-of-tenant-a',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: SOCIAL_ACCOUNT_IN,
      params: ['__A__', SOCIAL_ACCOUNT_KEY],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA, as every anonymous case against an `app` table in this suite is. A '
         + 'connected destination is the kind of thing a public profile page might one day want to '
         + 'show, which is exactly why the refusal is declared on the object rather than merely '
         + 'observed.',
    },
    {
      id: 'service-sees-zero-social-account-rows',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: SOCIAL_ACCOUNT_IN,
      params: ['__A__', SOCIAL_ACCOUNT_KEY],
      expect: 'no-rows',
      why: 'The filtered read on the second table. app_worker holds the SELECT grant and no policy, so '
         + 'the empty result is row level security and not a forgotten GRANT — one of the two cases '
         + 'the CI negative control for app.social_accounts rests on.',
    },
    {
      id: 'owner-a-cannot-rename-the-social-account-of-tenant-a',
      covers: ['§8.3/connect-meta', '§8.5'],
      as: ownerA,
      ...renameSocialAccount('__A__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'social_accounts' },
      why: 'The one column of this table anything may ever update is `display_name`, and no client '
         + 'holds it. The case names that column deliberately: an UPDATE of `meta_connection_id` or '
         + 'of the external account hash is refused for every role INCLUDING the service, which the '
         + 'migration asserts per column against the live ACL, so a client case about those columns '
         + 'would be asking a weaker question than the apply-time block already answers.',
    },
    {
      id: 'service-cannot-discover-a-social-account',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.3/meta-connection-health'],
      as: service,
      ...discoverSocialAccount('__A__', META_CONNECTION_A),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'social_accounts' },
      why: 'THE SECOND CASE THE CONTROL FOR THIS TABLE RESTS ON, and the operation §4\'s ERD names: '
         + 'META_CONNECTION ||--o{ SOCIAL_ACCOUNT : "discovers". Discovery is the service\'s act, '
         + 'which is why this row carries no actor columns — and the service cannot perform it, '
         + 'because the empty policy set refuses the INSERT it holds the grant for. The row it '
         + 'attempts is well formed and names a real connection in the same workspace, so with row '
         + 'level security disabled it LANDS: the composite foreign key and the unique key are both '
         + 'satisfied, and the only thing standing between the statement and the table is RLS.',
    },

    // --- private.meta_credential_references. ------------------------------------------------------
    //
    // Batch 060's shape followed rather than re-derived: no role holds anything, so every refusal is
    // the privilege system on the SCHEMA and the layer is the same for a workspace owner and for the
    // service. That is what §8.3's "Plain credential SELECT | N N N N N N" asks for, in the one
    // column — the service's — where every other row of the matrix gives something.
    {
      id: 'owner-a-cannot-read-a-meta-credential-reference',
      covers: ['§8.3/plain-credential', '§9.2', '§4/invariant-9'],
      as: ownerA,
      sql: META_REFERENCE_OF,
      params: [META_CONNECTION_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'The owner of the workspace whose credential this is, refused before the table is reached. '
         + '§4 invariant 9 keeps a token out of an exposed row, §3.1 puts the reference in `private` '
         + 'with no direct grant, and §8.3 marks "Plain credential SELECT" N for every role. The '
         + 'refusal lands on the SCHEMA because that is where the first missing privilege is, and '
         + 'asserting the schema is what makes this case notice the day somebody writes `grant usage '
         + 'on schema private` — the grant that would have to come first.',
    },
    {
      id: 'service-cannot-read-a-meta-credential-reference',
      // NOT labelled RFC-2026-017§7: that section's claim is that the service is denied by ROW LEVEL
      // SECURITY, and this table deliberately grants it nothing, so the refusal is the privilege
      // system. That is a STRONGER refusal and a DIFFERENT one, which is the distinction the layer
      // declaration exists to keep.
      covers: ['§8.3/plain-credential', 'RFC-2026-012/connector', '§12.6/8-negative'],
      as: service,
      sql: META_REFERENCE_OF,
      params: [META_CONNECTION_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'THE HALF OF §8.3 THAT DENIES THE SERVICE TOO. "Plain credential SELECT" is N in the '
         + 'service column as well, so this table departs from the app_worker shape every other '
         + 'batch uses and holds no grant at all — which is batch 060\'s decision followed, not a new '
         + 'one. The price is that the CI negative control can have no entry for this table, and '
         + 'that absence is asserted in both directions rather than left to be noticed.',
    },
    {
      id: 'anonymous-cannot-read-a-meta-credential-reference',
      covers: ['§12.6/6', '§8.6/7', '§9.2'],
      as: anonymous,
      sql: META_REFERENCE_OF,
      params: [META_CONNECTION_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'anon holds nothing anywhere, so the schema that refuses it is whichever one the statement '
         + 'names — and here that is `private` rather than `app`. Declaring which is what makes this a '
         + 'different assertion from the anonymous cases on the two `app` tables above rather than '
         + 'the same one repeated.',
    },
    {
      id: 'owner-a-cannot-create-a-meta-credential-reference',
      covers: ['§8.3/connect-meta', 'RFC-2026-012§4', '§9.2'],
      as: ownerA,
      ...createMetaReference('__A__', META_CONNECTION_A, '__SELF__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'The write half of §8.3\'s owner `Y`, refused on the schema. A client grant here is not one '
         + 'grant: it is `grant usage on schema private` first, which opens private.as_user, '
         + 'private.as_suspended_user, private.as_service and every worker payload table a later '
         + 'batch puts there — to every end user, at once. That is RFC-2026-021 §7/4\'s structural '
         + 'argument about anon and schema app, one schema over, and it is why the owner\'s Y is '
         + 'reached the way §3.1 says it is reached: through a typed service.',
    },

    // --- private.meta_webhook_inbox. --------------------------------------------------------------
    //
    // §5's three verbs, one case each for the two that have a statement, plus the reads §8.3's `S`
    // cell is about. Nothing here flips: RFC-2026-022 §5/5 gives a DISCOVERED cell no policy
    // permanently, and the decision is NOT IN EFFECT besides, because the only member of app_worker
    // is postgres, which bypasses row level security.
    //
    // THE UNRESOLVED DELIVERY IS NOT GIVEN A CASE OF ITS OWN, and the reason is worth stating so a
    // later reader does not add one: it is refused identically to the resolved one, by the same
    // missing schema privilege, so a case about it would assert nothing the case below does not.
    // What the unresolved row is FOR is the static assertion that `workspace_id` is nullable and
    // that the fixture exercises both states — identity-isolation.test.mjs holds that, where it can
    // be checked without a database.
    {
      id: 'owner-a-cannot-read-a-meta-webhook-delivery',
      covers: ['§8.3/raw-webhook', '§10/WEBHOOK-SHORT', '§11.1/5'],
      as: ownerA,
      sql: DELIVERY_BY_HASH,
      params: [DELIVERY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'DOES A CLIENT EVER READ A RAW WEBHOOK BODY? This case is the answer. §8.3 marks "Raw '
         + 'token/webhook SELECT" N for all five built-in roles, §10\'s WEBHOOK-SHORT says "no tenant '
         + 'access", §11.1/5 keeps raw webhook out of a PDPA export the owner may request, and §14\'s '
         + 'gate checklist requires the table not be exposed. The owner of the workspace this '
         + 'delivery RESOLVED TO is refused, which is the strongest form of that claim available.',
    },
    {
      id: 'service-cannot-read-a-meta-webhook-delivery',
      covers: ['§8.3/raw-webhook', 'RFC-2026-022§3/discovered', '§12.6/8-negative'],
      as: service,
      sql: DELIVERY_BY_HASH,
      params: [DELIVERY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'THE `S` CELL ITSELF, AND ITS REFUSAL IS PERMANENT RATHER THAN PENDING. §8.3 gives "Raw '
         + 'token/webhook SELECT" to the service alone; RFC-2026-022 §3 classifies that statement '
         + 'DISCOVERED — "an inbox row arrives from the provider; the workspace is what reading it '
         + 'resolves" — and §5/5 gives a discovered cell NO POLICY, permanently, performed through a '
         + 'SECURITY DEFINER broker owned by a role that does not exist. A later reader who takes '
         + 'this for a case waiting to flip will "fix" it by writing the unscoped policy that RFC '
         + 'refuses. The layer is `grant` and not `policy` because this table grants nobody anything, '
         + 'which is a stronger refusal than the one the classification is about.',
    },
    {
      id: 'anonymous-cannot-read-a-meta-webhook-delivery',
      covers: ['§12.6/6', '§8.6/7', '§8.3/raw-webhook'],
      as: anonymous,
      sql: DELIVERY_BY_HASH,
      params: [DELIVERY_A1],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'The anonymous refusal on the raw inbox. It is asserted rather than assumed for the reason '
         + 'every anonymous case in this suite is: anon holds nothing anywhere, and the case declares '
         + 'the object so that a widening moves the refusal and fails the case.',
    },
    {
      id: 'service-cannot-process-a-meta-webhook-delivery',
      covers: ['§8.3/raw-webhook', 'RFC-2026-022§5/5', '§5/append-process-purge'],
      as: service,
      ...processDelivery(DELIVERY_A1, '__A__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'THE MIDDLE VERB, WHICH HAS NO ACTOR. §5 gives this row the mutability '
         + '"append/process/purge" and processing is exactly this statement: stamp the delivery and '
         + 'record which Workspace it resolved to. Nobody may issue it. Batch 050 refused to build a '
         + 'writer for its outbox on the same ground — "a correctly shaped table with no writer, and '
         + 'the writer is a decision with an owner rather than a column somebody forgot" — and here '
         + 'the owner is named: RFC-2026-022 §5/6\'s broker, owed to the RFC that creates the worker '
         + '(DATA-DEC-03, due before G1).',
    },
    {
      id: 'service-cannot-purge-a-meta-webhook-delivery',
      covers: ['§8.3/raw-webhook', '§10/WEBHOOK-SHORT', '§8.5'],
      as: service,
      ...purgeDelivery(DELIVERY_A1),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'THE THIRD VERB, AND THERE IS NO SCHEDULER. §10\'s WEBHOOK-SHORT is a retention rule with a '
         + 'purge in it — "30 วันหลัง processed; 90 วัน failure/DLQ … redact/purge payload, retain '
         + 'dedupe hash longer" — and batch 160 owns the retention job while §10\'s own numbers need '
         + 'Product/Security/Legal approval (§15). So no role holds DELETE here, app_maintenance is '
         + 'granted nothing by this batch, and no window is encoded in a constraint where it would '
         + 'read as ratified. What the batch does provide is the columns the sweep will read — '
         + 'processed_at, failed_at, redacted_at and a body_ref that can be emptied while the dedupe '
         + 'hash stays — and an index over each.',
    },
    // =========================================================================================
    // BATCH 061 — metering. The ledger, the hold, and the aggregate a client may read.
    // =========================================================================================
    //
    // Three tables and three shapes. app.usage_events and app.usage_reservations are the shape
    // batch 050 established — no client role holds a privilege, so every client refusal is a
    // PRIVILEGE-layer one and the only cases row level security decides are the service's.
    // app.quota_buckets is the other shape: §8.4 marks "Usage/quota summary SELECT" `Y` for the
    // OWNER and `Y` for the ADMIN, and the aggregate IS the summary, so that table carries §8.6's
    // grid as written.
    //
    // THE ADMIN IS A NEW IDENTITY AND IT IS NOT CONVENIENCE. §12.6 names an owner, an editor, an
    // approver, a viewer and a suspended member of workspace_a and no admin, while §8.4 gives the
    // admin an UNCONDITIONAL `Y` here rather than the `P` §8.1 gives the same role. The policy
    // therefore reads `app.workspace_member_role(workspace_id) in ('owner', 'admin')` and half of
    // that predicate could have been inverted without a case failing. user_admin_a is SCOPED to
    // business_a1 and user_owner_a deliberately is not, because batch 021 reads §7 as "a member
    // with no scope row is not narrowed" and both halves of that reading need a caller.
    {
      id: 'owner-a-reads-the-quota-bucket-of-tenant-a',
      covers: ['§12.6/1', '§8.6/1', '§8.4/usage-quota-summary'],
      as: ownerA,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'rows',
      why: 'THE POSITIVE EVERY NEGATIVE BELOW DEPENDS ON. §8.4 marks "Usage/quota summary SELECT" '
         + '`Y` for the owner and the aggregate is the summary, so this is the cell implemented '
         + 'rather than refused. Without it every refusal on this table is satisfied by a policy '
         + 'that denies everyone — which is the state the other two tables in this batch are in, '
         + 'and they say so rather than counting it.',
    },
    {
      id: 'admin-a-reads-the-quota-bucket-of-tenant-a',
      covers: ['§8.6/1', '§8.4/usage-quota-summary'],
      as: METERING_ADMIN_A(id),
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'rows',
      why: 'THE SECOND BRANCH OF THE POLICY PREDICATE, WHICH NO IDENTITY §12.6 NAMES COULD HAVE '
         + 'EXERCISED. §8.4 gives the admin `Y` here — unconditional, not the `P` §8.1 gives the '
         + 'same role — so the role test has two live branches and this is the one the fixture had '
         + 'to gain a member for. The bucket is the WORKSPACE-level one, so the restrictive '
         + 'narrowing takes its NULL branch and this case is about the role and nothing else.',
    },
    {
      id: 'admin-a-reads-the-quota-bucket-inside-their-narrowing',
      covers: ['§12.6/2', '§8.6/1'],
      as: METERING_ADMIN_A(id),
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a1')],
      expect: 'rows',
      why: 'The scoped positive. user_admin_a holds a `business` member scope naming business_a1 '
         + 'and this bucket is scoped to it, so 021\'s app.member_scope_admits_business answers '
         + 'true. Paired with the negative below, which differs in ONE argument.',
    },
    {
      id: 'admin-a-cannot-read-the-quota-bucket-outside-their-narrowing',
      covers: ['§12.6/2', '§8.6/3'],
      as: METERING_ADMIN_A(id),
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a2')],
      expect: 'no-rows',
      why: 'THE CASE THAT MAKES THE RESTRICTIVE POLICY FALSIFIABLE. The caller has ALREADY PASSED '
         + 'the role test — they are an admin of this workspace and the case above proves it — so '
         + 'the only thing that can refuse this row is quota_buckets_scope_narrows_member, which is '
         + 'AS RESTRICTIVE because permissive policies OR together and cannot subtract. business_a2 '
         + 'is the Business batch 021 put in the fixture precisely to be excluded by a member '
         + 'scope, so this is §8.6 case 3 at Business granularity on a caller the matrix otherwise '
         + 'allows. It is also what this table\'s CI negative control gains that dropping the '
         + 'permissive policy alone would not touch.',
    },
    {
      id: 'owner-a-reads-the-quota-bucket-outside-the-admin-narrowing',
      covers: ['§8.6/1', '§8.6/3-control'],
      as: ownerA,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a2')],
      expect: 'rows',
      why: 'THE CONTROL FOR THE CASE ABOVE, and 021\'s reading of §7 asserted rather than assumed: '
         + '"a member with no scope row is not narrowed". user_owner_a holds no scope row in this '
         + 'workspace, so app.member_scope_admits_business answers true for them on the same row '
         + 'the admin is refused. Without this case a restrictive policy that denied EVERY caller '
         + 'the business-scoped buckets would pass.',
    },
    {
      id: 'editor-a-sees-zero-quota-buckets',
      covers: ['§8.6/2', '§8.4/usage-quota-summary'],
      as: editorA,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'no-rows',
      why: '§8.4 marks the editor `P` on this cell — "ผ่านตาม policy/explicit capability" — and '
         + 'RFC-2026-020 §8 decides that no document defines the capability set, so the cell is '
         + 'denied by default. Writing `in (\'owner\', \'admin\', \'editor\')` would delete the '
         + 'distinction between `Y` and `P` and hand every editor the workspace\'s spend. Same '
         + 'Workspace, wrong role, and the member scope has nothing to do with it: this is the '
         + 'WORKSPACE-level bucket, which no scope narrows.',
    },
    {
      id: 'approver-a-sees-zero-quota-buckets',
      covers: ['§8.6/2', '§8.4/usage-quota-summary'],
      as: approverA,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'no-rows',
      why: '§8.4 marks the approver `N`. Refused by the role test, on a row an owner and an admin '
         + 'of the same workspace both read in the two cases above.',
    },
    {
      id: 'viewer-a-sees-zero-quota-buckets',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'no-rows',
      why: '§8.4 marks the viewer `N`, and this is a READ refusal rather than §12.6/4\'s write one, '
         + 'which is why it is counted under §8.6/2. The viewer holds an `all_businesses` member '
         + 'scope (batch 021\'s fixture), so a narrowing could not have refused them and the ROLE '
         + 'is the whole of it.',
    },
    {
      id: 'suspended-a-sees-zero-quota-buckets',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'no-rows',
      why: 'AND HERE THE SUSPENSION IS WHAT REFUSES, which is not true of every table in this '
         + 'schema. app.workspace_member_role returns a role only for an ACTIVE membership, and an '
         + 'active owner and an active admin both read this exact row above. On batch 140\'s two '
         + 'tables the same case is refused identically to an active owner and therefore says '
         + 'nothing about suspension; here the pair is what makes it a suspension control.',
    },
    {
      id: 'owner-a-cannot-read-the-quota-bucket-of-tenant-b',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_b')],
      expect: 'no-rows',
      why: 'The cross-tenant read, run while HOLDING TENANT B\'S EXACT id — the control §12.6 asks '
         + 'for, on a FIN-3 row: what another business is spending, and on what.',
    },
    {
      id: 'owner-b-reads-the-quota-bucket-of-tenant-b',
      covers: ['§12.6/1', '§8.6/5'],
      as: ownerB,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_b')],
      expect: 'rows',
      why: 'THE THIRD CASE, without which the negative above is satisfied by a fixture that never '
         + 'loaded the row. Batch 020 established that a cross-tenant claim needs all three.',
    },
    {
      id: 'owner-b-cannot-read-the-quota-bucket-of-tenant-a',
      covers: ['§12.6/1', '§8.6/5'],
      as: ownerB,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'no-rows',
      why: 'The boundary in the other direction, so it is a boundary rather than one tenant being '
         + 'unlucky.',
    },
    {
      id: 'anonymous-cannot-read-a-quota-bucket',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused during name resolution, on the SCHEMA, because anon holds no USAGE on app — '
         + 'which RFC-2026-021 §7/4 makes an approved decision rather than an inherited convention. '
         + 'The day somebody grants it, this refusal moves to the table and the case fails, which '
         + 'is the whole reason the object is declared.',
    },
    {
      id: 'service-sees-zero-quota-buckets',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: METERING_BUCKET_BY_ID,
      params: [id('quota_bucket_a_all')],
      expect: 'no-rows',
      why: 'app_worker holds a column-scoped SELECT and NO POLICY, so this empty read can only have '
         + 'come from row level security — and a service role that had quietly acquired BYPASSRLS '
         + 'would return the row. One of the cases the CI negative control for app.quota_buckets '
         + 'rests on.',
    },
    {
      id: 'owner-a-cannot-create-a-quota-bucket',
      covers: ['§8/no-row', 'RFC-2026-012§1'],
      as: ownerA,
      ...meteringOpenQuotaBucket('__A__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quota_buckets' },
      why: 'CREATING YOUR OWN QUOTA BUCKET IS DECLARING YOUR OWN CONSUMPTION. §8 has no row for '
         + 'writing a quota bucket in any of its four matrices — its two metering rows are the '
         + 'summary SELECT and the ledger INSERT/UPDATE/DELETE — so the cell is denied by default, '
         + 'and the refusal is at the PRIVILEGE layer because `authenticated` holds SELECT and '
         + 'nothing else. The row it attempts is otherwise valid and names a period no fixture row '
         + 'holds, so the refusal cannot be the natural key standing in for a missing grant.',
    },
    {
      id: 'owner-a-cannot-rewrite-a-quota-bucket-total',
      covers: ['§8/no-row', '§8.6/9'],
      as: ownerA,
      ...meteringRewriteQuotaBucket(id('quota_bucket_a_all')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quota_buckets' },
      why: 'Setting your own consumed total to zero is granting yourself the quota back. The owner '
         + 'can READ this row — the first case in this block proves it — so the refusal is about '
         + 'the verb rather than about visibility, and it is a privilege-layer refusal a later '
         + 'policy edit cannot widen.',
    },
    {
      id: 'owner-a-cannot-delete-a-quota-bucket',
      covers: ['§8/no-row', '§8.6/9'],
      as: ownerA,
      sql: 'delete from app.quota_buckets where id = $1 returning id',
      params: [id('quota_bucket_a_all')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quota_buckets' },
      why: 'Deleting the aggregate is a subtler form of editing it, because whatever resolves a '
         + 'quota has to decide what an ABSENT bucket means — 021\'s question about an absent scope '
         + 'row, arriving in batch 132\'s inbox.',
    },
    {
      id: 'service-cannot-create-a-quota-bucket',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8/no-row'],
      as: service,
      ...meteringOpenQuotaBucket('__A__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'quota_buckets' },
      why: 'THE CASE THAT ANSWERS "WHO MAY MOVE THE DERIVED ROW", and one of the two policy-layer '
         + 'refusals this table\'s negative control rests on. app_worker HOLDS the INSERT grant, so '
         + 'FORCE ROW LEVEL SECURITY with no service policy is what refuses it — with row level '
         + 'security off the grant is enough and the write LANDS. The writer is batch 132 (§6: '
         + '"entitlement-metering resolver", depending on 061 and 130) and the identity that would '
         + 'run it does not exist either (RFC-2026-022 §5/8).',
    },
    {
      id: 'service-cannot-rewrite-a-quota-bucket-total',
      covers: ['§12.6/8', '§8/no-row'],
      as: service,
      ...meteringRewriteQuotaBucket(id('quota_bucket_a_all')),
      expect: 'no-effect',
      witness: {
        as: ownerA,
        sql: METERING_BUCKET_WITNESS_SQL,
        params: [id('quota_bucket_a_all')],
        column: 'state',
        equals: 'unchanged',
      },
      why: 'A WRITE ROW LEVEL SECURITY FILTERS RATHER THAN REFUSES, which is why this is '
         + '`no-effect` and not `denied`: app_worker holds a column-scoped UPDATE on the three '
         + 'derived columns, the USING clause admits no row, the statement affects nothing and '
         + 'RAISES NOTHING. The witness is the half an empty result cannot give — the workspace '
         + 'owner, who CAN read this row, sees the fixture\'s number unchanged. With row level '
         + 'security off the write lands and the witness sees the new value, which is what makes '
         + 'this case part of the negative control rather than decoration.',
    },
    {
      id: 'service-cannot-retarget-a-quota-bucket',
      covers: ['§8.5/no-cross-tenant-update', '§8.6/8'],
      as: service,
      sql: 'update app.quota_buckets set workspace_id = $2 where id = $1 returning id',
      params: [id('quota_bucket_a_all'), '__B__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quota_buckets' },
      why: '§8.5: "ห้ามย้าย row ข้าม tenant ด้วย update". The refusal is at the PRIVILEGE layer and '
         + 'that is the point — app_worker\'s UPDATE grant names the three derived columns plus '
         + '`updated_at`, and `workspace_id` is not one of them, so the prohibition holds by a '
         + 'COLUMN LIST rather than by the absence of a verb. Batch 060 shipped a comment claiming '
         + 'the second beside a table-wide grant and independent review found it; this case is that '
         + 'finding as an assertion.',
    },
    {
      id: 'service-cannot-delete-a-quota-bucket',
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      sql: 'delete from app.quota_buckets where id = $1 returning id',
      params: [id('quota_bucket_a_all')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quota_buckets' },
      why: 'No role holds DELETE on any table in this batch. §10\'s FINANCE-HISTORY is "not erased '
         + 'if legal basis requires" and the purge is batch 160\'s, through a role this batch grants '
         + 'nothing.',
    },

    // -- The LEDGER. Nobody may read it, nobody may write it, and nobody may ever edit it. -------
    //
    // §8.4 says NOTHING about who may SELECT a usage event — its two metering rows are the SUMMARY
    // SELECT, which is app.quota_buckets above, and the ledger's INSERT/UPDATE/DELETE. Where a
    // document is silent the cell is denied, so no client role holds a privilege here and every
    // client case below is a PRIVILEGE-layer refusal that declares its layer and its object.
    {
      id: 'owner-a-cannot-read-a-usage-event',
      covers: ['§8/no-row', 'RFC-2026-012§2'],
      as: ownerA,
      sql: METERING_LEDGER_BY_ID,
      params: [id('usage_event_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'THE PAIR THAT MAKES §8.4\'s TWO ROWS TWO OBJECTS. The same identity reads the SUMMARY '
         + 'in the first case of this block and is refused the LEDGER here, at a different layer '
         + 'and on a different table. §8.4 grants a summary and says nothing about a ledger read, '
         + 'and a ledger row carries what the summary does not: the cost, the provider, the dedupe '
         + 'key and the estimate a correction supersedes.',
    },
    {
      id: 'admin-a-cannot-read-a-usage-event',
      covers: ['§8/no-row', '§9.1/FIN-3'],
      as: METERING_ADMIN_A(id),
      sql: METERING_LEDGER_BY_ID,
      params: [id('usage_event_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'And the same for the other role §8.4 gives the summary to, so "the summary is granted '
         + 'and the ledger is not" is a statement about the TABLES rather than about one caller. '
         + '§9.1 gives FIN-3 the client projection "owner/admin summary" — a projection, which '
         + 'RFC-2026-012 §2 puts behind a named security_invoker view and RFC-2026-021 keeps on an '
         + 'allowlist that is empty.',
    },
    {
      id: 'owner-b-cannot-read-their-own-usage-event',
      covers: ['§8/no-row', '§8.6/5-substitute'],
      as: ownerB,
      sql: METERING_LEDGER_BY_ID,
      params: [id('usage_event_b1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'BOTH OWNERS ARE REFUSED IDENTICALLY, WHILE EACH HOLDS THE EXACT ID OF A ROW IN THEIR '
         + 'OWN WORKSPACE. That is batch 030\'s substitute for a cross-tenant claim on a table no '
         + 'client identity can read, kept by 050, 060 and 140 and kept here: without it the case '
         + 'above would be satisfied by a tenant boundary rather than by the absent grant it is '
         + 'actually about.',
    },
    {
      id: 'anonymous-cannot-read-a-usage-event',
      covers: ['§12.6/6', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: METERING_LEDGER_BY_ID,
      params: [id('usage_event_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA, one of three in this batch, so the day anon is granted USAGE on app all '
         + 'three fail together rather than one of them being noticed.',
    },
    {
      id: 'service-sees-zero-usage-events',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: METERING_LEDGER_BY_ID,
      params: [id('usage_event_a1')],
      expect: 'no-rows',
      why: 'One of the two cases the CI negative control for app.usage_events rests on. app_worker '
         + 'holds a column-scoped SELECT and no policy, so this is the only thing row level '
         + 'security decides on a read of this table.',
    },
    {
      id: 'owner-a-cannot-write-a-usage-event',
      covers: ['§8.4/usage-ledger-insert', '§8.6/8'],
      as: ownerA,
      ...meteringWriteUsageEvent('__A__', id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'THE CELL THIS FAMILY EXISTS FOR, ON THE CLIENT SIDE. §8.4 marks "Usage ledger INSERT" '
         + '`N` for every client role including the workspace owner, so the party a charge is about '
         + 'cannot write the measurement it is computed from. The row it attempts is otherwise '
         + 'VALID — its dedupe key is composed from its own workspace and job exactly as '
         + 'CTR-USG-001 requires, so 061\'s starts_with constraint would admit it — and nothing but '
         + 'the absent grant refuses it.',
    },
    {
      id: 'service-cannot-write-a-usage-event',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.4/usage-ledger-insert'],
      as: service,
      ...meteringWriteUsageEvent('__A__', id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'THE `S` CELL, REFUSED AT THE POLICY LAYER, AND THE REFUSAL IS NOT PENDING ON THIS '
         + 'BATCH. RFC-2026-022 §3 classes §8.4\'s "Usage ledger INSERT" CARRIED and its §5/8 '
         + 'declares the whole decision NOT IN EFFECT — measured, the only member of app_worker is '
         + 'postgres, which bypasses row level security — so batch 061 records the classification '
         + 'in db/foundation/lint/service-policy-map.json and writes no policy. app_worker HOLDS '
         + 'the INSERT grant, so with row level security off the write lands: this is the second '
         + 'case the negative control for this table rests on. The `job_id` it carries is the '
         + 'workspace owner\'s subject rather than a job, and the value is arbitrary on purpose — '
         + 'the column carries no foreign key (061\'s header says why) and app_worker holds no '
         + 'policy here, so there is no WITH CHECK for the refusal to be about.',
    },
    {
      id: 'owner-a-cannot-rewrite-a-usage-event',
      covers: ['§8.4/usage-ledger-mutation', '§8.6/9', '§4/invariant-8'],
      as: ownerA,
      ...meteringRewriteUsageEvent(id('usage_event_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'Editing the quantity is editing the bill. §3.2 and §4 invariant 8 both name USAGE '
         + 'history immutable and §8.4 marks the ledger\'s UPDATE `N` in every column of the row, '
         + 'so no role holds the verb at all — a privilege-layer refusal rather than a policy a '
         + 'later edit could widen.',
    },
    {
      id: 'owner-a-cannot-delete-a-usage-event',
      covers: ['§8.4/usage-ledger-mutation', '§8.6/9'],
      as: ownerA,
      sql: 'delete from app.usage_events where usage_id = $1 returning usage_id',
      params: [id('usage_event_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'The second verb of the same cell. A measurement that can be removed is a measurement '
         + 'that can be un-charged.',
    },
    {
      id: 'service-cannot-rewrite-a-usage-event',
      covers: ['§8.4/usage-ledger-mutation', '§8.6/9'],
      as: service,
      ...meteringRewriteUsageEvent(id('usage_event_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'AND THE SERVICE IS REFUSED THE SAME VERB, which is the half of §8.4\'s `S/N` a reader '
         + 'is most likely to lose: the `S` is on the INSERT alone and the UPDATE and DELETE are '
         + '`N` for the service too. Not labelled for RFC-2026-017 §7 — a grant-layer refusal is '
         + 'not evidence about row level security.',
    },
    {
      id: 'service-cannot-delete-a-usage-event',
      covers: ['§8.4/usage-ledger-mutation', '§8.6/9'],
      as: service,
      sql: 'delete from app.usage_events where usage_id = $1 returning usage_id',
      params: [id('usage_event_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_events' },
      why: 'The fourth cell of the grid, so this table carries the whole of §8.4\'s mutation row as '
         + 'live cases rather than resting on the apply-time block for half of it.',
    },

    // -- The HOLD. §8 has no row for it at all, so every cell is denied by default. --------------
    {
      id: 'owner-a-cannot-read-a-usage-reservation',
      covers: ['§8/no-row', 'RFC-2026-012§2'],
      as: ownerA,
      sql: METERING_RESERVATION_BY_ID,
      params: [id('usage_reservation_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_reservations' },
      why: 'A reservation has NO ROW in any of §8\'s four matrices, in either direction, so there '
         + 'is no cell to implement and every operation on it is denied by default — 030\'s reading '
         + 'of the same silence, kept by 050 for the outbox and the consumer ledger. What a client '
         + 'is granted about a quota is the SUMMARY, and a hold is not one.',
    },
    {
      id: 'anonymous-cannot-read-a-usage-reservation',
      covers: ['§12.6/6', 'RFC-2026-021§7/4'],
      as: anonymous,
      sql: METERING_RESERVATION_BY_ID,
      params: [id('usage_reservation_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'The last of this batch\'s three anonymous refusals, all declared on the SCHEMA and all '
         + 'failing together the day anon is granted USAGE on app.',
    },
    {
      id: 'service-sees-zero-usage-reservations',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: METERING_RESERVATION_BY_ID,
      params: [id('usage_reservation_a1')],
      expect: 'no-rows',
      why: 'One of the two cases the CI negative control for app.usage_reservations rests on. The '
         + 'fixture loads exactly one hold, and against an empty table this case would pass with '
         + 'row level security on or off.',
    },
    {
      id: 'owner-a-cannot-open-a-usage-reservation',
      covers: ['§8/no-row', 'RFC-2026-012§1'],
      as: ownerA,
      ...meteringOpenReservation('__A__', id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_reservations' },
      why: 'Taking your own hold against your own quota. Refused at the privilege layer, because '
         + '`authenticated` holds nothing at all on this table.',
    },
    {
      id: 'service-cannot-open-a-usage-reservation',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8/no-row'],
      as: service,
      ...meteringOpenReservation('__A__', id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'usage_reservations' },
      why: 'The second case this table\'s negative control rests on. app_worker holds the INSERT '
         + 'grant and no policy, so the refusal is row level security\'s and disabling it lets the '
         + 'row land. There is no §8 cell to point at here and no RFC-2026-022 classification '
         + 'either — the service-policy map carries ONE entry, on the ledger\'s INSERT, because '
         + 'that is the only metering statement §8 marks `S`.',
    },
    {
      id: 'service-cannot-retarget-a-usage-reservation',
      covers: ['§8.5/no-cross-tenant-update', '§8.6/8'],
      as: service,
      sql: 'update app.usage_reservations set workspace_id = $2 where id = $1 returning id',
      params: [id('usage_reservation_a1'), '__B__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_reservations' },
      why: '§8.5 again, by column list: app_worker\'s UPDATE grant on this table names '
         + '`released_at`, `consumed_usage_id` and `updated_at` — the two columns a hold ENDS with, '
         + 'plus the stamp — and nothing that says which hold it is or whose.',
    },
    {
      id: 'service-cannot-delete-a-usage-reservation',
      covers: ['§8.6/9', '§12.6/8-negative'],
      as: service,
      sql: 'delete from app.usage_reservations where id = $1 returning id',
      params: [id('usage_reservation_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'usage_reservations' },
      why: 'A hold is RELEASED and never deleted: the row is what says a quota was held and then '
         + 'given back, and a delete would erase the fact rather than close it. No role holds the '
         + 'verb on any table in this batch.',
    },
    // Batch 051 — notification. A boundary with TWO terms, and a secret with no column.
    // =========================================================================================
    //
    // §5 scopes `notification.core` **workspace/user**, and every tenant table this suite has run
    // against is scoped by workspace alone. That one word changes what the cases have to prove.
    //
    // §8.4 gives the family exactly two cells:
    //
    //   | Own notification SELECT/mark read  | O | O | O | O | O | P |
    //   | Notification insert/delivery state | N | N | N | N | N | S |
    //
    // The first is IMPLEMENTED — a SELECT policy and an UPDATE policy, both predicated on
    // `user_id = (select auth.uid()) and app.is_active_member(workspace_id)` — and the second is
    // classified CARRIED in db/foundation/lint/service-policy-map.json and gets no policy, because
    // RFC-2026-022 is approved and NOT IN EFFECT.
    //
    // SO THIS BLOCK IS SHAPED UNLIKE THE THREE ABOVE IT. Batches 050, 060 and 140 have no `rows`
    // case anywhere, because no client role holds any privilege on any of their tables. This one
    // does, and the positives are what the negatives are measured against.
    //
    // **THE TWO TERMS FAIL SEPARATELY AND THE SUITE HAS TO SEE BOTH.** A conjunction is the one
    // predicate shape where a test suite can be green while half the predicate is missing, because
    // dropping either conjunct only widens what is visible — and every case in this suite before
    // batch 051 is about two WORKSPACES, so none of them would notice the user term going. Two
    // cases exist for that alone:
    //
    //   owner-a-cannot-see-the-notification-of-editor-a
    //       Same workspace. Both identities are ACTIVE MEMBERS of it. user_owner_a is its OWNER,
    //       which on every other table in this schema is the identity that sees the most. It holds
    //       the row's exact id and reads nothing. Drop `user_id = (select auth.uid())` and this is
    //       the only case in 3xx that fails.
    //
    //   suspended-a-sees-zero-notifications
    //       The fixture addresses a notification TO user_suspended_a. Drop
    //       `app.is_active_member(workspace_id)` and it comes back — and §12.6/5 ("sees zero tenant
    //       rows") stops being true of a table it is true of today. This case is NOT the analogue
    //       050, 060 and 140 had to label: on those tables a suspended member is refused where every
    //       active member is also refused, so the refusal is the privilege system and says nothing
    //       about suspension. Here an active member with the same recipient WOULD see the row, so
    //       the empty read is suspension and nothing else.
    //
    // AND THE THIRD TABLE IS A SECRET WITH NO COLUMN FOR IT. §9.1 lists "push token" as an example
    // of `SECRET-4`; a Web Push subscription is an endpoint — a bearer capability URL — plus two
    // keys; and `private.push_subscription_references` holds a `vault://` LOCATOR and none of the
    // three. Every case against it is refused on the SCHEMA, for every identity including the
    // service, which is batch 060's shape for its credential reference and is asserted here so that
    // the day somebody writes `grant usage on schema private` the refusal moves to the table and
    // four cases fail.

    // -- §12.6/1, §8.6/1 and §8.6/5. The tenant boundary, in both directions and on both sides. ---
    {
      id: 'owner-a-sees-their-own-notification',
      covers: ['§12.6/1', '§8.6/1', '§8.4/own-notification'],
      as: ownerA,
      sql: NOTIFICATION_BY_ID,
      params: [NOTIFICATION_OWNER_A],
      expect: 'rows',
      why: 'THE POSITIVE, AND THE FIRST ONE THIS SUITE HAS HAD ON A §8.4 ROW. Batch 050 owns §8.4\'s job '
         + 'rows and could implement neither, because the client cell there grants a REDACTED STATUS — '
         + 'a projection, which is a security_invoker view on an allowlist RFC-2026-021 keeps empty. '
         + '§8.4\'s notification rows separate BY COLUMN instead: "own notification" is the message and '
         + '"delivery state" is two columns marked `N`, so a column-scoped grant expresses the split '
         + 'and no view is needed. Without this case every refusal below is satisfied by an empty '
         + 'table.',
    },
    {
      id: 'owner-b-sees-their-own-notification',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: NOTIFICATION_BY_ID,
      params: [NOTIFICATION_OWNER_B],
      expect: 'rows',
      why: 'The far side reads its own row, which is what stops the cross-tenant negative below being '
         + 'satisfied by a fixture that never loaded it. Batch 020 established that a tenant boundary '
         + 'needs THREE cases and not two — A reads its own, A cannot read B\'s, and B CAN — and this '
         + 'is the third.',
    },
    {
      id: 'owner-a-cannot-see-the-notification-of-owner-b',
      covers: ['§12.6/1', '§8.6/5', 'DB00-A03'],
      as: ownerA,
      sql: NOTIFICATION_BY_ID,
      params: [NOTIFICATION_OWNER_B],
      expect: 'no-rows',
      why: 'Tenant A\'s owner holds tenant B\'s notification id exactly and the row is not there. BOTH '
         + 'TERMS OF THE PREDICATE REFUSE IT INDEPENDENTLY here, which is why this case cannot stand in '
         + 'for the two below: user_owner_a is not the recipient AND is not a member of workspace_b, so '
         + 'a database that had lost either conjunct would still pass this one. That is the exact shape '
         + 'a conjunction hides, and it is why the suite carries a case per term.',
    },
    {
      id: 'owner-a-cannot-mark-the-notification-of-owner-b-read',
      covers: ['§12.6/1', '§8.6/5', '§8.5'],
      as: ownerA,
      ...markRead(NOTIFICATION_OWNER_B),
      expect: 'no-effect',
      witness: ownerBNotificationStillUnread,
      why: 'The write side of the boundary. The USING clause does not admit the row, so the statement '
         + 'matches nothing and Postgres raises nothing — the witness, run as B\'s own recipient, is '
         + 'what turns "returned nothing" into "the row is still there and is still unread". §8.5 '
         + 'requires USING and WITH CHECK on an update policy and this case exercises the first; the '
         + 'second has no client statement that can reach it, because `workspace_id` and `user_id` are '
         + 'absent from the client UPDATE grant, so no client can even attempt to move a row across '
         + 'scope.',
    },

    // -- THE USER HALF OF THE SCOPE. Two active members of ONE workspace, refused each other's ----
    // -- rows — including the OWNER, whom §8.1 admits to the member list and §8.4 does not admit ----
    // -- here. ------------------------------------------------------------------------------------
    {
      id: 'owner-a-cannot-see-the-notification-of-editor-a',
      covers: ['§8.4/own-notification', '§8.6/2', '§5/workspace-user'],
      as: ownerA,
      sql: NOTIFICATION_BY_ID,
      params: [NOTIFICATION_EDITOR_A],
      expect: 'no-rows',
      why: 'THE CASE THIS BATCH EXISTS FOR, AND THE ATTACKER IS THE OWNER FOR A REASON. §5 scopes '
         + 'notification.core "workspace/user" and §8.4 marks the cell `O` FOR ALL FIVE BUILT-IN '
         + 'ROLES, so user_owner_a — an ACTIVE OWNER of the workspace this row lives in, holding its '
         + 'exact id — reads nothing.\n\n'
         + 'A ROW-LEVEL SEPARATION BETWEEN TWO MEMBERS OF ONE WORKSPACE IS NOT NEW AND THIS CASE DOES '
         + 'NOT CLAIM TO BE: `viewer-a-cannot-see-another-members-row` does it on '
         + 'app.workspace_members and `editor-a-cannot-see-another-members-member-scope` on '
         + 'app.workspace_member_scopes. WHAT IS DIFFERENT IS WHICH IDENTITY IS REFUSED. §8.1 gives '
         + 'the member list to owner and admin and 011\'s workspace_members_select_roster implements '
         + 'it, so on those tables an OWNER succeeds; §8.4 gives the owner no more than the viewer '
         + 'here. A predicate copied from the roster shape would pass every case in this suite except '
         + 'this one and its mirror.',
    },
    {
      id: 'owner-a-cannot-mark-the-notification-of-editor-a-read',
      covers: ['§8.4/own-notification', '§8.6/2', '§8.5'],
      as: ownerA,
      ...markRead(NOTIFICATION_EDITOR_A),
      expect: 'no-effect',
      witness: editorANotificationStillUnread,
      why: 'The write half of the same separation, and it is a different claim from the read: SELECT and '
         + 'UPDATE are two policies with two predicates, and a batch that wrote the user term into one '
         + 'and not the other would be caught by exactly one of this pair. The witness runs as the '
         + 'ROW\'S OWN RECIPIENT rather than as the workspace owner, which is where this family departs '
         + 'from every witness above it in this file — a workspace owner cannot see the row, so it '
         + 'could not testify about it.',
    },
    {
      id: 'editor-a-sees-their-own-notification',
      covers: ['§8.4/own-notification', '§8.6/1'],
      as: editorA,
      sql: NOTIFICATION_BY_ID,
      params: [NOTIFICATION_EDITOR_A],
      expect: 'rows',
      why: 'And the editor CAN, which is what makes the two cases above about a RECIPIENT rather than '
         + 'about a role. §8.4 marks the cell `O` for owner, admin, editor, approver and viewer alike, '
         + 'so a suite that only showed the owner being refused would be consistent with a policy that '
         + 'checked role instead of recipient.',
    },
    {
      id: 'editor-a-cannot-see-the-notification-of-owner-a',
      covers: ['§8.4/own-notification', '§8.6/2'],
      as: editorA,
      sql: NOTIFICATION_BY_ID,
      params: [NOTIFICATION_OWNER_A],
      expect: 'no-rows',
      why: 'THE SEPARATION IS SYMMETRIC, asserted rather than assumed. A predicate that compared the '
         + 'reader\'s role to the recipient\'s — or that admitted a row whenever the reader outranked '
         + 'its recipient — would pass `owner-a-cannot-see-the-notification-of-editor-a` in one '
         + 'direction and fail here. Two directions, two cases.',
    },

    // -- §8.4's "mark read", which is the one write this family gives a client. --------------------
    {
      id: 'owner-a-can-mark-their-own-notification-read',
      covers: ['§8.4/own-notification', '§8.6/1'],
      as: ownerA,
      ...markRead(NOTIFICATION_OWNER_A),
      expect: 'rows',
      why: 'THE POSITIVE OF THE WRITE CELL. §8.4 reads "Own notification SELECT/MARK READ" and the '
         + 'second half is implemented as a one-column UPDATE grant plus an update policy carrying '
         + 'both USING and WITH CHECK. Without this case the four refused writes beside it would be '
         + 'consistent with a table nobody can write at all, which is what batches 050, 060 and 140 '
         + 'actually have and what this one deliberately does not. It is also what exercises the '
         + 'non-null state of read_at: the fixture loads every notification unread, so the column\'s '
         + 'other value is produced by a policy admitting a write rather than by a row asserting a '
         + 'literal.',
    },
    {
      id: 'owner-a-cannot-relabel-their-own-notification',
      covers: ['§8.4/own-notification', '§9.1/PII-2'],
      as: ownerA,
      sql: 'update app.notifications set message_key = $2 where id = $1 returning id',
      params: [NOTIFICATION_OWNER_A, 'notification.case.rewritten'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: 'THE COLUMN GRANT IS THE CONTROL AND THIS IS WHAT PROVES IT. The policy above ADMITS this row '
         + '— it is the caller\'s own notification in a workspace they are an active member of — so a '
         + 'policy-shaped test would report a pass. What refuses the statement is that `read_at` is the '
         + 'ONLY column in the client UPDATE grant, so the refusal is 42501 from the privilege system '
         + 'and the layer is declared as such. A batch that widened the grant to the table would be '
         + 'caught here and nowhere else, which is exactly what RFC-2026-021 §8.4 asks a rule to catch: '
         + '"a table-wide grant is a finding even when it covers exactly the same columns today".',
    },

    // -- §12.6/5 and §12.6/6. Suspension, on a table where suspension is what refuses. -------------
    {
      id: 'suspended-a-sees-zero-notifications',
      covers: ['§12.6/5', '§8.6/6', '§5/workspace-user'],
      as: suspendedA,
      sql: NOTIFICATION_BY_ID,
      params: [NOTIFICATION_SUSPENDED_A],
      expect: 'no-rows',
      why: 'THE MEMBERSHIP HALF OF THE PREDICATE, AND THE STRONGEST FORM §12.6/5 HAS TAKEN IN THIS SUITE. '
         + 'The fixture addresses this notification TO user_suspended_a, so the recipient term admits '
         + 'them and only `app.is_active_member(workspace_id)` refuses. On batches 050, 060 and 140 the '
         + 'suspended cases had to be labelled ANALOGUES, because a suspended member refused where '
         + 'every active member is also refused has been refused by the privilege system rather than '
         + 'by suspension; here an active member with this recipient WOULD read the row, which is '
         + 'asserted one case up. §12.6/5 asks for zero TENANT rows and a notification is one — '
         + 'unlike 010\'s user profile, whose own header places it outside that sentence.',
    },
    {
      id: 'suspended-a-cannot-mark-a-notification-read',
      covers: ['§12.6/5', '§8.6/6', '§8.5'],
      as: suspendedA,
      ...markRead(NOTIFICATION_EDITOR_A),
      expect: 'no-effect',
      witness: editorANotificationStillUnread,
      why: '§12.6/5 asks for zero rows AND no mutation, and the second half is a separate claim: a '
         + 'filtered read and a filtered write are two policies. THE TARGET IS ANOTHER MEMBER\'S ROW '
         + 'AND NOT THE SUSPENDED MEMBER\'S OWN, WHICH IS A WEAKER CASE THAN IT LOOKS AND IS SAID SO '
         + 'RATHER THAN LEFT TO BE NOTICED. The stronger statement — the suspended member marking '
         + 'notification_suspended_a read — CANNOT BE WITNESSED BY ANY IDENTITY IN THIS SCHEMA: a '
         + '`no-effect` case is an empty result PLUS a witness that reads the value back, the '
         + 'recipient is the only client identity a policy admits to that row, and the recipient here '
         + 'is the suspended member. The service holds SELECT and no policy, so it sees nothing '
         + 'either, and a witness that sees nothing fails `expectRows` — which would make the case '
         + 'fail on a CORRECT database. The read half above carries the own-row claim, where an empty '
         + 'result IS the assertion and needs no witness; this carries the mutation half at the '
         + 'granularity the harness can actually observe.',
    },
    {
      id: 'anonymous-cannot-see-a-notification',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: NOTIFICATION_BY_ID,
      params: [NOTIFICATION_OWNER_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused during name resolution, on the SCHEMA, because anon holds no USAGE on app — which '
         + 'RFC-2026-021 §7/4 makes an approved decision rather than an inherited convention. The day '
         + 'somebody grants it, this refusal moves to the table and the case fails, which is the whole '
         + 'reason the object is declared.',
    },

    // -- §8.4's SECOND ROW, "Notification insert/delivery state | N N N N N S", as columns. --------
    //
    // These four are the half of the batch that is a COLUMN LIST rather than a policy. Batch 050
    // could not implement §8.4's client cell because "a redacted status" is a projection with no
    // column list; here the two rows separate by column, and these cases are what holds that split
    // to the grant rather than to a sentence in a header.
    {
      id: 'owner-a-cannot-read-the-delivery-state-of-their-own-notification',
      covers: ['§8.4/notification-delivery', '§9.1/INTERNAL-3'],
      as: ownerA,
      sql: NOTIFICATION_DELIVERY_BY_ID,
      params: [NOTIFICATION_OWNER_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: 'THE SHARPEST CASE IN THE BATCH. The row is the caller\'s OWN notification and the policy '
         + 'admits it — one case above, the same identity reads `message_key` from the same row and '
         + 'gets it. What refuses this statement is that `delivery_state` and `delivery_failure_class` '
         + 'are absent from the client SELECT grant, because §8.4\'s second row marks delivery state '
         + '`N` for every client role including the owner. The two §8.4 rows are ONE TABLE AND TWO '
         + 'OBJECTS, as they are on app.jobs — and here the second object is a pair of columns rather '
         + 'than a transformation, which is what makes a grant sufficient and a view unnecessary.',
    },
    {
      id: 'owner-a-cannot-read-the-dedupe-key-of-their-own-notification',
      covers: ['§8.4/notification-delivery', '§8/no-row'],
      as: ownerA,
      sql: NOTIFICATION_DEDUPE_BY_ID,
      params: [NOTIFICATION_OWNER_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: 'The third withheld column, and it is withheld for a REASON NOT IN §8.4 — which is why it is '
         + 'a separate case rather than a second parameter to the one above. `dedupe_key` is ID-005\'s '
         + 'idempotency key, the identity of the event that produced the notification; §8.4 names it in '
         + 'neither of its two rows, and where a document is silent the cell is denied. A client that '
         + 'could read it could enumerate which events the system decided not to notify about twice, '
         + 'which is the "redacted status only" projection §9.1 gives INTERNAL-3 read one table over.',
    },
    {
      id: 'owner-a-cannot-write-a-notification',
      covers: ['§8.4/notification-insert', '§8.6/8'],
      as: ownerA,
      ...writeNotification('__A__', '__SELF__', 'attempted-dedupe-owner-a'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: 'THE CASE §8.4\'s SECOND ROW EXISTS FOR. It marks the notification INSERT `N` for every '
         + 'client role including the workspace owner, and the row this statement attempts is '
         + 'ADDRESSED TO THE CALLER THEMSELVES in their own workspace — so no scope check refuses it '
         + 'and every CHECK on the table is satisfied. Only the absent grant does, at the privilege '
         + 'layer, which is a refusal a later policy edit cannot widen. A client that could write its '
         + 'own inbox row could choose the deep link and the message key the product will render.',
    },
    {
      id: 'owner-a-cannot-record-a-notification-delivery',
      covers: ['§8.4/notification-delivery', '§8.5'],
      as: ownerA,
      ...recordDelivery(NOTIFICATION_OWNER_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: 'The UPDATE half of §8.4\'s second row, on the caller\'s own row, so the policy admits it and '
         + 'the column grant does not. It is a separate case from the read for the reason every pair '
         + 'in this suite is two: SELECT and UPDATE are separate privileges, and a batch that granted '
         + 'the client one of them on this column would be caught by exactly one of the two.',
    },
    {
      id: 'owner-a-cannot-delete-their-own-notification',
      covers: ['§8.5', '§8.6/9'],
      as: ownerA,
      sql: 'delete from app.notifications where id = $1 returning id',
      params: [NOTIFICATION_OWNER_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: 'The fourth verb, so the grid on this table is complete rather than three cells and an '
         + 'average. §8.5 has no broad user delete, and a notification has no lifecycle field to '
         + 'soft-delete through: §10 purges the inbox by AGE (NOTIFICATION-INBOX, 180 days) rather '
         + 'than by a user action, and batch 160 owns that sweep through app_maintenance, which this '
         + 'batch grants nothing.',
    },

    // -- §12.6/8 and RFC-2026-017 §7. The service, granted and unpoliced, on the `S` cell. ---------
    {
      id: 'service-sees-zero-notification-rows',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.4/own-notification'],
      as: service,
      sql: NOTIFICATION_DELIVERY_BY_ID,
      params: [NOTIFICATION_OWNER_A],
      expect: 'no-rows',
      why: 'app_worker holds a column-scoped SELECT on this table — INCLUDING the two delivery columns '
         + 'no client may read — and NO POLICY, so an empty read is attributable to row level security '
         + 'rather than to a forgotten GRANT, and a service role that had quietly acquired BYPASSRLS '
         + 'would return the row instead. The statement selects the columns only the service can '
         + 'reach, which makes the claim about the POLICY set rather than about a column list. §8.4 '
         + 'marks the service `P` on this row, and a `P` nobody has defined is a permission nobody may '
         + 'write.',
    },
    {
      id: 'service-cannot-write-a-notification-row',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8.4/notification-insert', 'RFC-2026-022§3'],
      as: service,
      // The recipient is the workspace owner's subject and NOT `__SELF__`: `as_service` sets a role
      // and a claim set with no `sub`, and CI found the cost of forgetting that once already. No
      // policy on this table reads the column for a service identity — there is no service policy —
      // so the value is arbitrary and the case says so.
      ...writeNotification('__A__', id('user_owner_a'), 'attempted-dedupe-service'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: '§8.4\'s `S` CELL, DENIED, AND THE FIRST ONE CLASSIFIED UNDER RFC-2026-022 RATHER THAN LEFT '
         + 'AS AN OPEN QUESTION. Batches 050 and 140 each reached an `S` cell and each reported that '
         + 'RFC-2026-016 §2 conditioned the service policy on a workspace GUC no document named; '
         + 'RFC-2026-022 (approved 2026-09-08) disposed of that by splitting the nine `S` cells into '
         + 'CARRIED and DISCOVERED, and it classifies this one CARRIED — "recipient and workspace are '
         + 'inputs". db/foundation/lint/service-policy-map.json carries that classification for both '
         + 'statements the cell names. NO POLICY IS WRITTEN, because the decision is APPROVED AND NOT '
         + 'IN EFFECT: measured 2026-09-08, the only member of app_worker is postgres, which bypasses '
         + 'RLS. So app_worker holds the INSERT grant, the refusal is row level security finding no '
         + 'permissive policy, and the declared POLICY layer is what says so. It is one of the two '
         + 'cases the CI negative control for app.notifications rests on: with row level security off, '
         + 'this write SUCCEEDS and the case fails.',
    },
    {
      id: 'service-cannot-record-a-notification-delivery-state',
      // NOT labelled RFC-2026-017§7, following 020's note and 040's: that clause asks for the service
      // to be denied BY ROW LEVEL SECURITY WITH AN ERROR, and an UPDATE whose USING clause filters
      // the row reports zero rows and raises nothing. It is a `no-effect` and carries a witness.
      covers: ['§8.4/notification-delivery', 'RFC-2026-022§3'],
      as: service,
      ...recordDelivery(NOTIFICATION_EDITOR_A),
      expect: 'no-effect',
      witness: editorANotificationStillUnread,
      why: 'THE SECOND STATEMENT OF THE SAME `S` CELL, AND IT FAILS DIFFERENTLY FROM THE FIRST. §8.4 '
         + 'reads "Notification insert/DELIVERY STATE", so the cell names two statements, and '
         + 'RFC-2026-022 §7.2 keys its register on (cell, STATEMENT) rather than on the table — the '
         + 'asset-hard-purge row in §3\'s table is BOTH shapes for exactly that reason. app_worker '
         + 'holds a column-scoped UPDATE on delivery_state, so the privilege system admits the '
         + 'statement and the empty policy set filters the row: nothing raises. The witness — run as '
         + 'the row\'s own recipient — is what turns "returned nothing" into "the row is still there '
         + 'and still unread", and it is reading a DIFFERENT column from the one the write targeted, '
         + 'which is the strongest form available here: the recipient may not read delivery_state at '
         + 'all.',
    },
    {
      id: 'service-cannot-mark-a-notification-read',
      covers: ['§8.4/own-notification', '§8/no-row'],
      as: service,
      ...markRead(NOTIFICATION_OWNER_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: 'THE COLUMN THE SERVICE MAY NOT TOUCH, which is the mirror of the two columns the client may '
         + 'not. `read_at` is absent from the SERVICE UPDATE grant, because marking a notification read '
         + 'is the recipient\'s act — §8.4 marks that cell `O` for the client and `P` for the service, '
         + 'and `P` is "passes per policy/EXPLICIT capability" over a capability set no document '
         + 'defines, which is the refusal 011, 020, 021 and 030 each recorded and RFC-2026-020 §8 '
         + 'ratified. The refusal is the privilege system rather than the policy, so it would survive '
         + 'a service policy being written, which is the point of asserting it separately.',
    },
    {
      id: 'service-cannot-delete-a-notification-row',
      covers: ['§8.5', '§8.6/9'],
      as: service,
      sql: 'delete from app.notifications where id = $1 returning id',
      params: [NOTIFICATION_OWNER_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notifications' },
      why: 'No role holds DELETE on any table in this batch. §8.5 has no broad user delete and hard '
         + 'deletion is a retention sweep — NOTIFICATION-INBOX and PUSH-SECRET both name a purge — '
         + 'which batch 160 owns through app_maintenance, granted nothing here.',
    },

    // -- app.notification_preferences. §8 IS SILENT, so every cell is denied. ----------------------
    //
    // THE CASE IDS HERE SAY `channel-preference` AND NOT `notification-preference`, AND THAT IS A
    // CONTROL RATHER THAN A PREFERENCE ABOUT NAMES. The CI negative control matches a failed case by
    // a regex per table, and `[a-z0-9-]*notification` — the pattern app.notifications needs — would
    // also match every id containing `notification-preference`, so the preference table's entry
    // could be satisfied by an inbox regression it did not cause. That is the overlap batch 130
    // measured across the pre-existing entries and reported without being able to fix; it is
    // avoidable here by naming, so it is avoided. `channel-preference` is not a euphemism: the row
    // IS a per-channel switch, keyed on CTR-NTF-001's three-channel vocabulary, and that is the only
    // axis any document gives a preference.
    //
    // These four are the batch's honest finding rather than its achievement. §6's registry gives 051
    // "notification inbox/preferences/push" and §5's inventory names "preferences", so the table is
    // assigned; §8's four matrices contain NO ROW for a notification preference, in either
    // direction. Where a document is silent the cell is denied (030's reading), so no client role
    // holds any privilege — which means a person can neither read nor set their own preference, and
    // that is recorded as a blocker owed to §8.4's owner rather than repaired by inventing a cell.
    {
      id: 'owner-a-cannot-read-their-own-channel-preference',
      covers: ['§8/no-row', '§9.1/TENANT-1'],
      as: ownerA,
      sql: PREFERENCE_OF,
      params: ['__A__', '__SELF__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notification_preferences' },
      why: 'THE OWNER OF THE WORKSPACE, ASKING FOR THEIR OWN PREFERENCE ROW, REFUSED. §8 has no row for '
         + 'a notification preference in any of its four matrices, so there is no cell to implement '
         + 'and every operation is denied by default. §9.1 classes "settings" TENANT-1 with a client '
         + 'projection "allowed through RLS", and 060 established what that sentence does and does not '
         + 'do: it licenses the CONTENT and names no object, no tier and no mechanism, while '
         + 'RFC-2026-021 §8.5 makes the list of inherited base-table grants CLOSED. A grant here would '
         + 'be a client read with no §8 cell behind it. The fix is a row in §8.4 written by that '
         + 'document\'s owner, not a grant written by this migration.',
    },
    {
      id: 'owner-b-cannot-read-their-own-channel-preference',
      covers: ['§8/no-row'],
      as: ownerB,
      sql: PREFERENCE_OF,
      params: ['__B__', id('user_owner_b')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notification_preferences' },
      why: 'The same refusal from the other tenant, on the other tenant\'s own row, and the pair is what '
         + 'stops the case above being read as a tenant boundary: both rows exist, both owners hold '
         + 'their own workspace\'s and their own subject\'s exact ids, and neither reaches anything. '
         + 'That is batch 030\'s shape for a table no identity can read, on a row that DOES belong to a '
         + 'tenant.',
    },
    {
      id: 'owner-a-cannot-set-their-own-channel-preference',
      covers: ['§8/no-row', '§8.6/8'],
      as: ownerA,
      ...setPreference('__A__', '__SELF__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notification_preferences' },
      why: 'THE UNCOMFORTABLE ONE, AND IT IS ASSERTED RATHER THAN SOFTENED. A person cannot decline a '
         + 'channel, and `line` — the channel this statement attempts — is an EXTERNAL side effect. '
         + 'The batch that lands a §8 row for this cell arrives at a failing assertion instead of an '
         + 'empty one, which is why the case exists in the shape it does.',
    },
    {
      id: 'anonymous-cannot-read-a-channel-preference',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: PREFERENCE_OF,
      params: ['__A__', id('user_owner_a')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA, as every anonymous case on an `app` table in this suite is. anon holds no '
         + 'USAGE on app (RFC-2026-021 §7/4), so name resolution refuses it before a table is reached.',
    },
    {
      id: 'service-sees-zero-channel-preference-rows',
      covers: ['§12.6/8', 'RFC-2026-017§7', '§8/no-row'],
      as: service,
      sql: PREFERENCE_OF,
      params: ['__A__', id('user_owner_a')],
      expect: 'no-rows',
      why: 'THE ONE CASE ON THIS TABLE THAT ROW LEVEL SECURITY DECIDES, and the reason app_worker holds '
         + 'a SELECT grant at all. Without the grant this refusal would be 42501 either way and would '
         + 'prove only that somebody forgot a GRANT; with the grant and no policy, an empty read can '
         + 'only have come from RLS, and a service role that had quietly acquired BYPASSRLS would '
         + 'SUCCEED here. The service holds SELECT AND NOTHING ELSE — §8 has no row for a preference, '
         + 'so a verb issued here would be a verb nobody reviews against a caller — so the CI negative '
         + 'control for app.notification_preferences rests on THIS CASE ALONE, which batch 030 warned '
         + 'is one deletion away from resting on none. That is said here and pinned by id in '
         + 'identity-isolation.test.mjs rather than left to be counted.',
    },
    {
      id: 'service-cannot-set-a-channel-preference-row',
      covers: ['§8/no-row', '§12.6/8-negative'],
      as: service,
      ...setPreference('__A__', id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'notification_preferences' },
      why: 'THE SERVICE READS AND DOES NOT WRITE, and the two layers on one table are asserted as two '
         + 'claims. app_worker holds SELECT here and nothing else, so its read is refused by row level '
         + 'security and its write by the privilege system — which is 060\'s shape on app.ai_models '
         + 'and, unlike 060\'s app.ai_model_policies, is NOT accompanied by an INSERT grant issued to '
         + 'make a control rounder. No document says a service sets a person\'s preference; a verb '
         + 'issued ahead of a caller is a verb nobody reviews against one.',
    },

    // -- private.push_subscription_references. SECRET-4, and a refusal on the SCHEMA. --------------
    //
    // The second subject this suite has in `private`, and every case below declares
    // `deniedOn: { kind: 'schema', name: 'private' }` for the reason batch 060's do: no role holds a
    // privilege on the table and no role holds USAGE on the schema, so the first missing privilege
    // is the schema's. A case may name `private` only when its own statement names a `private.`
    // TABLE a migration creates, which no scaffolding failure can do, and
    // identity-isolation.test.mjs holds these to that.
    {
      id: 'owner-a-cannot-read-a-push-subscription-reference',
      covers: ['§9.1/SECRET-4', '§9.2', '§8/no-row'],
      as: ownerA,
      sql: PUSH_SUBSCRIPTION_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'The owner of the workspace this subscription belongs to, refused before the table is '
         + 'reached. §9.1 lists "PUSH TOKEN" as one of its four examples of SECRET-4 — so this is the '
         + 'class the document assigns and not one read by analogy — and gives that class a client '
         + 'projection of "never returned after write"; §3.1 puts secret references in `private` with '
         + 'no direct grant. The refusal lands on the SCHEMA because that is where the first missing '
         + 'privilege is, and asserting the schema rather than the table is what makes this case notice '
         + 'the day somebody writes `grant usage on schema private to authenticated` — the grant that '
         + 'would have to come first.',
    },
    {
      id: 'owner-b-cannot-read-a-push-subscription-reference',
      covers: ['§9.1/SECRET-4', '§9.2'],
      as: ownerB,
      sql: PUSH_SUBSCRIPTION_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'The other tenant\'s owner, holding workspace A\'s exact id, refused identically. On this '
         + 'table the pair is NOT a tenant boundary and is not offered as one: nothing here '
         + 'distinguishes the two owners, which is exactly the claim — a push subscription reference '
         + 'is unreadable, not tenant-scoped-readable.',
    },
    {
      id: 'service-cannot-read-a-push-subscription-reference',
      // NOT labelled RFC-2026-017§7, for the reason 060's equivalent is not: §7's claim is that the
      // service is denied BY ROW LEVEL SECURITY, and this table deliberately grants it nothing, so
      // the refusal is the privilege system. That is the STRONGER refusal and it is a DIFFERENT one,
      // which is the whole distinction the layer declaration exists to keep.
      covers: ['§9.1/SECRET-4', '§12.6/8-negative'],
      as: service,
      sql: PUSH_SUBSCRIPTION_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'THE CASE THAT DEPARTS FROM THE app_worker SHAPE THE REST OF THIS BATCH USES, deliberately, '
         + 'and 060 paid the same price one table over. Everywhere else the service holds a grant so '
         + 'that a denial is attributable to RLS; here it holds none, because §9.1 gives SECRET-4 a '
         + 'client projection of "never returned after write" and §8 gives a push subscription no cell '
         + 'in any matrix. The price is that the CI negative control can have NO ENTRY for this table '
         + '— disabling row level security restores no grant — and that absence is asserted in BOTH '
         + 'DIRECTIONS in identity-isolation.test.mjs rather than left to be noticed.',
    },
    {
      id: 'anonymous-cannot-read-a-push-subscription-reference',
      covers: ['§12.6/6', '§8.6/7', '§9.2'],
      as: anonymous,
      sql: PUSH_SUBSCRIPTION_OF,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'Anonymous refused on `private` rather than on `app`. anon holds nothing anywhere; the schema '
         + 'that refuses it is the schema the statement names, which is why declaring the object is '
         + 'what makes the case mean something rather than merely pass.',
    },
    {
      id: 'owner-a-cannot-create-a-push-subscription-reference',
      covers: ['§9.2', '§8/no-row', 'RFC-2026-012§1'],
      as: ownerA,
      sql: 'insert into private.push_subscription_references'
         + ' (workspace_id, user_id, provider, credential_reference)'
         + " values ($1, $2, 'fixture-push', 'vault://fixture/attempted') returning id",
      params: ['__A__', '__SELF__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'REGISTERING A DEVICE FOR PUSH IS THE OPERATION A PERSON WOULD PERFORM, AND IT IS NOT '
         + 'IMPLEMENTED. That is a refusal with a reason rather than an omission: a client grant on a '
         + 'table in `private` is not one grant, it is `grant usage on schema private` first, which '
         + 'would put private.as_user and every worker payload table a later batch puts there inside '
         + 'the reach of every end user — RFC-2026-021 §7/4\'s structural argument about anon and '
         + 'schema app, one schema over. §3.1 says the server reaches it through a typed service; '
         + 'RFC-2026-012 §4 says what that is; RFC-2026-021 §10 records that no command function '
         + 'exists. The day one does, this case is the one that has to change.',
    },
    {
      id: 'owner-a-cannot-revoke-a-push-subscription-reference',
      covers: ['§11.2/revoke', '§11.4/revoke'],
      as: ownerA,
      sql: 'update private.push_subscription_references set revoked_at = now()'
         + ' where workspace_id = $1 returning id',
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'TWO CLAUSES NAME THIS REVOCATION IN TERMS AND NEITHER HAS A PATH. §11.2: "Push token/'
         + 'session/active invitation revoke ทันที", triggered by a member being removed. §11.4 step '
         + '2: "Revoke browser sessions, PUSH TOKENS, invitations, API/connector credentials", '
         + 'triggered by a workspace closing. `revoked_at` is the column both would set and no role '
         + 'can set it, which means both lifecycles have a store and no writer — stated as a case '
         + 'rather than as a comment, so the batch that brings the retention job (160) or the command '
         + 'surface arrives at a failing assertion instead of an empty one.',
    },
    {
      id: 'service-cannot-rotate-a-push-subscription-reference',
      covers: ['§9.1/SECRET-4', '§9.2'],
      as: service,
      sql: 'update private.push_subscription_references set rotated_at = now()'
         + ' where workspace_id = $1 returning id',
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'Rotation is the operation a service performs — a browser reissues a subscription when its '
         + 'endpoint changes — and this one cannot. It is a separate case from the read for the reason '
         + 'every pair in this suite is two cases: SELECT and UPDATE are separate privileges, and a '
         + 'batch that granted the service one of them would be caught by exactly one of the two.',
    },
    {
      id: 'owner-a-cannot-delete-a-push-subscription-reference',
      covers: ['§8.5', '§8.6/9'],
      as: ownerA,
      sql: 'delete from private.push_subscription_references where workspace_id = $1 returning id',
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'private' },
      why: 'The fourth verb, so the grid on this table is complete. §8.5 has no broad user delete; '
         + 'removing a push subscription is a revocation, which is a typed lifecycle field this table '
         + 'has and no role can write, and a purge, which §10\'s PUSH-SECRET gives to batch 160.',
    },
    // -- Batch 131 — the billing projection: the webhook receipt, the invoice, the payment. -------
    //
    // THERE IS NO `rows` CASE ANYWHERE IN THIS BLOCK, and it is the same shape batch 140's block has
    // for the same reason: no client role holds any privilege on any of the three tables, and no
    // policy is written for one, so no request-path identity has an operation to succeed at. What
    // stands in place of a positive is batch 030's substitute, restated by 140 — "both owners are
    // refused identically, at the privilege layer" — plus the two service cases per table that row
    // level security actually decides.
    //
    // AND THERE IS NO WITNESS FUNCTION HERE EITHER. A `no-effect` case pairs an empty write with a
    // witness read run as an identity that CAN see the target row, and there is no such identity.
    // Every client write below is therefore REFUSED at the privilege layer, which is the stronger
    // assertion the helper module reserves for exactly that; and the one filtered write this batch
    // could have asserted — the service's own column-scoped UPDATE, which row level security empties
    // rather than refuses — is ABSENT for the same reason batch 050 has no
    // `service-cannot-update-a-job-row`. It is unassertable, not overlooked.
    {
      id: 'owner-a-cannot-read-a-billing-webhook-receipt',
      covers: ['§8.3/raw-webhook-select', '§9.1/PROVIDER-3'],
      as: ownerA,
      sql: RECEIPT_BY_EVENT,
      params: ['fixture-billing-event-a'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_webhook_receipts' },
      why: '§8.3 "Raw token/webhook SELECT" is `N` for the owner — the strictest client cell in the '
         + 'whole matrix short of "Plain credential SELECT" — and §11.1/5 excludes a raw webhook from '
         + 'a PDPA export as well. The receipt this identity is refused is the one CORRELATED TO ITS '
         + 'OWN WORKSPACE, so the refusal is about the table rather than about a tenant boundary.',
    },
    {
      id: 'owner-b-cannot-read-a-billing-webhook-receipt',
      covers: ['§8.3/raw-webhook-select', '§8.6/1'],
      as: ownerB,
      sql: RECEIPT_BY_EVENT,
      params: ['fixture-billing-event-b'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_webhook_receipts' },
      why: 'The other owner, refused its own workspace\'s receipt identically. This pair is batch '
         + '030\'s substitute for a cross-tenant assertion on a table no identity can read, and it is '
         + 'what stops the case above being read as a tenant boundary it is not.',
    },
    {
      id: 'suspended-a-cannot-read-a-billing-webhook-receipt',
      covers: ['§12.6/5', '§8.6/6', '§8.3/raw-webhook-select'],
      as: suspendedA,
      sql: RECEIPT_BY_EVENT,
      params: ['fixture-billing-event-a'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_webhook_receipts' },
      why: '§12.6/5 asked of a table where membership is not what refuses. The suspended member is '
         + 'refused at the same layer as the active owner, which is the honest reading: §7\'s "only '
         + 'status active grants access" is about a policy, and there is no policy here.',
    },
    {
      id: 'anonymous-cannot-read-a-billing-webhook-receipt',
      covers: ['§12.6/7', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: RECEIPT_BY_EVENT,
      params: ['fixture-billing-event-a'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused on the SCHEMA and not on the table, because `anon` holds no USAGE on `app` and '
         + 'name resolution stops first. RFC-2026-021 §7/4 decided that as a negative and gave the '
         + 'structural reason; this case is what notices the day it changes.',
    },
    {
      id: 'owner-a-cannot-record-a-billing-webhook-receipt',
      covers: ['§8.3/raw-webhook-select', '§8.6/2'],
      as: ownerA,
      ...recordWebhookReceipt('__A__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_webhook_receipts' },
      why: 'A client that could write an inbox row could assert that a provider said something. §8.1 '
         + 'makes a receipt the product of a SIGNATURE CHECK — "ปฏิเสธ signature/ความเก่าเกิน tolerance" '
         + '— and §14.3 names "ปลอม webhook" as its first threat. The refusal is at the privilege layer '
         + 'because no client role holds INSERT, which is a stronger refusal than a policy an edit '
         + 'could widen.',
    },
    {
      id: 'owner-a-cannot-attribute-a-billing-webhook-receipt',
      covers: ['§8.3/raw-webhook-select', '§8.6/2', 'RFC-2026-022§3'],
      as: ownerA,
      ...resolveWebhookReceipt('__A__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_webhook_receipts' },
      why: 'The one write the PROCESSING half of a receipt makes: claim the unresolved fixture row by '
         + 'naming the workspace it belongs to. That row is the one RFC-2026-022 §3\'s test is about — '
         + 'a confinement predicate on `correlation_workspace_id` excludes exactly the rows a '
         + 'processor exists to resolve — and a client that could make this write could ATTRIBUTE '
         + 'another tenant\'s provider event to itself.',
    },
    {
      id: 'service-sees-zero-billing-webhook-receipts',
      covers: ['§12.6/8', '§8.3/raw-webhook-select', 'RFC-2026-022§5'],
      as: service,
      sql: RECEIPT_BY_EVENT,
      params: ['fixture-billing-event-a'],
      expect: 'no-rows',
      why: 'app_worker holds a column-scoped SELECT and NO POLICY, so this empty read can only have '
         + 'come from row level security — a service role that had quietly acquired BYPASSRLS would '
         + 'return the row. THIS ASSERTION IS PERMANENT AND NOT PENDING: RFC-2026-022 §3 classifies '
         + 'this §8.3 `S` cell DISCOVERED and §5/5 gives a discovered cell no policy permanently, so '
         + 'no policy will ever admit app_worker here. What will flip instead is a NEW PAIR — a broker '
         + 'claim succeeds while this statement still returns zero (§7.3 c). A reader who takes this '
         + 'case as pending will "fix" it by writing the unscoped service policy §4 option B rejects. '
         + 'It is one of the two cases the negative control for this table rests on.',
    },
    {
      id: 'service-cannot-record-a-billing-webhook-receipt',
      covers: ['§12.6/8', '§8.3/raw-webhook-select', 'RFC-2026-022§5'],
      as: service,
      ...recordWebhookReceipt('__A__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'billing_webhook_receipts' },
      why: 'The RAISING half, and the second case the negative control rests on: app_worker holds the '
         + 'INSERT grant §8.1/6\'s durable insert needs, so FORCE ROW LEVEL SECURITY with an empty '
         + 'policy set is what refuses the row — with row level security off, the grant is enough and '
         + 'the write lands. Only an INSERT can carry this claim: an UPDATE a USING clause filters '
         + 'reports zero rows and raises nothing.',
    },
    {
      id: 'service-cannot-delete-a-billing-webhook-receipt',
      covers: ['§8.5', '§10/WEBHOOK-SHORT'],
      as: service,
      sql: 'delete from app.billing_webhook_receipts'
         + " where provider = 'stripe' and livemode = false"
         + " and provider_event_hash = sha256(convert_to($1, 'utf8')) returning id",
      params: ['fixture-billing-event-a'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_webhook_receipts' },
      why: 'No role holds DELETE on any table in this batch. §10\'s WEBHOOK-SHORT purge is a retention '
         + 'sweep owned by batch 160 through app_maintenance, which this batch grants nothing. Not '
         + 'labelled for row level security: a grant-layer refusal is not evidence about a policy.',
    },
    {
      id: 'owner-a-cannot-read-a-billing-invoice',
      covers: ['§9.1/FIN-3', 'RFC-2026-021§3'],
      as: ownerA,
      sql: INVOICE_AMOUNT_BY_ID,
      params: [INVOICE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: 'ITS OWN INVOICE, and this is the sharpest refusal in the batch because it is the one a '
         + 'document argues FOR: §6 of the billing contract gives the Workspace Owner "ขอใบเสร็จ/ข้อมูล '
         + 'billing" with a ✓, and §11.1 puts the invoice read model in the PDPA export minimum. It is '
         + 'still refused, because §9.1\'s FIN-3 client projection is an "owner/admin summary", a '
         + 'summary is a security_invoker view, and RFC-2026-021 keeps that allowlist empty and its C1 '
         + '— a named CLIENT caller exists — fails while there is no `src/`. This case is what a future '
         + 'allowlist entry has to flip, deliberately.',
    },
    {
      id: 'owner-b-cannot-read-a-billing-invoice',
      covers: ['§9.1/FIN-3', '§8.6/1'],
      as: ownerB,
      sql: INVOICE_AMOUNT_BY_ID,
      params: [INVOICE_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: 'The other owner, refused its own invoice identically — 030\'s substitute for a positive on '
         + 'a table nobody reads. The two invoices are deliberately DIFFERENT rows: A\'s is settled and '
         + 'B\'s is not, so a boundary that failed would leak a fact rather than a duplicate.',
    },
    {
      id: 'owner-a-cannot-read-the-billing-invoice-of-tenant-b',
      covers: ['§12.6/1', '§8.6/5', '§9.1/FIN-3'],
      as: ownerA,
      sql: INVOICE_AMOUNT_BY_ID,
      params: [INVOICE_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: 'Tenant A\'s owner holds tenant B\'s EXACT invoice id and is refused — at the PRIVILEGE '
         + 'layer, which is worth stating rather than counting as a tenant-isolation proof. On this '
         + 'table there is no policy for a boundary to be expressed in, so this case says "no client '
         + 'reads this table" and not "the tenant boundary holds"; the coverage map records the '
         + 'difference instead of averaging it.',
    },
    {
      id: 'viewer-a-cannot-read-a-billing-invoice',
      covers: ['§8.6/2', '§9.1/FIN-3'],
      as: viewerA,
      sql: INVOICE_BY_ID,
      params: [INVOICE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: 'A viewer is refused where the owner is refused, so §8.6 case 2 is carried here in its weak '
         + 'form only: the roles are not distinguished, because no role has the operation. Recorded '
         + 'rather than counted — batch 130 carries the strong form of this cell on '
         + 'app.billing_subscriptions, where the owner passes and the viewer does not.',
    },
    {
      id: 'suspended-a-cannot-read-a-billing-invoice',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: INVOICE_BY_ID,
      params: [INVOICE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: '§12.6/5 on a table where membership decides nothing, for the reason the receipt case '
         + 'gives: the refusal is at the privilege layer for every client identity alike.',
    },
    {
      id: 'anonymous-cannot-read-a-billing-invoice',
      covers: ['§12.6/7', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: INVOICE_BY_ID,
      params: [INVOICE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused on the SCHEMA, for RFC-2026-021 §7/4\'s structural reason: the first anon grant is '
         + '`usage on schema app`, which moves the denial layer of every object in app at once.',
    },
    {
      id: 'owner-a-cannot-project-a-billing-invoice',
      covers: ['§8.6/2', 'RFC-2026-012§1'],
      as: ownerA,
      ...projectInvoice('__A__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: 'A client that could write an invoice could write a zero one. RFC-2026-012 decision 1 is '
         + 'server-only mutation with zero exceptions at G0, and CONTRIBUTING_AGENTS.md derives '
         + 'payment entitlement only from a verified webhook projection.',
    },
    {
      id: 'owner-a-cannot-void-a-billing-invoice',
      covers: ['§8.6/2', '§12.1'],
      as: ownerA,
      ...voidInvoice(INVOICE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: 'Writing off your own debt, refused at the privilege layer. §12.1 forbids the human version '
         + 'of this in terms — "ห้าม Support ปรับ subscription/entitlement โดยแก้ DB" — and the '
         + 'database version is refused by the absence of the verb rather than by a policy an edit '
         + 'could widen.',
    },
    {
      id: 'service-sees-zero-billing-invoices',
      covers: ['§12.6/8', '§9.1/FIN-3'],
      as: service,
      sql: INVOICE_AMOUNT_BY_ID,
      params: [INVOICE_A],
      expect: 'no-rows',
      why: 'app_worker holds a column-scoped SELECT and no policy, so this empty read can only have '
         + 'come from row level security. It is one of the two cases the negative control for '
         + 'app.billing_invoices rests on. Unlike the receipt\'s, this one IS pending rather than '
         + 'permanent: §8 has no row for an invoice at all, so what would change it is an RFC-2026-021 '
         + 'allowlist entry rather than RFC-2026-022, and the two absences are different absences.',
    },
    {
      id: 'service-cannot-project-a-billing-invoice',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      ...projectInvoice('__A__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: 'The RAISING half. app_worker holds the INSERT grant the projection will need, so FORCE ROW '
         + 'LEVEL SECURITY with an empty policy set is what refuses the row — with row level security '
         + 'off the write lands, which is what makes this the second case the negative control rests '
         + 'on. Batch 130 promised this batch would grant the SUBSCRIPTION writer; it does not, and the '
         + 'migration header says why, so the projection this insert imitates still has no writer.',
    },
    {
      id: 'service-cannot-delete-a-billing-invoice',
      covers: ['§8.5', '§10/FINANCE-HISTORY'],
      as: service,
      ...deleteInvoice(INVOICE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_invoices' },
      why: 'No role holds DELETE anywhere in this batch. §10\'s FINANCE-HISTORY keeps an invoice seven '
         + 'years by engineering default and ends "retain ledger integrity"; the purge is batch 160\'s '
         + 'through app_maintenance, which this batch grants nothing.',
    },
    {
      id: 'owner-a-cannot-read-a-billing-payment',
      covers: ['§9.1/FIN-3', '§9.2'],
      as: ownerA,
      sql: PAYMENTS_OF_INVOICE,
      params: [INVOICE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: 'The "payment refs" of §5\'s inventory row, refused to the tenant they belong to. The '
         + 'statement selects `direction` and `amount` by name, so what is being protected is legible: '
         + 'what moved and which way, which is a commercial fact rather than a data one. There is no '
         + 'card column to protect — §9.2 and BILL-DEC-003 forbid the data and the migration refuses '
         + 'the column shapes — so this refusal is about money and never about an instrument.',
    },
    {
      id: 'owner-b-cannot-read-a-billing-payment',
      covers: ['§9.1/FIN-3', '§8.6/1'],
      as: ownerB,
      sql: PAYMENTS_OF_INVOICE,
      params: [INVOICE_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: 'Both owners refused identically, which is what this batch has instead of a positive. B\'s '
         + 'payment FAILED where A\'s succeeded and was partly refunded, so the two sides of the '
         + 'boundary are distinguishable rows rather than copies.',
    },
    {
      id: 'approver-a-cannot-read-a-billing-payment',
      covers: ['§8.6/2', '§9.1/FIN-3'],
      as: approverA,
      sql: PAYMENTS_OF_INVOICE,
      params: [INVOICE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: '§6 of the billing contract gives an Admin/Approver "configurable" on every billing action '
         + 'and ✗ on none of them, which is a capability set no document defines — the `P` refusal '
         + 'every batch since 010 has made. Here it costs nothing to refuse, because the owner is '
         + 'refused too.',
    },
    {
      id: 'suspended-a-cannot-read-a-billing-payment',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: PAYMENTS_OF_INVOICE,
      params: [INVOICE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: '§12.6/5 on the third of this batch\'s three tables, at the same layer for the same reason.',
    },
    {
      id: 'anonymous-cannot-read-a-billing-payment',
      covers: ['§12.6/7', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: PAYMENTS_OF_INVOICE,
      params: [INVOICE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'The third anonymous case, refused on the SCHEMA. All three declare the schema rather than '
         + 'the table, because that is where name resolution stops for a role holding no USAGE.',
    },
    {
      id: 'owner-a-cannot-record-a-billing-payment',
      covers: ['§8.6/2', 'RFC-2026-012§1'],
      as: ownerA,
      ...recordPayment('__A__', INVOICE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: 'A client that could write a payment row could assert that it had paid. That is the '
         + 'sentence CONTRIBUTING_AGENTS.md, RFC-2026-012 decision 1 and §2.1, §3/2 and §12.1 of the '
         + 'billing contract each forbid, arriving one table further along than batch 130 could put '
         + 'it: 130 refused a client-asserted SUBSCRIPTION, and this refuses a client-asserted PAYMENT.',
    },
    {
      id: 'owner-a-cannot-amend-a-billing-payment',
      covers: ['§8.6/9', '§9.1/FIN-3'],
      as: ownerA,
      ...amendPayment(INVOICE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: '§8.6 case 9 — "Immutable/LEDGER row → update/delete fail" — for the client half. The '
         + 'statement sets the AMOUNT, which is the number a finance record exists to be right about.',
    },
    {
      id: 'service-sees-zero-billing-payments',
      covers: ['§12.6/8', '§9.1/FIN-3'],
      as: service,
      sql: PAYMENTS_OF_INVOICE,
      params: [INVOICE_A],
      expect: 'no-rows',
      why: 'app_worker holds a column-scoped SELECT and no policy, so the empty read is row level '
         + 'security and not a forgotten grant. One of the two cases the negative control for '
         + 'app.billing_payments rests on. Two rows sit behind this refusal — a charge and its partial '
         + 'refund — so a policy widened to "any row" would return them rather than returning nothing.',
    },
    {
      id: 'service-cannot-record-a-billing-payment',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      ...recordPayment('__A__', INVOICE_A),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: 'The RAISING half and the second case the control rests on: app_worker holds INSERT — '
         + 'appending is how a ledger changes, so the verb is granted — and the empty policy set is '
         + 'what refuses the row. With row level security off the write lands.',
    },
    {
      id: 'service-cannot-amend-a-billing-payment',
      covers: ['§8.6/9', '§12.1'],
      as: service,
      ...amendPayment(INVOICE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: 'The append-only claim as the PRIVILEGE system holds it, for the one role that holds any '
         + 'privilege here at all. No role has UPDATE on this table, so the refusal is about the VERB '
         + 'and cannot be widened by editing a policy. Not labelled for RFC-2026-017 §7: a grant-layer '
         + 'refusal is not evidence about row level security.',
    },
    {
      id: 'service-cannot-delete-a-billing-payment',
      covers: ['§8.6/9', '§10/FINANCE-HISTORY'],
      as: service,
      ...deletePayment(INVOICE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'billing_payments' },
      why: 'The other half of §8.6 case 9. §10\'s FINANCE-HISTORY ends "retain ledger integrity" and a '
         + 'deletable ledger has none; the purge is batch 160\'s and this batch grants app_maintenance '
         + 'nothing. Together with the two amend cases, the whole of case 9 is live on this table from '
         + 'both a client identity and the service.',
    },

    // -- BATCH 132 — the effective limit question, asked in one statement so the refusal has an ------
    // -- object rather than an argument. -----------------------------------------------------------
    //
    // Four cases, and none of them is about a table batch 132 creates, because it creates none. What
    // they measure is the SHAPE of the question the registry gives this batch: an allowance reached
    // through a subscription, minus a consumption reached through a quota bucket. Three of the four
    // run the same statement with one join added or removed, so the difference between them is the
    // difference between "assemblable" and "refused" and nothing else.
    //
    // WHAT HOLDS THEM, STATED BECAUSE IT IS NOT THE NEGATIVE CONTROL. Batch 132 adds no control entry
    // — the step disables row level security on a TABLE and this batch creates none — so these four
    // rest on the static suite, which pins each of them by id, and on the positive that sits beside
    // the negatives. Two are grant-layer refusals, which ci.yml's own comment says "would pass
    // unchanged" with row level security disabled; the other two name more than one table, and a
    // control that opens one table at a time cannot restore a statement that needs three.
    {
      id: 'owner-a-reads-a-consumed-total-beside-its-subscription',
      covers: ['§8.3/billing-subscription-select', '§8.4/usage-quota-summary-select', '§9.1/FIN-3'],
      as: ownerA,
      sql: ENTITLEMENT_HALF_OMITTED,
      params: ['__A__'],
      expect: 'rows',
      why: 'THE POSITIVE THE THREE NEGATIVES REST ON, and the half of the effective limit question '
         + 'that IS assemblable today. §8.3 marks "Billing/subscription SELECT" `Y` for the owner and '
         + '§8.4 marks "Usage/quota summary SELECT" `Y` for the owner, so one identity holds both '
         + 'cells, and this statement joins the two families on workspace_id and returns rows. '
         + 'Without it, the next case would be satisfied by a database where the owner could read '
         + 'neither table and the refusal would say nothing about WHICH half is missing.',
    },
    {
      id: 'owner-a-cannot-reach-the-allowance-that-would-bound-a-consumed-total',
      covers: ['RFC-2026-012§2', 'RFC-2026-012§3', 'RFC-2026-021§4/C1', '§9.1/FIN-3'],
      as: ownerA,
      sql: EFFECTIVE_LIMIT_QUESTION,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'plan_entitlements' },
      why: 'THE SAME STATEMENT WITH ONE JOIN ADDED, and the added join is where the answer stops '
         + 'being assemblable. `authenticated` holds a column-scoped SELECT on app.billing_subscriptions '
         + '(130) and on app.quota_buckets (061) and NOTHING on app.plan_entitlements, so the refusal '
         + 'is at the privilege layer and names that table — which is the layer distinction '
         + 'RFC-2026-021 M4 measured live on a different column. It flips the day an allowlist entry '
         + 'admits an effective-limit projection, which batch 132 names as a candidate and does not '
         + 'add: RFC-2026-021 §7/3 keeps the allowlist empty, C1 fails because there is no client '
         + 'caller, and the number such a projection exists to carry has no definition yet.',
    },
    {
      id: 'service-reads-no-effective-limit',
      covers: ['§12.6/8', 'RFC-2026-017§7', 'RFC-2026-022§5'],
      as: service,
      sql: EFFECTIVE_LIMIT_QUESTION,
      params: ['__A__'],
      expect: 'no-rows',
      why: 'THE ONE IDENTITY THAT HOLDS EVERY GRANT THE STATEMENT NEEDS, and it still reads nothing. '
         + 'app_worker holds SELECT on app.billing_subscriptions and app.plan_entitlements (130) and a '
         + 'column-scoped SELECT on app.quota_buckets (061), and a policy on NONE of the three, so the '
         + 'empty result is row level security rather than a forgotten grant — 010\'s shape, asked of '
         + 'a statement that spans two families. It is deliberately not the case a service policy '
         + 'would flip: RFC-2026-022 classifies §8 `S` cells, §8 has no row for a plan-catalog read, '
         + 'and batch 132 therefore declines the policy batch 130\'s own case says is owed to it.',
    },
    {
      id: 'owner-a-cannot-read-a-quota-bucket-watermark',
      covers: ['§9.1/INTERNAL-3', '§9.1/FIN-3', 'RFC-2026-021§4/C3'],
      as: ownerA,
      sql: BUCKET_WATERMARK_OF_WORKSPACE,
      params: ['__A__'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quota_buckets' },
      why: 'The one column of app.quota_buckets `authenticated` is NOT granted, and batch 061 says '
         + 'whose it is: computed_through "describes the resolver\'s own progress, which is the shape '
         + '§9.1 gives INTERNAL-3 rather than the summary §9.1 gives FIN-3, and batch 132 owns it". '
         + 'The owner reads every other column of the same row in the positive above, so this is the '
         + 'COLUMN boundary of a column-scoped grant and not a row one — RFC-2026-021 M3\'s '
         + 'measurement, which is why a column-scoped grant is a drift control at all. It is asserted '
         + 'here rather than left implicit because a resolver that later projected this column to a '
         + 'client would be telling a tenant how far behind a job is.',
    },

    // -- BATCH 070 — research: the run, the citation, the capture, the evidence, the suggestion. --
    //
    // Five tables and three shapes of case, because §8.2 gives this family four rows and §9.1 takes
    // one table back out of the first of them.
    //
    //   * app.research_runs, app.research_sources, app.research_evidence and app.research_suggestions
    //     carry §8.2's "Knowledge/Research SELECT | Y | Y | Y | Y | Y", so every negative below has a
    //     POSITIVE beside it and the boundary is a client-visible one — which is what lets this batch
    //     assert §8.6 cases 1 through 5 as reads rather than as privilege refusals.
    //   * app.research_snapshots carries §9.1's COPYRIGHT-3 instead, whose client projection is
    //     "approved excerpt only" and whose approval nothing defines, so NO client role holds
    //     anything on it and its every client case is a grant-layer refusal. Its substitute for a
    //     cross-tenant claim is 030's and 140's: both owners refused identically.
    //   * The two client WRITE cells — §8.2's "Start/cancel Research" and "Suggestion
    //     save/dismiss/use" — are asserted from five identities each, and §8.6 case 8 lives on the
    //     UPDATE rather than on an INSERT, because §8.2 gives clients no INSERT anywhere in this
    //     family.
    {
      id: 'owner-a-sees-the-research-run-of-a1',
      covers: ['§8.2', '§12.6/1'],
      as: ownerA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1')],
      expect: 'rows',
      why: 'The positive every negative below is measured against. §8.2 marks "Knowledge/Research '
         + 'SELECT" `Y` for all five built-in roles, so the policy tests active membership and not '
         + 'role, and user_owner_a holds no member scope row at all — 021 reads §7 as "a scope '
         + 'narrows, it does not grant", so the restrictive narrowing subtracts nothing here.',
    },
    {
      id: 'viewer-a-sees-the-research-run-of-a1',
      covers: ['§8.2', '§8.6/1'],
      as: viewerA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1')],
      expect: 'rows',
      why: 'The `Y` at the far end of §8.2\'s SELECT row. A viewer reads research and cannot touch '
         + 'it, and both halves are asserted: this case and viewer-a-cannot-cancel-a-research-run.',
    },
    {
      id: 'editor-a-sees-the-research-run-inside-their-narrowing',
      covers: ['§8.6/1', '§12.6/2'],
      as: editorA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1')],
      expect: 'rows',
      why: 'user_editor_a holds a `business` scope on business_a1 and this run is under it, so '
         + 'app.member_scope_admits_business is true. Without this positive the case below would be '
         + 'satisfied by a narrowing that denied the editor everything.',
    },
    {
      id: 'editor-a-cannot-see-the-research-run-outside-their-narrowing',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a2')],
      expect: 'no-rows',
      why: '§8.6 case 3 on this family: same Workspace, a Business the member scope does not cover. '
         + 'The permissive policy admits it — the editor is an active member — and the RESTRICTIVE '
         + 'narrowing subtracts it, which is the only shape that can subtract at all.',
    },
    {
      id: 'pinned-editor-a-sees-the-unpinned-research-run-of-a1',
      covers: ['§8.6/1', '§7'],
      as: pageEditorA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1')],
      expect: 'rows',
      why: 'A consequence of 021\'s definition, consumed rather than re-decided: '
         + 'member_scope_covers_business counts a `page` scope row on its parent Business, because '
         + '"a member scoped to one Page must be able to read the Business that Page hangs from". So '
         + 'a page-scoped editor reaches business-level research, which reaches every Page beneath '
         + 'it. 040 met the same consequence one family over; if it is wrong it is wrong in 021.',
    },
    {
      id: 'pinned-editor-a-sees-the-research-run-pinned-to-their-own-target',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1_page')],
      expect: 'rows',
      why: 'The `else` branch of the run\'s narrowing — app.member_scope_admits_page — reached by the '
         + 'one identity in this suite whose scope is a single Page. A branch no row exercises is a '
         + 'branch that could be inverted without any case failing.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-research-run-pinned-to-a-sibling-target',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1_sibling_page')],
      expect: 'no-rows',
      why: '§8.6 case 4, which no identity §12.6 names can carry: both the editor and the approver '
         + 'are scoped at BUSINESS level and §7 gives a business scope every Page beneath it. This '
         + 'refusal is by PAGE inside a Business the caller is otherwise admitted to — the case above '
         + 'proves the caller is admitted — which is what distinguishes it from case 3.',
    },
    {
      id: 'owner-a-cannot-see-the-research-run-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_b1')],
      expect: 'no-rows',
      why: 'The attack is run while HOLDING tenant B\'s exact run id, which is the whole of §12.6\'s '
         + 'control: proving A cannot reach B by guessing is worthless.',
    },
    {
      id: 'owner-b-sees-the-research-run-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_b1')],
      expect: 'rows',
      why: 'THE THIRD CASE, and without it the negative above is satisfied by a fixture that never '
         + 'loaded the row. Batch 020 established that a cross-tenant claim is three cases and not '
         + 'two; this is the far side of the boundary reading what the near side cannot.',
    },
    {
      id: 'suspended-a-sees-zero-research-runs',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1')],
      expect: 'no-rows',
      why: '§7: only `active` grants access. app.is_active_member is where that lives for this table, '
         + 'and the predicate has no `status` term of its own.',
    },
    {
      id: 'anonymous-cannot-read-a-research-run',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused on the SCHEMA rather than the table: `anon` holds no USAGE on app, so name '
         + 'resolution stops before a table is reached. RFC-2026-021 §7/4 makes that an approved '
         + 'decision, and declaring the schema is what makes this case notice the day it changes.',
    },
    {
      id: 'editor-a-can-cancel-the-research-run-of-a1',
      covers: ['§8.2', '§8.6/1'],
      as: editorA,
      ...researchCancelRun(id('research_run_a1'), '__SELF__'),
      expect: 'rows',
      why: 'The half of §8.2\'s "Start/cancel Research" this schema can reach. The row\'s INSERT is '
         + '`N` for every client role on the very next line of the matrix, so starting is a command '
         + 'RFC-2026-012 §4 names and RFC-2026-021 §10 records does not exist; cancelling is an '
         + 'update of an existing row and the editor is one of its three `Y` roles.',
    },
    {
      id: 'approver-a-cannot-cancel-a-research-run',
      covers: ['§8.6/2', '§12.6/3'],
      as: approverA,
      ...researchCancelRun(id('research_run_a1'), '__SELF__'),
      expect: 'no-effect',
      witness: researchRunStillOpen(ownerA, id('research_run_a1')),
      why: '§8.2 marks the approver `N` on "Start/cancel Research". The USING half does not admit the '
         + 'row, so the statement matches nothing and RAISES NOTHING — which is why the witness is '
         + 'half the assertion: with row level security off the update lands and the witness reads '
         + '`cancelled`.',
    },
    {
      id: 'viewer-a-cannot-cancel-a-research-run',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...researchCancelRun(id('research_run_a1'), '__SELF__'),
      expect: 'no-effect',
      witness: researchRunStillOpen(ownerA, id('research_run_a1')),
      why: '§12.6/4 on this table, and it says something here that it cannot say everywhere: the '
         + 'viewer READS this row (viewer-a-sees-the-research-run-of-a1) and still cannot write it, '
         + 'so the refusal is about the operation rather than about the table being unreachable.',
    },
    {
      id: 'owner-a-cannot-forge-the-actor-on-a-research-run-cancel',
      covers: ['§8.6/8', '§8.5'],
      as: ownerA,
      ...researchCancelRun(id('research_run_a1'), id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'research_runs' },
      why: '§8.6 case 8 — a forged actor column — asserted on an UPDATE, because §8.2 gives clients '
         + 'no INSERT anywhere in this family and the case would otherwise have nowhere to live. The '
         + 'UPDATE policy\'s WITH CHECK requires updated_by = (select auth.uid()); the USING half '
         + 'admits the row, so this refusal is the second half of the policy and not the first.',
    },
    {
      id: 'owner-a-cannot-cancel-the-research-run-of-tenant-b',
      covers: ['§8.6/5', '§8.5'],
      as: ownerA,
      ...researchCancelRun(id('research_run_b1'), '__SELF__'),
      expect: 'no-effect',
      witness: researchRunStillOpen(ownerB, id('research_run_b1')),
      why: 'The write half of the cross-tenant case, holding B\'s exact id. The witness runs as B\'s '
         + 'own owner, because no A-side identity can see the row it has to prove is unchanged.',
    },
    {
      id: 'editor-a-cannot-cancel-the-research-run-outside-their-narrowing',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      ...researchCancelRun(id('research_run_a2'), '__SELF__'),
      expect: 'no-effect',
      witness: researchRunStillOpen(ownerA, id('research_run_a2')),
      why: 'The write half of the member-scope narrowing. It is refused AFTER the caller has passed '
         + 'the role predicate — an editor is one of the three `Y` roles — so it fails because a '
         + 'RESTRICTIVE policy subtracted rather than because no permissive one admitted.',
    },
    {
      id: 'owner-a-cannot-start-a-research-run',
      covers: ['§8.2', 'RFC-2026-012§4'],
      as: ownerA,
      ...researchStartRun(A, BUSINESS_A1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_runs' },
      why: '§8.2\'s "Research run/source/evidence INSERT" is `N` in all five client columns, so the '
         + 'START half of the row above it has no path through the request path at all. It is a '
         + 'command function\'s job and none exists; the refusal is an ABSENT GRANT, which cannot be '
         + 'widened by editing a policy.',
    },
    {
      id: 'owner-a-cannot-rewrite-the-brief-of-a-research-run',
      covers: ['§8.5', '§8.2'],
      as: ownerA,
      ...researchRewriteBrief(id('research_run_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_runs' },
      why: 'The client UPDATE grant names cancel_requested_at and updated_by and nothing else, so '
         + '§8.5\'s "no row moves across tenant or scope by an update" holds here by a COLUMN LIST. '
         + 'The brief is in that list for its own reason: a run whose brief changed after it ran is a '
         + 'record of work nobody requested.',
    },
    {
      id: 'owner-a-cannot-delete-a-research-run',
      covers: ['§8.5', '§10/RESEARCH-RUN'],
      as: ownerA,
      ...researchDeleteRun(id('research_run_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_runs' },
      why: '§8.5 has no broad user delete. Hard deletion here is a retention sweep — RESEARCH-RUN '
         + 'names one — and batch 160 owns it through app_maintenance, which batch 070 grants '
         + 'nothing.',
    },
    {
      id: 'service-sees-zero-research-runs',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: RESEARCH_RUN_BY_ID,
      params: [id('research_run_a1')],
      expect: 'no-rows',
      why: 'app_worker holds a column-scoped SELECT and NO POLICY, so the empty read is row level '
         + 'security and not a forgotten grant — and a service role that had quietly acquired '
         + 'BYPASSRLS would return the row here. One of the two cases the negative control for '
         + 'app.research_runs rests on.',
    },
    {
      id: 'service-cannot-start-a-research-run',
      covers: ['§12.6/8', 'RFC-2026-022§3'],
      as: service,
      ...researchStartRun(A, BUSINESS_A1, id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'research_runs' },
      why: 'The RAISING half, and the second case the control rests on: app_worker holds the INSERT '
         + '§8.2\'s `S` gives it, and the empty policy set is what refuses the row. RFC-2026-022 §3\'s '
         + 'test classifies this statement CARRIED in db/foundation/lint/service-policy-map.json and '
         + 'the decision is approved and NOT IN EFFECT, so no service policy exists to admit it.',
    },
    {
      id: 'owner-a-sees-the-research-source-of-a1',
      covers: ['§8.2', '§8.6/1'],
      as: ownerA,
      sql: RESEARCH_SOURCE_BY_ID,
      params: [id('research_source_a1')],
      expect: 'rows',
      why: 'The citation half of §8.2\'s SELECT row, and the positive the child-narrowing negatives '
         + 'are measured against.',
    },
    {
      id: 'pinned-editor-a-sees-the-research-source-of-the-unpinned-run',
      covers: ['§8.6/1', '§4/3'],
      as: pageEditorA,
      sql: RESEARCH_SOURCE_BY_ID,
      params: [id('research_source_a1')],
      expect: 'rows',
      why: 'A source carries no page column of its own, so its restrictive policy resolves through '
         + 'its run. This is that resolution answering TRUE, and it is the control for the case '
         + 'below: without it, an exists() that had been replaced by a constant false would still '
         + 'pass.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-research-source-of-a-sibling-target-run',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: RESEARCH_SOURCE_BY_ID,
      params: [id('research_source_a1_sibling_page')],
      expect: 'no-rows',
      why: 'THE CASE THIS BATCH OWES MOST. A child\'s reach IS its parent\'s reach, asserted rather '
         + 'than copied — a nullable copy of the run\'s page could not be held equal to it under any '
         + 'foreign key this schema can write. The caller is admitted to the Business (the case '
         + 'above) and refused this row only because the RUN it belongs to is pinned to a Page the '
         + 'caller\'s scope does not cover. Replace the exists() with '
         + 'member_scope_admits_business(workspace_id, business_profile_id) and this is the only case '
         + 'that fails.',
    },
    {
      id: 'owner-a-cannot-see-the-research-source-of-tenant-b',
      covers: ['§8.6/5'],
      as: ownerA,
      sql: RESEARCH_SOURCE_BY_ID,
      params: [id('research_source_b1')],
      expect: 'no-rows',
      why: 'Holding tenant B\'s exact source id.',
    },
    {
      id: 'owner-b-sees-the-research-source-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: RESEARCH_SOURCE_BY_ID,
      params: [id('research_source_b1')],
      expect: 'rows',
      why: 'The third case on the citation table.',
    },
    {
      id: 'suspended-a-sees-zero-research-sources',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: RESEARCH_SOURCE_BY_ID,
      params: [id('research_source_a1')],
      expect: 'no-rows',
      why: '§12.6/5 on the second of this batch\'s five tables.',
    },
    {
      id: 'anonymous-cannot-read-a-research-source',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: RESEARCH_SOURCE_BY_ID,
      params: [id('research_source_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused on the schema, for the reason every anonymous case in this suite declares one.',
    },
    {
      id: 'owner-a-cannot-cite-a-research-source',
      covers: ['§8.2'],
      as: ownerA,
      ...researchCiteSource(A, BUSINESS_A1, id('research_run_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_sources' },
      why: '§8.2\'s "Research run/source/evidence INSERT" names the source explicitly and marks it '
         + '`N` for every client role. A client that could write a citation could put a URL of its '
         + 'choosing in front of whatever dereferences one.',
    },
    {
      id: 'owner-a-cannot-rewrite-a-research-source',
      covers: ['§8.6/9', '§10/RESEARCH-SNAPSHOT'],
      as: ownerA,
      ...researchRewriteSource(id('research_source_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_sources' },
      why: 'The append-only claim as the privilege system holds it. §5 names only evidence immutable, '
         + 'so this disposition is batch 070\'s own reading: §10 preserves "permitted hash/citation '
         + 'metadata" after the capture is purged, and a citation editable once its snapshot is gone '
         + 'is a claim about a document nobody can check.',
    },
    {
      id: 'owner-a-cannot-delete-a-research-source',
      covers: ['§8.6/9', '§8.5'],
      as: ownerA,
      ...researchDeleteSource(id('research_source_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_sources' },
      why: 'The other half of §8.6 case 9 on the citation.',
    },
    {
      id: 'service-sees-zero-research-sources',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: RESEARCH_SOURCE_BY_ID,
      params: [id('research_source_a1')],
      expect: 'no-rows',
      why: 'One of the two cases the negative control for app.research_sources rests on.',
    },
    {
      id: 'service-cannot-cite-a-research-source',
      covers: ['§12.6/8', 'RFC-2026-022§3'],
      as: service,
      ...researchCiteSource(A, BUSINESS_A1, id('research_run_a1')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'research_sources' },
      why: 'The RAISING half and the second case that control rests on. The statement is CARRIED by '
         + 'RFC-2026-022 §3\'s test — the source copies its workspace from a run the worker already '
         + 'holds — and no policy is written, because the decision is NOT IN EFFECT.',
    },
    {
      id: 'service-cannot-rewrite-a-research-source',
      covers: ['§8.6/9'],
      as: service,
      ...researchRewriteSource(id('research_source_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_sources' },
      why: 'Append-only for the SERVICE too, which is the half that matters: appending is the only '
         + 'thing §8.2\'s `S` licenses, and no role holds UPDATE on this table at all. Not labelled '
         + 'for RFC-2026-017 §7 — a grant-layer refusal is not evidence about row level security.',
    },
    {
      id: 'owner-a-cannot-read-a-research-snapshot',
      covers: ['§9.1/COPYRIGHT-3', '§9.2'],
      as: ownerA,
      sql: RESEARCH_SNAPSHOT_BY_CAPTURE,
      params: [id('research_source_a1'), RESEARCH_CAPTURE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: 'THE COPYRIGHT-3 REFUSAL, and it is refused for the OWNER of the workspace whose research '
         + 'produced the capture — §8.2\'s SELECT row would have admitted them. §9.1 gives this class '
         + 'the client projection "approved excerpt only", nothing in this repository defines an '
         + 'approval, and §9.2 forbids a full research snapshot in a client surface at all. The row '
         + 'is addressed by (source, content hash), which is the natural key 070 makes unique.',
    },
    {
      id: 'owner-b-cannot-read-a-research-snapshot',
      covers: ['§9.1/COPYRIGHT-3', '§8.6/1'],
      as: ownerB,
      sql: RESEARCH_SNAPSHOT_BY_CAPTURE,
      params: [id('research_source_b1'), RESEARCH_CAPTURE_B],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: 'Both owners refused identically, which is what this table has instead of a cross-tenant '
         + 'positive (030\'s substitute, kept by 140 and 131). The two captures are distinguishable '
         + 'rows and not copies: B\'s has been PURGED — object_ref null, purged_at stamped — which is '
         + '§10\'s "purge object + locator; preserve permitted hash/citation metadata" as data.',
    },
    {
      id: 'editor-a-cannot-read-a-research-snapshot',
      covers: ['§9.1/COPYRIGHT-3', '§8.6/2'],
      as: editorA,
      sql: RESEARCH_SNAPSHOT_BY_CAPTURE,
      params: [id('research_source_a1'), RESEARCH_CAPTURE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: 'The editor reads the SOURCE and the EVIDENCE that name this capture and cannot read the '
         + 'capture, which is the whole shape of §9.1\'s split: CONTENT-2 goes through RLS and '
         + 'COPYRIGHT-3 does not go at all until somebody defines an approval.',
    },
    {
      id: 'suspended-a-cannot-read-a-research-snapshot',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: RESEARCH_SNAPSHOT_BY_CAPTURE,
      params: [id('research_source_a1'), RESEARCH_CAPTURE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: '§12.6/5 at the GRANT layer rather than as a filtered read, which is the form it takes on '
         + 'every table no client role may reach. It says less than the same case on '
         + 'app.research_runs does, and that is recorded rather than counted.',
    },
    {
      id: 'anonymous-cannot-read-a-research-snapshot',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: RESEARCH_SNAPSHOT_BY_CAPTURE,
      params: [id('research_source_a1'), RESEARCH_CAPTURE_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the schema, like every other anonymous case here.',
    },
    {
      id: 'owner-a-cannot-capture-a-research-snapshot',
      covers: ['§9.1/COPYRIGHT-3', '§9.2'],
      as: ownerA,
      ...researchCaptureSnapshot(A, BUSINESS_A1, id('research_source_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: 'A client that could write a capture row could point a locator at anything and give it a '
         + 'retention limit of its own choosing, on the one table DATA-DEC-07 is about.',
    },
    {
      id: 'service-sees-zero-research-snapshots',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: RESEARCH_SNAPSHOT_BY_CAPTURE,
      params: [id('research_source_a1'), RESEARCH_CAPTURE_A],
      expect: 'no-rows',
      why: 'The FIRST of exactly two cases the negative control for app.research_snapshots rests on, '
         + 'and it is the whole of the live evidence about that table: no client role holds anything, '
         + 'so nothing else on it is decided by row level security. app_worker holds a column-scoped '
         + 'SELECT and no policy.',
    },
    {
      id: 'service-cannot-capture-a-research-snapshot',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      ...researchCaptureSnapshot(A, BUSINESS_A1, id('research_source_a1')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: 'The SECOND of those two, and the raising one. app_worker holds the INSERT — a capture has '
         + 'to be written by something — and the empty policy set refuses the row. §8.2\'s `S` names '
         + 'the run, the source and the evidence and NOT the snapshot, so this table has no cell in '
         + 'db/foundation/lint/service-policy-map.json either: where a document is silent the cell is '
         + 'denied.',
    },
    {
      id: 'service-cannot-extend-the-retention-of-a-research-snapshot',
      covers: ['§15/DATA-DEC-07', '§8.5'],
      as: service,
      ...researchExtendRetention(id('research_source_a1'), RESEARCH_CAPTURE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: 'THE DATA-DEC-07 CASE. `retention_until` is outside every UPDATE grant to every role, so a '
         + 'retention window cannot be pushed forward through any granted path. The decision is OPEN '
         + '(30 days max default, owner Research+Legal), the column is NOT NULL with no default so no '
         + 'row inherits a number nobody approved, and this is the half that keeps the number a row '
         + 'DID state from being edited afterwards. A grant-layer refusal, so not labelled for '
         + 'RFC-2026-017 §7.',
    },
    {
      id: 'service-cannot-rewrite-the-digest-of-a-research-snapshot',
      covers: ['§9.3', '§10/RESEARCH-SNAPSHOT'],
      as: service,
      ...researchRewriteDigest(id('research_source_a1'), RESEARCH_CAPTURE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: '§10 preserves the hash after the object is purged and app.research_evidence names a '
         + 'capture by it, so a role that could rewrite it could re-point a piece of evidence at a '
         + 'document nobody captured. A capture whose hash changed is a different capture.',
    },
    {
      id: 'service-cannot-delete-a-research-snapshot',
      covers: ['§8.5', '§10/RESEARCH-SNAPSHOT'],
      as: service,
      ...researchDeleteSnapshot(id('research_source_a1'), RESEARCH_CAPTURE_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_snapshots' },
      why: 'A snapshot is PURGED and not deleted: §10 says "purge object + locator; PRESERVE '
         + 'permitted hash/citation metadata", which is an update of two columns and not the removal '
         + 'of a row — the row is what a later evidence lookup and a later audit both read.',
    },
    {
      id: 'owner-a-sees-the-research-evidence-of-a1',
      covers: ['§8.2', '§11.1'],
      as: ownerA,
      sql: RESEARCH_EVIDENCE_BY_ID,
      params: [id('research_evidence_a1')],
      expect: 'rows',
      why: '§11.1\'s minimum export domain is "Research citation/evidence metadata", and metadata is '
         + 'all this row holds: which source, and the digest of the capture it was taken from. There '
         + 'is no excerpt column, so the client read is of the citation and never of the material.',
    },
    {
      id: 'owner-a-cannot-see-the-research-evidence-of-tenant-b',
      covers: ['§8.6/5'],
      as: ownerA,
      sql: RESEARCH_EVIDENCE_BY_ID,
      params: [id('research_evidence_b1')],
      expect: 'no-rows',
      why: 'Holding tenant B\'s exact evidence id. B\'s row carries a NULL capture digest where A\'s '
         + 'carries one, so the two sides are distinguishable rows.',
    },
    {
      id: 'owner-b-sees-the-research-evidence-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: RESEARCH_EVIDENCE_BY_ID,
      params: [id('research_evidence_b1')],
      expect: 'rows',
      why: 'The third case on the evidence table.',
    },
    {
      id: 'suspended-a-sees-zero-research-evidence-rows',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: RESEARCH_EVIDENCE_BY_ID,
      params: [id('research_evidence_a1')],
      expect: 'no-rows',
      why: '§12.6/5 on the evidence table.',
    },
    {
      id: 'anonymous-cannot-read-a-research-evidence-row',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: RESEARCH_EVIDENCE_BY_ID,
      params: [id('research_evidence_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the schema.',
    },
    {
      id: 'owner-a-cannot-record-a-research-evidence-row',
      covers: ['§8.2'],
      as: ownerA,
      ...researchRecordEvidence(A, BUSINESS_A1, id('research_source_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_evidence' },
      why: '§8.2 names evidence in its INSERT row and marks it `N` for every client role. A client '
         + 'that could write evidence could manufacture the support for its own claim.',
    },
    {
      id: 'owner-a-cannot-amend-a-research-evidence-row',
      covers: ['§8.6/9', '§5'],
      as: ownerA,
      ...researchAmendEvidence(id('research_evidence_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_evidence' },
      why: '§8.6 case 9 on the one object §5 names immutable. The statement clears the capture digest, '
         + 'which is the column that says WHICH document this evidence was taken from.',
    },
    {
      id: 'owner-a-cannot-delete-a-research-evidence-row',
      covers: ['§8.6/9', '§8.5'],
      as: ownerA,
      ...researchDeleteEvidence(id('research_evidence_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_evidence' },
      why: 'The other half of case 9.',
    },
    {
      id: 'service-sees-zero-research-evidence-rows',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: RESEARCH_EVIDENCE_BY_ID,
      params: [id('research_evidence_a1')],
      expect: 'no-rows',
      why: 'One of the two cases the negative control for app.research_evidence rests on.',
    },
    {
      id: 'service-cannot-record-a-research-evidence-row',
      covers: ['§12.6/8', 'RFC-2026-022§3'],
      as: service,
      ...researchRecordEvidence(A, BUSINESS_A1, id('research_source_a1')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'research_evidence' },
      why: 'The raising half, and the third of batch 070\'s three CARRIED statements. app_worker holds '
         + 'the INSERT §8.2\'s `S` gives it and the empty policy set refuses the row.',
    },
    {
      id: 'service-cannot-amend-a-research-evidence-row',
      covers: ['§8.6/9', '§5'],
      as: service,
      ...researchAmendEvidence(id('research_evidence_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_evidence' },
      why: 'Immutable for the SERVICE too, which is the half §5 actually turns on: §8.2 gives the '
         + 'service the INSERT and nothing else, and no role holds UPDATE on this table at all.',
    },
    {
      id: 'service-cannot-delete-a-research-evidence-row',
      covers: ['§8.6/9', '§8.5'],
      as: service,
      ...researchDeleteEvidence(id('research_evidence_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_evidence' },
      why: 'And the delete half for the service. Together with the two amend cases, the whole of §8.6 '
         + 'case 9 is live on this table from both a client identity and the service.',
    },
    {
      id: 'owner-a-sees-the-research-suggestion-of-a1',
      covers: ['§8.2', '§8.6/1'],
      as: ownerA,
      sql: RESEARCH_SUGGESTION_BY_ID,
      params: [id('research_suggestion_a1')],
      expect: 'rows',
      why: 'The positive the four write negatives below are measured against.',
    },
    {
      id: 'owner-a-cannot-see-the-research-suggestion-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: RESEARCH_SUGGESTION_BY_ID,
      params: [id('research_suggestion_b1')],
      expect: 'no-rows',
      why: 'The READ half of the cross-tenant case, holding tenant B\'s exact suggestion id — the write '
         + 'half is below. Both are needed: a caller refused a write it could still READ would be '
         + 'refused by the role predicate rather than by the tenant boundary, and this batch asserts '
         + 'both predicates on this table.',
    },
    {
      id: 'editor-a-can-save-the-research-suggestion-of-a1',
      covers: ['§8.2', '§8.6/1'],
      as: editorA,
      ...researchSaveSuggestion(id('research_suggestion_a1'), '__SELF__'),
      expect: 'rows',
      why: '§8.2\'s "Suggestion save/dismiss/use" is `Y` for owner, admin and editor. The fixture row '
         + 'carries all three verb timestamps NULL, so this write changes something — a case that set '
         + 'what was already there would pass against a database where the write did nothing.',
    },
    {
      id: 'approver-a-cannot-save-a-research-suggestion',
      covers: ['§8.6/2', 'RFC-2026-020§8'],
      as: approverA,
      ...researchSaveSuggestion(id('research_suggestion_a1'), '__SELF__'),
      expect: 'no-effect',
      witness: researchSuggestionStillUnsaved(ownerA, id('research_suggestion_a1')),
      why: 'THE `P` REFUSAL, and this is the cell it is about: §8.2 marks the approver `P` on '
         + '"Suggestion save/dismiss/use" while marking the other three `Y`. RFC-2026-020 §8 makes it '
         + 'an approved decision that `P` cannot be implemented until somebody defines the capability '
         + 'set, so the approver is refused and the refusal is recorded as owed rather than as final.',
    },
    {
      id: 'viewer-a-cannot-save-a-research-suggestion',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...researchSaveSuggestion(id('research_suggestion_a1'), '__SELF__'),
      expect: 'no-effect',
      witness: researchSuggestionStillUnsaved(ownerA, id('research_suggestion_a1')),
      why: '§8.2 marks the viewer `N`. The viewer can READ this row, so the refusal is about the '
         + 'operation and not about the table.',
    },
    {
      id: 'owner-a-cannot-forge-the-actor-on-a-research-suggestion-save',
      covers: ['§8.6/8', '§8.5'],
      as: ownerA,
      ...researchSaveSuggestion(id('research_suggestion_a1'), id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'research_suggestions' },
      why: '§8.6 case 8 on the second of this batch\'s two client write paths. The USING half admits '
         + 'the row and the WITH CHECK half refuses the forged actor, which is why the outcome is a '
         + 'RAISED refusal rather than a filtered one.',
    },
    {
      id: 'owner-a-cannot-save-the-research-suggestion-of-tenant-b',
      covers: ['§8.6/5', '§8.5'],
      as: ownerA,
      ...researchSaveSuggestion(id('research_suggestion_b1'), '__SELF__'),
      expect: 'no-effect',
      witness: researchSuggestionStillUnsaved(ownerB, id('research_suggestion_b1')),
      why: 'The cross-tenant write, holding B\'s exact suggestion id. It names `saved_at` and not '
         + '`used_at` on purpose: B\'s row is already DISMISSED, and a case that stamped `used_at` '
         + 'would be refused by research_suggestions_one_outcome as well, so the refusal it observes '
         + 'could not be attributed to the policy.',
    },
    {
      id: 'owner-b-sees-the-research-suggestion-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: RESEARCH_SUGGESTION_BY_ID,
      params: [id('research_suggestion_b1')],
      expect: 'rows',
      why: 'The third case on the suggestion table, and the row the cross-tenant WRITE above is '
         + 'about — so that negative is a refusal against something rather than against nothing.',
    },
    {
      id: 'owner-a-cannot-rewrite-the-title-of-a-research-suggestion',
      covers: ['§8.5', '§8.2'],
      as: ownerA,
      ...researchRewriteTitle(id('research_suggestion_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_suggestions' },
      why: '§8.2\'s three verbs are save, dismiss and use. Rewriting what a run PROPOSED is none of '
         + 'them, and the refusal is an absent column in the grant rather than a policy clause.',
    },
    {
      id: 'owner-a-cannot-propose-a-research-suggestion',
      covers: ['§8.2'],
      as: ownerA,
      ...researchProposeSuggestion(A, BUSINESS_A1, id('research_run_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_suggestions' },
      why: '§8 has NO cell anywhere for creating a suggestion — §4\'s ERD says a RUN proposes one — '
         + 'and where a document is silent the cell is denied. A client that could propose its own '
         + 'suggestion could put words into the research\'s mouth.',
    },
    {
      id: 'owner-a-cannot-delete-a-research-suggestion',
      covers: ['§8.5'],
      as: ownerA,
      ...researchDeleteSuggestion(id('research_suggestion_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'research_suggestions' },
      why: '§8.5 has no broad user delete. Dismissing is the typed lifecycle field §8.2 names in the '
         + 'operation itself, which is 040\'s reading of the same rule for an archived knowledge item.',
    },
    {
      id: 'suspended-a-sees-zero-research-suggestions',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: RESEARCH_SUGGESTION_BY_ID,
      params: [id('research_suggestion_a1')],
      expect: 'no-rows',
      why: '§12.6/5 on the last of this batch\'s five tables.',
    },
    {
      id: 'anonymous-cannot-read-a-research-suggestion',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: RESEARCH_SUGGESTION_BY_ID,
      params: [id('research_suggestion_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the schema.',
    },
    {
      id: 'service-sees-zero-research-suggestions',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      sql: RESEARCH_SUGGESTION_BY_ID,
      params: [id('research_suggestion_a1')],
      expect: 'no-rows',
      why: 'One of the two cases the negative control for app.research_suggestions rests on.',
    },
    {
      id: 'service-cannot-propose-a-research-suggestion',
      covers: ['§12.6/8', 'RFC-2026-017§7'],
      as: service,
      ...researchProposeSuggestion(A, BUSINESS_A1, id('research_run_a1')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'research_suggestions' },
      why: 'The raising half. §8.2 gives the service no cell for this table either — its `S` names the '
         + 'run, the source and the evidence — so app_worker holds the INSERT a producer needs, holds '
         + 'no policy, and is refused by row level security. That is why there is no entry for this '
         + 'table in db/foundation/lint/service-policy-map.json: inventing a `cell` value for a row '
         + '§8 does not have would be a claim about the access matrix made in a lint file.',
    },

    // -- BATCH 080 — content: the idea, the item, the version, the variant, the review. --------
    //
    // Five tables and three shapes of case, because §8.2 gives this family three rows and the third
    // is the hardest cell in the matrix.
    //
    //   * ALL FIVE TABLES carry §8.2's "Content SELECT | Y | Y | Y | Y | Y", so every negative below
    //     has a POSITIVE beside it and the boundary is a client-visible one — which is what lets
    //     this batch assert §8.6 cases 1 through 5 as READS rather than as privilege refusals.
    //   * THE TWO MUTABLE TABLES carry §8.2 row 2 — "Content create/edit/version | Y | Y | Y | N |
    //     N" — as an INSERT and a column-scoped UPDATE, asserted from five identities. The cell is
    //     HALF implemented and the half is named: a client renames a draft and cannot approve one,
    //     because `status` is outside the UPDATE grant and moving it is a domain command's act.
    //   * THE THREE IMMUTABLE TABLES carry row 3 — `N` for every role INCLUDING the service, which
    //     no other row in §8 is — as absent grants and absent policies. Every write case against
    //     them is therefore a GRANT-layer refusal, and the three read cases are RLS-decided.
    //
    // THE SERVICE CASES HERE MAKE A DIFFERENT CLAIM FROM EVERY BATCH BEFORE 130's, AND THE
    // DIFFERENCE IS THE POINT. Batch 070 grants app_worker select, insert and update and lets row
    // level security refuse it, so its `service-sees-zero-*` cases are RLS-decided. Batch 080 grants
    // app_worker NOTHING: the writer this family needs is a SECURITY DEFINER command function owned
    // by app_command (RFC-2026-017 §3), not a worker with privileges, and granting one here would
    // build a second path to the same act. So every service case below is refused by the PRIVILEGE
    // system — stronger, and a different claim, and labelled as one rather than filed under
    // RFC-2026-017 §7, which asks for a refusal BY row level security and therefore needs a grant
    // for row level security to refuse.
    {
      id: 'owner-a-sees-the-content-item-of-a1',
      covers: ['§8.2', '§12.6/1'],
      as: ownerA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1')],
      expect: 'rows',
      why: 'The positive every negative below is measured against. §8.2 marks "Content SELECT" `Y` '
         + 'for all five built-in roles, so the policy tests active membership and not role, and '
         + 'user_owner_a holds no member scope row at all — 021 reads §7 as "a scope narrows, it '
         + 'does not grant", so the restrictive narrowing subtracts nothing here.',
    },
    {
      id: 'viewer-a-sees-the-content-item-of-a1',
      covers: ['§8.2', '§8.6/1'],
      as: viewerA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1')],
      expect: 'rows',
      why: 'The `Y` at the far end of §8.2\'s SELECT row. A viewer reads content and cannot touch '
         + 'it, and both halves are asserted: this case and viewer-a-cannot-rename-a-content-item.',
    },
    {
      id: 'approver-a-sees-the-content-item-of-a1',
      covers: ['§8.2', '§12.6/3'],
      as: approverA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1')],
      expect: 'rows',
      why: 'THE HALF §12.6/3 NEEDS AND THE REFUSALS CANNOT SUPPLY. "user_approver_a cannot edit '
         + 'content/knowledge" is a claim about the ROLE, and it only says that if the approver can '
         + 'SEE the row they are refused: user_approver_a holds a business scope on business_a1, so '
         + 'the restrictive narrowing admits this row and the three refusals below are the role '
         + 'test and nothing else. Batch 040 paid the knowledge half of that sentence the same way.',
    },
    {
      id: 'editor-a-sees-the-content-item-inside-their-narrowing',
      covers: ['§8.6/1', '§12.6/2'],
      as: editorA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1')],
      expect: 'rows',
      why: 'user_editor_a holds a `business` scope on business_a1 and this item is under it, so '
         + 'app.member_scope_admits_business is true. Without this positive the case below would be '
         + 'satisfied by a narrowing that denied the editor everything.',
    },
    {
      id: 'editor-a-cannot-see-the-content-item-outside-their-narrowing',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a2')],
      expect: 'no-rows',
      why: '§8.6 case 3 on this family: same Workspace, a Business the member scope does not cover. '
         + 'The permissive policy admits it — the editor is an active member — and the RESTRICTIVE '
         + 'narrowing subtracts it, which is the only shape that can subtract at all.',
    },
    {
      id: 'pinned-editor-a-sees-the-unpinned-content-item-of-a1',
      covers: ['§8.6/1', '§7'],
      as: pageEditorA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1')],
      expect: 'rows',
      why: 'A consequence of 021\'s definition, consumed rather than re-decided: '
         + 'member_scope_covers_business counts a `page` scope row on its parent Business. So a '
         + 'page-scoped editor reaches business-level content, which reaches every Page beneath it. '
         + '040 and 070 met the same consequence; if it is wrong it is wrong in 021.',
    },
    {
      id: 'pinned-editor-a-sees-the-content-item-pinned-to-their-own-target',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1_page')],
      expect: 'rows',
      why: 'The `else` branch of the item\'s narrowing — app.member_scope_admits_page — reached by '
         + 'the one identity in this suite whose scope is a single Page. A branch no row exercises '
         + 'is a branch that could be inverted without any case failing.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-content-item-pinned-to-a-sibling-target',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1_sibling_page')],
      expect: 'no-rows',
      why: '§8.6 case 4, which no identity §12.6 names can carry: the editor and the approver are '
         + 'both scoped at BUSINESS level and §7 gives a business scope every Page beneath it. This '
         + 'refusal is by PAGE inside a Business the caller is otherwise admitted to — the case '
         + 'above proves the caller is admitted — which is what distinguishes it from case 3.',
    },
    {
      id: 'owner-a-cannot-see-the-content-item-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_b1')],
      expect: 'no-rows',
      why: 'The attack is run while HOLDING tenant B\'s exact item id, which is the whole of '
         + '§12.6\'s control: proving A cannot reach B by guessing is worthless. What is behind '
         + 'this boundary is CONTENT-2 — the text a business is about to publish — so a leak here '
         + 'is a competitor reading a campaign before it runs.',
    },
    {
      id: 'owner-b-sees-the-content-item-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_b1')],
      expect: 'rows',
      why: 'THE THIRD CASE, and without it the negative above is satisfied by a fixture that never '
         + 'loaded the row. Batch 020 established that a cross-tenant claim is three cases and not '
         + 'two; this is the far side of the boundary reading what the near side cannot.',
    },
    {
      id: 'suspended-a-sees-zero-content-items',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1')],
      expect: 'no-rows',
      why: '§7: only `active` grants access. app.is_active_member is where that lives for this '
         + 'table, and the predicate has no `status` term of its own.',
    },
    {
      id: 'anonymous-cannot-read-a-content-item',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused on the SCHEMA rather than the table: `anon` holds no USAGE on app, so name '
         + 'resolution stops before a table is reached. RFC-2026-021 §7/4 makes that an approved '
         + 'decision, and declaring the schema is what makes this case notice the day it changes.',
    },
    {
      id: 'service-cannot-read-a-content-item',
      covers: ['§12.6/8-negative', '§8.2/content-service-P'],
      as: service,
      sql: CONTENT_ITEM_BY_ID,
      params: [id('content_item_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: 'NOT labelled RFC-2026-017 §7, and the reason is 130\'s: §7 asks for the service to be '
         + 'denied BY row level security with an error, which needs a GRANT for row level security '
         + 'to then refuse. Batch 080 grants app_worker nothing on any of its five tables, so this '
         + 'refusal is the privilege system. §8.2 marks the service `P` on content, no document '
         + 'defines that capability, and a `P` with no capability defined is not an `S` — so there '
         + 'is no service policy here and no entry in the service-policy map.',
    },
    {
      id: 'owner-a-can-create-a-content-item',
      covers: ['§8.2', '§8.6/1'],
      as: ownerA,
      ...contentCreateItem(A, BUSINESS_A1, '__SELF__'),
      expect: 'rows',
      why: 'The half of §8.2 row 2 a client actually holds. Creating an item is a client act — the '
         + 'INSERT grant names the columns and the policy names the three roles — and it is the '
         + 'only INSERT this batch gives any client on any of its five tables.',
    },
    {
      id: 'viewer-a-cannot-create-a-content-item',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...contentCreateItem(A, BUSINESS_A1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: '§8.2 row 2 is `N` for the viewer. The viewer can READ this table — the case above says '
         + 'so — and the grant is held by `authenticated` as a role rather than by a person, so the '
         + 'refusal is the policy\'s role test and not a missing privilege.',
    },
    {
      id: 'approver-a-cannot-create-a-content-item',
      covers: ['§8.6/2', 'RFC-2026-020§8'],
      as: approverA,
      ...contentCreateItem(A, BUSINESS_A1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: '§8.2 row 2 marks the approver `N` where row 1 marks them `Y`: an approver decides about '
         + 'content rather than writing it. This is one of the two cells in this family that is `N` '
         + 'for a role §8 otherwise grants, and the other is the viewer\'s.',
    },
    {
      id: 'owner-a-cannot-forge-the-actor-on-a-content-item',
      covers: ['§8.6/8', '§8.5'],
      as: ownerA,
      ...contentCreateItem(A, BUSINESS_A1, id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: '§8.6 case 8 at INSERT time, which this batch can carry where 070 could not: 070 had no '
         + 'client INSERT anywhere in its family and had to assert the forgery on an UPDATE. The '
         + 'statement is the passing case above with ONE ARGUMENT CHANGED, so the refusal is '
         + 'attributable to `created_by = (select auth.uid())` and to nothing else.',
    },
    {
      id: 'owner-a-cannot-create-a-content-item-in-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      ...contentCreateItem(B, BUSINESS_B1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: 'The cross-tenant WRITE, holding tenant B\'s exact workspace and Business ids so the '
         + 'composite foreign key is satisfied and the refusal can only be the policy. '
         + 'app.workspace_member_role answers null for a workspace the caller is not a member of, '
         + 'and null is in none of the three roles.',
    },
    {
      id: 'editor-a-can-rename-the-content-item-of-a1',
      covers: ['§8.2', '§8.6/1'],
      as: editorA,
      ...contentRenameItem(id('content_item_a1'), '__SELF__'),
      expect: 'rows',
      why: 'The EDIT half of §8.2 row 2, and the case that makes every refusal below a statement '
         + 'about what was attempted rather than about the table being closed. A title is content; '
         + 'the editor is one of the row\'s three `Y` roles.',
    },
    {
      id: 'approver-a-cannot-rename-a-content-item',
      covers: ['§8.6/2', 'RFC-2026-020§8'],
      as: approverA,
      ...contentRenameItem(id('content_item_a1'), '__SELF__'),
      expect: 'no-effect',
      witness: contentItemStillTitled(ownerA, id('content_item_a1'), 'fixture content item a1 business'),
      why: 'The approver reads this row and cannot edit it. The outcome is `no-effect` rather than '
         + '`denied` because the USING half of an UPDATE policy FILTERS: a row the policy does not '
         + 'admit is not a row the statement refuses, it is a row the statement never sees.',
    },
    {
      id: 'viewer-a-cannot-rename-a-content-item',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...contentRenameItem(id('content_item_a1'), '__SELF__'),
      expect: 'no-effect',
      witness: contentItemStillTitled(ownerA, id('content_item_a1'), 'fixture content item a1 business'),
      why: '§8.2 marks the viewer `N` on row 2 and `Y` on row 1, so this is the operation being '
         + 'refused rather than the table.',
    },
    {
      id: 'editor-a-cannot-rename-the-content-item-outside-their-narrowing',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      ...contentRenameItem(id('content_item_a2'), '__SELF__'),
      expect: 'no-effect',
      witness: contentItemStillTitled(ownerA, id('content_item_a2'), 'fixture content item a2 business'),
      why: 'The WRITE half of §8.6 case 3. The editor holds the role the policy names and is '
         + 'refused by the member scope instead, which is what a restrictive narrowing is for — and '
         + 'the witness is the unscoped owner, because the editor cannot read the row it is about.',
    },
    {
      id: 'owner-a-cannot-rename-the-content-item-of-tenant-b',
      covers: ['§8.6/5', '§8.5'],
      as: ownerA,
      ...contentRenameItem(id('content_item_b1'), '__SELF__'),
      expect: 'no-effect',
      witness: contentItemStillTitled(ownerB, id('content_item_b1'), 'fixture content item b1 business'),
      why: 'The cross-tenant write on an EXISTING row, holding B\'s exact id. The witness runs as '
         + 'B\'s owner because no A-side identity can see the row at all, which is the same shape '
         + '020 established for a workspace name.',
    },
    {
      id: 'owner-a-cannot-approve-a-content-item',
      covers: ['§8.2', '§4/6'],
      as: ownerA,
      ...contentApproveItem(id('content_item_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: 'THE CASE THIS BATCH IS MOST LIKELY TO BE READ WRONG WITHOUT. §8.2 marks "Content '
         + 'create/edit/version" `Y` for the owner, so a reader expects the owner to be able to '
         + 'move a draft to approved; §4.6 says "state change ผ่าน domain command; ห้าม client '
         + 'update status อิสระ". Both are true and they are about different acts. The refusal is a '
         + 'column missing from the UPDATE grant rather than a policy predicate — an absent '
         + 'privilege has to be WRITTEN to be undone — and the `Y` cell is therefore half '
         + 'implemented, with the missing half owed to a command function that does not exist '
         + '(RFC-2026-021 §10).',
    },
    {
      id: 'owner-a-cannot-pin-the-current-version-of-a-content-item',
      covers: ['§8.2', '§4/6'],
      as: ownerA,
      ...contentPinCurrentVersion(id('content_item_a1'), id('content_version_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: 'Which version is CURRENT is the act of publishing one, not a field a client edits, so '
         + '`current_version_id` is outside the UPDATE grant beside `status`. The argument is the '
         + 'version the fixture already pinned, so the refusal cannot be the foreign key.',
    },
    {
      id: 'owner-a-can-soft-delete-a-content-item',
      covers: ['§8.5', '§8.2'],
      as: ownerA,
      ...contentSoftDeleteItem(id('content_item_a1'), '__SELF__'),
      expect: 'rows',
      why: '§8.5 asks for a soft delete through a typed lifecycle field where a delete is wanted at '
         + 'all, and `deleted_at` is in the client UPDATE grant for exactly that. This positive is '
         + 'what makes the DELETE refusal below a statement about the VERB rather than about the '
         + 'caller — without it, both cases would be consistent with an item nobody may remove.',
    },
    {
      id: 'owner-a-cannot-delete-a-content-item',
      covers: ['§8.5'],
      as: ownerA,
      ...contentDeleteItem(id('content_item_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: '§8.5 has no broad user delete. Hard removal in this family is batch 160\'s retention '
         + 'sweep through app_maintenance, which this batch grants nothing, and the soft delete '
         + 'above is the verb a client holds.',
    },
    {
      id: 'service-cannot-create-a-content-item',
      covers: ['§12.6/8-negative', '§8.2/content-service-P'],
      as: service,
      ...contentCreateItem(A, BUSINESS_A1, id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_items' },
      why: 'The service holds no INSERT here, so this is the privilege system and not a policy. '
         + '`created_by` names an EXISTING user rather than `__SELF__`, because as_service sets a '
         + 'claim set with no subject and the substitution would inline the text `undefined` — the '
         + 'build error batch 040 introduced after CI found it.',
    },

    {
      id: 'owner-a-sees-the-content-idea-of-a1',
      covers: ['§8.2', '§12.6/1'],
      as: ownerA,
      sql: CONTENT_IDEA_BY_REQUEST,
      params: [A, CONTENT_IDEA_A],
      expect: 'rows',
      why: 'The positive the idea negatives are measured against, and the row is addressed by the '
         + 'IDEMPOTENCY KEY §4.6 asks for rather than by a symbol — (workspace_id, '
         + 'client_request_id) is unique where the key is not null, which is what makes a retried '
         + 'create fail to produce a second idea.',
    },
    {
      id: 'editor-a-can-retopic-the-content-idea-of-a1',
      covers: ['§8.2', '§8.6/1'],
      as: editorA,
      ...contentRetopicIdea(A, CONTENT_IDEA_A, '__SELF__'),
      expect: 'rows',
      why: 'An idea is the one table in this family a client may freely rewrite: §4.6 enumerates no '
         + 'vocabulary for its `status`, gives it no command, and the UPDATE grant names goal, '
         + 'topic, brief and status. The fixture topic differs from the one written here, so the '
         + 'write changes something — a case that set what was already there would pass against a '
         + 'database where the write did nothing.',
    },
    {
      id: 'approver-a-cannot-retopic-a-content-idea',
      covers: ['§8.6/2', 'RFC-2026-020§8'],
      as: approverA,
      ...contentRetopicIdea(A, CONTENT_IDEA_A, '__SELF__'),
      expect: 'no-effect',
      witness: contentIdeaStillOnTopic(ownerA, A, CONTENT_IDEA_A, 'fixture content topic a1'),
      why: '§8.2 row 2 is `N` for the approver on this table as on the item.',
    },
    {
      id: 'viewer-a-cannot-retopic-a-content-idea',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...contentRetopicIdea(A, CONTENT_IDEA_A, '__SELF__'),
      expect: 'no-effect',
      witness: contentIdeaStillOnTopic(ownerA, A, CONTENT_IDEA_A, 'fixture content topic a1'),
      why: '§8.2 row 2 is `N` for the viewer, who reads the same row in the SELECT positive.',
    },
    {
      id: 'owner-a-cannot-forge-the-actor-on-a-content-idea-update',
      covers: ['§8.6/8', '§8.5'],
      as: ownerA,
      ...contentRetopicIdea(A, CONTENT_IDEA_A, id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'content_ideas' },
      why: '§8.6 case 8 on the UPDATE path. The USING half admits the row and the WITH CHECK half '
         + 'refuses the forged `updated_by`, which is why the outcome is a RAISED refusal rather '
         + 'than a filtered one — the distinction the two approver cases above and this one turn '
         + 'on.',
    },
    {
      id: 'owner-a-cannot-rewrite-the-idempotency-key-of-a-content-idea',
      covers: ['§8.5', '§4/6'],
      as: ownerA,
      ...contentRewriteIdeaKey(A, CONTENT_IDEA_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_ideas' },
      why: '§4.6 asks for "unique idempotency ต่อ workspace". A key the client can rewrite after '
         + 'the fact identifies nothing: the retry that the key exists to make safe would create a '
         + 'second idea. The column is outside the UPDATE grant, so the refusal is the privilege '
         + 'system.',
    },
    {
      id: 'owner-a-can-capture-a-content-idea',
      covers: ['§8.2', '§8.6/1'],
      as: ownerA,
      ...contentCaptureIdea(A, BUSINESS_A1, '__SELF__'),
      expect: 'rows',
      why: 'The second and last client INSERT this batch grants. It passes no client_request_id, '
         + 'which the partial index permits — the idempotency key is optional and its absence is '
         + 'not a collision, which is why it is a partial unique INDEX and not a constraint.',
    },
    {
      id: 'viewer-a-cannot-capture-a-content-idea',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...contentCaptureIdea(A, BUSINESS_A1, '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'content_ideas' },
      why: 'The viewer holds the grant as `authenticated` and is refused by the policy\'s role '
         + 'test, exactly as on the item.',
    },
    {
      id: 'owner-a-cannot-see-the-content-idea-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: CONTENT_IDEA_BY_REQUEST,
      params: [B, CONTENT_IDEA_B],
      expect: 'no-rows',
      why: 'The cross-tenant read, holding tenant B\'s workspace id AND the exact request key its '
         + 'idea was created under. An idea names what a business intends to publish before it has '
         + 'published anything, which is the earliest point at which this boundary can leak a plan.',
    },
    {
      id: 'owner-b-sees-the-content-idea-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: CONTENT_IDEA_BY_REQUEST,
      params: [B, CONTENT_IDEA_B],
      expect: 'rows',
      why: 'The third case, so the negative above is a refusal against something rather than '
         + 'against nothing.',
    },
    {
      id: 'owner-a-cannot-retopic-the-content-idea-of-tenant-b',
      covers: ['§8.6/5', '§8.5'],
      as: ownerA,
      ...contentRetopicIdea(B, CONTENT_IDEA_B, '__SELF__'),
      expect: 'no-effect',
      witness: contentIdeaStillOnTopic(ownerB, B, CONTENT_IDEA_B, 'fixture content topic b1'),
      why: 'The cross-tenant WRITE half, which the read half above does not imply: a caller refused '
         + 'a write it could still read would be refused by a role predicate rather than by the '
         + 'tenant boundary.',
    },
    {
      id: 'owner-a-cannot-delete-a-content-idea',
      covers: ['§8.5'],
      as: ownerA,
      ...contentDeleteIdea(A, CONTENT_IDEA_A),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_ideas' },
      why: '§8.5 has no broad user delete, and an idea carries no lifecycle column for a soft one '
         + 'either — §4.6 names `status` and enumerates nothing, so this batch will not invent '
         + '"discarded". The gap is in the work package\'s open blockers rather than filled here.',
    },
    {
      id: 'suspended-a-sees-zero-content-ideas',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: CONTENT_IDEA_BY_REQUEST,
      params: [A, CONTENT_IDEA_A],
      expect: 'no-rows',
      why: '§7: only `active` grants access.',
    },
    {
      id: 'anonymous-cannot-read-a-content-idea',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: CONTENT_IDEA_BY_REQUEST,
      params: [A, CONTENT_IDEA_A],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the schema.',
    },
    {
      id: 'service-cannot-capture-a-content-idea',
      covers: ['§12.6/8-negative', '§8.2/content-service-P'],
      as: service,
      ...contentCaptureIdea(A, BUSINESS_A1, id('user_owner_a')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_ideas' },
      why: 'The service holds no INSERT on this table either. An idea produced by a research run is '
         + 'the obvious future service write, and it is not built here: it would need the command '
         + 'surface RFC-2026-021 §10 records does not exist.',
    },

    {
      id: 'owner-a-sees-the-content-version-of-a1',
      covers: ['§8.2', '§12.6/1'],
      as: ownerA,
      sql: CONTENT_VERSION_BY_ID,
      params: [id('content_version_a1')],
      expect: 'rows',
      why: 'The positive the immutability cases are measured against: the owner READS this row and '
         + 'cannot change a byte of it, and both halves have to be asserted or "immutable" is '
         + 'indistinguishable from "unreachable".',
    },
    {
      id: 'pinned-editor-a-sees-the-content-version-of-their-own-target-item',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: CONTENT_VERSION_OF_ITEM,
      params: [id('content_item_a1_page')],
      expect: 'rows',
      why: 'The POSITIVE half of the child narrowing. A version carries no page column, so its '
         + 'reach is its item\'s reach, resolved through app.content_items — and this case says the '
         + 'resolution admits what the item admits.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-content-version-of-a-sibling-target-item',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: CONTENT_VERSION_OF_ITEM,
      params: [id('content_item_a1_sibling_page')],
      expect: 'no-rows',
      why: 'THE CASE THE CHILD NARROWING EXISTS FOR. user_page_editor_a is admitted to business_a1 '
         + 'and must still be refused the history of an item pinned to a sibling Page. Asserted '
         + 'only against a business-level parent, the design would still hold if somebody replaced '
         + 'the exists() with member_scope_admits_business on the version\'s own columns — the '
         + 'substitution this case refuses.',
    },
    {
      id: 'editor-a-cannot-see-the-content-version-outside-their-narrowing',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      sql: CONTENT_VERSION_OF_ITEM,
      params: [id('content_item_a2')],
      expect: 'no-rows',
      why: 'The BUSINESS half of the same resolution, and it is not implied by the page half: a '
         + 'narrowing that resolved through the item for one branch and not the other would pass '
         + 'the case above and leak here.',
    },
    {
      id: 'owner-a-cannot-see-the-content-version-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: CONTENT_VERSION_BY_ID,
      params: [id('content_version_b1')],
      expect: 'no-rows',
      why: 'A version row holds what an item USED to say, so a boundary that held on the current '
         + 'item and not on its history would leak the same content one table over — batch 040\'s '
         + 'sentence about a knowledge version, on a family where the text is the product.',
    },
    {
      id: 'owner-b-sees-the-content-version-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: CONTENT_VERSION_BY_ID,
      params: [id('content_version_b1')],
      expect: 'rows',
      why: 'The third case on the version table.',
    },
    {
      id: 'owner-a-cannot-write-a-content-version',
      covers: ['§8.2', '§8.5'],
      as: ownerA,
      ...contentWriteVersion(A, BUSINESS_A1, id('content_item_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_versions' },
      why: 'A version is created by the act that GENERATES it, not by a client typing one. §8.2 row '
         + '2 gives the client "create/edit/version" and this batch reads the third word as the '
         + 'command\'s act rather than the client\'s: the same shape 070 gave app.research_evidence. '
         + 'No INSERT grant and no INSERT policy, so this is the privilege layer.',
    },
    {
      id: 'owner-a-cannot-amend-a-content-version',
      covers: ['§8.2'],
      as: ownerA,
      ...contentAmendVersion(id('content_version_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_versions' },
      why: '§8.2 row 3: "Approved/published version UPDATE/DELETE" is `N` in every column of the '
         + 'matrix including Service. Rewriting a version would rewrite what was approved, after it '
         + 'was approved.',
    },
    {
      id: 'owner-a-cannot-delete-a-content-version',
      covers: ['§8.2', '§8.5'],
      as: ownerA,
      ...contentDeleteVersion(id('content_version_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_versions' },
      why: 'The DELETE half of row 3. Deleting a version is the same act as rewriting it with '
         + 'nothing, and the refusal is an absent grant rather than a policy for the reason this '
         + 'whole batch gives: a grant never made has to be written to be undone.',
    },
    {
      id: 'suspended-a-sees-zero-content-versions',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: CONTENT_VERSION_BY_ID,
      params: [id('content_version_a1')],
      expect: 'no-rows',
      why: '§7 on an immutable table: the SELECT policy is the only policy it has, and it tests '
         + 'active membership.',
    },
    {
      id: 'anonymous-cannot-read-a-content-version',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: CONTENT_VERSION_BY_ID,
      params: [id('content_version_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the schema.',
    },
    {
      id: 'service-cannot-write-a-content-version',
      covers: ['§12.6/8-negative', '§8.2/version-service-N'],
      as: service,
      ...contentWriteVersion(A, BUSINESS_A1, id('content_item_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_versions' },
      why: 'THE CASE THAT SAYS WHAT §8.2 ROW 3 MEANS. The row is `N` for the SERVICE as well, which '
         + 'no other row in §8 is, so there is no identity in this repository — client, worker or '
         + 'otherwise — that may write a content version through a granted path. What will write '
         + 'one is a SECURITY DEFINER function owned by app_command, exempt by ownership rather '
         + 'than by privilege, and it does not exist.',
    },

    {
      id: 'owner-a-sees-the-content-variant-of-a1',
      covers: ['§8.2', '§12.6/1'],
      as: ownerA,
      sql: CONTENT_VARIANT_BY_VERSION,
      params: [id('content_version_a1'), 'facebook'],
      expect: 'rows',
      why: 'The positive, and the row is addressed by (content_version_id, platform) — §4.6\'s '
         + '"unique logical variant key" — rather than by a symbol.',
    },
    {
      id: 'owner-a-cannot-see-the-content-variant-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: CONTENT_VARIANT_BY_VERSION,
      params: [id('content_version_b1'), 'facebook'],
      expect: 'no-rows',
      why: 'A variant is the text that actually goes to a platform, so this is the last table in '
         + 'the chain where a cross-tenant read would leak a publishable post rather than a draft '
         + 'of one. The query holds B\'s exact version id and the platform its fixture row carries.',
    },
    {
      id: 'owner-b-sees-the-content-variant-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: CONTENT_VARIANT_BY_VERSION,
      params: [id('content_version_b1'), 'facebook'],
      expect: 'rows',
      why: 'The third case on the variant table.',
    },
    {
      id: 'pinned-editor-a-sees-the-content-variant-of-the-unpinned-item',
      covers: ['§8.6/1', '§7'],
      as: pageEditorA,
      sql: CONTENT_VARIANT_BY_VERSION,
      params: [id('content_version_a1'), 'facebook'],
      expect: 'rows',
      why: 'The POSITIVE half of the two-level chain — variant through version through item — for a '
         + 'page-scoped member reading content that is pinned to no Page. Without it the negative '
         + 'below is satisfied by a narrowing that refused this member everything. The id says '
         + '"unpinned" rather than "business-level" because `[a-z0-9-]*business` is batch 020\'s '
         + 'control pattern, and a case that satisfied another family\'s entry would let that '
         + 'entry pass on a failure it did not cause — 070 took the same care with the word `page`.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-content-variant-of-a-sibling-target-item',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: CONTENT_VARIANT_BY_VERSION,
      params: [id('content_version_a1_sibling_page'), 'facebook'],
      expect: 'no-rows',
      why: 'THE SECOND LINK OF THE CHAIN, and the case that fails if somebody cuts it. A variant '
         + 'resolves through its version and the version through its ITEM, which is where the page '
         + 'lives; a narrowing that resolved the first link and then asked the Business question '
         + 'about the version\'s own columns would pass every other variant case in this suite and '
         + 'leak a page-restricted item\'s variants to a member scoped to a sibling Page.',
    },
    {
      id: 'owner-a-cannot-write-a-content-variant',
      covers: ['§8.2'],
      as: ownerA,
      ...contentWriteVariant(A, BUSINESS_A1, id('content_version_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_variants' },
      why: 'Row 3 again, one table over. The platform is `instagram` where the fixture row is '
         + '`facebook`, so a refusal cannot be content_variants_logical_key standing in for the '
         + 'missing privilege — and the insert LANDS when the negative control disables row level '
         + 'security.',
    },
    {
      id: 'owner-a-cannot-amend-a-content-variant',
      covers: ['§8.2'],
      as: ownerA,
      ...contentAmendVariant(id('content_version_a1'), 'facebook'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_variants' },
      why: 'The variant is what a platform actually receives; an editable one makes the approved '
         + 'version and the published text two different things.',
    },
    {
      id: 'owner-a-cannot-delete-a-content-variant',
      covers: ['§8.5'],
      as: ownerA,
      ...contentDeleteVariant(id('content_version_a1'), 'facebook'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_variants' },
      why: 'No role holds DELETE on any of this batch\'s five tables, which the migration asserts '
         + 'against the live catalog as well.',
    },
    {
      id: 'service-cannot-write-a-content-variant',
      covers: ['§12.6/8-negative', '§8.2/version-service-N'],
      as: service,
      ...contentWriteVariant(A, BUSINESS_A1, id('content_version_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'content_variants' },
      why: 'The service half of row 3 on the variant table.',
    },
    {
      id: 'anonymous-cannot-read-a-content-variant',
      covers: ['§12.6/6', '§8.6/7'],
      as: anonymous,
      sql: CONTENT_VARIANT_BY_VERSION,
      params: [id('content_version_a1'), 'facebook'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the schema.',
    },

    {
      id: 'owner-a-sees-the-quality-review-of-a1',
      covers: ['§8.2', '§12.6/1'],
      as: ownerA,
      sql: QUALITY_REVIEW_BY_ID,
      params: [id('quality_review_a1')],
      expect: 'rows',
      why: 'The positive. A review carries §4.6\'s findings — a stable rule code and a Thai message '
         + 'each — and the client may read them, which is what makes the quality gate legible to '
         + 'the person whose content was blocked.',
    },
    {
      id: 'owner-a-cannot-see-the-quality-review-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: QUALITY_REVIEW_BY_ID,
      params: [id('quality_review_b1')],
      expect: 'no-rows',
      why: 'Holding B\'s exact review id. A review names what was WRONG with another tenant\'s '
         + 'content, which is a second kind of disclosure on top of the content itself.',
    },
    {
      id: 'owner-b-sees-the-quality-review-of-their-own-tenant',
      covers: ['§12.6/1', '§8.6/1'],
      as: ownerB,
      sql: QUALITY_REVIEW_BY_ID,
      params: [id('quality_review_b1')],
      expect: 'rows',
      why: 'The third case on the review table. The two sides are loaded in different states, so a '
         + 'read that returned the wrong tenant\'s row would be visible as a different status '
         + 'rather than as an identical copy.',
    },
    {
      id: 'owner-a-cannot-write-a-quality-review',
      covers: ['§8.2'],
      as: ownerA,
      ...contentWriteQualityReview(A, BUSINESS_A1, id('content_version_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quality_reviews' },
      why: 'A client that could write its own quality review could pass its own content. The '
         + 'findings payload is well formed, so the refusal cannot be '
         + 'quality_reviews_findings_carry_code_and_message standing in for the missing grant.',
    },
    {
      id: 'owner-a-cannot-amend-a-quality-review',
      covers: ['§8.2'],
      as: ownerA,
      ...contentAmendQualityReview(id('quality_review_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quality_reviews' },
      why: 'The statement moves `warn` to `pass`, which is the exact act an editable review table '
         + 'would permit: the gate is a record of what a rule set decided, not a field the reviewed '
         + 'party edits.',
    },
    {
      id: 'owner-a-cannot-delete-a-quality-review',
      covers: ['§8.5'],
      as: ownerA,
      ...contentDeleteQualityReview(id('quality_review_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quality_reviews' },
      why: 'Deleting the review is the other way to pass the gate.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-quality-review-of-a-sibling-target-item',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: QUALITY_REVIEW_BY_ID,
      params: [id('quality_review_a1_sibling_page')],
      expect: 'no-rows',
      why: 'The same second link on the other two-level table, and it is not implied by the variant '
         + 'case: the two narrowings are separate policies with separate predicates, and the one '
         + 'this batch is most likely to get wrong is the one written last.',
    },
    {
      id: 'pinned-editor-a-sees-the-quality-review-of-the-unpinned-item',
      covers: ['§8.6/1', '§7'],
      as: pageEditorA,
      sql: QUALITY_REVIEW_BY_ID,
      params: [id('quality_review_a1')],
      expect: 'rows',
      why: 'The positive that makes the refusal above about the PAGE rather than about the table.',
    },
    {
      id: 'suspended-a-sees-zero-quality-reviews',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: QUALITY_REVIEW_BY_ID,
      params: [id('quality_review_a1')],
      expect: 'no-rows',
      why: '§12.6/5 on the last of this batch\'s five tables.',
    },
    {
      id: 'service-cannot-write-a-quality-review',
      covers: ['§12.6/8-negative', '§8.2/version-service-N'],
      as: service,
      ...contentWriteQualityReview(A, BUSINESS_A1, id('content_version_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'quality_reviews' },
      why: 'AND THIS IS THE ONE THAT COSTS SOMETHING. A quality review is produced by a rule set '
         + 'run, which is a job; §8.2 row 3 refuses the service anyway, so the producer of this row '
         + 'has to be the command function that does not exist rather than a worker with an INSERT. '
         + 'Until it exists, nothing in this repository can record a quality verdict at all, and '
         + 'that is stated here rather than left to be discovered by whoever builds the gate.',
    },

    // -- BATCH 090 — approval: the policy, the request and the trail. -------------------------
    //
    // Three tables and three shapes of case, because §8.3 gives this family four rows and they do
    // not fall one per table.
    //
    //   * §8.3 HAS NO SELECT ROW FOR APPROVAL AT ALL. Every read case below rests on the three
    //     sentences 090_approval.sql's header names — the approver's `Y` on the decide row, §5's
    //     CONTENT-2 beside AUTH-3, and §8.4's "approval trail" — rather than on a matrix cell.
    //     That is weaker than every other family's read basis in this suite and is recorded as
    //     weaker here rather than in a commit message nobody re-reads.
    //   * THE POLICY carries §8.3 row 1 — manage is `Y` for owner and admin and `N` for the other
    //     three — as an INSERT and a ONE-COLUMN UPDATE. §4.7's "published policy version immutable"
    //     is the columns that grant does NOT name, so the quorum and the version number are
    //     privilege refusals and the toggle is a policy refusal, from the same caller.
    //   * THE REQUEST carries §8.3 rows 2 and 3, which are DIFFERENT ROWS WITH DIFFERENT ROLE CELLS
    //     over the SAME granted column. The cases that matter most in this batch are the crossed
    //     ones: an editor writing `approved` and an approver writing `cancelled`. Both are
    //     `denied` rather than `no-effect`, and the reason is worth stating because it is the whole
    //     design: the OTHER policy's USING half admits the row, so the statement is not filtered —
    //     it reaches the WITH CHECK halves, both of which refuse it, and the error is 42501.
    //   * THE TRAIL carries row 4 — `N` for every role INCLUDING the service, which only §8.2 row 3
    //     is besides it — as absent grants and absent policies. Every write case against it is a
    //     GRANT-layer refusal AND IS RUN FROM THE WORKSPACE OWNER, which is what makes it about the
    //     operation rather than about the caller.
    //
    // THE SERVICE CASES MAKE BATCH 080's CLAIM AND NOT BATCH 070's. app_worker is granted nothing on
    // any of these three tables: §8.3 marks the Service column `P` on three rows and `N` on the
    // fourth, so there is no `S` cell for a worker grant to anticipate, and the writer this family
    // needs is a SECURITY DEFINER command function owned by app_command (RFC-2026-017 §3). So every
    // service case below is refused by the PRIVILEGE system — a different claim, not a stronger
    // version of the same one — and none is filed under RFC-2026-017 §7, which asks for a refusal BY
    // row level security and therefore needs a grant for row level security to refuse.
    {
      id: 'owner-a-sees-the-approval-policy-of-a1',
      covers: ['§8.3', '§12.6/1'],
      as: ownerA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'],
      expect: 'rows',
      why: 'The positive every negative below is measured against, and the one whose basis is '
         + 'thinnest in this batch: §8.3 has NO SELECT row for approval policy, request or event. '
         + 'The policy tests active membership and not role, and user_owner_a holds no member scope '
         + 'row at all — 021 reads §7 as "a scope narrows, it does not grant", so the restrictive '
         + 'narrowing subtracts nothing here.',
    },
    {
      id: 'owner-a-sees-both-versions-of-the-approval-policy-key',
      covers: ['§8.3', '§5/versioned'],
      as: ownerA,
      sql: APPROVAL_POLICY_VERSIONS_OF_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS],
      expect: 'rows',
      why: 'THE CASE THAT MAKES "VERSIONED" MEAN SOMETHING. §5 says "policy versioned" and 090 '
         + 'implements it as (workspace_id, business_profile_id, policy_key, version) rather than '
         + 'as a separate version table, so two rows of one key coexisting IS the mechanism. The '
         + 'fixture loads version 1 disabled with a quorum of 1 and version 2 enabled with a quorum '
         + 'of 2, so the pair disagrees in a column a client may move and in one no client may.',
    },
    {
      id: 'viewer-a-sees-the-approval-policy-of-a1',
      covers: ['§8.3', '§8.6/1'],
      as: viewerA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'],
      expect: 'rows',
      why: 'The viewer reads the gate and cannot touch it, and both halves are asserted: this case '
         + 'and viewer-a-cannot-toggle-an-approval-policy. The READ here is the widest claim this '
         + 'batch makes on a row §8.3 does not have — §9.1 gives AUTH-3 "minimum role projection" '
         + 'and a projection is a view with an allowlist entry, which RFC-2026-021 §8.1\'s file '
         + 'does not exist to hold.',
    },
    {
      id: 'approver-a-sees-the-approval-policy-of-a1',
      covers: ['§8.3', '§8.6/1'],
      as: approverA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'],
      expect: 'rows',
      why: 'The approver reads the policy they decide under and cannot manage it: §8.3 row 1 is `N` '
         + 'for the approver and row 3 is `Y`. The pair is the clearest reading of §7\'s "approver: '
         + 'อ่านงานใน scope, approve/reject/request changes ตาม policy" this schema can express.',
    },
    {
      id: 'editor-a-sees-the-approval-policy-inside-their-narrowing',
      covers: ['§8.6/1', '§12.6/2'],
      as: editorA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'],
      expect: 'rows',
      why: 'user_editor_a holds a `business` scope on business_a1 and this policy is under it, so '
         + 'app.member_scope_admits_business is true. Without this positive the case below would be '
         + 'satisfied by a narrowing that denied the editor everything.',
    },
    {
      id: 'editor-a-cannot-see-the-approval-policy-outside-their-narrowing',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A2, APPROVAL_POLICY_A2_BUSINESS, '1'],
      expect: 'no-rows',
      why: '§8.6 case 3 on this family: same Workspace, a Business the member scope does not cover. '
         + 'The permissive policy admits it — the editor is an active member — and the RESTRICTIVE '
         + 'narrowing subtracts it, which is the only shape that can subtract at all.',
    },
    {
      id: 'pinned-editor-a-sees-the-approval-policy-of-their-own-target',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_PINNED, '1'],
      expect: 'rows',
      why: 'The `else` branch of the policy\'s own narrowing — app.member_scope_admits_page — '
         + 'reached by the one identity in this suite whose scope is a single Page. This is the '
         + 'only table in batch 090 that asks the Page question about its OWN columns; the request '
         + 'and the event resolve it through app.content_items instead.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-approval-policy-of-a-sibling-target',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_SIBLING, '1'],
      expect: 'no-rows',
      why: '§8.6 case 4, which no identity §12.6 names can carry: the editor and the approver are '
         + 'both scoped at BUSINESS level and §7 gives a business scope every Page beneath it. This '
         + 'refusal is by PAGE inside a Business the caller is otherwise admitted to — the case '
         + 'above proves the caller is admitted — which is what distinguishes it from case 3.',
    },
    {
      id: 'owner-a-cannot-see-the-approval-policy-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [B, BUSINESS_B1, APPROVAL_POLICY_B1_BUSINESS, '1'],
      expect: 'no-rows',
      why: 'The tenant boundary, held by tenant B\'s exact workspace id, Business id and policy key. '
         + 'Proving A cannot reach B by guessing is worthless; this holds every part of the address.',
    },
    {
      id: 'owner-b-sees-the-approval-policy-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerB,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [B, BUSINESS_B1, APPROVAL_POLICY_B1_BUSINESS, '1'],
      expect: 'rows',
      why: 'The control for the case above. Without it, an empty table on the B side would satisfy '
         + 'the refusal just as well as a working boundary does.',
    },
    {
      id: 'suspended-a-cannot-see-the-approval-policy-of-a1',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'],
      expect: 'no-rows',
      why: '§7: "Member status ที่ให้ access ได้มีเพียง `active`". app.is_active_member is where that '
         + 'lives for all three policies in this batch, and none of the predicates carries a '
         + '`status` term of its own. Paired with owner-a-sees-the-approval-policy-of-a1, which is '
         + 'the same row read by an active member of the same workspace.',
    },
    {
      id: 'anonymous-cannot-read-an-approval-policy',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused on the SCHEMA rather than the table: `anon` holds no USAGE on app, so name '
         + 'resolution stops before a table is reached. RFC-2026-021 §7/4 makes that an approved '
         + 'decision, and declaring the schema is what makes this case notice the day it changes.',
    },
    {
      id: 'service-cannot-read-an-approval-policy',
      covers: ['§12.6/8-negative', '§8.3/service-P'],
      as: service,
      sql: APPROVAL_POLICY_BY_KEY,
      params: [A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: 'NOT labelled RFC-2026-017 §7, for 130\'s reason and 080\'s: §7 asks for the service to '
         + 'be denied BY row level security with an error, which needs a GRANT for row level '
         + 'security to then refuse. Batch 090 grants app_worker nothing on any of its three '
         + 'tables, so this refusal is the privilege system. §8.3 marks the service `P` on three '
         + 'rows and `N` on the fourth, no document defines that capability, and a `P` with no '
         + 'capability defined is not an `S` — so there is no service policy here and no entry in '
         + 'the service-policy map.',
    },
    {
      id: 'owner-a-can-toggle-an-approval-policy',
      covers: ['§8.3', '§8.6/1'],
      as: ownerA,
      ...approvalTogglePolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', '__SELF__'),
      expect: 'rows',
      why: 'The whole of what §8.3 row 1 lets a client change on an existing policy. `enabled` is '
         + 'the one column in the UPDATE grant, and this case is what makes every refusal below a '
         + 'statement about what was attempted rather than about the table being closed.',
    },
    {
      id: 'admin-a-can-toggle-an-approval-policy',
      covers: ['§8.3', '§8.6/1'],
      as: { helper: 'as_user', subject: id('user_admin_a') },
      ...approvalTogglePolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', '__SELF__'),
      expect: 'rows',
      why: 'The second `Y` in §8.3 row 1, and the identity is spelled inline here because '
         + 'buildCases names no admin constant — batch 061 met the same gap and resolved it the '
         + 'same way. Row 1 is the only row in §8.3 whose owner and admin cells are both `Y` while '
         + 'the editor\'s is `N`, so an admin case is the only way to tell it from row 2.',
    },
    {
      id: 'editor-a-cannot-toggle-an-approval-policy',
      covers: ['§8.6/2', '§8.3'],
      as: editorA,
      ...approvalTogglePolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', '__SELF__'),
      expect: 'no-effect',
      witness: approvalPolicyStillEnabled(ownerA, A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', 'true'),
      why: 'THE CELL THAT SEPARATES THIS FAMILY FROM CONTENT. §8.2 row 2 gives the editor content; '
         + '§8.3 row 1 marks them `N` on the gate. Writing the rule is not the same act as writing '
         + 'the thing the rule is for. The outcome is `no-effect` rather than `denied` because the '
         + 'USING half of an UPDATE policy FILTERS: a row the policy does not admit is not a row '
         + 'the statement refuses, it is a row the statement never sees.',
    },
    {
      id: 'approver-a-cannot-toggle-an-approval-policy',
      covers: ['§8.6/2', '§8.3'],
      as: approverA,
      ...approvalTogglePolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', '__SELF__'),
      expect: 'no-effect',
      witness: approvalPolicyStillEnabled(ownerA, A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', 'true'),
      why: 'The approver decides UNDER a policy and cannot change the policy they decide under, '
         + 'which is the one property of §8.3 that would make an approval gate meaningless if it '
         + 'failed. They read the row — the case above says so — so this is the role being refused '
         + 'and not the row being hidden.',
    },
    {
      id: 'viewer-a-cannot-toggle-an-approval-policy',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...approvalTogglePolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', '__SELF__'),
      expect: 'no-effect',
      witness: approvalPolicyStillEnabled(ownerA, A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', 'true'),
      why: '§8.3 row 1 is `N` for the viewer where the read above is permitted, so this is the '
         + 'operation being refused rather than the table.',
    },
    {
      id: 'owner-a-cannot-raise-the-quorum-of-an-approval-policy',
      covers: ['§8.3', '§4/7-immutable'],
      as: ownerA,
      ...approvalRaiseQuorum(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: 'THE CASE THIS BATCH IS MOST LIKELY TO BE READ WRONG WITHOUT, and it is the twin of '
         + '080\'s owner-a-cannot-approve-a-content-item. §8.3 marks "Approval policy manage" `Y` '
         + 'for the owner, so a reader expects the owner to be able to edit a policy; §4.7 says '
         + '"published policy version immutable". Both are true and they are about different acts: '
         + 'the owner toggles `enabled` and writes a NEW VERSION, and cannot rewrite the decision '
         + 'an existing version encodes. The refusal is a column missing from the UPDATE grant '
         + 'rather than a policy predicate — an absent privilege has to be WRITTEN to be undone.',
    },
    {
      id: 'owner-a-cannot-renumber-an-approval-policy',
      covers: ['§8.3', '§4/7-immutable'],
      as: ownerA,
      ...approvalRenumberPolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: 'THE OTHER WAY TO REWRITE A PUBLISHED DECISION, and the one a case list that only '
         + 'guarded the value columns would miss: leave every decision column alone and move the '
         + 'row to a different ordinal, so that a request pinned to version 2 now resolves to a '
         + 'policy nobody approved as version 2. `version` is outside the UPDATE grant beside the '
         + 'quorum for exactly this reason.',
    },
    {
      id: 'owner-a-can-write-a-second-approval-policy-version',
      covers: ['§8.3', '§5/versioned'],
      as: ownerA,
      ...approvalWritePolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '3', '__SELF__'),
      expect: 'rows',
      why: 'THE HALF THE TWO REFUSALS ABOVE LEAVE, AND THE REASON THEY COST NOTHING. A new decision '
         + 'is a new row: the same policy key at a new ordinal. Without this case the pair above '
         + 'would read as a table nobody can maintain, which is the opposite of what §5\'s '
         + '"policy versioned" asks for.',
    },
    {
      id: 'editor-a-cannot-write-an-approval-policy',
      covers: ['§8.6/2', '§8.3'],
      as: editorA,
      ...approvalWritePolicy(A, BUSINESS_A1, 'attempted-editor-policy', '1', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: '§8.3 row 1 is `N` for the editor. The editor can READ this table and the grant is held '
         + 'by `authenticated` as a role rather than by a person, so the refusal is the policy\'s '
         + 'role test and not a missing privilege.',
    },
    {
      id: 'approver-a-cannot-write-an-approval-policy',
      covers: ['§8.6/2', '§8.3'],
      as: approverA,
      ...approvalWritePolicy(A, BUSINESS_A1, 'attempted-approver-policy', '1', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: 'An approver who could write the policy could write themselves a quorum of one. §8.3 '
         + 'row 1 is `N` for them and this is the INSERT half of that cell.',
    },
    {
      id: 'viewer-a-cannot-write-an-approval-policy',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...approvalWritePolicy(A, BUSINESS_A1, 'attempted-viewer-policy', '1', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: '§12.6/4 on the first of this batch\'s tables: the viewer refused every write the table '
         + 'actually offers a client, which here is an INSERT and a one-column UPDATE.',
    },
    {
      id: 'owner-a-cannot-forge-the-actor-on-an-approval-policy',
      covers: ['§8.6/8', '§8.5'],
      as: ownerA,
      ...approvalWritePolicy(A, BUSINESS_A1, 'attempted-forged-policy', '1', id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: '§8.6 case 8 at INSERT time. The statement is the passing create above with ONE ARGUMENT '
         + 'CHANGED — `created_by` set to another member of the SAME workspace — so the refusal is '
         + 'attributable to `created_by = (select auth.uid())` and to nothing else. A forged author '
         + 'on an approval policy is worse than on a content row: it is the audit answer to "who '
         + 'decided this gate should be this shape".',
    },
    {
      id: 'owner-a-cannot-write-an-approval-policy-in-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      ...approvalWritePolicy(B, BUSINESS_B1, 'attempted-cross-tenant-policy', '1', '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: 'The cross-tenant WRITE, holding tenant B\'s exact workspace and Business ids so the '
         + 'composite foreign key is satisfied and the refusal can only be the policy. '
         + 'app.workspace_member_role answers null for a workspace the caller is not a member of, '
         + 'and null is in neither of the two roles.',
    },
    {
      id: 'owner-a-cannot-toggle-the-approval-policy-of-tenant-b',
      covers: ['§8.6/5', '§8.5'],
      as: ownerA,
      ...approvalTogglePolicy(B, BUSINESS_B1, APPROVAL_POLICY_B1_BUSINESS, '1', '__SELF__'),
      expect: 'no-effect',
      witness: approvalPolicyStillEnabled(ownerB, B, BUSINESS_B1, APPROVAL_POLICY_B1_BUSINESS, '1', 'true'),
      why: 'The cross-tenant write on an EXISTING row, holding B\'s exact address. The witness runs '
         + 'as B\'s owner because no A-side identity can see the row at all, which is the shape 020 '
         + 'established for a workspace name.',
    },
    {
      id: 'owner-a-cannot-delete-an-approval-policy',
      covers: ['§8.5', '§8.6/9'],
      as: ownerA,
      ...approvalDeletePolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_policies' },
      why: '§8.5: "ไม่มี broad user delete". A deleted policy version is a request pinned to nothing '
         + '— app.approval_requests.policy_version_id references this row — and the refusal is a '
         + 'DELETE grant no role holds rather than a foreign key, so it holds for a version no '
         + 'request has pinned as well as for one that has.',
    },
    {
      id: 'suspended-a-cannot-toggle-an-approval-policy',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      ...approvalTogglePolicy(A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', '__SELF__'),
      expect: 'no-effect',
      witness: approvalPolicyStillEnabled(ownerA, A, BUSINESS_A1, APPROVAL_POLICY_A1_BUSINESS, '2', 'true'),
      why: 'The write half of §8.6 case 6, paired with the read half above. A suspended owner is '
         + 'refused by app.workspace_member_role answering null for a member whose status is not '
         + '`active`, which is the same helper the read case turns on.',
    },

    // -- The request: §8.3's two write rows over one granted column. --------------------------
    {
      id: 'owner-a-sees-the-approval-request-of-a1',
      covers: ['§8.3', '§12.6/1'],
      as: ownerA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1')],
      expect: 'rows',
      why: 'The positive the request negatives are measured against. Its reach is resolved through '
         + 'app.content_items — this table carries no page column — so even this case is evidence '
         + 'about a chain rather than about a predicate on the row.',
    },
    {
      id: 'viewer-a-sees-the-approval-request-of-a1',
      covers: ['§8.3', '§8.6/1'],
      as: viewerA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1')],
      expect: 'rows',
      why: 'The viewer reads the request and can move none of its states, and both halves are '
         + 'asserted: this case and viewer-a-cannot-decide-an-approval-request.',
    },
    {
      id: 'approver-a-sees-the-approval-request-of-a1',
      covers: ['§8.3', '§8.6/1'],
      as: approverA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1')],
      expect: 'rows',
      why: 'THE READ §8.3 ROW 3 PRESUPPOSES AND DOES NOT STATE. An approver who cannot see a '
         + 'request cannot approve one, which is the first of the three sentences the read surface '
         + 'in this batch rests on. It also makes the refusals below about the ROLE rather than '
         + 'about visibility.',
    },
    {
      id: 'editor-a-sees-the-approval-request-inside-their-narrowing',
      covers: ['§8.6/1', '§12.6/2'],
      as: editorA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1')],
      expect: 'rows',
      why: 'user_editor_a holds a `business` scope on business_a1 and the request\'s ITEM is under '
         + 'it. Without this positive the case below would be satisfied by a narrowing that denied '
         + 'the editor everything.',
    },
    {
      id: 'editor-a-cannot-see-the-approval-request-outside-their-narrowing',
      covers: ['§8.6/3', '§12.6/2'],
      as: editorA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a2')],
      expect: 'no-rows',
      why: '§8.6 case 3, resolved one table away: the narrowing reads the request\'s content item '
         + 'and asks the Business question about the ITEM\'s columns.',
    },
    {
      id: 'pinned-editor-a-sees-the-approval-request-of-their-own-target',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1_page')],
      expect: 'rows',
      why: 'The `else` branch of app.content_items\' narrowing, reached from a table that has no '
         + 'page column of its own. A branch no row exercises is a branch that could be inverted '
         + 'without any case failing.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-approval-request-of-a-sibling-target-item',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1_sibling_page')],
      expect: 'no-rows',
      why: 'THE CASE THAT PROVES THE RESOLUTION RATHER THAN A COPY OF THE PREDICATE. It is the only '
         + 'request case that fails if the narrowing\'s exists() is replaced by '
         + 'member_scope_admits_business over the request\'s own columns — which would pass every '
         + 'other case here while leaking the approval trail of a page-restricted item to a member '
         + 'scoped to a sibling target.',
    },
    {
      id: 'owner-a-cannot-see-the-approval-request-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_b1')],
      expect: 'no-rows',
      why: 'The tenant boundary on the table that holds the decision, with B\'s exact id in hand. '
         + 'The B-side row is loaded `changes_requested` where the A side\'s is `pending`, so a '
         + 'read that returned the wrong tenant\'s row would be a different value and not a copy.',
    },
    {
      id: 'owner-b-sees-the-approval-request-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerB,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_b1')],
      expect: 'rows',
      why: 'The control for the case above: the row is there to be seen.',
    },
    {
      id: 'suspended-a-cannot-see-the-approval-request-of-a1',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1')],
      expect: 'no-rows',
      why: '§8.6 case 6 on the second of this batch\'s three tables, paired with the active read of '
         + 'the same row above.',
    },
    {
      id: 'anonymous-cannot-read-an-approval-request',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'Refused where every anonymous case in this suite is refused: at name resolution, on the '
         + 'SCHEMA, because anon holds no USAGE on app.',
    },
    {
      id: 'service-cannot-read-an-approval-request',
      covers: ['§12.6/8-negative', '§8.3/service-P'],
      as: service,
      sql: APPROVAL_REQUEST_BY_ID,
      params: [id('approval_request_a1')],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'app_worker holds nothing on this table, so the refusal is the privilege system rather '
         + 'than a policy. See service-cannot-read-an-approval-policy for why that is a different '
         + 'claim from batch 070\'s and not a stronger version of it.',
    },
    {
      id: 'editor-a-can-raise-an-approval-request',
      covers: ['§8.3', '§8.6/1'],
      as: editorA,
      ...approvalRaiseRequest(A, BUSINESS_A1, id('content_item_a1'), id('content_version_a1'), '__SELF__'),
      expect: 'rows',
      why: 'The CREATE half of §8.3 row 2, and the case that makes every refusal below a statement '
         + 'about what was attempted. The editor is one of that row\'s three `Y` roles — the same '
         + 'three §8.2 row 2 gives content, which is the reading that makes "the person who wrote '
         + 'it asks for it to be approved" expressible.',
    },
    {
      id: 'owner-a-can-raise-an-approval-request',
      covers: ['§8.3', '§8.6/1'],
      as: ownerA,
      ...approvalRaiseRequest(A, BUSINESS_A1, id('content_item_a1'), id('content_version_a1'), '__SELF__'),
      expect: 'rows',
      why: 'The first `Y` of §8.3 row 2. It also demonstrates that a SECOND request on a version '
         + 'that already has one is legal, which is why the catalog gives a request a symbol '
         + 'instead of a natural key.',
    },
    {
      id: 'approver-a-cannot-raise-an-approval-request',
      covers: ['§8.6/2', '§8.3'],
      as: approverA,
      ...approvalRaiseRequest(A, BUSINESS_A1, id('content_item_a1'), id('content_version_a1'), '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'THE SEPARATION §8.3 SPENDS TWO ROWS ON. Row 2 is `N` for the approver and row 3 is `Y`: '
         + 'the person who asks for approval is not the person who grants it. An approver who could '
         + 'raise a request could raise one and approve it in the same session.',
    },
    {
      id: 'viewer-a-cannot-raise-an-approval-request',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...approvalRaiseRequest(A, BUSINESS_A1, id('content_item_a1'), id('content_version_a1'), '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: '§8.3 row 2 is `N` for the viewer, where row 1\'s read is permitted — the operation '
         + 'being refused rather than the table.',
    },
    {
      id: 'owner-a-cannot-forge-the-actor-on-an-approval-request',
      covers: ['§8.6/8', '§8.5'],
      as: ownerA,
      ...approvalRaiseRequest(A, BUSINESS_A1, id('content_item_a1'), id('content_version_a1'),
        id('user_editor_a')),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: '§8.6 case 8 at INSERT time: the passing create above with ONE ARGUMENT CHANGED, so the '
         + 'refusal is attributable to `created_by = (select auth.uid())`. The builder sets '
         + '`requested_by` from the same argument, which is why this also forges the column §4.7 '
         + 'names by that word.',
    },
    {
      id: 'owner-a-cannot-raise-an-approval-request-in-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      ...approvalRaiseRequest(B, BUSINESS_B1, id('content_item_b1'), id('content_version_b1'), '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'The cross-tenant INSERT holding every one of tenant B\'s ids — workspace, Business, '
         + 'item and version — so all three foreign keys are satisfied and the refusal can only be '
         + 'the policy.',
    },
    {
      id: 'owner-a-cannot-raise-an-approval-request-already-decided',
      covers: ['§8.3', '§4/7'],
      as: ownerA,
      ...approvalRaiseRequestAlreadyApproved(A, BUSINESS_A1, id('content_item_a1'),
        id('content_version_a1'), '__SELF__'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'THE FAILURE MODE THE TRANSITION POLICIES CANNOT CATCH, AND THE ONLY DEFENCE AGAINST IT '
         + 'IS A MISSING PRIVILEGE. §8.3\'s two write rows are both about moving an EXISTING '
         + 'request; no UPDATE policy can refuse a row that was never updated. So `status`, '
         + '`decided_at` and `decided_by` are outside the INSERT grant, a request arrives `pending` '
         + 'by the column default, and a caller who tries to open one already approved is stopped '
         + 'by the privilege system. This is the same statement as the permitted create with three '
         + 'columns added.',
    },
    {
      id: 'editor-a-can-cancel-an-approval-request',
      covers: ['§8.3', '§8.6/1'],
      as: editorA,
      ...approvalCancelRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'rows',
      why: 'The CANCEL half of §8.3 row 2, and the positive its crossed refusal below is measured '
         + 'against. §4.7 gives the vocabulary the word `cancelled` and this is the only path that '
         + 'writes it.',
    },
    {
      id: 'owner-a-can-cancel-an-approval-request',
      covers: ['§8.3', '§8.6/1'],
      as: ownerA,
      ...approvalCancelRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'rows',
      why: 'The owner is `Y` on BOTH of §8.3\'s write rows, which no other role is. This case and '
         + 'owner-a-can-decide-an-approval-request are the pair that says so, and together they are '
         + 'why the `expired` case below runs as the owner: the one identity that holds both paths '
         + 'is still refused the value neither path admits.',
    },
    {
      id: 'approver-a-cannot-cancel-an-approval-request',
      covers: ['§8.3', '§8.6/2'],
      as: approverA,
      ...approvalCancelRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'ONE OF THE TWO CROSSED CASES THIS BATCH EXISTS FOR, AND THE OUTCOME IS `denied` RATHER '
         + 'THAN `no-effect` FOR A REASON THAT IS THE WHOLE DESIGN. The approver is `N` on §8.3 row '
         + '2 and `Y` on row 3, and both rows write the SAME granted column. The DECIDE policy\'s '
         + 'USING half admits this row — the caller is an approver and the row is pending — so the '
         + 'statement is not filtered: it reaches the WITH CHECK halves, where the cancel policy '
         + 'refuses the ROLE and the decide policy refuses the VALUE. Permissive policies OR, both '
         + 'halves are false, and the error is 42501.',
    },
    {
      id: 'viewer-a-cannot-cancel-an-approval-request',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...approvalCancelRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'no-effect',
      witness: approvalRequestStillInState(ownerA, id('approval_request_a1'), 'pending'),
      why: 'AND THE CONTRAST THAT MAKES THE CASE ABOVE READABLE. The viewer is `N` on BOTH write '
         + 'rows, so NEITHER policy\'s USING half admits the row, the statement is filtered before '
         + 'any WITH CHECK is evaluated, and the outcome is `no-effect` with a witness. The '
         + 'approver gets an error and the viewer gets silence, and the difference is which row of '
         + '§8.3 each one holds.',
    },
    {
      id: 'approver-a-can-decide-an-approval-request',
      covers: ['§8.3', '§8.6/1'],
      as: approverA,
      ...approvalDecideRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'rows',
      why: 'THE `Y` §7 DESCRIBES IN WORDS — "approver: อ่านงานใน scope, approve/reject/request '
         + 'changes ตาม policy" — as a statement that succeeds. It writes `decided_by` as itself, '
         + 'which approval_requests_decision_has_a_decider requires of exactly these two status '
         + 'values and which the policy\'s WITH CHECK half holds equal to auth.uid().',
    },
    {
      id: 'owner-a-can-decide-an-approval-request',
      covers: ['§8.3', '§8.6/1'],
      as: ownerA,
      ...approvalDecideRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'rows',
      why: 'The other `Y` on §8.3 row 3. §7 gives the owner "ทุก capability ใน Workspace", and this '
         + 'is the one case in the batch where that is a permission rather than a constraint.',
    },
    {
      id: 'editor-a-cannot-decide-an-approval-request',
      covers: ['§8.3', '§8.6/2'],
      as: editorA,
      ...approvalDecideRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'THE OTHER CROSSED CASE, AND THE ONE THAT MATTERS MOST: THE PERSON WHO WROTE THE CONTENT '
         + 'CANNOT APPROVE IT. §8.3 marks the editor `Y` on row 2 and `P` on row 3, and no '
         + 'capability is defined anywhere in this repository, so `P` is refused. The CANCEL '
         + 'policy\'s USING half admits the row — the caller is an editor and the row is pending — '
         + 'so this reaches the WITH CHECK halves and is refused by both: the cancel policy on the '
         + 'VALUE and the decide policy on the ROLE. If either WITH CHECK half lost its role test, '
         + 'this case is the one that stops failing.',
    },
    {
      id: 'admin-a-cannot-decide-an-approval-request',
      covers: ['§8.3', '§8.6/2'],
      as: { helper: 'as_user', subject: id('user_admin_a') },
      ...approvalDecideRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'THE SECOND `P` CELL, REFUSED AND RECORDED AS REFUSED. §8.3 row 3 marks the admin `P` — '
         + '"ผ่านตาม policy/explicit capability" — and app.approval_policies.required_role is the '
         + 'nearest thing in the schema to that policy while no predicate reads it. Batch 070 '
         + 'refused the approver\'s `P` on "Suggestion save/dismiss/use" on the same ground. Both '
         + 'cells are in the work package\'s open blockers; implementing either would be this batch '
         + 'deciding what "ตาม policy" means.',
    },
    {
      id: 'viewer-a-cannot-decide-an-approval-request',
      covers: ['§12.6/4', '§8.6/2'],
      as: viewerA,
      ...approvalDecideRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'no-effect',
      witness: approvalRequestStillInState(ownerA, id('approval_request_a1'), 'pending'),
      why: '§12.6/4 on the table that holds the decision. `no-effect` for the same reason the '
         + 'viewer\'s cancel is: neither USING half admits a viewer, so nothing reaches a WITH '
         + 'CHECK.',
    },
    {
      id: 'owner-a-cannot-expire-an-approval-request',
      covers: ['§4/7-vocabulary', '§8.3'],
      as: ownerA,
      ...approvalExpireRequest(id('approval_request_a1'), '__SELF__'),
      expect: 'denied',
      deniedBy: 'policy',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'THE ONE OF §4.7\'s FIVE STATUS VALUES NOBODY MAY WRITE, ASSERTED FROM THE IDENTITY THAT '
         + 'HOLDS BOTH WRITE PATHS. §4.7 lists `expired`; §8.3 has no row that produces it; the '
         + 'service column on the three rows it does have is `P` with no capability defined; and no '
         + 'document in this repository says how long a request stays open. So the CHECK admits the '
         + 'value because the document names it, and neither policy\'s WITH CHECK half does — the '
         + 'migration asserts that at apply time and this asserts it at run time. Running it as the '
         + 'workspace OWNER is what makes it about the VALUE: the two cases above prove the same '
         + 'caller can cancel and can decide. THE GAP IS A BLOCKER, NOT A FEATURE: a request that '
         + 'should expire cannot, and the number that would say when is Product\'s.',
    },
    {
      id: 'approver-a-cannot-redecide-a-settled-approval-request',
      covers: ['§8.3', '§4/8'],
      as: approverA,
      ...approvalDecideRequest(id('approval_request_a1_decided'), '__SELF__'),
      expect: 'no-effect',
      witness: approvalRequestStillInState(ownerA, id('approval_request_a1_decided'), 'approved'),
      why: 'THE `status = \'pending\'` CLAUSE IN BOTH USING HALVES, AND THE ONLY CASE THAT CAN TEST '
         + 'IT. A decision that could be retaken is not a decision; §4 invariant 8 makes approval '
         + 'history immutable and this is the half of that sentence a mutable table can carry. The '
         + 'outcome is `no-effect` because the USING half FILTERS — the row is not refused, it is '
         + 'never seen — and the witness is what tells that apart from a write that landed and '
         + 'changed nothing.',
    },
    {
      id: 'editor-a-cannot-cancel-a-settled-approval-request',
      covers: ['§8.3', '§4/8'],
      as: editorA,
      ...approvalCancelRequest(id('approval_request_a1_decided'), '__SELF__'),
      expect: 'no-effect',
      witness: approvalRequestStillInState(ownerA, id('approval_request_a1_decided'), 'approved'),
      why: 'The same clause from the other policy. An editor who could cancel an APPROVED request '
         + 'could withdraw a decision they were never allowed to take, which is the crossed case '
         + 'above reached by a different route.',
    },
    {
      id: 'owner-a-cannot-repin-an-approval-request',
      covers: ['§4/6', '§8.3'],
      as: ownerA,
      ...approvalRepinRequest(id('approval_request_a1'), id('content_version_a1_sibling_page')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: '§4 invariant 6: "Approval Request pin Content Version; Version ใหม่ไม่ inherit approval '
         + 'โดยอัตโนมัติ". A request that can be re-pointed INHERITS approval by an UPDATE, which is '
         + 'the exact act that sentence forbids. `content_version_id` is outside the UPDATE grant, '
         + 'so the refusal is the privilege system and holds for the owner. The version named here '
         + 'is one from another ITEM, which the four-column foreign key would also refuse — the '
         + 'privilege refusal arrives first and the case says which one it is asserting.',
    },
    {
      id: 'owner-a-cannot-delete-an-approval-request',
      covers: ['§8.5', '§8.6/9'],
      as: ownerA,
      ...approvalDeleteRequest(id('approval_request_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: '§8.5: "ไม่มี broad user delete; ใช้ soft-delete command ที่ update typed lifecycle '
         + 'field". The typed lifecycle field here is `status` and the word for withdrawing a '
         + 'request is `cancelled`, which §4.7 supplies — so a DELETE is not the soft path taking a '
         + 'shortcut, it is the decision trail losing its subject.',
    },
    {
      id: 'owner-a-cannot-decide-the-approval-request-of-tenant-b',
      covers: ['§8.6/5', '§8.5'],
      as: ownerA,
      ...approvalDecideRequest(id('approval_request_b1'), '__SELF__'),
      expect: 'no-effect',
      witness: approvalRequestStillInState(ownerB, id('approval_request_b1'), 'changes_requested'),
      why: 'The cross-tenant DECISION, holding B\'s exact request id. '
         + 'app.workspace_member_role answers null for a workspace the caller is not a member of, '
         + 'so neither USING half admits the row and the outcome is `no-effect`. The witness runs '
         + 'as B\'s owner because no A-side identity can read the row, and it reads '
         + '`changes_requested` — the state the fixture loaded — so a write that landed would be '
         + 'visible as `approved`.',
    },
    {
      id: 'service-cannot-decide-an-approval-request',
      covers: ['§12.6/8-negative', '§8.3/service-P'],
      as: service,
      ...approvalDecideRequest(id('approval_request_a1'), id('user_approver_a')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_requests' },
      why: 'The service holds no UPDATE here, so an automated approval is impossible — which is '
         + 'either the control §8.3 intends or a gap somebody will meet when they build a timed '
         + 'auto-approval. §8.3 marks the service `P` on this row and no capability is defined, so '
         + 'this batch grants nothing and says so rather than choosing.',
    },

    // -- The trail: §8.3 row 4, `N` for every role including the service. ---------------------
    {
      id: 'owner-a-sees-the-approval-event-of-a1',
      covers: ['§8.3', '§12.6/1'],
      as: ownerA,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'],
      expect: 'rows',
      why: 'The positive the trail negatives are measured against, addressed by §4.7\'s own '
         + '"unique idempotency key ต่อ action" rather than by a symbol — the key whose purpose is '
         + 'to identify an action, used as the address of one.',
    },
    {
      id: 'viewer-a-sees-the-approval-event-of-a1',
      covers: ['§8.3', '§8.6/1'],
      as: viewerA,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'],
      expect: 'rows',
      why: 'THE WIDEST READ IN THIS BATCH AND THE ONE WITH THE LEAST BEHIND IT. §8.3 has no SELECT '
         + 'row; §8.4 spells the APPROVER\'s audit cell "approval trail" in words and marks the '
         + 'viewer `N` on tenant audit. An approval event is not an audit log — different table, '
         + 'different owner, different retention class — but a reader who thinks the viewer should '
         + 'not see a decision trail has a case to make, and the blocker that says the read surface '
         + 'is unspecified is where they should make it.',
    },
    {
      id: 'approver-a-sees-the-approval-event-of-a1',
      covers: ['§8.3', '§8.4'],
      as: approverA,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'],
      expect: 'rows',
      why: 'The one cell in §8 that names this material in words: §8.4\'s tenant audit row gives the '
         + 'approver "approval trail" where every other cell is a letter. It is the third of the '
         + 'three sentences this batch\'s read surface rests on and the only one that is about the '
         + 'trail specifically.',
    },
    {
      id: 'editor-a-sees-the-approval-event-inside-their-narrowing',
      covers: ['§8.6/1', '§12.6/2'],
      as: editorA,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'],
      expect: 'rows',
      why: 'The positive for a chain TWO links long: the event resolves through its request and the '
         + 'request through its content item, where the page lives. Without it the case below would '
         + 'be satisfied by a narrowing that denied the editor everything.',
    },
    {
      id: 'pinned-editor-a-sees-the-approval-event-of-a-reachable-item',
      covers: ['§8.6/1', '§7'],
      as: pageEditorA,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'],
      expect: 'rows',
      why: 'A consequence of 021\'s definition, consumed rather than re-decided: '
         + 'member_scope_covers_business counts a `page` scope row on its parent Business, so a '
         + 'page-scoped editor reaches business-level content and everything hanging off it. 040, '
         + '070 and 080 met the same consequence; if it is wrong it is wrong in 021. This case is '
         + 'also the control for the one below — the same caller, two links down, admitted here.',
    },
    {
      id: 'pinned-editor-a-cannot-see-the-approval-event-of-a-sibling-target-item',
      covers: ['§8.6/4', '§4/3'],
      as: pageEditorA,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1_sibling_page'), 'fixture-action-a1-sibling',
        'fixture-idempotency-a1-sibling'],
      expect: 'no-rows',
      why: 'THE CASE THE FIXTURE\'S SIBLING-TARGET ROWS EXIST FOR, AND THE ONLY ONE IN THIS BATCH '
         + 'THAT FAILS IF THE SECOND LINK OF THE CHAIN IS CUT. An event resolves through its '
         + 'request and then through that request\'s content item. A narrowing that resolved the '
         + 'first link and then asked the Business question about the request\'s own columns would '
         + 'pass every other case here — including the positive directly above — while leaking a '
         + 'page-restricted item\'s decision trail to a member scoped to a sibling target.',
    },
    {
      id: 'owner-a-cannot-see-the-approval-event-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerA,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_b1'), 'fixture-action-b1', 'fixture-idempotency-b1'],
      expect: 'no-rows',
      why: 'The tenant boundary on the trail, holding every part of B\'s address including the '
         + 'idempotency key. §4.7 makes that key unique per workspace and action, so a case that '
         + 'held it and still read nothing is the strongest form this boundary takes.',
    },
    {
      id: 'owner-b-sees-the-approval-event-of-tenant-b',
      covers: ['§8.6/5', '§12.6/1'],
      as: ownerB,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_b1'), 'fixture-action-b1', 'fixture-idempotency-b1'],
      expect: 'rows',
      why: 'The control for the case above.',
    },
    {
      id: 'suspended-a-cannot-see-the-approval-event-of-a1',
      covers: ['§12.6/5', '§8.6/6'],
      as: suspendedA,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'],
      expect: 'no-rows',
      why: '§8.6 case 6 on the third of this batch\'s tables, paired with the active read of the '
         + 'same row above.',
    },
    {
      id: 'anonymous-cannot-read-an-approval-event',
      covers: ['§12.6/6', '§8.6/7', 'RFC-2026-021§7'],
      as: anonymous,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'schema', name: 'app' },
      why: 'On the SCHEMA, like every anonymous case in this suite. There is no table in this '
         + 'family whose refusal is argued from a sensitivity class instead.',
    },
    {
      id: 'service-cannot-read-an-approval-event',
      covers: ['§12.6/8-negative', '§8.3/service-N'],
      as: service,
      sql: APPROVAL_EVENT_BY_KEY,
      params: [id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'],
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'The READ, refused for want of a grant. §8.3 row 4 is about UPDATE and DELETE and says '
         + 'nothing about a service read, so this refusal is batch 090 granting app_worker nothing '
         + 'at all rather than a cell being implemented.',
    },
    {
      id: 'owner-a-cannot-write-an-approval-event',
      covers: ['§8.6/9', '§8.3/event-N'],
      as: ownerA,
      ...approvalWriteEvent(A, BUSINESS_A1, id('approval_request_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'RUN FROM THE WORKSPACE OWNER, WHICH IS WHAT MAKES IT ABOUT THE OPERATION RATHER THAN '
         + 'ABOUT THE CALLER. §8.3 row 4 is `N` for owner, admin, editor, approver, viewer AND '
         + 'service — the same shape §8.2 row 3 has and the only other row in §8 like it. The '
         + 'refusal is an absent GRANT rather than a policy that says no, because a grant has to be '
         + 'written to be undone. AND IT COSTS SOMETHING, STATED HERE RATHER THAN DISCOVERED: '
         + 'nothing in this repository can write an approval event, so the decision trail §4 '
         + 'invariant 8 calls immutable is immutable and empty until a command function exists '
         + '(RFC-2026-017 §3, RFC-2026-021 §10).',
    },
    {
      id: 'owner-a-cannot-amend-an-approval-event',
      covers: ['§8.6/9', '§8.3/event-N'],
      as: ownerA,
      ...approvalAmendEvent(id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'The UPDATE §8.3 row 4 names, from the owner. The statement clears `comment` — the '
         + 'column that says WHY a decision was taken — which is the edit a forger would actually '
         + 'want and the one §4.7\'s "decision ห้าม update/delete" is about.',
    },
    {
      id: 'owner-a-cannot-delete-an-approval-event',
      covers: ['§8.6/9', '§8.3/event-N'],
      as: ownerA,
      ...approvalDeleteEvent(id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'The DELETE §8.3 row 4 names, from the owner. A trail whose owner can remove a row is a '
         + 'trail that records what its owner is willing to keep.',
    },
    {
      id: 'approver-a-cannot-amend-an-approval-event',
      covers: ['§8.6/9', '§8.3/event-N'],
      as: approverA,
      ...approvalAmendEvent(id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'The role whose decisions this table records cannot edit the record of them. Refused at '
         + 'the same layer as the owner, which is what a row that is `N` in every column means.',
    },
    {
      id: 'editor-a-cannot-delete-an-approval-event',
      covers: ['§8.6/9', '§8.3/event-N'],
      as: editorA,
      ...approvalDeleteEvent(id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'The third of the five client roles on the same verb. All five are refused identically '
         + 'and at the same layer, which is the observable difference between a row that is `N` '
         + 'everywhere and a row that is `N` for some.',
    },
    {
      id: 'service-cannot-write-an-approval-event',
      covers: ['§12.6/8-negative', '§8.3/event-N'],
      as: service,
      ...approvalWriteEvent(A, BUSINESS_A1, id('approval_request_a1')),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'AND THIS IS THE ONE THAT COSTS MOST. An approval event is the natural output of a '
         + 'worker — a timed auto-approval, a policy evaluation — and §8.3 row 4 refuses the '
         + 'service anyway, so the producer has to be the command function that does not exist '
         + 'rather than a worker with an INSERT. Until it does, nothing records a decision at all, '
         + 'and that is stated here rather than left for whoever builds the gate to discover.',
    },
    {
      id: 'service-cannot-amend-an-approval-event',
      covers: ['§12.6/8-negative', '§8.3/event-N'],
      as: service,
      ...approvalAmendEvent(id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'The service half of §8.3 row 4\'s UPDATE, which is the cell that makes this row unlike '
         + 'every other `N` row in §8 except §8.2\'s third.',
    },
    {
      id: 'service-cannot-delete-an-approval-event',
      covers: ['§12.6/8-negative', '§8.3/event-N'],
      as: service,
      ...approvalDeleteEvent(id('approval_request_a1'), 'fixture-action-a1', 'fixture-idempotency-a1'),
      expect: 'denied',
      deniedBy: 'grant',
      deniedOn: { kind: 'table', name: 'approval_events' },
      why: 'The last of the six identities on the last of the three verbs. §10 gives '
         + 'APPROVAL-HISTORY a retention window and §11 a purge, and neither can run through this '
         + 'table today: batch 160 will meet a table with no DELETE grant for app_maintenance '
         + 'either, which is in the open blockers because discovering it in 160 would be '
         + 'discovering it after the migration that caused it merged.',
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


// ---------------------------------------------------------------------------------------------
// BATCH 061 — the statements the metering cases run.
// ---------------------------------------------------------------------------------------------
//
// They are module-level constants declared AFTER buildCases rather than locals declared inside it,
// and the reason is a merge rule rather than a style: three other batches are appending to this
// file at the same time, and the only resolution that cannot silently lose another batch's work is
// "main's version plus this branch's own section, contiguous and last". A `const` here is in scope
// inside buildCases at CALL time, so the whole of batch 061's contribution to this file is two
// appended blocks and no edit anywhere else in it.
//
// They exist at all for the reason every earlier batch's builders exist: a negative and the
// positive it is paired with have to be visibly THE SAME STATEMENT with one argument changed, and
// a reader comparing two inline strings is checking that by eye.

// The identity §12.6 does not name. It is a function of the resolver rather than a constant because
// every id in this file is read from the fixture catalog and none is written.
export const METERING_ADMIN_A = (id) => ({ helper: 'as_user', subject: id('user_admin_a') });

export const METERING_BUCKET_BY_ID = 'select id from app.quota_buckets where id = $1';
export const METERING_LEDGER_BY_ID = 'select usage_id from app.usage_events where usage_id = $1';
export const METERING_RESERVATION_BY_ID = 'select id from app.usage_reservations where id = $1';

// The number 061-metering-fixture.sql loads into quota_bucket_a_all, which is also the quantity of
// the one ledger row in workspace A — the fixture's own demonstration that the aggregate agrees
// with the ledger, kept that way by nothing. It is HERE rather than inline in the witness for the
// reason the witness exists at all: a witness asserting "the row is still there" and not "it still
// says what it said" is expectNoRows wearing a different name, so the expected VALUE has one home
// and the fixture has the other.
export const METERING_BUCKET_A_CONSUMED = '1450';

// The witness reads a DERIVED ANSWER rather than the column, and that is deliberate. `no-effect`
// compares the witness column with `!==`, and a numeric(24,8) comes back from a driver as a string
// whose rendering is a property of the declared scale — so a witness pinned to '1450.00000000'
// would fail the day somebody widened the column rather than the day somebody widened the policy.
// The comparison happens in SQL, against the value the fixture wrote, and the case asserts the
// word.
export const METERING_BUCKET_WITNESS_SQL =
  `select case when consumed_amount = ${METERING_BUCKET_A_CONSUMED} then 'unchanged' else 'moved' end as state `
  + 'from app.quota_buckets where id = $1';

// A bucket for a period no fixture row holds, so a refusal cannot be quota_buckets_one_per_period
// standing in for a missing grant, and so the write LANDS when the CI negative control disables row
// level security. No business_profile_id, so the composite foreign key is not exercised here.
export function meteringOpenQuotaBucket(workspace) {
  return {
    sql: 'insert into app.quota_buckets '
       + '(workspace_id, dimension, quantity_unit, period_start, period_end, consumed_amount, reserved_amount) '
       + "values ($1::uuid, 'ai_tokens', 'token', "
       + "        timestamptz '2026-10-01 00:00:00+00', timestamptz '2026-11-01 00:00:00+00', 0, 0) "
       + 'returning id',
    params: [workspace],
  };
}

// Setting the consumed total to zero, which is the attack rather than an arbitrary edit: a quota is
// what a plan grants MINUS what has been consumed, so zeroing the second half hands the caller the
// whole allowance back. `consumed_amount` is one of the three columns app_worker's UPDATE grant
// DOES name, which is what makes the service form of this case a POLICY refusal and not a grant one.
export function meteringRewriteQuotaBucket(bucketId) {
  return {
    sql: 'update app.quota_buckets set consumed_amount = 0 where id = $1 returning id',
    params: [bucketId],
  };
}

// A valid usage event, composed the way CTR-USG-001 composes one. The dedupe key is BUILT FROM THE
// STATEMENT'S OWN PARAMETERS rather than written out, so this insert satisfies
// usage_events_dedupe_key_names_its_row by construction — which matters because the case demands a
// refusal that is about the GRANT or the POLICY, and a row a CHECK would have rejected anyway
// proves neither. The instant segment is literal because it is the one segment no constraint in
// this dialect can check (061_metering.sql's header says why), and 2026-09-02 is a different
// instant from the fixture's, so the natural key cannot be what refuses this.
//
// Every parameter is cast at every use. `$1` appears as a uuid column value and inside a text
// concatenation, and a parameter whose type is inferred from whichever context Postgres reaches
// first is a parameter whose type is an accident.
export function meteringWriteUsageEvent(workspace, jobId) {
  return {
    sql: 'insert into app.usage_events '
       + '(occurred_at, dimension, quantity_amount, quantity_unit, workspace_id, job_id, '
       + 'provider_key, cost_amount, cost_currency, cost_basis, dedupe_key) '
       + "values (timestamptz '2026-09-02 11:00:00+00', 'ai_tokens', 10, 'token', $1::uuid, $2::uuid, "
       + "'openai', 0.001000, 'USD', 'estimated', "
       + "'usg:' || ($1::uuid)::text || ':' || ($2::uuid)::text || ':ai_tokens:estimated:20260902T110000Z') "
       + 'returning usage_id',
    params: [workspace, jobId],
  };
}

// Editing a measurement after the fact. No role holds UPDATE on this table at all — §8.4 marks the
// ledger's UPDATE `N` in every column of the row, the service included — so both forms of this case
// are grant-layer refusals and neither is evidence about row level security.
export function meteringRewriteUsageEvent(usageId) {
  return {
    sql: 'update app.usage_events set quantity_amount = 1 where usage_id = $1 returning usage_id',
    params: [usageId],
  };
}

// A valid hold. `expires_at` is far-future and FIXED rather than an offset from now(): the row must
// satisfy usage_reservations_expiry_after_reservation when the CI negative control disables row
// level security and the insert actually lands, and a fixture value that depends on when it ran is
// one whose failures depend on when they ran.
export function meteringOpenReservation(workspace, jobId) {
  return {
    sql: 'insert into app.usage_reservations '
       + '(workspace_id, dimension, quantity_amount, quantity_unit, job_id, expires_at) '
       + "values ($1::uuid, 'ai_tokens', 5, 'token', $2::uuid, timestamptz '2099-01-01 00:00:00+00') "
       + 'returning id',
    params: [workspace, jobId],
  };
}


// ---------------------------------------------------------------------------------------------
// BATCH 132 — the three statements the effective-limit cases run.
// ---------------------------------------------------------------------------------------------
//
// Module-level constants declared after buildCases, which is batch 061's placement and its reason:
// a `const` here is in scope inside buildCases at CALL time, so the whole of batch 132's
// contribution to this file is its case block and this one, both appended, and no edit anywhere
// else in it.
//
// THEY ARE WRITTEN OUT IN FULL RATHER THAN BUILT, and that is the opposite choice from 061's
// builders for a reason particular to what these cases assert. The first two statements differ by
// exactly one join, and the whole claim is that the added join is where the effective limit stops
// being assemblable — so a reader has to be able to see the two texts side by side. A builder taking
// a flag would hide the difference inside a branch.

// The half that works: a subscription and a consumed total, joined on the tenant scope both
// families carry. No allowance term at all.
export const ENTITLEMENT_HALF_OMITTED =
  'select s.local_access_state, q.consumed_amount '
  + 'from app.billing_subscriptions s '
  + 'join app.quota_buckets q on q.workspace_id = s.workspace_id '
  + 'where s.workspace_id = $1::uuid';

// The whole question. The third join reaches what the PLAN grants, through the revision the
// subscription pins — the one path between the two families that batch 130's foreign keys already
// make walkable.
//
// AND THE `on` CLAUSE IS WHERE THE FINDING IS. It joins a plan revision to its entitlements and
// stops there, because there is no term that could relate `e.feature_key` to `q.dimension`: one is
// CTR-USG-001's closed six-value vocabulary and the other is an open form batch 130 deliberately did
// not enumerate, no relation in this schema carries both columns, and no document maps one onto the
// other. So this statement is a cartesian product of allowances and consumptions rather than a
// resolver, and that is exactly what makes it the right statement for these cases: it is the most a
// caller could assemble, and it is refused before the missing join could matter.
export const EFFECTIVE_LIMIT_QUESTION =
  'select s.local_access_state, q.consumed_amount, e.feature_key, e.limit_value '
  + 'from app.billing_subscriptions s '
  + 'join app.quota_buckets q on q.workspace_id = s.workspace_id '
  + 'join app.plan_entitlements e on e.billing_plan_version_id = s.billing_plan_version_id '
  + 'where s.workspace_id = $1::uuid';

// The watermark, alone, so the refusal is about the COLUMN. Reading it beside a granted column
// would be a statement two different absences could explain.
export const BUCKET_WATERMARK_OF_WORKSPACE =
  'select computed_through from app.quota_buckets where workspace_id = $1::uuid';

// ---------------------------------------------------------------------------------------------
// BATCH 070 — the statements the research cases run.
// ---------------------------------------------------------------------------------------------
//
// They are module-level constants declared AFTER buildCases rather than locals declared inside it,
// and the reason is a merge rule rather than a style: other batches are appending to this file at
// the same time, and the only resolution that cannot silently lose another batch's work is "main's
// version plus this branch's own section, contiguous and last". A `const` here is in scope inside
// buildCases at CALL time — the module has finished evaluating by then — so the whole of batch 070's
// contribution to this file is two appended blocks and no edit anywhere else in it.
//
// They exist at all for the reason every earlier batch's builders exist: a negative and the positive
// it is paired with have to be visibly THE SAME STATEMENT with one argument changed, and a reader
// comparing two inline strings is checking that by eye.

export const RESEARCH_RUN_BY_ID = 'select id from app.research_runs where id = $1';
export const RESEARCH_SOURCE_BY_ID = 'select id from app.research_sources where id = $1';
export const RESEARCH_EVIDENCE_BY_ID = 'select id from app.research_evidence where id = $1';
export const RESEARCH_SUGGESTION_BY_ID = 'select id from app.research_suggestions where id = $1';

// A CAPTURE IS ADDRESSED BY ITS DIGEST AND NOT BY AN ID, and that is the fixture catalog's own rule
// arriving as SQL: 070_research.sql makes (workspace_id, research_source_id, content_hash) unique
// because that triple is what app.research_evidence.snapshot_content_hash has to name single-valued
// once §10's purge has removed the locator, so a snapshot needs no catalog symbol. The two strings
// below are the ones the fixture digests; they are synthetic and belong to this repository, because
// §9.2 names `fixture` among the surfaces a research snapshot may not reach.
//
// `sha256()` from pg_catalog rather than pgcrypto's `digest()`, for batch 010's measured reason:
// `public.digest` does not exist on the provisioned instance, where pgcrypto lives in `extensions`.
export const RESEARCH_CAPTURE_A = 'fixture research capture a1';
export const RESEARCH_CAPTURE_B = 'fixture research capture b1';
export const RESEARCH_SNAPSHOT_BY_CAPTURE =
  'select id from app.research_snapshots '
  + "where research_source_id = $1::uuid and content_hash = sha256(convert_to($2, 'utf8'))";

// The witnesses. Each reads a DERIVED ANSWER rather than the column itself, and that is the rule §6.4
// of evidence/WP-0A-DB-00/parallel-integration-2026-09-07.md exists for: the driver reads psql's CSV,
// CSV has no NULL, and an unset timestamptz arrives as the empty string — so a witness comparing
// against `null` holds against every correct database. The comparison happens in SQL and the case
// asserts the WORD.
export function researchRunStillOpen(as, runId) {
  return {
    as,
    sql: "select case when cancel_requested_at is null then 'open' else 'cancelled' end as state "
       + 'from app.research_runs where id = $1',
    params: [runId],
    column: 'state',
    equals: 'open',
  };
}

export function researchSuggestionStillUnsaved(as, suggestionId) {
  return {
    as,
    sql: "select case when saved_at is null then 'unsaved' else 'saved' end as state "
       + 'from app.research_suggestions where id = $1',
    params: [suggestionId],
    column: 'state',
    equals: 'unsaved',
  };
}

// §8.2's "Start/CANCEL Research", as the two columns the client UPDATE grant names. The actor is a
// parameter rather than `(select auth.uid())` so that the forged-actor case is visibly the same
// statement with one argument changed — which is what §8.6 case 8 has to be in order to attribute its
// refusal to the WITH CHECK half rather than to the USING half.
export function researchCancelRun(runId, actor) {
  return {
    sql: 'update app.research_runs set cancel_requested_at = now(), updated_by = $2::uuid '
       + 'where id = $1::uuid returning id',
    params: [runId, actor],
  };
}

// §8.2's START, which no client role holds and which the service holds without a policy. No `id` is
// passed: the column defaults to gen_random_uuid(), the row is rolled back with its transaction, and
// no case has a reason to hold the id of a row it is creating. The Business is a live one under the
// Workspace, so when the CI negative control disables row level security the insert LANDS rather than
// failing on a foreign key — a case that could not succeed proves nothing about the policy that
// refuses it.
export function researchStartRun(workspace, business, createdBy) {
  return {
    sql: 'insert into app.research_runs (workspace_id, business_profile_id, brief, created_by) '
       + "values ($1::uuid, $2::uuid, 'attempted research brief', $3::uuid) returning id",
    params: [workspace, business, createdBy],
  };
}

// The column the client UPDATE grant does NOT name. §8.5 holds here by a column list rather than by
// the absence of a verb, and this is the case that says so.
export function researchRewriteBrief(runId) {
  return {
    sql: "update app.research_runs set brief = 'rewritten research brief' where id = $1::uuid returning id",
    params: [runId],
  };
}

export function researchDeleteRun(runId) {
  return { sql: 'delete from app.research_runs where id = $1::uuid returning id', params: [runId] };
}

// A citation. `example.com` is RFC 2606's reserved name, for the reason the fixture gives: §9.2 names
// `fixture` among the surfaces a research snapshot may not reach, and a real publisher's URL in a
// test is the first step of a worker fetching it. The value satisfies research_sources_uri_scheme and
// research_sources_uri_no_traversal, so a refusal cannot be a CHECK standing in for a missing grant,
// and the insert lands when the negative control disables row level security.
export function researchCiteSource(workspace, business, runId) {
  return {
    sql: 'insert into app.research_sources (workspace_id, business_profile_id, research_run_id, source_uri) '
       + "values ($1::uuid, $2::uuid, $3::uuid, 'https://example.com/attempted') returning id",
    params: [workspace, business, runId],
  };
}

// The append-only claim, as a statement. No role holds UPDATE on this table at all, so both forms of
// this case are grant-layer refusals and neither is evidence about row level security.
export function researchRewriteSource(sourceId) {
  return {
    sql: "update app.research_sources set source_uri = 'https://example.com/rewritten' "
       + 'where id = $1::uuid returning id',
    params: [sourceId],
  };
}

export function researchDeleteSource(sourceId) {
  return { sql: 'delete from app.research_sources where id = $1::uuid returning id', params: [sourceId] };
}

// A capture. Its digest is over a DIFFERENT synthetic string from either fixture row's, so a refusal
// cannot be research_snapshots_one_per_capture standing in for a missing grant, and so the write
// LANDS when the CI negative control disables row level security. `retention_until` is a fixed
// literal seven days after `captured_at` and is deliberately NOT thirty: DATA-DEC-07 is open, §10
// says "30 วัน default หรือสั้นกว่าตาม source policy", and a case carrying exactly the default would
// read as the open decision having been chosen.
export function researchCaptureSnapshot(workspace, business, sourceId) {
  return {
    sql: 'insert into app.research_snapshots '
       + '(workspace_id, business_profile_id, research_source_id, object_ref, content_hash, '
       + 'captured_at, retention_until) '
       + "values ($1::uuid, $2::uuid, $3::uuid, 'snapshot:research/attempted/capture-1', "
       + "        sha256(convert_to('attempted research capture', 'utf8')), "
       + "        timestamptz '2026-09-03 09:00:00+00', timestamptz '2026-09-10 09:00:00+00') "
       + 'returning id',
    params: [workspace, business, sourceId],
  };
}

// THE DATA-DEC-07 STATEMENT. `retention_until` is outside every UPDATE grant to every role, so this is
// refused by the PRIVILEGE system and not by a policy — which is the property that makes an open
// decision safe to leave open: a row states its own limit once and nothing can push it forward.
export function researchExtendRetention(sourceId, capture) {
  return {
    sql: "update app.research_snapshots set retention_until = timestamptz '2099-01-01 00:00:00+00' "
       + "where research_source_id = $1::uuid and content_hash = sha256(convert_to($2, 'utf8')) "
       + 'returning id',
    params: [sourceId, capture],
  };
}

export function researchRewriteDigest(sourceId, capture) {
  return {
    sql: "update app.research_snapshots set content_hash = sha256(convert_to('rewritten', 'utf8')) "
       + "where research_source_id = $1::uuid and content_hash = sha256(convert_to($2, 'utf8')) "
       + 'returning id',
    params: [sourceId, capture],
  };
}

export function researchDeleteSnapshot(sourceId, capture) {
  return {
    sql: 'delete from app.research_snapshots '
       + "where research_source_id = $1::uuid and content_hash = sha256(convert_to($2, 'utf8')) "
       + 'returning id',
    params: [sourceId, capture],
  };
}

// An evidence row. `snapshot_content_hash` is NULL rather than a digest, because the nullable branch
// is the one a piece of evidence takes when no capture was made — and because a digest here would
// have to be one of the fixture's, which would make the statement a claim about a specific capture
// instead of about the grant.
export function researchRecordEvidence(workspace, business, sourceId) {
  return {
    sql: 'insert into app.research_evidence '
       + '(workspace_id, business_profile_id, research_source_id, snapshot_content_hash) '
       + 'values ($1::uuid, $2::uuid, $3::uuid, null) returning id',
    params: [workspace, business, sourceId],
  };
}

// §8.6 case 9 on the one object §5 names immutable. It clears the column that says WHICH document the
// evidence was taken from, which is the edit a forger would actually want.
export function researchAmendEvidence(evidenceId) {
  return {
    sql: 'update app.research_evidence set snapshot_content_hash = null where id = $1::uuid returning id',
    params: [evidenceId],
  };
}

export function researchDeleteEvidence(evidenceId) {
  return { sql: 'delete from app.research_evidence where id = $1::uuid returning id', params: [evidenceId] };
}

// §8.2's SAVE, one of its three verbs, with the actor as a parameter for the reason
// researchCancelRun's is one. `saved_at` and not `used_at`: research_suggestion_b1 is loaded
// DISMISSED, and research_suggestions_one_outcome would refuse a `used_at` on it — so a cross-tenant
// case naming `used_at` could be satisfied by a CHECK rather than by the policy it exists to prove.
export function researchSaveSuggestion(suggestionId, actor) {
  return {
    sql: 'update app.research_suggestions set saved_at = now(), updated_by = $2::uuid '
       + 'where id = $1::uuid returning id',
    params: [suggestionId, actor],
  };
}

export function researchRewriteTitle(suggestionId) {
  return {
    sql: "update app.research_suggestions set title = 'rewritten suggestion' where id = $1::uuid returning id",
    params: [suggestionId],
  };
}

export function researchProposeSuggestion(workspace, business, runId) {
  return {
    sql: 'insert into app.research_suggestions (workspace_id, business_profile_id, research_run_id, title) '
       + "values ($1::uuid, $2::uuid, $3::uuid, 'attempted suggestion') returning id",
    params: [workspace, business, runId],
  };
}

export function researchDeleteSuggestion(suggestionId) {
  return {
    sql: 'delete from app.research_suggestions where id = $1::uuid returning id',
    params: [suggestionId],
  };
}

// -- BATCH 080 — content: the idea, the item, the version, the variant, the review. -----------
//
// THE IDEA IS ADDRESSED BY THE REQUEST THAT CREATED IT, not by a symbol. §4.6 asks for "unique
// idempotency ต่อ workspace" and 080_content.sql makes that a partial unique index, so
// (workspace_id, client_request_id) names exactly one row — batch 050's job addressing, one family
// over. A VARIANT is addressed by (content_version_id, platform) for the same reason, and a VERSION
// by (content_item_id, version_no) except for the two the catalog names, which carry a symbol
// because the variant and the review are addressed THROUGH a version id and a join to find it would
// put two tables' policies behind one result.
export const CONTENT_ITEM_BY_ID = 'select id from app.content_items where id = $1';
export const CONTENT_VERSION_BY_ID = 'select id from app.content_versions where id = $1';
export const QUALITY_REVIEW_BY_ID = 'select id from app.quality_reviews where id = $1';
export const CONTENT_IDEA_A = 'fixture content idea a1';
export const CONTENT_IDEA_B = 'fixture content idea b1';
export const CONTENT_IDEA_BY_REQUEST =
  'select id from app.content_ideas where workspace_id = $1::uuid and client_request_id = $2';
export const CONTENT_VERSION_OF_ITEM =
  'select id from app.content_versions where content_item_id = $1::uuid and version_no = 1';
export const CONTENT_VARIANT_BY_VERSION =
  'select id from app.content_variants where content_version_id = $1::uuid and platform = $2';

// The witnesses. Each reads a value that is NOT NULL in the fixture, so the comparison says what it
// looks like it says: §6.4 of evidence/WP-0A-DB-00/parallel-integration-2026-09-07.md records that
// the driver reads psql's CSV, CSV has no NULL, and a witness comparing against `null` holds against
// every correct database. `title` and `topic` are text columns the fixture loads with a known value.
export function contentItemStillTitled(as, itemId, title) {
  return { as, sql: 'select title from app.content_items where id = $1', params: [itemId], column: 'title', equals: title };
}

export function contentIdeaStillOnTopic(as, workspace, request, topic) {
  return {
    as,
    sql: 'select topic from app.content_ideas where workspace_id = $1::uuid and client_request_id = $2',
    params: [workspace, request],
    column: 'topic',
    equals: topic,
  };
}

// §8.2's "Content create/edit/version", as the columns the client UPDATE grant actually names. The
// actor is a parameter rather than `(select auth.uid())` so the forged-actor case is visibly the
// same statement with one argument changed — which is what §8.6 case 8 has to be for its refusal to
// be attributable to the WITH CHECK half rather than to the USING half.
export function contentRenameItem(itemId, actor) {
  return {
    sql: "update app.content_items set title = 'renamed content item', updated_by = $2::uuid "
       + 'where id = $1::uuid returning id',
    params: [itemId, actor],
  };
}

// THE OTHER HALF OF THE SAME `Y` CELL, AND THE ONE THE CLIENT DOES NOT HOLD. §4.6: "state change
// ผ่าน domain command; ห้าม client update status อิสระ". `status` is outside every UPDATE grant, so
// this is refused by the privilege system and not by a policy predicate — which is the distinction
// the case's `deniedBy` declares.
export function contentApproveItem(itemId) {
  return {
    sql: "update app.content_items set status = 'approved' where id = $1::uuid returning id",
    params: [itemId],
  };
}

// Which version is CURRENT is the act of publishing one, so the column is outside the UPDATE grant
// beside `status` rather than for a reason of its own.
export function contentPinCurrentVersion(itemId, versionId) {
  return {
    sql: 'update app.content_items set current_version_id = $2::uuid where id = $1::uuid returning id',
    params: [itemId, versionId],
  };
}

// §8.5's soft delete: "ใช้ soft delete ผ่าน typed lifecycle field". `deleted_at` IS in the client
// UPDATE grant, and this is the positive that makes the DELETE refusal below a statement about the
// verb rather than about the row.
export function contentSoftDeleteItem(itemId, actor) {
  return {
    sql: 'update app.content_items set deleted_at = now(), updated_by = $2::uuid '
       + 'where id = $1::uuid returning id',
    params: [itemId, actor],
  };
}

// No `id` is passed: the column defaults to gen_random_uuid(), the row is rolled back with its
// transaction, and no case has a reason to hold the id of a row it is creating. The Business is a
// live one under the Workspace, so when the CI negative control disables row level security the
// insert LANDS rather than failing on a foreign key — a case that could not succeed proves nothing
// about the policy that refuses it.
export function contentCreateItem(workspace, business, createdBy) {
  return {
    sql: 'insert into app.content_items (workspace_id, business_profile_id, title, content_type, '
       + "created_by, updated_by) values ($1::uuid, $2::uuid, 'attempted content item', 'post', "
       + '$3::uuid, $3::uuid) returning id',
    params: [workspace, business, createdBy],
  };
}

export function contentDeleteItem(itemId) {
  return { sql: 'delete from app.content_items where id = $1::uuid returning id', params: [itemId] };
}

export function contentCaptureIdea(workspace, business, createdBy) {
  return {
    sql: 'insert into app.content_ideas (workspace_id, business_profile_id, goal, topic, '
       + "created_by, updated_by) values ($1::uuid, $2::uuid, 'attempted content goal', "
       + "'attempted content topic', $3::uuid, $3::uuid) returning id",
    params: [workspace, business, createdBy],
  };
}

export function contentRetopicIdea(workspace, request, actor) {
  return {
    sql: "update app.content_ideas set topic = 'rewritten content topic', updated_by = $3::uuid "
       + 'where workspace_id = $1::uuid and client_request_id = $2 returning id',
    params: [workspace, request, actor],
  };
}

// The idempotency key §4.6 asks for, which is outside the UPDATE grant: a key a client can rewrite
// after the fact identifies nothing, and a retried create would produce a second idea.
export function contentRewriteIdeaKey(workspace, request) {
  return {
    sql: "update app.content_ideas set client_request_id = 'rewritten idea key' "
       + 'where workspace_id = $1::uuid and client_request_id = $2 returning id',
    params: [workspace, request],
  };
}

export function contentDeleteIdea(workspace, request) {
  return {
    sql: 'delete from app.content_ideas where workspace_id = $1::uuid and client_request_id = $2 returning id',
    params: [workspace, request],
  };
}

// version_no 2, because version 1 of every fixture item exists and a refusal that was
// content_versions_item_version_key rather than the missing privilege would be a constraint standing
// in for a control. `source` is `manual`, which content_versions_revision_has_parent permits without
// a parent. So the insert LANDS when the negative control disables row level security.
export function contentWriteVersion(workspace, business, itemId) {
  return {
    sql: 'insert into app.content_versions (workspace_id, business_profile_id, content_item_id, '
       + "version_no, body, source) values ($1::uuid, $2::uuid, $3::uuid, 2, "
       + "'attempted content body', 'manual') returning id",
    params: [workspace, business, itemId],
  };
}

export function contentAmendVersion(versionId) {
  return {
    sql: "update app.content_versions set body = 'rewritten content body' where id = $1::uuid returning id",
    params: [versionId],
  };
}

export function contentDeleteVersion(versionId) {
  return { sql: 'delete from app.content_versions where id = $1::uuid returning id', params: [versionId] };
}

// `instagram`, because the fixture's variant of this version is `facebook` and an untyped second
// variant on the same platform would be refused by content_variants_logical_key — which is the
// constraint the migration asserts is NULLS NOT DISTINCT, and a case refused by it would be
// asserting that assertion instead of the missing privilege.
export function contentWriteVariant(workspace, business, versionId) {
  return {
    sql: 'insert into app.content_variants (workspace_id, business_profile_id, content_version_id, '
       + "platform, body) values ($1::uuid, $2::uuid, $3::uuid, 'instagram', "
       + "'attempted variant body') returning id",
    params: [workspace, business, versionId],
  };
}

export function contentAmendVariant(versionId, platform) {
  return {
    sql: "update app.content_variants set body = 'rewritten variant body' "
       + 'where content_version_id = $1::uuid and platform = $2 returning id',
    params: [versionId, platform],
  };
}

export function contentDeleteVariant(versionId, platform) {
  return {
    sql: 'delete from app.content_variants where content_version_id = $1::uuid and platform = $2 returning id',
    params: [versionId, platform],
  };
}

// One finding carrying the two fields §4.6 requires, so a refusal cannot be
// quality_reviews_findings_carry_code_and_message standing in for a missing grant.
export function contentWriteQualityReview(workspace, business, versionId) {
  return {
    sql: 'insert into app.quality_reviews (workspace_id, business_profile_id, content_version_id, '
       + "rule_set_version, status, findings, reviewer_type) values ($1::uuid, $2::uuid, $3::uuid, "
       + "'fixture-rule-set-v1', 'pass', "
       + '\'[{"rule_code": "ATTEMPTED-001", "message_th": "ข้อความที่พยายามเขียน"}]\'::jsonb, '
       + "'ai') returning id",
    params: [workspace, business, versionId],
  };
}

export function contentAmendQualityReview(reviewId) {
  return {
    sql: "update app.quality_reviews set status = 'pass' where id = $1::uuid returning id",
    params: [reviewId],
  };
}

export function contentDeleteQualityReview(reviewId) {
  return { sql: 'delete from app.quality_reviews where id = $1::uuid returning id', params: [reviewId] };
}


// -- BATCH 090 — approval: the policy, the request and the trail. -----------------------------
//
// A POLICY IS ADDRESSED BY ITS OWN VERSION KEY, not by a symbol. §5 says "policy versioned" and
// 090_approval.sql makes (workspace_id, business_profile_id, policy_key, version) unique, so the
// four-part key names exactly one row — batch 020's version addressing, on a table whose rows ARE
// versions. AN APPROVAL EVENT is addressed by (approval_request_id, action, idempotency_key), which
// is §4.7's "unique idempotency key ต่อ action": the key whose entire purpose is to identify an
// action is used here AS the address, which is the demonstration batch 070 made about a content
// hash. A REQUEST has no natural key and carries a symbol; the catalog argues why.
export const APPROVAL_POLICY_A1_BUSINESS = 'fixture-a1-business';
export const APPROVAL_POLICY_A1_PINNED = 'fixture-a1-pinned';
export const APPROVAL_POLICY_A1_SIBLING = 'fixture-a1-sibling';
export const APPROVAL_POLICY_A2_BUSINESS = 'fixture-a2-business';
export const APPROVAL_POLICY_B1_BUSINESS = 'fixture-b1-business';

export const APPROVAL_POLICY_BY_KEY =
  'select id from app.approval_policies where workspace_id = $1::uuid '
  + 'and business_profile_id = $2::uuid and policy_key = $3 and version = $4::integer';
export const APPROVAL_POLICY_VERSIONS_OF_KEY =
  'select version from app.approval_policies where workspace_id = $1::uuid '
  + 'and business_profile_id = $2::uuid and policy_key = $3 order by version';
export const APPROVAL_REQUEST_BY_ID = 'select id from app.approval_requests where id = $1';
export const APPROVAL_EVENT_BY_KEY =
  'select id from app.approval_events where approval_request_id = $1::uuid '
  + 'and action = $2 and idempotency_key = $3';

// The witnesses. §6.4 of evidence/WP-0A-DB-00/parallel-integration-2026-09-07.md records that the
// driver reads psql's CSV and that CSV has no NULL, so a witness comparing against `null` holds
// against every correct database. `status` is text and needs nothing.
//
// `enabled` IS CAST TO TEXT AND ALIASED BACK, which no witness before this one has had to do and is
// worth a sentence rather than a shrug: psql renders a boolean as `t` or `f` in CSV, so a witness
// written as `select enabled ... equals 'false'` would compare 'f' against 'false' and FAIL ON A
// CORRECT DATABASE — and a witness written `equals 'f'` would be asserting psql's output format
// rather than the row's value. The cast makes the comparison about the value.
export function approvalPolicyStillEnabled(as, workspace, business, key, version, expected) {
  return {
    as,
    sql: 'select enabled::text as enabled from app.approval_policies where workspace_id = $1::uuid '
       + 'and business_profile_id = $2::uuid and policy_key = $3 and version = $4::integer',
    params: [workspace, business, key, version],
    column: 'enabled',
    equals: expected,
  };
}

export function approvalPolicyQuorumStill(as, workspace, business, key, version, expected) {
  return {
    as,
    sql: 'select minimum_approvers::text as minimum_approvers from app.approval_policies '
       + 'where workspace_id = $1::uuid and business_profile_id = $2::uuid '
       + 'and policy_key = $3 and version = $4::integer',
    params: [workspace, business, key, version],
    column: 'minimum_approvers',
    equals: expected,
  };
}

export function approvalRequestStillInState(as, requestId, status) {
  return {
    as,
    sql: 'select status from app.approval_requests where id = $1',
    params: [requestId],
    column: 'status',
    equals: status,
  };
}

// §8.3 row 1's manage verb, as the ONE column the UPDATE grant names. The actor is a parameter for
// the reason every builder in this file takes one: the forged-actor case has to be visibly the same
// statement with one argument changed.
export function approvalTogglePolicy(workspace, business, key, version, actor) {
  return {
    sql: 'update app.approval_policies set enabled = not enabled, updated_by = $5::uuid '
       + 'where workspace_id = $1::uuid and business_profile_id = $2::uuid '
       + 'and policy_key = $3 and version = $4::integer returning id',
    params: [workspace, business, key, version, actor],
  };
}

// THE OTHER HALF OF §8.3 ROW 1, AND THE ONE NOBODY HOLDS. §4.7: "published policy version
// immutable". `minimum_approvers` is the decision the version encodes and it is outside every
// UPDATE grant, so this is refused by the privilege system and not by a policy predicate — which is
// the distinction the case's `deniedBy` declares.
export function approvalRaiseQuorum(workspace, business, key, version) {
  return {
    sql: 'update app.approval_policies set minimum_approvers = 9 '
       + 'where workspace_id = $1::uuid and business_profile_id = $2::uuid '
       + 'and policy_key = $3 and version = $4::integer returning id',
    params: [workspace, business, key, version],
  };
}

// Renumbering a version is the other way to rewrite a published decision: leave the columns alone
// and move the row to a different ordinal. Outside the UPDATE grant beside the quorum rather than
// for a reason of its own.
export function approvalRenumberPolicy(workspace, business, key, version) {
  return {
    sql: 'update app.approval_policies set version = 99 '
       + 'where workspace_id = $1::uuid and business_profile_id = $2::uuid '
       + 'and policy_key = $3 and version = $4::integer returning id',
    params: [workspace, business, key, version],
  };
}

// No `id` is passed: the column defaults to gen_random_uuid(), the row is rolled back with its
// transaction, and no case has a reason to hold the id of a row it is creating. The Business is a
// live one under the Workspace, so when the CI negative control disables row level security the
// insert LANDS rather than failing on a foreign key — a case that could not succeed proves nothing
// about the policy that refuses it. The `policy_key` is a parameter so that the permitted case and
// the second-version case do not collide with the fixture's rows on the version key.
export function approvalWritePolicy(workspace, business, key, version, createdBy) {
  return {
    sql: 'insert into app.approval_policies (workspace_id, business_profile_id, policy_key, '
       + 'version, enabled, minimum_approvers, created_by, updated_by) '
       + 'values ($1::uuid, $2::uuid, $3, $4::integer, true, 1, $5::uuid, $5::uuid) returning id',
    params: [workspace, business, key, version, createdBy],
  };
}

export function approvalDeletePolicy(workspace, business, key, version) {
  return {
    sql: 'delete from app.approval_policies where workspace_id = $1::uuid '
       + 'and business_profile_id = $2::uuid and policy_key = $3 and version = $4::integer '
       + 'returning id',
    params: [workspace, business, key, version],
  };
}

// §8.3 row 2's create verb. `status` is NOT named, because it is not in the INSERT grant: a request
// arrives `pending` by the column default. The case that names it is below and is refused by the
// privilege system.
export function approvalRaiseRequest(workspace, business, itemId, versionId, createdBy) {
  return {
    sql: 'insert into app.approval_requests (workspace_id, business_profile_id, content_item_id, '
       + 'content_version_id, requested_by, created_by, updated_by) '
       + 'values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, $5::uuid, $5::uuid) returning id',
    params: [workspace, business, itemId, versionId, createdBy],
  };
}

// THE SAME STATEMENT WITH ONE COLUMN ADDED, which is the whole of the case it serves. A caller who
// could name `status` on insert would open a request that is already approved, and neither UPDATE
// policy would ever see it — the state machine bypassed in one statement, and the one failure mode
// the transition policies cannot catch because no UPDATE policy can refuse a row that was never
// updated.
export function approvalRaiseRequestAlreadyApproved(workspace, business, itemId, versionId, createdBy) {
  return {
    sql: 'insert into app.approval_requests (workspace_id, business_profile_id, content_item_id, '
       + 'content_version_id, status, decided_at, decided_by, requested_by, created_by, updated_by) '
       + "values ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'approved', now(), $5::uuid, $5::uuid, "
       + '$5::uuid, $5::uuid) returning id',
    params: [workspace, business, itemId, versionId, createdBy],
  };
}

// §8.3 ROW 2's CANCEL AND §8.3 ROW 3's DECIDE, AND THEY ARE THE SAME COLUMN. The two statements
// below differ only in the VALUE they write, which is exactly how the two policies tell the two
// matrix rows apart — so a case pairing them is a case about the WITH CHECK halves and nothing else.
export function approvalCancelRequest(requestId, actor) {
  return {
    sql: "update app.approval_requests set status = 'cancelled', updated_by = $2::uuid "
       + 'where id = $1::uuid returning id',
    params: [requestId, actor],
  };
}

export function approvalDecideRequest(requestId, actor) {
  return {
    sql: "update app.approval_requests set status = 'approved', decided_at = now(), "
       + 'decided_by = $2::uuid, updated_by = $2::uuid where id = $1::uuid returning id',
    params: [requestId, actor],
  };
}

// THE VALUE NOBODY MAY WRITE. §4.7 puts `expired` in the vocabulary, §8.3 gives no row that produces
// it, and 090_approval.sql asserts at apply time that no policy's WITH CHECK half mentions it. This
// is that assertion's runtime twin, run from the WORKSPACE OWNER — the identity that holds both
// write paths — so the refusal is about the VALUE and not about the caller.
export function approvalExpireRequest(requestId, actor) {
  return {
    sql: "update app.approval_requests set status = 'expired', updated_by = $2::uuid "
       + 'where id = $1::uuid returning id',
    params: [requestId, actor],
  };
}

// §4 invariant 6: "Approval Request pin Content Version; Version ใหม่ไม่ inherit approval
// โดยอัตโนมัติ". A request that could be re-pointed at a newer version would inherit approval by an
// UPDATE, so the column is outside the UPDATE grant and this is a privilege refusal.
export function approvalRepinRequest(requestId, versionId) {
  return {
    sql: 'update app.approval_requests set content_version_id = $2::uuid where id = $1::uuid returning id',
    params: [requestId, versionId],
  };
}

export function approvalDeleteRequest(requestId) {
  return { sql: 'delete from app.approval_requests where id = $1::uuid returning id', params: [requestId] };
}

// §8.3 row 4 — `N` in every column including Service. The three statements below are the three verbs
// that row names plus the INSERT 090 reads into it, and every case that runs them expects a GRANT
// refusal: there is no policy for row level security to apply, because there is no grant for it to
// apply to.
export function approvalWriteEvent(workspace, business, requestId) {
  return {
    sql: 'insert into app.approval_events (workspace_id, business_profile_id, approval_request_id, '
       + 'action, request_id, correlation_id, idempotency_key) '
       + "values ($1::uuid, $2::uuid, $3::uuid, 'attempted-action', 'attempted-request', "
       + "'attempted-correlation', 'attempted-idempotency') returning id",
    params: [workspace, business, requestId],
  };
}

// It clears the COMMENT — the column that says why a decision was taken — which is the edit a
// forger would actually want and the one §4.7's "decision ห้าม update/delete" is about.
export function approvalAmendEvent(requestId, action, key) {
  return {
    sql: 'update app.approval_events set comment = null where approval_request_id = $1::uuid '
       + 'and action = $2 and idempotency_key = $3 returning id',
    params: [requestId, action, key],
  };
}

export function approvalDeleteEvent(requestId, action, key) {
  return {
    sql: 'delete from app.approval_events where approval_request_id = $1::uuid '
       + 'and action = $2 and idempotency_key = $3 returning id',
    params: [requestId, action, key],
  };
}
