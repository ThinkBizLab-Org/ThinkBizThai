do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  -- The columns that fix what a target IS. Identity and scope (§8.5: a row may not be moved across
  -- tenant or scope by an update), the destination, the pin, and the provenance.
  fixed_columns constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'content_item_id', 'social_account_id',
          'content_variant_id', 'created_by', 'created_at'];
begin
  -- SUPERSEDED BY 083, 102. Batch 081 wrote one restrictive narrowing per table. The later files
  -- added restrictive policies to the same tables: content_targets_service_path_closed (083), content_targets_updated_by_is_caller (102).
  -- Each of those is asserted by its own batch's block, which this pass also re-runs. The final-state
  -- form below pins every table's restrictive set by name, then excludes the later names from the 2
  -- restrictive predicates of 081's original assertions, which are otherwise kept word for word.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.content_targets'::regclass and not pol.polpermissive)
     is distinct from array['content_targets_scope_narrowing', 'content_targets_service_path_closed', 'content_targets_updated_by_is_caller'] then
    raise exception 'app.content_targets restrictive policies are not exactly batch 081''s narrowing and the ones 083, 102 added';
  end if;
  -- ENABLE AND FORCE. They are DIFFERENT CATALOG COLUMNS and the data package's own lint rule reads
  -- only the first (RFC-2026-016 §4). Without FORCE the table owner is exempt from every policy,
  -- and the owner is the role migrations run as.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'app.% does not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending;
  end if;

  -- THE DEFERRAL, AS A FACT ABOUT THE CATALOG. No foreign key on this table may involve
  -- `social_account_id`, in any position of any key. §6's registry gives the social FK to batch
  -- 111, and the day somebody writes it here instead this migration must fail rather than quietly
  -- perform another batch's deliverable. Asked of pg_constraint rather than of this file's own
  -- text, because a key added by a LATER statement -- or by a later batch that edits this one --
  -- would not appear in the text above at all.
  select string_agg(con.conname, ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and con.contype = 'f'
     and exists (
       select 1 from pg_catalog.pg_attribute a
        where a.attrelid = c.oid
          and a.attname = 'social_account_id'
          and a.attnum = any (con.conkey)
     )
     -- SUPERSEDED BY 111. The deferral above ended the way its own hint said it would: batch 111
     -- wrote `content_targets_social_scope_fk`. The final-state form says the social FK on this table
     -- is that one key and no other, so a second key on social_account_id still fails here, as
     -- written by anyone other than 111. 111's own block asserts the key's shape and validation.
     and not (c.relname = 'content_targets' and con.conname = 'content_targets_social_scope_fk');
  if not exists (select 1 from pg_catalog.pg_constraint con
                  where con.conrelid = 'app.content_targets'::regclass and con.contype = 'f'
                    and con.conname = 'content_targets_social_scope_fk') then
    raise exception 'batch 111''s content_targets_social_scope_fk is gone, and the deferral 081 recorded has nothing to end it';
  end if;
  if offending is not null then
    raise exception 'batch 081 wrote a foreign key on social_account_id: %', offending
      using hint = '§6''s migration ownership registry gives "business-channel/social FK" to batch '
                   '111 (A0 Integration, depending on 110, 020 and 081). app.social_accounts exists '
                   'on disk, so this key is WITHHELD rather than impossible, and withholding it is '
                   'the whole content of "target placeholder contract". The cost -- nothing checks '
                   'that a destination exists or belongs to this tenant -- is in the work package''s '
                   'open blockers, owed to A0 Integration.';
  end if;

  -- AND THE OTHER SIDE OF THE SAME CLAIM: the two references this batch IS entitled to enforce are
  -- present. Asserting only the absence would be satisfied by a table with no foreign keys at all,
  -- which is the failure mode a deferral is most likely to slide into.
  select count(*) into count_of
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and con.contype = 'f'
     and con.conname in ('content_targets_item_scope_fk', 'content_targets_variant_scope_fk')
     and pg_catalog.array_length(con.conkey, 1) = 3;
  if count_of <> 2 then
    raise exception 'the item and the pin must each reach their parent over the WHOLE scope path, and % of the two do',
      count_of
      using hint = '§4 invariant 10: an unrelated Workspace/Business/row triple must fail at the '
                   'database. A two-column key on (workspace_id, content_item_id) or a bare key on '
                   'the id alone would let a target name a parent in another Business, which is the '
                   'weakness batch 080 had to record about content_ideas.research_suggestion_id and '
                   'which this table has no excuse for.';
  end if;

  -- §4.6's "unique active target", AS THE INDEX IT ACTUALLY IS. Four different objects could be
  -- described by the words above and only one of them enforces the rule: a NON-UNIQUE index bounds
  -- nothing; a unique index that is NOT PARTIAL forbids ever re-targeting a destination after the
  -- first target is soft-deleted; a unique index over the wrong columns is a different rule. So
  -- uniqueness, partiality and the exact column set are all asserted, and `indpred` is the column
  -- that tells a partial index from a whole one.
  select count(*) into count_of
    from pg_catalog.pg_index ix
    join pg_catalog.pg_class ic on ic.oid = ix.indexrelid
    join pg_catalog.pg_class c  on c.oid = ix.indrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and ic.relname = 'content_targets_active_destination'
     and ix.indisunique
     and ix.indpred is not null
     and ix.indnatts = 2
     and (select array_agg(a.attname::text order by k.ord)
            from unnest(ix.indkey::smallint[]) with ordinality as k(attnum, ord)
            join pg_catalog.pg_attribute a
              on a.attrelid = c.oid and a.attnum = k.attnum)
         = array['content_item_id', 'social_account_id']::text[];
  if count_of <> 1 then
    raise exception 'the active-target rule is not a partial unique index over (content_item_id, social_account_id)'
      using hint = '§4.6: "unique active target ต่อ content item/social account". Which `status` '
                   'values are ACTIVE is a vocabulary nobody has decided, so the rule is written '
                   'over `deleted_at is null` -- STRICTER than §4.6 states it, in the direction that '
                   'refuses a duplicate LIVE destination, because a duplicate live target for one '
                   'item and one destination is the shape of a double post. Recorded in the open '
                   'blockers and owed to Product.';
  end if;

  -- THE IDENTITY, THE DESTINATION AND THE PIN ARE UNWRITABLE AFTER INSERT, PER COLUMN, AGAINST THE
  -- LIVE ACL. The UPDATE grant above names four columns and this is what says so about the rest.
  -- Asserted against the catalog rather than against the grant list, because a grant made by a
  -- LATER batch would not appear in this file -- and because the control here is an ABSENCE, which
  -- is exactly the kind of thing a file cannot show about itself.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(fixed_columns) as col
       where n.nspname = 'app'
         and c.relname = 'content_targets'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, destination or pin column of app.content_targets is updatable: %', offending
      using hint = 'A pin the pinner can move afterwards is not a pin (§4.6: "target pin immutable '
                   'version ก่อน approve/schedule"), and §8.5 forbids moving a row across tenant or '
                   'scope with an update. Re-aiming a target at another item or another destination '
                   'is CREATING a different target. Re-pinning is a domain command''s act, and no '
                   'command function exists anywhere in this repository (RFC-2026-021 §10), which is '
                   'a cost recorded in the open blockers rather than paid with a grant.';
  end if;

  -- AND THE PRESENCE THAT MAKES THAT ABSENCE MEAN SOMETHING: the four columns the client MAY write
  -- are actually granted. Without this, the assertion above is satisfied by a table `authenticated`
  -- holds no UPDATE on at all, and §8.2 row 2's `Y` would be implemented by nothing.
  select string_agg(col, ', ') into offending
    from unnest(array['status', 'updated_at', 'updated_by', 'deleted_at']) as col
   where not exists (
     select 1
       from pg_catalog.pg_class c
       join pg_catalog.pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'app'
        and c.relname = 'content_targets'
        and pg_catalog.has_column_privilege('authenticated', c.oid, col, 'UPDATE')
   );
  if offending is not null then
    raise exception 'authenticated holds no UPDATE on column(s) §8.2 row 2 gives it: %', offending;
  end if;

  -- NO ROLE HOLDS DELETE. §8.5 has no broad user delete; `deleted_at` is the soft delete this table
  -- does have, and hard removal is batch 160's retention sweep through app_maintenance, which this
  -- batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'content_targets'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a content target can be deleted through a granted path: %', offending;
  end if;

  -- app_worker HOLDS NOTHING, which is batch 080's departure from 070's shape, kept here for the
  -- same reason. The writer this family needs is a SECURITY DEFINER function owned by app_command --
  -- which RFC-2026-017 §3 keeps OFF the owner seat precisely so that the policies here APPLY to it
  -- (this comment read "exempt by OWNERSHIP rather than by privilege" until integration on
  -- 2026-09-15; that was false, found so by C0 H2 and Q0 F4, and what it licensed is the S8 shape
  -- batch 083 closes). Granting a worker the verbs
  -- would build the second path to the same act -- the shape RFC-2026-018 was superseded for
  -- proposing. The consequence, stated rather than discovered: every service case in the isolation
  -- suite for this table is a PRIVILEGE refusal, none of them carries RFC-2026-017 §7, and none is
  -- part of the CI negative control's basis.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and (pg_catalog.has_any_column_privilege('app_worker', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('app_worker', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('app_worker', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'app_worker holds a privilege on app.%, and batch 081 grants it none', offending;
  end if;

  -- `anon` holds nothing. RFC-2026-021 §7/4 decided that as a NEGATIVE, and it is the one
  -- client-role property no approved decision is expected to move.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- app_authz reaches nothing. RFC-2026-020 §6.1/6 pins its grants to USAGE on schema app plus four
  -- columns of app.workspace_members; 081 creates no helper and needs no exemption.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- NO POLICY NAMES ANY ROLE BUT `authenticated`, and the service half of that is a DECISION rather
  -- than an omission. RFC-2026-022 §3 carries a service policy for a cell the §8 matrix marks `S`.
  -- Content has no `S` cell anywhere -- its Service column is `P`, and a `P` with no capability
  -- defined is not an `S` -- so db/foundation/lint/service-policy-map.json gets no entry from this
  -- batch and no policy here may name a service role. That is batch 080's conclusion for this
  -- family, restated because an assertion inherited silently is an assertion nobody rechecked.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('anon', 'app_worker', 'app_command', 'app_maintenance',
                                      'app_authz'));
  if offending is not null then
    raise exception 'batch 081 left a policy for a role that is not authenticated: %', offending;
  end if;

  -- NO INSERT, UPDATE OR DELETE POLICY EXISTS THAT THE GRANTS ABOVE DO NOT BACK, AND NONE IS
  -- MISSING EITHER. `a` is INSERT, `w` is UPDATE, `d` is DELETE; `*` is the restrictive FOR ALL
  -- narrowing and is deliberately not counted here. There must be exactly one INSERT policy and
  -- exactly one UPDATE policy -- §8.2 row 2's two write paths -- and NO DELETE policy at all,
  -- because a DELETE policy beside the absent DELETE grant would be a table that only looks closed.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and pol.polcmd = 'd';
  if count_of <> 0 then
    raise exception 'app.content_targets carries % DELETE policy/policies and §8.5 has no broad user delete',
      count_of;
  end if;

  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and pol.polpermissive
     and pol.polcmd in ('r', 'a', 'w');
  if count_of <> 3 then
    raise exception 'app.content_targets carries % permissive read/insert/update policies and §8.2 gives it three',
      count_of
      using hint = 'One SELECT (row 1, `Y` for all five client roles), one INSERT and one UPDATE '
                   '(row 2, `Y` for owner, admin and editor). A missing one is a `Y` implemented by '
                   'nothing; a fourth is a path this batch did not write.';
  end if;

  -- ONE RESTRICTIVE NARROWING. `polpermissive` is the one catalog column that tells a narrowing
  -- from a widening: a PERMISSIVE policy with the same name and the same predicate would WIDEN the
  -- table instead of narrowing it, and §12.6/2 would silently stop being implemented here.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and not pol.polpermissive
     and (c.relname::text, pol.polname::text) not in (('content_targets', 'content_targets_service_path_closed'), ('content_targets', 'content_targets_updated_by_is_caller'));  -- SUPERSEDED BY 083, 102, 111: names another file wrote, see the header
  if count_of <> 1 then
    raise exception 'batch 081 wrote % restrictive policies and it creates one table to narrow', count_of;
  end if;

  -- AND THE ASSERTION THIS BATCH OWES MOST, which is about the PREDICATE rather than its count and
  -- about BOTH CATALOG COLUMNS rather than one. `polqual` is USING and `polwithcheck` is WITH
  -- CHECK; 040's probe found that a reversal gutting one while leaving the other intact goes
  -- unnoticed by a test that looks at one of them.
  count_of := 0;
  for probe in
    select pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname = 'content_targets'
       and not pol.polpermissive
       and (c.relname::text, pol.polname::text) not in (('content_targets', 'content_targets_service_path_closed'), ('content_targets', 'content_targets_updated_by_is_caller'))  -- SUPERSEDED BY 083, 102, 111: names another file wrote, see the header
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if narrowing is null or position('content_items' in narrowing) = 0 then
        raise exception 'the content target narrowing does not resolve through its item: %',
          coalesce(narrowing, '<an empty half of the restrictive policy>')
          using hint = 'A target carries no page column, so its reach is its item''s reach. A '
                       'narrowing that asked about the target''s own columns would ask the Business '
                       'question about a page-restricted item''s destinations, and every member of '
                       'the workspace would see them.';
      end if;
      -- AND BOTH BRANCHES OF THE PARENT'S QUESTION. §4 invariant 3 makes the Page scope a nullable
      -- override on a row that always carries a Business scope, so the predicate decides per row
      -- which question to ask. A narrowing that resolved through content_items and then asked only
      -- the Business question admits every member scoped to a sibling Page -- which is the exact
      -- defect the fixture's sibling-page row exists to catch, and asserting it here as well means
      -- the defect fails at APPLY TIME rather than only in a suite somebody could delete a case
      -- from.
      if position('member_scope_admits_business' in narrowing) = 0
         or position('member_scope_admits_page' in narrowing) = 0 then
        raise exception 'the content target narrowing does not ask both the Business and the Page question: %',
          narrowing;
      end if;
    end loop;
  end loop;
  if count_of <> 1 then
    raise exception 'batch 081 found % restrictive policies to inspect and there must be one', count_of;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  -- app_command must not own the table: RFC-2026-017 §3 keeps it off the owner seat so that the
  -- policies here are ones that can NAME it and so apply to it. (Until integration on 2026-09-15 this
  -- read "would be exempt from the policies above BY OWNERSHIP"; FORCE makes an owner subject to its
  -- own policies, so the sentence was false -- and the narrowing above binds nothing app_command does
  -- for a different reason, its TO clause, which batch 083 closes.)
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname = 'content_targets'
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 081 creates is owned by a role that must not own one: %', offending;
  end if;
end $$;
