-- Batch 124: the foreign key batch 091 could not write -- content_schedules.publish_intent_id -> publish_intents.
--
-- A0 Integration, in the 081 -> 111 shape. content_schedules is 091's; publish_intents is 120's. 091
-- sorts before 120, so it created the column without a key and said so. This file sorts after 120,
-- 122 and 123 and adds the key over the scope path (§4 invariant 10), so a schedule can only ever name
-- an intent of its own workspace and business. Nothing writes the column today: it is in no client
-- grant, and the dispatcher that will set it does not exist.
--
-- NO ACTION on delete and update, like every key in this schema; the FK-action probe requires it.

create index if not exists content_schedules_intent_scope_idx
  on app.content_schedules (workspace_id, business_profile_id, publish_intent_id);

alter table app.content_schedules
  add constraint content_schedules_intent_scope_fk
    foreign key (workspace_id, business_profile_id, publish_intent_id)
    references app.publish_intents (workspace_id, business_profile_id, id)
    not valid;
alter table app.content_schedules validate constraint content_schedules_intent_scope_fk;

comment on constraint content_schedules_intent_scope_fk on app.content_schedules is
  'Batch 124 (A0 Integration): the key batch 091 deferred because it sorts before 120. MATCH SIMPLE, so '
  'an unlinked schedule (publish_intent_id null) is legal; a linked one names an intent of its own scope.';

do $$
begin
  if not exists (
       select 1 from pg_catalog.pg_constraint con
        where con.conrelid = 'app.content_schedules'::regclass and con.contype = 'f'
          and con.conname = 'content_schedules_intent_scope_fk' and con.convalidated
          and con.confrelid = 'app.publish_intents'::regclass
          and pg_catalog.pg_get_constraintdef(con.oid) = 'FOREIGN KEY (workspace_id, business_profile_id, publish_intent_id) REFERENCES app.publish_intents(workspace_id, business_profile_id, id)') then
    raise exception 'batch 124''s content_schedules_intent_scope_fk is missing, unvalidated or not over the scope path';
  end if;
end $$;
