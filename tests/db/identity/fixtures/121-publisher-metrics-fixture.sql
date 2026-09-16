-- Tenant fixture for the batch 121 isolation cases.
--
-- Owner: A6 Publisher. It loads after 120, whose three app.published_posts rows it hangs metrics
-- off and whose ids batch 121 fixes for that purpose (see the note in 120's own fixture and in
-- db/foundation/seeds/fixture-catalog.json). The runner applies the whole list in order.
--
-- Every id here is read from db/foundation/seeds/fixture-catalog.json, where it is
-- uuid5(namespace, 'thinkbizthai.fixture.' || symbol). Nothing is invented.
--
-- THIS FIXTURE WRITES INTO ONE TABLE AND ONE ONLY -- app.performance_snapshots, batch 121's own.
-- It adds no row to any other batch's table, which is the lesson batch 120 recorded the hard way:
-- every free (item, destination) pair in workspace A is already the subject of one of batch 081's
-- insert cases, and a row added on one of them turns that case's 23505 into a pass that proves
-- nothing. Nothing here is free to take, so nothing is taken.
--
-- WHY THERE IS NO SNAPSHOT ON THE SIBLING PAGE, and what that costs §8.6 case 4. The page-pinned
-- rows in this family are publish_intent_a1_page (which has NO target, deliberately -- it is what
-- makes `service-cannot-fan-out-a-publish-target` a well-formed insert that LANDS with row level
-- security off) and publish_target_a1_sibling_page (which is `pending` with NO job, NO post and NO
-- asset pin, deliberately, for the same reason on three other cases). Neither has a post, and a
-- metric snapshot without a post is not a row this schema permits.
--
-- Giving the sibling-page target a post would take all three of those cases from batch 120:
-- published_posts_one_per_target is unique, so the insert each one attempts would stop landing and
-- would start colliding. Adding a second target under the sibling-page intent would need an aim at
-- social_account_a2 and an instagram variant on that item -- two rows in batches 081's and 080's
-- tables, which is the shape of the mistake named above.
--
-- SO §8.6 CASE 4 IS NOT EXERCISED ON THIS TABLE AT ALL, AND THIS PARAGRAPH SAID THE OPPOSITE UNTIL
-- TWO REVIEWERS CAUGHT IT. It claimed "the page-pinned member is admitted to NOTHING in this family"
-- and cited a case called `pinned-editor-a-sees-zero-metric-snapshot-rows` as the measurement. NO
-- SUCH CASE EXISTS. It never did: the claim came from batch 121's plan, the live run contradicted
-- the plan before a line of the case list was written, and the case that was actually committed --
-- `pinned-editor-a-sees-the-metric-snapshots-of-the-fb-send`, `expect: 'rows'` -- says so in its own
-- `why`. The fixture was not corrected with it. C0 graded the contradiction stop-the-line and A1
-- found the dangling id independently.
--
-- WHAT IS ACTUALLY TRUE, MEASURED: the page-pinned editor reads TWO snapshots -- the business-level
-- series -- because the narrowing's CASE expression tests app.member_scope_admits_business for an
-- item whose page_context_profile_id is null. A single-Page scope is a scope WITHIN a business, not
-- one that excludes the business's own rows.
--
-- The case §8.6 case 4 actually asks for -- a member allowed Page A refused a row on Page B --
-- cannot be written for this table until a page-pinned send produces a post, and it is in the work
-- package's open blockers against the batch that gives this family one. The metric table is
-- therefore the only publishing table with no `pinned-editor-...-sibling-item` deny case, which C0
-- noticed by comparing it against the other four rather than by reading this comment.

