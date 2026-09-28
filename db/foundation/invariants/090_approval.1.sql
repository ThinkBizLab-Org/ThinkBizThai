do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  approval_tables constant text[] :=
    array['approval_policies', 'approval_requests', 'approval_events'];
  -- §8.3 row 4 — "Approval event UPDATE/DELETE | N N N N N | N" — the second row in §8 that is `N`
  -- in every column including Service, and the only one outside §8.2.
  append_only_tables constant text[] := array['approval_events'];
begin
  -- SUPERSEDED BY 123 as well: batch 123 added `<table>_updated_by_on_update_is_caller`, restrictive, to approval_policies, approval_requests, and approval_requests_decided_by_on_update_is_caller; and 125 added approval_requests_settled_is_immutable.
  -- SUPERSEDED BY 092, 094, 102. Batch 090 wrote one restrictive narrowing per table. The later files
  -- added restrictive policies to the same tables: approval_events_service_path_closed (092), approval_policies_service_path_closed (092), approval_policies_updated_by_is_caller (102), approval_requests_requester_is_caller (094), approval_requests_service_path_closed (092), approval_requests_updated_by_is_caller (102).
  -- Each of those is asserted by its own batch's block, which this pass also re-runs. The final-state
  -- form below pins every table's restrictive set by name, then excludes the later names from the 2
  -- restrictive predicates of 090's original assertions, which are otherwise kept word for word.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.approval_events'::regclass and not pol.polpermissive)
     is distinct from array['approval_events_scope_narrowing', 'approval_events_service_path_closed'] then
    raise exception 'app.approval_events restrictive policies are not exactly batch 090''s narrowing and the ones 092 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.approval_policies'::regclass and not pol.polpermissive)
     is distinct from array['approval_policies_scope_narrowing', 'approval_policies_service_path_closed', 'approval_policies_updated_by_is_caller', 'approval_policies_updated_by_on_update_is_caller'] then  -- SUPERSEDED BY 123: its UPDATE closure
    raise exception 'app.approval_policies restrictive policies are not exactly batch 090''s narrowing and the ones 092, 102, 123 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.approval_requests'::regclass and not pol.polpermissive)
     is distinct from array['approval_requests_decided_by_on_update_is_caller', 'approval_requests_requester_is_caller', 'approval_requests_scope_narrowing', 'approval_requests_service_path_closed', 'approval_requests_settled_is_immutable', 'approval_requests_updated_by_is_caller', 'approval_requests_updated_by_on_update_is_caller'] then  -- SUPERSEDED BY 123: its two UPDATE closures; and 125: the settled-row closure
    raise exception 'app.approval_requests restrictive policies are not exactly batch 090''s narrowing and the ones 092, 094, 102, 123, 125 added';
  end if;
  -- ENABLE AND FORCE ON ALL THREE. They are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4). Without FORCE the table owner is exempt from
  -- every policy, and the owner is the role migrations run as.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- APPEND-ONLY AS THE PRIVILEGE SYSTEM HOLDS IT, which is the first half of the claim the header
  -- makes. Asserted against the live ACLs rather than against the grant list above, because a grant
  -- made by a LATER batch would not appear in this file at all — and because the control here is an
  -- ABSENCE, which is exactly the kind of thing a file cannot show about itself.
  --
  -- `has_any_column_privilege` for INSERT and UPDATE so a column-scoped grant is caught as well as a
  -- table-wide one (070's measured trap: a full set of column grants leaves `has_table_privilege`
  -- false); DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (append_only_tables)
         and r.rolname::text = any (every_role)
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
              or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'an approval event can be written through a granted path: %', offending
      using hint = '§8.3 row 4 is `N` for owner, admin, editor, approver, viewer AND service, which '
                   'only §8.2 row 3 is besides it. The refusal is a grant that was never made '
                   'rather than a policy that says no, because a grant has to be WRITTEN to be '
                   'undone while a policy predicate can be widened by an edit. INSERT is in this '
                   'list on a reading rather than a quotation: a decision trail a client can author '
                   'proves nothing about the decision.';
  end if;

  -- AND THE SAME CLAIM AS THE POLICY CATALOG HOLDS IT, which is the "both ways" the header promises.
  -- Either half alone can be satisfied while the other is wrong: a policy with no grant is inert,
  -- and a grant with no policy is refused by row level security rather than by privilege — a weaker
  -- refusal than append-only asks for. `a` is INSERT, `w` is UPDATE, `d` is DELETE; `*` is the
  -- restrictive FOR ALL narrowing and is deliberately not in this list.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (append_only_tables)
     and pol.polcmd in ('a', 'w', 'd');
  if offending is not null then
    raise exception 'app.approval_events carries an INSERT, UPDATE or DELETE policy: %', offending
      using hint = 'A write policy here would be this batch deciding that §8.3 row 4 has an '
                   'exception. It does not: the row that records a decision is written by the act '
                   'that takes it, which is a SECURITY DEFINER command function owned by '
                   'app_command (RFC-2026-017 §3) and does not exist yet (RFC-2026-021 §10).';
  end if;

  -- §4.7's "published policy version immutable" AND §4 invariant 6's "Version ใหม่ไม่ inherit
  -- approval" AND §8.5's rule against moving a row across tenant or scope with an update, PER
  -- COLUMN, against the live ACL. The three client UPDATE grants above name seven columns between
  -- them and this is what says so about the rest.
  --
  -- `version`, `policy_key` and `minimum_approvers` are the columns this batch is most likely to be
  -- read wrong on: a reader who has seen §8.3 mark "Approval policy manage" `Y` for two roles
  -- expects a manager to be able to edit a policy. They cannot edit the DECISION — they toggle
  -- `enabled` and they write a new version — and the refusal is a missing privilege rather than a
  -- policy clause. `content_version_id` is in the second list for the sharper reason: §4 invariant
  -- 6 says a new version does not inherit approval, and a request that could be re-pointed at one
  -- would inherit it by an UPDATE.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'policy_key', 'version',
                                'minimum_approvers', 'required_role', 'required_scope_type',
                                'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'approval_policies'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id', 'content_item_id',
                                'content_version_id', 'policy_version_id', 'requested_by',
                                'created_by', 'created_at']) as col
       where n.nspname = 'app'
         and c.relname = 'approval_requests'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope, decision or pin column of a batch 090 table is updatable: %', offending
      using hint = '§4.7: "published policy version immutable". §4 invariant 6: "Approval Request '
                   'pin Content Version; Version ใหม่ไม่ inherit approval โดยอัตโนมัติ" — a request '
                   'that can be re-pointed at a new version inherits approval by an UPDATE. §8.5: a '
                   'row may not be moved across tenant OR scope by an update.';
  end if;

  -- `status` IS NOT IN THE INSERT GRANT, so a request arrives `pending` by the column default. A
  -- caller who could name the column on insert could open a request that is already `approved`,
  -- and the two UPDATE policies below would never see it — which is the whole state machine
  -- bypassed in one statement, and the one failure mode the transition policies cannot catch.
  select string_agg(format('%s to %s', column_name, grantee), ', ') into offending
    from (
      select col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['status', 'decided_at', 'decided_by']) as col
       where n.nspname = 'app'
         and c.relname = 'approval_requests'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'INSERT')
    ) as held;
  if offending is not null then
    raise exception 'a batch 090 request can be INSERTED with a state or a decision already on it: %', offending
      using hint = '§4.7 gives status five values and §8.3 gives the table two write rows. Both are '
                   'about moving an EXISTING request. A request that can be created `approved` — or '
                   'created with a decided_at — has skipped every policy that bounds the '
                   'transition, and no UPDATE policy can refuse a row that was never updated.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE THREE. §8.5 has no broad user delete; a request that is
  -- withdrawn becomes `cancelled`, which is why §4.7 gives the vocabulary that word; and hard
  -- removal in this family is batch 160's APPROVAL-HISTORY sweep through app_maintenance, which this
  -- batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (approval_tables)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'an approval row can be deleted through a granted path: %', offending;
  end if;

  -- app_worker HOLDS NOTHING HERE, AND THIS BATCH TAKES 080's SHAPE RATHER THAN 070's. Batch 070
  -- grants its worker select, insert and update and lets row level security refuse it, which is the
  -- "grants and no policy" shape batch 010 introduced. Approval does not, for the reason 080 gave
  -- and one of its own: §8.3 marks the Service column `P` on three rows and `N` on the fourth, so
  -- there is no `S` cell for a worker grant to anticipate, and the writer this family needs is a
  -- SECURITY DEFINER command function owned by `app_command`, which RFC-2026-017 §3 keeps off the
  -- owner seat so that these policies apply to it (corrected at integration, 2026-09-15: this read
  -- "exempt from these policies by being the owner", which is false). Granting app_worker a write
  -- here would be building the second path to the same act — the shape RFC-2026-018 was superseded
  -- for proposing.
  --
  -- The cost is stated rather than discovered: the isolation suite's service cases here are refused
  -- at the PRIVILEGE layer rather than by row level security, which is a different claim from batch
  -- 070's and is labelled as one in tests/db/identity/isolation-cases.mjs, and none of them is part
  -- of the CI negative control's basis.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('app_worker', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'app_worker holds a privilege on app.%, and batch 090 grants it none', offending;
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE, and it is the one client-role property no approved decision is expected to move.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- NO POLICY ON THESE THREE NAMES ANY ROLE BUT `authenticated`, AND THE SERVICE HALF OF THAT IS A
  -- DECISION RATHER THAN AN OMISSION. RFC-2026-022 §3 carries a service policy for a cell the §8
  -- matrix marks `S`. Approval has no `S` cell anywhere in §8.3 — its Service column is `P` on three
  -- rows and `N` on the fourth, and a `P` with no capability defined is not an `S` — so
  -- db/foundation/lint/service-policy-map.json gets no entry from this batch and no policy here may
  -- name a service role. Batch 070 deliberately left app_worker OUT of its equivalent assertion
  -- because it expects a policy once RFC-2026-022 is in effect; this batch expects none, so the
  -- assertion is wider here for a stated reason, exactly as 080's is.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('anon', 'app_worker', 'app_command', 'app_maintenance',
                                      'app_authz'));
  if offending is not null then
    raise exception 'batch 090 left a policy for a role that is not authenticated: %', offending;
  end if;

  -- `expired` IS WRITTEN BY NOBODY, ASSERTED AGAINST THE POLICY CATALOG RATHER THAN PROMISED IN A
  -- COMMENT. §4.7 puts the word in the vocabulary and §8.3 gives no row that produces it, so the
  -- CHECK admits it and no granted path reaches it. The failure this catches is the plausible one: a
  -- later edit widening the cancel policy's WITH CHECK to `status in ('cancelled', 'expired')`,
  -- which would hand every editor in the workspace the power to expire somebody else's request
  -- while looking like a tidy-up. `polwithcheck` and not `polqual`, because a USING half that
  -- mentioned `expired` would only be selecting rows to act on.
  select string_agg(pol.polname, ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'approval_requests'
     and pol.polwithcheck is not null
     and position('expired' in pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid)) > 0;
  if offending is not null then
    raise exception 'a batch 090 policy admits a write of the one status value nothing may produce: %', offending
      using hint = '§4.7 lists `expired` among five status values and §8.3 has NO ROW that produces '
                   'it: the service column on the three write rows is `P` with no capability '
                   'defined, and no document in this repository says how long an approval request '
                   'stays open. Writing it here would be this batch setting a product deadline.';
  end if;

  -- THE TWO UPDATE POLICIES ON app.approval_requests ARE DISTINGUISHED BY THEIR WITH CHECK HALVES,
  -- AND EACH CARRIES ITS OWN ROLE TEST. Permissive policies OR together, so a WITH CHECK half that
  -- dropped its role test would let the OTHER policy's USING half admit the row: an approver would
  -- cancel, or an editor would approve. That is the single most likely edit to this file and it is
  -- invisible to a test that reads one policy at a time.
  count_of := 0;
  for probe in
    select pol.polname as polname,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname = 'approval_requests'
       and pol.polpermissive
       and pol.polcmd = 'w'
  loop
    count_of := count_of + 1;
    if probe.check_half is null then
      raise exception 'the % policy has no WITH CHECK half, and it is the half that bounds the transition', probe.polname;
    end if;
    if position('workspace_member_role' in probe.check_half) = 0 then
      raise exception 'the % policy does not test the caller''s role in its WITH CHECK half: %',
        probe.polname, probe.check_half
        using hint = 'Permissive UPDATE policies OR their USING halves AND OR their WITH CHECK '
                     'halves. §8.3 gives this table two rows whose role cells differ — '
                     'cancel is Y for owner/admin/editor, decide is Y for owner/approver — so a '
                     'WITH CHECK half that trusts the USING half to have tested the role lets the '
                     'OTHER policy''s USING half admit the row.';
    end if;
    if position('status' in probe.check_half) = 0 then
      raise exception 'the % policy does not bound the status it writes: %', probe.polname, probe.check_half
        using hint = 'The same granted column serves both of §8.3''s write rows, so the VALUE each '
                     'policy admits is the only thing that tells the rows apart.';
    end if;
  end loop;
  if count_of <> 2 then
    raise exception 'batch 090 wrote % permissive UPDATE policies on app.approval_requests and §8.3 gives it two write rows', count_of;
  end if;

  -- THREE RESTRICTIVE NARROWINGS, ONE PER TABLE. `polpermissive` is the one catalog column that
  -- tells a narrowing from a widening: a PERMISSIVE policy with the same name and the same
  -- predicate would WIDEN each table instead of narrowing it, and §12.6/2 would silently stop being
  -- implemented here.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and not pol.polpermissive
     and (c.relname::text, pol.polname::text) not in (('approval_events', 'approval_events_service_path_closed'), ('approval_policies', 'approval_policies_service_path_closed'), ('approval_policies', 'approval_policies_updated_by_is_caller'), ('approval_requests', 'approval_requests_requester_is_caller'), ('approval_requests', 'approval_requests_service_path_closed'), ('approval_requests', 'approval_requests_updated_by_is_caller'), ('approval_policies', 'approval_policies_updated_by_on_update_is_caller'), ('approval_requests', 'approval_requests_updated_by_on_update_is_caller'), ('approval_requests', 'approval_requests_decided_by_on_update_is_caller'), ('approval_requests', 'approval_requests_settled_is_immutable'));  -- SUPERSEDED BY 092, 094, 102, 123, 125: names another file wrote, see the header
  if count_of <> 3 then
    raise exception 'batch 090 wrote % restrictive policies and it creates three tables to narrow', count_of;
  end if;

  -- AND THE ASSERTION THIS BATCH OWES MOST, which is about the three PREDICATES rather than their
  -- count, and about BOTH CATALOG COLUMNS rather than one. `polqual` is USING and `polwithcheck` is
  -- WITH CHECK; 040's probe found that a reversal gutting one while leaving the other intact goes
  -- unnoticed by a test that looks at one of them — a narrowing whose USING lost the Page branch
  -- filters nothing on read for a page-scoped member while still refusing their writes: the leak
  -- without the symptom.
  --
  -- EACH TABLE IS CHECKED FOR WHAT ITS OWN COMMENT CLAIMS. The policy asks both questions itself;
  -- the request must reach `content_items`, because a narrowing over its own columns would ask the
  -- Business question about the approval trail of a page-restricted item; the event must reach
  -- `approval_requests`, which is the first link of the two its comment claims.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (approval_tables)
       and not pol.polpermissive
       and (c.relname::text, pol.polname::text) not in (('approval_events', 'approval_events_service_path_closed'), ('approval_policies', 'approval_policies_service_path_closed'), ('approval_policies', 'approval_policies_updated_by_is_caller'), ('approval_requests', 'approval_requests_requester_is_caller'), ('approval_requests', 'approval_requests_service_path_closed'), ('approval_requests', 'approval_requests_updated_by_is_caller'), ('approval_policies', 'approval_policies_updated_by_on_update_is_caller'), ('approval_requests', 'approval_requests_updated_by_on_update_is_caller'), ('approval_requests', 'approval_requests_decided_by_on_update_is_caller'), ('approval_requests', 'approval_requests_settled_is_immutable'))  -- SUPERSEDED BY 092, 094, 102, 123, 125: names another file wrote, see the header
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target = 'approval_policies' then
        if narrowing is null
           or position('member_scope_admits_business' in narrowing) = 0
           or position('member_scope_admits_page' in narrowing) = 0 then
          raise exception 'the % narrowing does not ask both the Business and the Page question: %',
            probe.target, coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that '
                         'always carries a Business scope, so the narrowing decides per row which '
                         'question to ask. Dropping the Page branch admits every member scoped to a '
                         'sibling Page.';
        end if;
      elsif probe.target = 'approval_requests' then
        if narrowing is null or position('content_items' in narrowing) = 0 then
          raise exception 'the approval request narrowing does not resolve through its content item: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A request carries no page column, so its reach is its item''s reach. A '
                         'narrowing that asked about the request''s own columns would ask the '
                         'Business question about the approval trail of a page-restricted item.';
        end if;
      else
        if narrowing is null or position('approval_requests' in narrowing) = 0 then
          raise exception 'the approval event narrowing does not resolve through its request: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'An event hangs off a request, which hangs off the content item that '
                         'carries the page. The chain is asserted rather than copied, because a '
                         'nullable copy of the item''s page could not be held equal to it by any '
                         'foreign key — MATCH SIMPLE skips a null.';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 3 then
    raise exception 'batch 090 found % restrictive policies to inspect and there must be three', count_of;
  end if;

  -- THE PINNED VERSION IS A VERSION OF THE PINNED ITEM, asserted as the DEGREE of the foreign key
  -- rather than as its existence. §4 invariant 6 is "Approval Request pin Content Version", and a
  -- two-column key into app.content_versions (workspace_id, id) would satisfy every reading of that
  -- sentence while letting a request pin a version of ANOTHER ITEM in the same tenant — a content
  -- item approved by a decision taken about a different one. `confkey` is the array of referenced
  -- columns and its length is the whole of the claim.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'approval_requests'
     and con.conname = 'approval_requests_pinned_version_fk'
     and con.contype = 'f'
     and array_length(con.conkey, 1) = 4;
  if count_of <> 1 then
    raise exception 'the approval request does not pin its content version over the item scope path'
      using hint = '§4 invariant 6: "Approval Request pin Content Version". A key that named only '
                   'the workspace and the version id would let a request pin a version of another '
                   'item in the same tenant, which is a decision taken about a different piece of '
                   'content.';
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 090 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  -- It matters more here than in most batches, because the writer app.approval_events is waiting for
  -- is a SECURITY DEFINER function owned by app_command, and §3 wants that owner to be a role the
  -- policies can NAME and so bind. (Corrected at integration, 2026-09-15: this read "would be exempt
  -- from the policies above by ownership"; FORCE makes an owner subject to its own policies. What
  -- leaves the narrowings binding nothing app_command does is their TO clause, which batch 092
  -- closes.) This is the one table in the schema whose entire integrity claim rests on who may
  -- write it.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (approval_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 090 creates is owned by a role that must not own one: %', offending;
  end if;
end $$;
