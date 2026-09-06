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
// (business_profiles, page_context_profiles and their immutable versions) and therefore CHANGES
// three rows: 7 becomes covered, 2 becomes partial with the remaining half named and dated, and 3
// stays false because content and knowledge are still other people's batches.
//
// A row that moves must move for a case, not for a sentence: identity-isolation.test.mjs requires
// every assertion claimed `covered: true` to be cited by a case in this file.
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
                           + 'weaker shape and is named here rather than covered by an average.' },
  2: { covered: 'partial', note: 'HALF OF THIS IS NOW ASSERTED AND HALF IS STILL OWED, and the halves are '
                           + 'different rules wearing one sentence. "user_editor_a sees Business A1/Page A1" '
                           + 'and the tenant-boundary half — never business_b1, never page_b1, never their '
                           + 'versions — are asserted by batch 020 on all four of its tables. "never A2/Page '
                           + 'A2" is NOT: business_a2 is in the same workspace, and narrowing a member to one '
                           + 'Business inside their own workspace is MEMBER SCOPE, which lives in '
                           + '`workspace_member_scopes` — batch 021. Until 021 lands, §8.1 gives Business/Page '
                           + 'SELECT to every active member, so the editor seeing business_a2 is the access '
                           + 'matrix being implemented and not a leak. The case '
                           + '`editor-a-sees-business-a2-until-batch-021` asserts exactly that, so the day 021 '
                           + 'narrows it a test changes in a diff instead of a claim quietly becoming false.' },
  3: { covered: false, note: 'content and knowledge are batches 080 and 040. There are now two in-scope '
                           + 'ANALOGUES — an approver cannot update the workspace (010) and cannot update a '
                           + 'page context (020) — and both are labelled analogues rather than counted as '
                           + 'this assertion. The tables it names still do not exist.' },
  4: { covered: true, note: 'the VIEWER refused every write each table actually offers a client. On batch '
                           + '010 and on business_profiles and page_context_profiles that is insert, update '
                           + 'and delete. On the two version tables it is INSERT AND NOTHING ELSE, because '
                           + 'update and delete are granted to no role at all — so `viewer-a-cannot-write-a-'
                           + 'business-version` is the case that carries this assertion there, and the '
                           + 'update/delete cases on those tables belong to §8.6/9 instead: they are refused '
                           + 'for the OWNER and for the service, which says nothing about a viewer.' },
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
                           + 'had started answering for an inactive membership.' },
  6: { covered: true, note: 'anonymous. Refused at the privilege layer rather than filtered by RLS, '
                           + 'because §8.5 gives anon no tenant policy and neither batch grants anon '
                           + 'anything. Stronger than the assertion asks for; recorded as deniedBy, and '
                           + 'on the SCHEMA, so the day anon is granted USAGE on app the refusal moves to '
                           + 'the table and the case fails.' },
  7: { covered: true, note: 'ALL THREE ID KINDS NOW FAIL, which batch 010 could only claim for one. A forged '
                           + 'workspace_id and a forged created_by fail on the INSERT path with 42501 (010, '
                           + 'and again on business_profiles in 020). A forged BUSINESS id — a page whose '
                           + 'business_profile_id names a business in another workspace — fails at the policy. '
                           + 'And a version attached to a business in another workspace fails at the COMPOSITE '
                           + 'FOREIGN KEY with 23503, which is §4 invariant 10 in its own words: an unrelated '
                           + 'Workspace/Business/Page triple must fail AT THE DATABASE. That last case is '
                           + 'asserted as `rejected` with its SQLSTATE named, so it cannot be satisfied by a '
                           + 'policy refusing first — which would be a different control passing under this '
                           + "one's name." },
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
                           + 'and nothing else.' },
};