-- ---------------------------------------------------------------------------------------------
-- The snapshots. FOUR on THREE posts: the A-side post carries a SERIES of two, the other two one
-- each.
-- ---------------------------------------------------------------------------------------------
-- The series is the point of the pair on published_post_a1_fb. §4.8 asks for "unique
-- (published_post_id, metric_time)" and "no destructive overwrite", and both sentences are about a
-- post having MORE THAN ONE reading over time: a single row per post would satisfy a unique trivially
-- and would say nothing about either. Two readings an hour apart, with the numbers going up, is the
-- smallest fixture that makes `owner-a-sees-both-metric-snapshots-of-the-fb-send` a count rather than
-- an existence check.
--
-- The instants are on the hour because question F's answer says the service truncates to the
-- collection cadence before the insert and NOTHING HERE ENFORCES THAT. A fixture written to the hour
-- is what the rule looks like when it is obeyed; the absence of a constraint that would require it is
-- the blocker, not a defect in these rows.
--
-- Every value is a NUMBER and every key is one of the ten the schema knows, because
-- performance_snapshots_metrics_keys_are_known and _values_are_numbers refuse anything else -- which
-- is the control A1's finding against batch 120's publish_targets.failure_class asked for, one batch
-- earlier than it would otherwise have arrived.
insert into app.performance_snapshots
  (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
values
  -- published_post_a1_fb, reading one: twenty minutes after the send, the first collection.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'afd4dde9-c824-51b2-ab0b-d82f36131f5d', timestamptz '2026-09-01 10:00:00+00',
   '{"impressions": 1240, "reach": 980, "engagements": 61, "likes": 44, "comments": 9, "shares": 8}'::jsonb, 1),
  -- published_post_a1_fb, reading two: an hour later, and every number is larger. A collector that
  -- overwrote the first reading instead of appending this one would leave the table looking the same
  -- size; performance_snapshots_one_per_post_instant is what makes that impossible rather than
  -- merely discouraged, and the fixture block below probes it.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
   'afd4dde9-c824-51b2-ab0b-d82f36131f5d', timestamptz '2026-09-01 11:00:00+00',
   '{"impressions": 2310, "reach": 1702, "engagements": 118, "likes": 87, "comments": 14, "shares": 17}'::jsonb, 1),
  -- published_post_a2: §8.6 case 3. Under business_a2, outside user_editor_a's member scope, so
  -- `editor-a-sees-zero-metric-snapshots-under-a2` refuses a row that IS there.
  ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', '0a5bed73-2981-5699-b2a1-e1c1663127f4',
   '7ff92ce8-686d-560d-a202-72e673d02ee5', timestamptz '2026-09-01 11:00:00+00',
   '{"impressions": 410, "reach": 356, "engagements": 12, "likes": 10, "comments": 1, "shares": 1}'::jsonb, 1),
  -- published_post_b1: §8.6 case 5. Workspace B's own, reachable by no A-side identity holding its
  -- exact id, and `owner-b-sees-the-metric-snapshot-of-their-own-send` proves it is there to reach.
  ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', '3fd4e154-ab6e-5d61-8d96-ff1d6a5c31d3',
   'cd8df3a5-9a3a-57ed-bb37-5d57dfba1265', timestamptz '2026-09-01 12:00:00+00',
   '{"impressions": 733, "reach": 640, "engagements": 40, "likes": 31, "comments": 5, "shares": 4}'::jsonb, 1)
on conflict on constraint performance_snapshots_one_per_post_instant do nothing;


