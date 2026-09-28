do $$
declare
  offending text;
  count_of  integer;
  narrowing text;
  probe     record;
  every_role constant text[] :=
    array['authenticated', 'anon', 'app_worker', 'app_command', 'app_maintenance', 'app_authz'];
  -- §9.2's exhaustive list for a table of captured material, resolved to the columns §10's own final
  -- behavior names plus §3.2's and §3.3's required ones. 060 wrote the mechanism and 131 reused it:
  -- an ALLOWLIST, because a denylist of column names somebody thought of is defeated by the one they
  -- did not.
  snapshot_columns constant text[] :=
    array['id', 'workspace_id', 'business_profile_id', 'research_source_id', 'object_ref',
          'content_hash', 'captured_at', 'retention_until', 'purged_at', 'created_at', 'updated_at'];
  research_tables constant text[] :=
    array['research_runs', 'research_sources', 'research_snapshots', 'research_evidence',
          'research_suggestions'];
begin
  -- SUPERSEDED BY 123 as well: batch 123 added `<table>_updated_by_on_update_is_caller`, restrictive, to research_runs, research_suggestions.
  -- SUPERSEDED BY 071. Batch 070 wrote one restrictive narrowing per table. The later files
  -- added restrictive policies to the same tables: research_suggestions_service_path_closed (071).
  -- Each of those is asserted by its own batch's block, which this pass also re-runs. The final-state
  -- form below pins every table's restrictive set by name, then excludes the later names from the 2
  -- restrictive predicates of 070's original assertions, which are otherwise kept word for word.
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.research_evidence'::regclass and not pol.polpermissive)
     is distinct from array['research_evidence_scope_narrows_member'] then
    raise exception 'app.research_evidence restrictive policies are not exactly batch 070''s narrowing and the ones no later file added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.research_runs'::regclass and not pol.polpermissive)
     is distinct from array['research_runs_scope_narrows_member', 'research_runs_updated_by_on_update_is_caller'] then  -- SUPERSEDED BY 123: its UPDATE closure
    raise exception 'app.research_runs restrictive policies are not exactly batch 070''s narrowing and the ones 123 added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.research_sources'::regclass and not pol.polpermissive)
     is distinct from array['research_sources_scope_narrows_member'] then
    raise exception 'app.research_sources restrictive policies are not exactly batch 070''s narrowing and the ones no later file added';
  end if;
  if (select array_agg(pol.polname::text order by pol.polname) from pg_catalog.pg_policy pol
       where pol.polrelid = 'app.research_suggestions'::regclass and not pol.polpermissive)
     is distinct from array['research_suggestions_scope_narrows_member', 'research_suggestions_service_path_closed', 'research_suggestions_updated_by_on_update_is_caller'] then  -- SUPERSEDED BY 123: its UPDATE closure
    raise exception 'app.research_suggestions restrictive policies are not exactly batch 070''s narrowing and the ones 071, 123 added';
  end if;
  -- ENABLE and FORCE on all five. The two are DIFFERENT CATALOG COLUMNS and the data package's own
  -- lint rule reads only the first (RFC-2026-016 §4). On app.research_snapshots, which carries no
  -- policy, FORCE is the whole of what refuses the role holding the grants.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and not (c.relrowsecurity and c.relforcerowsecurity);
  if offending is not null then
    raise exception 'table(s) % do not carry both ENABLE and FORCE ROW LEVEL SECURITY', offending
      using hint = 'app.research_snapshots carries no policy at all, so FORCE is the whole control '
                   'there: without it the table owner reads every captured locator and the isolation '
                   'suite cannot tell that from a working boundary.';
  end if;

  -- THE COPYRIGHT-3 COLUMN ALLOWLIST, against the live catalog. §9.2 forbids storing a full research
  -- snapshot anywhere a client, an API, an event, a job, a log or a FIXTURE can reach, and §9.1
  -- licenses only an "approved excerpt" that nothing in this repository defines. The control is that
  -- the column does not exist — 060's mechanism for a plaintext credential, 131's for a payment
  -- instrument — and this is what makes it a control rather than a comment: a later batch that adds
  -- `body text`, `content bytea` or `excerpt text` fails the migration rather than the code review.
  select string_agg(a.attname, ', ' order by a.attname) into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'research_snapshots'
     and a.attnum > 0 and not a.attisdropped
     and a.attname::text <> all (snapshot_columns);
  if offending is not null then
    raise exception 'app.research_snapshots carries column(s) a COPYRIGHT-3 row may not hold: %', offending
      using hint = '§9.1 gives this class the client projection "approved excerpt only" and §9.2 '
                   'forbids storing or exporting a full research snapshot the client may not '
                   'reproduce. Nothing here defines what APPROVES an excerpt or how long one may be, '
                   'so the row holds a LOCATOR (§10: "purge object + locator") and a HASH (§10: '
                   '"preserve permitted hash/citation metadata") and nothing else. An allowlist '
                   'rather than a denylist, because a denylist of names somebody thought of is '
                   'defeated by the one they did not.';
  end if;

  -- AND NO TABLE IN THIS BATCH CARRIES AN EXCERPT BY ANOTHER NAME. The allowlist above protects one
  -- table; §9.1's class is "research snapshot/EXCERPT" and an excerpt would most plausibly arrive on
  -- the evidence row, which is the one that cites a passage.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join unnest(array['excerpt', 'quote', 'quoted_text', 'snippet', 'passage', 'body',
                            'body_text', 'content', 'content_text', 'raw', 'raw_html', 'html',
                            'markdown', 'full_text', 'page_text', 'snapshot_body']) as forbidden
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and a.attnum > 0 and not a.attisdropped
     -- `attname` is `name` and the array is `text`; the cast is written rather than left to an
     -- implicit one, which is 050's rule about a parameter whose type is inferred from whichever
     -- context the planner reaches first.
     and a.attname::text = forbidden;
  if offending is not null then
    raise exception 'a batch 070 table carries captured or quoted source text: %', offending
      using hint = '§9.2''s absolute prohibitions end with "full research snapshot ที่ client ไม่มี'
                   'สิทธิ์ทำซ้ำ", and §9.1 licenses an APPROVED excerpt only. No document in this '
                   'repository says what approves one, who may, or how long it may be, so the column '
                   'is absent rather than unbounded. If this is the batch that brings the approval '
                   'decision, it edits this assertion in a diff a reviewer reads.';
  end if;

  -- DATA-DEC-07 IS OPEN, AND THESE TWO ASSERTIONS ARE HOW ITS ABSENCE STAYS VISIBLE.
  --
  -- FIRST: `retention_until` has NO DEFAULT. `atthasdef` is a catalog column and is the only place
  -- the difference between "every writer states a limit" and "every row inherits thirty days" is
  -- recorded. §15: an open decision is not an agent's to choose.
  select string_agg(format('%s.%s', c.relname, a.attname), ', ') into offending
    from pg_catalog.pg_attribute a
    join pg_catalog.pg_class c on c.oid = a.attrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app' and c.relname = 'research_snapshots'
     and a.attname = 'retention_until'
     and (a.atthasdef or not a.attnotnull);
  if offending is not null then
    raise exception 'app.research_snapshots.retention_until is not the column DATA-DEC-07 leaves open: %', offending
      using hint = 'It must be NOT NULL with NO DEFAULT. §10 gives "30 วัน default หรือสั้นกว่าตาม '
                   'source policy" and §15 gives DATA-DEC-07 to Research+Legal; a default would make '
                   'every row silently assert the same thirty days, which is the decision arriving as '
                   'a column, and a nullable column would let a capture be stored with no stated '
                   'limit at all.';
  end if;

  -- SECOND: no CHECK constraint on any table this batch creates mentions an interval or a day count.
  -- A negative is the strongest thing a lint can hold (RFC-2026-019 §5), and this is the one that
  -- keeps thirty days out of the schema until somebody with the authority puts it there.
  select string_agg(format('%s on %s', con.conname, c.relname), ', ') into offending
    from pg_catalog.pg_constraint con
    join pg_catalog.pg_class c on c.oid = con.conrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and con.contype = 'c'
     and pg_catalog.pg_get_constraintdef(con.oid) ~* '\minterval\M';
  if offending is not null then
    raise exception 'a batch 070 constraint encodes a retention interval: %', offending
      using hint = 'DATA-DEC-07 ("Research snapshot retention, 30 วัน max default, owner '
                   'Research+Legal") is OPEN and §15 forbids an agent closing it. The only thing this '
                   'batch asserts about retention is that a capture cannot be retained until an '
                   'instant before it was taken, which uses no number.';
  end if;

  -- THE EVIDENCE ROW IS IMMUTABLE, as the privilege system holds it. §5's mutability column names
  -- exactly one object of this family — "evidence immutable" — and §8.2's "Research run/source/
  -- evidence INSERT" is `N N N N N S`, so appending is the service's and mutation is nobody's.
  -- Asserted against the live ACLs rather than against the text of the grants above, because a grant
  -- made by a LATER batch would not appear in this file at all.
  --
  -- `has_any_column_privilege` for UPDATE so a column-scoped grant is caught as well as a table-wide
  -- one — the measured trap that a full set of column grants leaves `has_table_privilege` false;
  -- DELETE has no column-level form and is asked of the table.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname in ('research_evidence', 'research_sources')
         and r.rolname::text = any (every_role)
         and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
              or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'))
    ) as held;
  if offending is not null then
    raise exception 'an evidence or citation row can be updated or deleted: %', offending
      using hint = '§5 names evidence immutable in terms. app.research_sources is APPEND-ONLY on '
                   'batch 070''s own reading rather than on a quotation: §10 preserves "permitted '
                   'hash/citation metadata" after the captured object is purged, so the citation is '
                   'the half that outlives what it describes, and a citation editable after its '
                   'snapshot is gone is a claim about a document nobody can check.';
  end if;

  -- And the same claim as the POLICY catalog holds it, because either half alone can be satisfied
  -- while the other is wrong: a policy with no grant is inert, and a grant with no policy is denied
  -- by row level security rather than by privilege, which is a weaker refusal than immutability asks
  -- for. `w` is UPDATE and `d` is DELETE; INSERT is deliberately absent, because RFC-2026-022 §3
  -- classifies both of these tables' INSERT statements CARRIED and expects a policy once §7 holds.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname in ('research_evidence', 'research_sources')
     and pol.polcmd in ('w', 'd');
  if offending is not null then
    raise exception 'an evidence or citation table carries an UPDATE or DELETE policy: %', offending;
  end if;

  -- THE SNAPSHOT IS APPEND-ONLY EXCEPT FOR THE PURGE'S TWO COLUMNS, per column, against the live
  -- ACL. The grant above names `object_ref`, `purged_at` and `updated_at`, and this is what says so
  -- about the other eight — including `retention_until`, which is the one that makes DATA-DEC-07's
  -- absence safe rather than merely visible: a window that can be extended by an update is not a
  -- window.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, a.attname as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        join pg_catalog.pg_attribute a on a.attrelid = c.oid
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname = 'research_snapshots'
         and a.attnum > 0 and not a.attisdropped
         and a.attname not in ('object_ref', 'purged_at', 'updated_at')
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, a.attname, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'a column of a research snapshot other than the purge''s own is updatable: %', offending
      using hint = '§10''s final behavior for RESEARCH-SNAPSHOT is "purge object + locator; preserve '
                   'permitted hash/citation metadata", so the locator and the purge stamp move and '
                   'everything that says WHAT WAS CAPTURED does not. retention_until is in this list '
                   'for a second reason: DATA-DEC-07 is open, and a retention limit a granted path '
                   'can push forward is not a limit.';
  end if;

  -- §8.5, PER COLUMN, ON THE TWO TABLES A CLIENT MAY WRITE: no role may re-identify a row, move it
  -- between tenants or across scope, or rewrite what a run was asked to do or what it proposed. The
  -- two client UPDATE grants name six columns between them and this is what says so about the rest.
  -- app_worker is IN the checked list for 050's reason: every grant this batch makes to it is
  -- column-scoped.
  select string_agg(format('%s.%s to %s', target, column_name, grantee), ', ') into offending
    from (
      select c.relname as target, col as column_name, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id',
                                'page_context_profile_id', 'brief', 'created_by']) as col
       where n.nspname = 'app'
         and c.relname = 'research_runs'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
      union all
      select c.relname, col, r.rolname
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
        cross join unnest(array['id', 'workspace_id', 'business_profile_id', 'research_run_id',
                                'title']) as col
       where n.nspname = 'app'
         and c.relname = 'research_suggestions'
         and r.rolname::text = any (every_role)
         and pg_catalog.has_column_privilege(r.rolname, c.oid, col, 'UPDATE')
    ) as held;
  if offending is not null then
    raise exception 'an identity, scope or content column of a batch 070 table is updatable: %', offending
      using hint = '§8.5 forbids moving a row across tenant OR scope with an update, and '
                   'page_context_profile_id is in this list because it carries the second half of the '
                   'scope (040''s sentence). `brief` and `title` are in it because §8.2''s client '
                   'verbs are cancel, save, dismiss and use — rewriting what was asked or what was '
                   'proposed is none of them.';
  end if;

  -- NO ROLE HOLDS DELETE ON ANY OF THE FIVE. §8.5 has no broad user delete; every purge in this
  -- family is a retention job — RESEARCH-RUN and RESEARCH-SNAPSHOT both name one — and batch 160
  -- owns it through app_maintenance, which this batch grants nothing.
  select string_agg(format('%s to %s', target, grantee), ', ') into offending
    from (
      select c.relname as target, r.rolname as grantee
        from pg_catalog.pg_class c
        join pg_catalog.pg_namespace n on n.oid = c.relnamespace
        cross join pg_catalog.pg_roles r
       where n.nspname = 'app'
         and c.relname::text = any (research_tables)
         and r.rolname::text = any (every_role)
         and pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE')
    ) as held;
  if offending is not null then
    raise exception 'a research row can be deleted through a granted path: %', offending
      using hint = '§8.5 requires a soft delete through a typed lifecycle field where a delete is '
                   'wanted at all, and hard deletion here is a retention sweep with its own classes '
                   'and its own batch. A snapshot in particular is PURGED rather than deleted: §10 '
                   'says "purge object + locator; preserve permitted hash/citation metadata", which '
                   'is an UPDATE of two columns and not the removal of a row.';
  end if;

  -- NO CLIENT ROLE HOLDS ANYTHING ON app.research_snapshots. This is the COPYRIGHT-3 refusal as the
  -- privilege system holds it, and it is asserted for `authenticated` as well as `anon` — unlike
  -- every other batch, where only the anonymous negative is asserted at apply time — because §9.2's
  -- prohibition is about a CLIENT SURFACE rather than about anonymity, and RFC-2026-021 §7/4 decides
  -- only the second. The static suite asserts the same thing about the grant TEXT, where the batch
  -- that lands an approval decision edits a line a reviewer reads.
  select string_agg(r.rolname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    cross join pg_catalog.pg_roles r
   where n.nspname = 'app' and c.relname = 'research_snapshots'
     and r.rolname in ('authenticated', 'anon')
     and (pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege(r.rolname, c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege(r.rolname, c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'a client role holds a privilege on the COPYRIGHT-3 snapshot table: %', offending
      using hint = '§9.1 gives COPYRIGHT-3 the client projection "approved excerpt only" and nothing '
                   'in this repository defines an approval; §9.2 forbids a full research snapshot in '
                   'a client surface at all. The refusal is an absent GRANT rather than a policy '
                   'predicate, because a policy can be widened by an edit while a grant that was '
                   'never made has to be written.';
  end if;

  -- `anon` holds nothing on anything this batch creates. RFC-2026-021 §7/4 decided that as a
  -- NEGATIVE and it is the one client-role property no approved decision is expected to move: the
  -- RFC says reversing it needs an RFC that states what the anonymous surface is for.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and (pg_catalog.has_any_column_privilege('anon', c.oid, 'SELECT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'INSERT')
          or pg_catalog.has_any_column_privilege('anon', c.oid, 'UPDATE')
          or pg_catalog.has_table_privilege('anon', c.oid, 'DELETE'));
  if offending is not null then
    raise exception 'anon holds a privilege on app.%, and RFC-2026-021 §7/4 grants it nothing anywhere our migrations reach', offending;
  end if;

  -- No policy this batch's tables carry may name an anonymous role. §8.5 gives anonymous no tenant
  -- policy. app_worker is deliberately NOT in this list: RFC-2026-022 §3's test classifies three of
  -- this batch's INSERT statements CARRIED and the RFC expects a policy once its decision is in
  -- effect.
  select string_agg(format('%s on %s', pol.polname, c.relname), ', ') into offending
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and exists (select 1 from pg_catalog.pg_roles r
                  where r.oid = any (pol.polroles) and r.rolname = 'anon');
  if offending is not null then
    raise exception 'batch 070 left a policy for the anonymous role: %', offending;
  end if;

  -- FOUR RESTRICTIVE POLICIES, ONE PER TABLE THAT HAS ONE, AND THE FIFTH TABLE HAS NONE OF ANY KIND.
  -- `polpermissive` is the one catalog column that tells a narrowing from a widening: a permissive
  -- policy with the same name and the same predicate would WIDEN each table instead of narrowing it,
  -- and §12.6/2 would silently stop being implemented here.
  select count(*) into count_of
    from pg_catalog.pg_policy pol
    join pg_catalog.pg_class c on c.oid = pol.polrelid
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and not pol.polpermissive
     and (c.relname::text, pol.polname::text) not in (('research_suggestions', 'research_suggestions_service_path_closed'), ('research_runs', 'research_runs_updated_by_on_update_is_caller'), ('research_suggestions', 'research_suggestions_updated_by_on_update_is_caller'));  -- SUPERSEDED BY 071, 123: names another file wrote, see the header
  if count_of <> 4 then
    raise exception 'batch 070 wrote % restrictive policies and it creates four tables to narrow', count_of
      using hint = 'One per table a client may read. app.research_snapshots has none because it has '
                   'no policy at all — §9.1 classes it COPYRIGHT-3 and no client role is granted '
                   'anything on it. A child table with no narrowing is a table where every active '
                   'member reaches every row their membership admits, which would leave a '
                   'page-restricted run''s sources readable to a member the run itself is hidden '
                   'from.';
  end if;

  -- THE ASSERTION THIS BATCH OWES MOST, and it is about the four predicates rather than their count.
  --
  -- BOTH CATALOG COLUMNS, AND THAT IS 040's PROBE RATHER THAN CAUTION. `polqual` is USING and
  -- `polwithcheck` is WITH CHECK; they are two predicates, and a reversal that gutted one while
  -- leaving the other intact went UNNOTICED by the first version of 040's block and by the static
  -- test beside it. A restrictive policy whose USING lost the Page branch filters nothing on read
  -- for a page-scoped member while still refusing their writes — the leak, without the symptom.
  --
  -- The run's narrowing must ask BOTH the Business question and the Page question, because §4
  -- invariant 3 makes the Page a nullable override on a row that always carries a Business. Each
  -- child's must resolve through its own parent, because a child that asked about its own columns
  -- would ask the Business question about the history of a page-restricted run.
  count_of := 0;
  for probe in
    select c.relname as target,
           pg_catalog.pg_get_expr(pol.polqual, pol.polrelid)      as using_half,
           pg_catalog.pg_get_expr(pol.polwithcheck, pol.polrelid) as check_half
      from pg_catalog.pg_policy pol
      join pg_catalog.pg_class c on c.oid = pol.polrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'app'
       and c.relname::text = any (research_tables)
       and not pol.polpermissive
       and (c.relname::text, pol.polname::text) not in (('research_suggestions', 'research_suggestions_service_path_closed'), ('research_runs', 'research_runs_updated_by_on_update_is_caller'), ('research_suggestions', 'research_suggestions_updated_by_on_update_is_caller'))  -- SUPERSEDED BY 071, 123: names another file wrote, see the header
  loop
    count_of := count_of + 1;
    foreach narrowing in array array[probe.using_half, probe.check_half] loop
      if probe.target = 'research_runs' then
        if narrowing is null
           or position('member_scope_admits_business' in narrowing) = 0
           or position('member_scope_admits_page' in narrowing) = 0 then
          raise exception 'the research run narrowing does not ask both the Business and the Page question: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = '§4 invariant 3 makes the Page scope a nullable override on a row that '
                         'always carries a Business scope, so the narrowing decides per row which '
                         'question to ask. Dropping the Page branch admits every member scoped to a '
                         'sibling Page — and dropping it from ONE of USING and WITH CHECK hides that '
                         'on the half a test is not looking at.';
        end if;
      elsif probe.target = 'research_evidence' then
        if narrowing is null or position('research_sources' in narrowing) = 0 then
          raise exception 'the evidence narrowing does not resolve through its source: %',
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'The evidence row carries no page column, so its reach is its source''s '
                         'reach, which is its run''s reach. A narrowing that asked about the '
                         'evidence''s own columns would ask the Business question about a '
                         'page-restricted run.';
        end if;
      else
        if narrowing is null or position('research_runs' in narrowing) = 0 then
          raise exception 'the % narrowing does not resolve through its run: %', probe.target,
            coalesce(narrowing, '<an empty half of the restrictive policy>')
            using hint = 'A source and a suggestion carry no page column, so each one''s reach is its '
                         'run''s reach — asserted rather than copied, because a nullable copy of the '
                         'run''s page could not be held equal to it by any foreign key (MATCH SIMPLE '
                         'skips a null).';
        end if;
      end if;
    end loop;
  end loop;
  if count_of <> 4 then
    raise exception 'batch 070 found % restrictive policies to inspect and there must be four', count_of;
  end if;

  -- app_authz reaches nothing this batch created. RFC-2026-020 §6.1/6 pins its grants to USAGE on
  -- schema app plus four columns of app.workspace_members; 070 creates no helper and needs no
  -- exemption, so this is the whole of what it owes that decision, asserted rather than promised.
  -- The POLICY COUNT is deliberately not re-asserted: 021 owns that assertion on the far side of the
  -- batch that could have moved it, and repeating it would be a second home for a number.
  select string_agg(c.relname, ', ') into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and pg_catalog.has_any_column_privilege('app_authz', c.oid, 'SELECT');
  if offending is not null then
    raise exception 'app_authz holds a privilege on app.%, and RFC-2026-020 §6.1/6 pins its grants to four columns of app.workspace_members', offending;
  end if;

  -- RFC-2026-017 §3 and RFC-2026-020 §5/2, asked here for the reason every batch since 020 asks
  -- them: scripts/db/run.mjs holds every tenant table to the ownership rule against the COMMITTED
  -- SNAPSHOT, and this batch is deliberately not applied to the instance that snapshot describes.
  select string_agg(format('%s owned by %s', c.relname, pg_catalog.pg_get_userbyid(c.relowner)), ', ')
    into offending
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'app'
     and c.relname::text = any (research_tables)
     and pg_catalog.pg_get_userbyid(c.relowner) in ('app_command', 'app_authz');
  if offending is not null then
    raise exception 'a table batch 070 creates is owned by a role that must not own one: %', offending
      using hint = 'RFC-2026-017 §3 keeps app_command off the owner seat because a SECURITY DEFINER '
                   'function owned by the table owner is exempt from the policies on a forced table, '
                   'and RFC-2026-020 §5/2 says app_authz owns no table at all.';
  end if;
end $$;
