do $$
declare
  offending        text;
  count_of         integer;
  probe_workspace  constant uuid := gen_random_uuid();
  probe_id         constant uuid := gen_random_uuid();
  probe_written    boolean := false;
  probe_sqlstate   text;
  update_refused   boolean := false;
  delete_refused   boolean := false;
  truncate_refused boolean := false;
begin
  -- ENABLE and FORCE on both. The two are different catalog columns and the data package's own lint
  -- rule reads only the first (RFC-2026-016).
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'On a table with no policy, FORCE is what refuses every non-bypassing role. It '
                   'refuses nothing to a role holding BYPASSRLS, which is why these tables also '
                   'carry a trigger.';
  end if;

  -- §8.4's "Audit/security UPDATE/DELETE | N N N N N N", as the privilege system holds it, plus
  -- TRUNCATE — the verb that empties a table with no DELETE grant and that no matrix has a row for.
  -- Asserted against the live ACLs rather than against the text of the grants above, because a grant
  -- made by a LATER batch would not appear in this file at all.
  --
  -- `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a table-wide
  -- one; DELETE and TRUNCATE have no column-level form and are asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('audit_logs', 'security_events')
         and r.rolname in ('authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz')
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'TRUNCATE'))
    ) as held;
  if offending is not null then
    raise exception 'an append-only audit table grants UPDATE, DELETE or TRUNCATE: %', offending
      using hint = '§8.4 marks "Audit/security UPDATE/DELETE" N for every role INCLUDING the '
                   'service, and TRUNCATE is refused here because no access matrix has a row for a '
                   'verb that empties a table. The absence of the grant is what makes the refusal a '
                   'privilege-layer denial rather than a policy a later edit can widen.';
  end if;

  -- And the same claim as the policy catalog holds it. Both halves, because either alone can be
  -- satisfied while the other is wrong: a policy with no grant is inert, and a grant with no policy
  -- is denied by RLS instead of by privilege, which is a weaker refusal than append-only asks for.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an append-only audit table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- Both triggers on both tables, by name, by timing and by the function they call. The behavioural
  -- proof below is run once, on one table, against one mechanism; this is what says the mechanism is
  -- attached to the other table too. tgtype bit 0 is ROW, bit 1 is BEFORE, and the action bits are
  -- UPDATE (4), DELETE (3) and TRUNCATE (5) — read here through the pg_trigger booleans rather than
  -- through the bitmask, because a bitmask in an apply-time block is a clever query, and a clever
  -- query that fails to parse fails the migration rather than the rule it was checking.
  select count(*) into count_of
    from pg_catalog.pg_trigger t
    join pg_catalog.pg_class c on c.oid = t.tgrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    join pg_catalog.pg_proc p on p.oid = t.tgfoid
    join pg_catalog.pg_namespace fn on fn.oid = p.pronamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and not t.tgisinternal
     and fn.nspname = 'private' and p.proname = 'refuse_mutation';
  if count_of <> 4 then
    raise exception 'batch 140 finds % append-only trigger(s) calling private.refuse_mutation() and writes four', count_of
      using hint = 'Two tables, and two triggers each: a ROW trigger for UPDATE and DELETE, and a '
                   'STATEMENT trigger for TRUNCATE, which has no rows to fire a row trigger on and '
                   'is the verb that empties a table without a DELETE grant.';
  end if;

  -- THE PROOF THIS BATCH OWES MOST, AND IT IS DISCHARGED BY EXECUTION RATHER THAN BY CITATION.
  --
  -- RFC-2026-020 §6.2 established the rule that a claim a decision rests on must be EXECUTED. The
  -- claim here is the batch's central one: an append-only table refuses UPDATE, DELETE and TRUNCATE
  -- **to the role running this migration**, which is `postgres` — the role that OWNS every table in
  -- `app` and holds BYPASSRLS, so it is exempt from every policy and from FORCE alike. If the
  -- trigger did not fire for it, this batch's entire immutability claim would be a comment.
  --
  -- The probe is deliberately dull. Its row is self-contained (no foreign keys to satisfy — see the
  -- header), the whole of it happens inside a subtransaction that ALWAYS aborts, and the abort is
  -- forced by raising a SQLSTATE this file owns so that a real failure inside the probe cannot be
  -- swallowed as the intended one.
  begin
    -- The write is itself wrapped, so that a database on which the migration role CANNOT write the
    -- table produces a message saying that rather than three misleading ones saying the trigger did
    -- not fire. It is a real possibility and not a defensive flourish: this whole probe depends on
    -- the migration role reaching the row, which on both databases this repository targets it does
    -- because it bypasses row level security -- and that is exactly the property being probed
    -- against.
    begin
      insert into app.audit_logs
        (id, workspace_id, occurred_at, actor_kind, actor_id, action_category, action_name,
         outcome, reason_key, request_id, correlation_id,
         secret_redacted, content_redacted, pii_redacted, retention_policy_ref)
      values
        (probe_id, probe_workspace, now(), 'system_actor', 'migration.140.probe',
         'support', 'audit.probe.immutability', 'succeeded', 'audit.probe.append_only_holds',
         'migration-140-probe', 'migration-140-probe', true, true, true, 'retention.audit');
      probe_written := true;
    exception when others then
      probe_sqlstate := sqlstate;
    end;

    if probe_written then
      begin
        update app.audit_logs set outcome = 'denied' where id = probe_id;
      exception when sqlstate 'ZZ140' then
        update_refused := true;
      end;

      begin
        delete from app.audit_logs where id = probe_id;
      exception when sqlstate 'ZZ140' then
        delete_refused := true;
      end;

      begin
        truncate app.audit_logs;
      exception when sqlstate 'ZZ140' then
        truncate_refused := true;
      end;
    end if;

    raise exception 'batch 140 append-only probe complete' using errcode = 'ZZ141';
  exception when sqlstate 'ZZ141' then
    -- The subtransaction is rolled back with everything the probe did, including its INSERT.
    -- PL/pgSQL variables are not rolled back with it, which is what carries the findings out.
    null;
  end;

  if not probe_written then
    raise exception 'the batch 140 append-only probe could not write its own row (SQLSTATE %)', probe_sqlstate
      using hint = 'A proof that could not execute has not been discharged (RFC-2026-020 §6.2), so '
                   'this is a failure and never a skip. The probe writes as the MIGRATION role, '
                   'which on both databases this repository targets owns the table and bypasses row '
                   'level security. If it was refused, either that is no longer true -- in which '
                   'case the paragraph in this file about FORCE buying nothing is out of date and '
                   'must be rewritten -- or the column constraints above refuse a record this file '
                   'itself composed.';
  end if;

  if not update_refused then
    raise exception 'app.audit_logs accepted an UPDATE from the migration role'
      using hint = 'The migration runs as the table OWNER, which also holds BYPASSRLS, so neither '
                   'FORCE ROW LEVEL SECURITY nor an absent grant refuses it. The trigger is the only '
                   'thing that can, and it did not. This batch''s immutability claim is false.';
  end if;
  if not delete_refused then
    raise exception 'app.audit_logs accepted a DELETE from the migration role'
      using hint = 'See the UPDATE hint. An audit record that the table owner can delete in one '
                   'statement is an audit record with no immutability at all.';
  end if;
  if not truncate_refused then
    raise exception 'app.audit_logs accepted a TRUNCATE from the migration role'
      using hint = 'TRUNCATE fires no row trigger and is refused by no DELETE grant. It is the verb '
                   'that empties an append-only table while every row-level control stays green, and '
                   'the STATEMENT trigger is the only thing that refuses it.';
  end if;
  if exists (select 1 from app.audit_logs where id = probe_id) then
    raise exception 'the batch 140 append-only probe left its row behind'
      using hint = 'The probe runs inside a subtransaction that always aborts. A surviving row means '
                   'the abort did not happen, and a migration that seeds its own test data into an '
                   'audit log is worse than one that proves nothing.';
  end if;

  -- No policy this batch writes may name a service or anonymous role. It writes none at all today,
  -- so this is vacuous today and is the rule that bites the day one appears: §8.4 marks the service
  -- `S` on the INSERT and `N` on mutation, and a `TO app_worker` policy written without the workspace
  -- GUC RFC-2026-016 §2 requires would be an UNSCOPED service permission, which the amendment's own
  -- "introduces no new permission" forbids.
  -- SUPERSEDED BY 172. RFC-2026-026 §3.3 (approved 2026-10-05; its command half lands with migration 172, batch
  -- 141, Q-026-6) writes ONE such policy: audit_logs_insert_command, a permissive FOR INSERT on app.audit_logs for
  -- app_command alone, bound to the acting user rather than to a workspace GUC (RFC-2026-023 §3.1). Exactly that
  -- one is excepted, by (table, name, command, role); any other policy for a service or anonymous role on either
  -- table -- the worker's included, which waits on DATA-DEC-03 -- still fails here.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles)
                    and r.rolname in ('app_worker', 'app_command', 'app_maintenance', 'anon'))
     and not (c.relname = 'audit_logs' and pol.polname = 'audit_logs_insert_command' and pol.polcmd = 'a'
              and pol.polpermissive
              and pol.polroles = array[(select r.oid from pg_catalog.pg_roles r where r.rolname = 'app_command')]::oid[]);
  if offending is not null then
    raise exception 'batch 140 wrote a policy for a service or anonymous role: %', offending;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 140 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason batches 020, 021, 030 and 040
  -- ask them: scripts/db/run.mjs holds every tenant table to the ownership rule against the
  -- COMMITTED SNAPSHOT, and this batch is deliberately not applied to the instance it describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('audit_logs', 'security_events')
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 140 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