-- ---------------------------------------------------------------------------------------------
-- WHAT THE FIXTURE RE-READS BEFORE IT COMMITS, AND ALL TEN PROBES
-- ---------------------------------------------------------------------------------------------
-- TWO of the ten need a parent row -- a snapshot whose tenant disagrees with its post's, and a
-- second collection at an instant already recorded -- and they were always here, for batch 120's
-- reason: a migration runs against an empty database, so such a probe written there would silently
-- never run.
--
-- THE OTHER EIGHT WERE IN THE MIGRATION AND Q0 MEASURED WHY THEY BELONG HERE TOO. An apply-time
-- block runs once, when its own file is applied; a later migration that weakens one of batch 121's
-- constraints is invisible to it for ever. rls-smoke does not re-migrate -- it applies the helpers
-- and the fixtures onto the database as the whole set left it -- so a probe here re-runs against
-- the schema as it actually stands, every time.
--
-- Every probe runs in a subtransaction that always aborts (140's shape), so none leaves a row
-- behind; each demands the SQLSTATE of the constraint that must refuse it BY NAME; each has a
-- `when others` arm so a fall-through is reported as a fall-through (Q0's F4); and the set is
-- counted, which is Q0's finding F2 against batch 120 kept.
do $$
declare
  count_of      integer;
  probes_passed integer := 0;
  offending     text;
  found_keys    text[];
  metric_keys constant text[] := array[
    'clicks', 'comments', 'engagements', 'impressions', 'likes',
    'profile_visits', 'reach', 'saves', 'shares', 'video_views'];
begin
  select count(*) into count_of from app.performance_snapshots;
  if count_of <> 4 then
    raise exception 'batch 121 fixture loaded % metric snapshot(s) and expects 4', count_of;
  end if;

  -- The series is two rows on ONE post, and a case counts it.
  select count(*) into count_of from app.performance_snapshots
   where published_post_id = 'afd4dde9-c824-51b2-ab0b-d82f36131f5d';
  if count_of <> 2 then
    raise exception 'published_post_a1_fb should carry a series of 2 snapshots and carries %', count_of;
  end if;

  -- Every snapshot's scope agrees with its post's. The FK enforces it; this re-reads it, because a
  -- fixture that loaded a misfiled row would make every isolation case below it meaningless.
  select count(*) into count_of
    from app.performance_snapshots s
    join app.published_posts p on p.id = s.published_post_id
   where p.workspace_id is distinct from s.workspace_id
      or p.business_profile_id is distinct from s.business_profile_id;
  if count_of <> 0 then
    raise exception '% metric snapshot(s) disagree with their post about the tenant', count_of;
  end if;

  -- PROBE 1 — THE SCOPE PROBE. The row the option the Owner declined (question H) would have
  -- permitted: a snapshot whose tenant columns disagree with its post's. Without
  -- published_posts_scope_unique and the composite FK it carries, this insert would SUCCEED, and no
  -- policy would return the row to the tenant it names while every policy would return it to the
  -- tenant it points at.
  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values ('43fd5c24-ebea-528f-9ce9-eedf1f8f9765', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
            'afd4dde9-c824-51b2-ab0b-d82f36131f5d', timestamptz '2026-09-02 10:00:00+00',
            '{"reach": 1}'::jsonb, 1);
    raise exception 'a metric snapshot naming workspace_b over a post of workspace_a was accepted';
  exception
    when foreign_key_violation then
      if sqlerrm not like '%performance_snapshots_post_scope_fk%' then
        raise exception 'the wrong constraint refused the cross-tenant scope probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the cross-tenant scope probe fell through performance_snapshots_post_scope_fk and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  -- PROBE 2 — THE OVERWRITE PROBE. §4.8's "no destructive overwrite" is this key and nothing else: a
  -- second collection at an instant already recorded is REFUSED, not merged and not replaced. It is
  -- probed against a real series, which is the only place the rule matters.
  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values ('c4840acc-0323-5e13-b1d3-c18d7eb615cb', 'dd7c6dc0-8a6e-5780-a656-0eeae7ef5b4a',
            'afd4dde9-c824-51b2-ab0b-d82f36131f5d', timestamptz '2026-09-01 11:00:00+00',
            '{"impressions": 9999}'::jsonb, 1);
    raise exception 'a second snapshot at an instant already recorded was accepted';
  exception
    when unique_violation then
      if sqlerrm not like '%performance_snapshots_one_per_post_instant%' then
        raise exception 'the wrong constraint refused the overwrite probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the overwrite probe fell through performance_snapshots_one_per_post_instant and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  -- ===========================================================================================
  -- THE EIGHT PAYLOAD PROBES. THEY WERE IN THE MIGRATION AND Q0 MEASURED WHY THEY BELONG HERE.
  -- ===========================================================================================
  -- Q0's finding F1 (HIGH), third survivor: an apply-time block runs ONCE, when its own file is
  -- applied, and nothing re-tests it afterwards. A later migration that weakens one of these
  -- constraints is invisible to every layer -- and the migration's own header says batch 150 must
  -- REBUILD this table to partition it, so a rebuild that reinstates four of the five CHECKs was a
  -- real path, not a hypothetical one. In the fixture they re-run on EVERY rls-smoke, against the
  -- database as the whole migration set left it.
  --
  -- The batch's stated reason for keeping them in the migration was that a probe needing a parent
  -- row belongs in the fixture -- which is an argument for moving the other two here, not an
  -- argument for keeping these there. Q0 called it "a move, not new code" and it is.
  --
  -- EVERY PROBE HAS A `when others` ARM — Q0's finding F4 (MEDIUM). The probes insert with
  -- gen_random_uuid() for the scope columns. A CHECK is evaluated before a foreign key trigger, so
  -- while the CHECKs bite the probes work; the moment the targeted CHECK stops refusing, the row
  -- falls through to performance_snapshots_post_scope_fk, the `when check_violation` arm never
  -- runs, and the `if sqlerrm not like ...` assertion that MAKES it a probe is never evaluated.
  -- Q0 hit this twice and was told the composite foreign key was broken when what had moved was the
  -- size bound. A fall-through is now reported as a fall-through.
  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(),
            '{"error": "Graph API (#100) unsupported get request for post 17841400000000000"}'::jsonb, 1);
    raise exception 'a metrics payload with a provider sentence under an unknown key was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_keys_are_known%' then
        raise exception 'the wrong constraint refused the unknown-key probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the unknown-key probe fell through performance_snapshots_metrics_keys_are_known and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(),
            '{"impressions": "see the Graph API response for post 17841400000000000"}'::jsonb, 1);
    raise exception 'a provider sentence under a KNOWN key was accepted as a metric value';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_values_are_numbers%' then
        raise exception 'the wrong constraint refused the string-value probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the string-value probe fell through performance_snapshots_metrics_values_are_numbers and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), '[]'::jsonb, 1);
    raise exception 'a metrics payload that is not an object was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_is_an_object%' then
        raise exception 'the wrong constraint refused the not-an-object probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the not-an-object probe fell through performance_snapshots_metrics_is_an_object and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), '{"reach": 1}'::jsonb, 0);
    raise exception 'a metrics_schema_version of 0 was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_schema_version_is_positive%' then
        raise exception 'the wrong constraint refused the schema-version probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the schema-version probe fell through performance_snapshots_schema_version_is_positive and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(),
            jsonb_build_object('reach', 1, 'clicks', repeat('9', 4096)::numeric), 1);
    raise exception 'a metrics payload over the size bound was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_is_bounded%' then
        raise exception 'the wrong constraint refused the size probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the size probe fell through performance_snapshots_metrics_is_bounded and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  -- A1's F1: the Instagram post-id shape that passed every type-discriminating constraint and was
  -- read back as an ordinary client. A1's exact literal, so a later reader meets the measurement.
  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(),
            '{"impressions": 17841400000000000, "clicks": 100064823456789}'::jsonb, 1);
    raise exception 'a provider identifier shaped as a metric count was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_values_are_plausible%' then
        raise exception 'the wrong constraint refused the provider-identifier probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the provider-identifier probe fell through performance_snapshots_metrics_values_are_plausible and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(),
            '{"reach": -999999}'::jsonb, 1);
    raise exception 'a negative metric was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_values_are_plausible%' then
        raise exception 'the wrong constraint refused the negative-value probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the negative-value probe fell through performance_snapshots_metrics_values_are_plausible and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  -- A1's F4: a snapshot that measures nothing.
  begin
    insert into app.performance_snapshots
      (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
    values (gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), now(), '{}'::jsonb, 1);
    raise exception 'an empty metrics payload was accepted';
  exception
    when check_violation then
      if sqlerrm not like '%performance_snapshots_metrics_is_not_empty%' then
        raise exception 'the wrong constraint refused the empty-payload probe: %', sqlerrm;
      end if;
      probes_passed := probes_passed + 1;
    when others then
      raise exception 'the empty-payload probe fell through performance_snapshots_metrics_is_not_empty and was refused by something else: % (%)', sqlerrm, sqlstate;
  end;

  -- ===========================================================================================
  -- AND THE KEY SET ITSELF, RE-ASSERTED AFTER THE WHOLE MIGRATION SET — Q0's D01h.
  -- ===========================================================================================
  -- MOVING THE PROBES HERE WAS NOT SUFFICIENT AND THE AUTHOR MEASURED THAT BEFORE WRITING IT DOWN.
  -- Q0's recommendation was to move the payload probes into the fixture so they re-run on every
  -- rls-smoke. They now do, and rls-smoke does NOT re-migrate -- it applies the helpers and the
  -- fixtures onto the database as the whole migration set left it, which is exactly the property
  -- the recommendation wanted. But a probe fires a FIXED LITERAL: the unknown-key probe sends
  -- `error`, and widening the allowlist with `followers` still refuses `error`. The Author applied
  -- Q0's own M17 after the migration set and rls-smoke stayed green.
  --
  -- What catches a widened, narrowed or reinstated key set is the TEXT of the constraint, and the
  -- migration asserts that in a block which runs ONCE. So it is asserted again here, where it runs
  -- every time. The two are deliberately the same assertion in two places with different lifetimes,
  -- and neither is redundant: the migration's fails the APPLY, this one fails the SUITE.
  for offending in
    select name from unnest(array[
      'performance_snapshots_metrics_keys_are_known',
      'performance_snapshots_metrics_values_are_numbers',
      'performance_snapshots_metrics_values_are_plausible']) as name
  loop
    select array_agg(distinct m[1] order by m[1]) into found_keys
      from pg_catalog.pg_constraint con
      join pg_catalog.pg_class c on c.oid = con.conrelid
      join pg_catalog.pg_namespace n on n.oid = c.relnamespace,
      lateral regexp_matches(pg_catalog.pg_get_constraintdef(con.oid), '''([a-z_]{4,})''', 'g') as m
     where n.nspname = 'app' and c.relname = 'performance_snapshots' and con.conname = offending;
    found_keys := array(select k from unnest(found_keys) k where k <> 'number' order by k);
    if found_keys is distinct from metric_keys then
      raise exception 'batch 121 constraint % no longer names the ten metric keys: it names %',
        offending, coalesce(array_to_string(found_keys, ', '), '(none)')
        using hint = 'Q0-121 F1/D01h: a later migration weakened this AFTER batch 121 was applied, so batch 121''s own apply-time block never re-ran. A key in the allowlist that is not in the value rules lets a provider sentence into a PROVIDER-3 column every active member reads.';
    end if;
  end loop;

  if probes_passed <> 10 then
    raise exception 'batch 121''s fixture ran % probe(s) and there are 10', probes_passed;
  end if;
  raise notice 'batch 121 fixture: 4 snapshot(s) loaded, 10 probe(s) passed';
end $$;