// The ten §8.6 authorization cases every tenant table family owes, and where this suite stands
// across batches 010, 011 and 020.
export const AUTHORIZATION_CASE_COVERAGE = {
  1: 'covered — owner reads its workspace and inserts an invitation (010); owner reads its '
   + 'businesses, pages and versions, creates a business, a page and a new version (020).',
  2: 'covered — viewer, editor and approver are all refused the owner-only workspace update (010) '
   + 'and the owner-or-admin business and page writes (020). The editor is the one to read '
   + 'carefully: §8.1 marks Business/Page INSERT/UPDATE `P` for editor, `P` is conditional on a '
   + 'capability set no document defines, and batch 020 therefore denies it — so the editor case '
   + 'asserts a DEFAULT-DENY and not a decided N.',
  3: 'still owed by batch 021, and now for a narrower reason than when 010 wrote this. The tables '
   + 'exist: business_a1 and business_a2 are both in workspace A. What does not exist is the row '
   + 'that would narrow a member to one of them — `workspace_member_scopes` is batch 021 — so '
   + '§8.1\'s "Business/Page SELECT: Y" gives every active member both. Batch 020 asserts that '
   + 'state positively rather than leaving it unstated, so 021 has to change a test to change it.',
  4: 'still owed by batch 021, for the same reason as case 3, one level down: page scope is a '
   + 'member scope row and not a property of app.page_context_profiles.',
  5: 'covered — the cross-tenant cases, run while holding workspace_b\'s exact id (010), and the '
   + 'same on business_profiles, page_context_profiles and both version tables while holding '
   + "business_b1's and page_b1's exact ids, which is also how the version rows beneath them are "
   + 'addressed (020).',
  6: 'covered — user_suspended_a, both halves, on both batches\' tables.',
  7: 'covered — anonymous, refused at the privilege layer because anon holds no grant at all.',
  8: 'covered — a forged created_by on the invitation insert (010) and on the business insert '
   + '(020), both of which raise.',
  9: 'COVERED BY BATCH 020, and this is the case 010 could only approximate. app.business_profile_'
   + 'versions and app.page_context_profile_versions are immutable by §3.2, §4 invariant 8 and '
   + "§8.1's `N N N N N N` row — the only row in §8.1 where the SERVICE column is N. Every one of "
   + 'update and delete, by a workspace owner and by the service identity, is asserted refused, '
   + 'with the LAYER declared as `grant`: no role is granted UPDATE or DELETE on either table, so '
   + 'the refusal happens before RLS is consulted. That distinction is the assertion — a policy '
   + 'can be widened by an edit, an absent grant has to be granted.',
  10: 'not applicable to batches 010-020 — no command function is specified for identity or for '
    + 'business.core, and audit (140) and outbox (050) do not exist yet.',
};

const WORKSPACE_A_NAME = 'fixture workspace a';
const WORKSPACE_A_TIMEZONE = 'Asia/Bangkok';

// The batch 020 fixture's own values, which the no-effect witnesses read back. They are here and
// not inline for the reason the witness exists at all: a witness that asserts "a row is still
// there" and not "it still says what it said" is expectNoRows wearing a different name, so the
// expected VALUE has one home and the fixture has the other.
const BUSINESS_A1_NAME = 'fixture business a1';
const BUSINESS_B1_NAME = 'fixture business b1';
const PAGE_A1_NAME = 'fixture page a1';
const PAGE_B1_NAME = 'fixture page b1';

/**
 * @param {(symbol: string) => string} id  resolves a fixture symbol to its uuid. Passing a
 *        resolver rather than the ids themselves is what makes "a test never generates a uuid"
 *        a property of the shape instead of a rule someone has to remember.
 */
export function buildCases(id) {
  const ownerA = { helper: 'as_user', subject: id('user_owner_a') };
  const editorA = { helper: 'as_user', subject: id('user_editor_a') };
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
  const PAGE_B1 = id('page_b1');

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
    {
      id: 'editor-a-sees-business-a2-until-batch-021',
      covers: ['§12.6/2-partial', '§8.6/3-pending-021'],
      as: editorA,
      sql: 'select id from app.business_profiles where id = $1',
      params: [BUSINESS_A2],
      expect: 'rows',
      why: 'THE HALF OF §12.6/2 THAT BATCH 020 CANNOT CARRY, written as an assertion instead of as a '
         + 'note. The fixture calls user_editor_a "editor scoped to business_a1 and page_a1", and '
         + 'that scope is a row in `workspace_member_scopes` — batch 021. Until it exists, §8.1 gives '
         + 'Business/Page SELECT to every active member of the workspace and business_a2 is visible: '
         + 'that is the access matrix being implemented, not a leak. Asserting the current state '
         + 'positively is what makes 021 a change to this file rather than a claim that quietly '
         + 'became false.',
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
  ].map((testCase) => resolvePlaceholders(testCase, { A, B }));
}

// `__A__`, `__B__` and `__SELF__` keep the shared `invite(...)` builder readable without letting a
// uuid literal into this file. `__SELF__` in particular is load-bearing: a case that forges
// created_by has to be visibly different from one that does not, and spelling both as explicit
// symbols makes the difference impossible to miss in review.
function resolvePlaceholders(testCase, { A, B }) {
  const swap = (value) => (value === '__A__' ? A : value === '__B__' ? B
    : value === '__SELF__' ? testCase.as.subject : value);
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
