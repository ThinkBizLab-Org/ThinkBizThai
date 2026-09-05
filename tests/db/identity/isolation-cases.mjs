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
//
// No case contains a uuid. Identities and rows are named by their fixture SYMBOL and resolved
// from db/foundation/seeds/fixture-catalog.json at run time, which is what makes the cross-tenant
// assertion mean anything: tenant A's identity attacks tenant B while HOLDING B's exact id.

// Which §12.6 smoke assertions this batch's tables can carry, and which they cannot.
//
// An honest coverage claim is worth more than a broad one. Assertions 2 and 3 name business,
// page, content and knowledge tables that batch 010 does not create and is not allowed to create
// — they are batches 020, 040 and 080. Claiming them here would put a tick against a control
// nothing exercises.
export const SMOKE_COVERAGE = {
  1: { covered: true, note: 'workspaces, workspace_settings and workspace_invitations, in both directions.' },
  2: { covered: false, note: 'business_a1/a2 and page_a1/a2 are batch 020 tables. The fixture catalog '
                           + 'already fixes their ids; the assertion is owed by 020, not by 010.' },
  3: { covered: false, note: 'content and knowledge are batches 080 and 040. The in-scope ANALOGUE — '
                           + 'an approver cannot update the workspace — is asserted below and is '
                           + 'labelled an analogue, not this assertion.' },
  4: { covered: true, note: 'viewer insert, update and delete on every batch 010 table with a '
                           + 'client-writable column.' },
  5: { covered: true, note: 'suspended sees zero TENANT rows — and still sees their own user_profiles '
                           + 'row, which is user-scoped and not a tenant row (§5). Both halves are '
                           + 'asserted, because only the pair distinguishes a policy from an empty table.' },
  6: { covered: true, note: 'anonymous. Refused at the privilege layer rather than filtered by RLS, '
                           + 'because §8.5 gives anon no tenant policy and this batch grants anon '
                           + 'nothing. Stronger than the assertion asks for; recorded as deniedBy.' },
  7: { covered: 'partial', note: 'a forged workspace_id and a forged created_by both fail, with an '
                           + 'error, on the INSERT path. Forged business and page ids cannot be '
                           + 'tested until 020 creates those columns.' },
  8: { covered: 'negative-half', note: 'RFC-2026-017 §7. The POSITIVE half — the server fixture '
                           + 'succeeds — is not asserted, because §8.1 marks no identity operation `S` '
                           + 'and batch 010 therefore writes the service no policy. Asserting a success '
                           + 'would have required inventing the permission first. The negative half is '
                           + 'the half that detects a regression, and it is asserted.' },
};

// The ten §8.6 authorization cases every tenant table family owes, and where batch 010 stands.
export const AUTHORIZATION_CASE_COVERAGE = {
  1: 'covered — owner reads its workspace and inserts an invitation.',
  2: 'covered — viewer, editor and approver are all refused the owner-only update.',
  3: 'not applicable to batch 010 — business scope is batch 020/021.',
  4: 'not applicable to batch 010 — page scope is batch 020/021.',
  5: 'covered — the cross-tenant cases, run while holding workspace_b\'s exact id.',
  6: 'covered — user_suspended_a, both halves.',
  7: 'covered — anonymous, refused at the privilege layer because anon holds no grant at all.',
  8: 'covered — a forged created_by on the invitation insert, which raises.',
  9: 'no immutable or ledger table exists in batch 010. The nearest control asserted here is that '
   + 'no table in the batch carries a DELETE policy for any client role (§8.5), so a delete is '
   + 'refused by the privilege system.',
  10: 'not applicable to batch 010 — no command function is specified for identity, and audit '
    + '(140) and outbox (050) do not exist yet.',
};

const WORKSPACE_A_NAME = 'fixture workspace a';
const WORKSPACE_A_TIMEZONE = 'Asia/Bangkok';

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

  const invite = (workspace, tokenSymbol, createdBy) => ({
    sql: 'insert into app.workspace_invitations (workspace_id, role, token_hash, expires_at, created_by)'
       + " values ($1, 'editor', public.digest($2, 'sha256'), now() + interval '1 day', $3)"
       + ' returning id',
    params: [workspace, tokenSymbol, createdBy],
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
export const OUTCOME_KINDS = ['rows', 'no-rows', 'denied', 'no-effect'];

export const MUTATION_PREFIXES = ['insert', 'update', 'delete'];

export function isMutation(sql) {
  return MUTATION_PREFIXES.some((verb) => sql.trimStart().toLowerCase().startsWith(verb));
}
