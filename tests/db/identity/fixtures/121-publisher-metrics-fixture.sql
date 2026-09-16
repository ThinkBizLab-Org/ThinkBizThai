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
-- SO §8.6 CASE 4 IS EXERCISED HERE IN ITS OTHER DIRECTION and the limit is stated rather than
-- papered over: the page-pinned member is admitted to NOTHING in this family, because every post
-- that exists hangs off a business-level item, and `pinned-editor-a-sees-zero-metric-snapshot-rows`
-- is that measurement. The case that a page-pinned member is refused a row on ANOTHER page's item
-- cannot be written for this table until a page-pinned send produces a post, and that is in the
-- work package's open blockers against the batch that gives the family a second page-level post.

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
-- WHAT THE FIXTURE RE-READS BEFORE IT COMMITS, AND THE TWO PROBES THAT NEED A POST
-- ---------------------------------------------------------------------------------------------
-- Batch 120's rule, applied: a probe that needs a parent row belongs HERE and not in the migration,
-- because a migration runs against an empty database and such a probe written there would silently
-- never run. The migration's own five payload probes need no parent row -- a CHECK is evaluated
-- before any foreign key trigger fires -- and they are there.
--
-- Both probes below run in a subtransaction that always aborts (140's shape), so neither leaves a
-- row behind, and each demands the SQLSTATE of the constraint that must refuse it BY NAME. Q0's
-- finding F2 against batch 120 is closed the same way it was there: the probe set is counted.
do $$
declare
  count_of      integer;
  probes_passed integer := 0;
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
  end;

  if probes_passed <> 2 then
    raise exception 'batch 121''s fixture ran % probe(s) and there are 2', probes_passed;
  end if;
  raise notice 'batch 121 fixture: 4 snapshot(s) loaded, 2 probe(s) passed';
end $$;
