// A SYNTHETIC FIXTURE OF THE WS:905 SHAPE (the batch 150 prerequisite draft; plan "Batch 150 -- Can do now"
// (c)). docs/plans/core-database-and-rls-workstream-th.md:905-910 asks for a production-like fixture of at
// least 100 workspaces, 10 businesses per workspace, 20 pages per workspace, 100k content rows and 1M usage,
// audit and metric rows, against which "no sequential scan on membership checks" and the first-page budgets
// are read. This module only WRITES SQL: one string, no psql meta-command, no transaction control (the
// harness in scripts/db/explain-harness.mjs wraps it), every row synthetic and every id derived, so a run
// can be reproduced and no customer data or secret can enter it (CONTRIBUTING_AGENTS.md: synthetic fixtures
// by default).
//
// The scale is a parameter. WS905_FULL is the WS:905 shape; WS905_SMALL is the default, small enough for a
// test to build the text and for a local run to load in seconds. Rows are spread round-robin over the
// workspaces and, within a workspace, over its businesses, so every workspace carries the same share.
//
// What it is NOT: a seed (it is never applied by migrate-clean, rls-smoke or CI), a statement about real
// data distributions (uniform by construction), or an SLO (it asserts no timing; Q150-d is undecided).
// Ids are md5('ws905:<kind>:<n>')::uuid -- deterministic and unique per kind, not uuid5, because nothing
// outside this fixture names them (the fixture catalog's uuid5 recipe is for the identities the cases name).

export const WS905_FULL = Object.freeze({
  workspaces: 100, businessesPerWorkspace: 10, pagesPerWorkspace: 20, membersPerWorkspace: 4,
  contentRows: 100_000, usageRows: 1_000_000, auditRows: 1_000_000, metricRows: 1_000_000,
  snapshotsPerPost: 100, calendarEvery: 4, assetEvery: 10, jobsPerWorkspace: 10,
});

export const WS905_SMALL = Object.freeze({
  workspaces: 4, businessesPerWorkspace: 10, pagesPerWorkspace: 20, membersPerWorkspace: 4,
  contentRows: 400, usageRows: 2_000, auditRows: 2_000, metricRows: 2_000,
  snapshotsPerPost: 100, calendarEvery: 4, assetEvery: 10, jobsPerWorkspace: 10,
});

// The full shape with every ROW count multiplied by `factor` (workspaces, businesses and pages kept), so a
// run can keep the tenant hierarchy of WS:905 and scale only the volume.
export function ws905Scaled(factor) {
  if (!(factor > 0 && factor <= 1)) throw new Error(`a scale factor is in (0, 1], not ${factor}`);
  const rows = (n) => Math.max(1, Math.round(n * factor));
  return Object.freeze({ ...WS905_FULL, contentRows: rows(WS905_FULL.contentRows), usageRows: rows(WS905_FULL.usageRows),
    auditRows: rows(WS905_FULL.auditRows), metricRows: rows(WS905_FULL.metricRows) });
}

const INTEGER_PARAMS = Object.keys(WS905_FULL);
export function checkParams(p) {
  for (const k of INTEGER_PARAMS) {
    if (!Number.isSafeInteger(p[k]) || p[k] < 1) throw new Error(`${k} must be a positive integer, not ${p[k]}`);
  }
  for (const k of Object.keys(p)) if (!INTEGER_PARAMS.includes(k)) throw new Error(`unknown fixture parameter ${k}`);
  if (p.membersPerWorkspace < 2) throw new Error('membersPerWorkspace must be at least 2: an owner and an editor');
  if (p.contentRows < p.workspaces) throw new Error('contentRows must be at least one per workspace');
  return p;
}

// How many published posts carry the metric rows: one post per snapshotsPerPost rows, never more posts
// than content items.
export const postCount = (p) => Math.min(p.contentRows, Math.max(1, Math.ceil(p.metricRows / p.snapshotsPerPost)));

// The ids the harness's named queries use, so it never searches for a row.
const uuidOf = (kind, n) => `md5('ws905:${kind}:' || (${n})::text)::uuid`;
export const fixtureIds = Object.freeze({
  workspace: (w) => uuidOf('ws', w),
  business: (b) => uuidOf('bp', b),
  owner: (w) => uuidOf('user', `(${w} - 1) * 4 + 1`),
});

// Row counts the fixture loads, per table, for the harness to verify after the load.
export function expectedCounts(p) {
  checkParams(p);
  const posts = postCount(p);
  return {
    'app.workspaces': p.workspaces,
    'app.workspace_members': p.workspaces * p.membersPerWorkspace + (p.workspaces > 1 ? p.workspaces : 0),
    'app.business_profiles': p.workspaces * p.businessesPerWorkspace,
    'app.page_context_profiles': p.workspaces * p.pagesPerWorkspace,
    'app.content_items': p.contentRows,
    'app.content_versions': posts,
    'app.content_variants': posts,
    'app.meta_connections': p.workspaces,
    'app.social_accounts': p.workspaces,
    'app.content_targets': posts,
    'app.publish_intents': posts,
    'app.publish_targets': posts,
    'app.published_posts': posts,
    'app.performance_snapshots': p.metricRows,
    'app.calendar_items': Math.floor(p.contentRows / p.calendarEvery),
    'app.assets': Math.floor(p.contentRows / p.assetEvery),
    'app.jobs': p.workspaces * p.jobsPerWorkspace,
    'app.usage_events': p.usageRows,
    'app.audit_logs': p.auditRows,
  };
}

// The SQL. Every statement is an INSERT ... SELECT over generate_series, in FK order.
export function fixtureSql(params = WS905_SMALL) {
  const p = checkParams({ ...params });
  const W = p.workspaces, B = p.businessesPerWorkspace, P = p.pagesPerWorkspace, M = p.membersPerWorkspace;
  const posts = postCount(p);
  const base = "timestamptz '2026-09-01 00:00:00+00'";
  // content item c (1..C): workspace (c-1)%W+1; business slot k = ((c-1)/W)%B within it; a page for even c
  // when the workspace has a page for that business slot (page slot k, whose business slot is k % B = k).
  const ws = (c) => `((${c} - 1) % ${W} + 1)`;
  const slot = (c) => `(((${c} - 1) / ${W}) % ${B})`;
  const bp = (c) => `((${ws(c)} - 1) * ${B} + ${slot(c)} + 1)`;
  const page = (c) => `case when ${c} % 2 = 0 and ${slot(c)} < ${P} then ${uuidOf('page', `(${ws(c)} - 1) * ${P} + ${slot(c)} + 1`)} end`;
  const owner = (w) => uuidOf('user', `(${w} - 1) * ${M} + 1`);
  const job = (r) => `(${ws(r)} + ${W} * (((${r} - 1) / ${W}) % ${p.jobsPerWorkspace}))`;
  return `-- WS:905 synthetic fixture: ${JSON.stringify(p)}
insert into app.workspaces (id, name, lifecycle_state, created_at)
select ${uuidOf('ws', 'w')}, 'ws905 workspace ' || w, 'active', ${base} + w * interval '1 minute'
  from generate_series(1, ${W}) w;
insert into app.workspace_members (workspace_id, user_id, role, status, created_at)
select ${uuidOf('ws', 'w')}, ${uuidOf('user', `(w - 1) * ${M} + m`)}, case when m = 1 then 'owner' else 'editor' end, 'active', ${base}
  from generate_series(1, ${W}) w, generate_series(1, ${M}) m;
${W > 1 ? `insert into app.workspace_members (workspace_id, user_id, role, status, created_at)
select ${uuidOf('ws', `w % ${W} + 1`)}, ${owner('w')}, 'viewer', 'active', ${base}
  from generate_series(1, ${W}) w;` : '-- one workspace: no owner is a member of a second'}
insert into app.business_profiles (id, workspace_id, name, created_at)
select ${uuidOf('bp', 'b')}, ${uuidOf('ws', `(b - 1) / ${B} + 1`)}, 'ws905 business ' || b, ${base} + b * interval '1 second'
  from generate_series(1, ${W * B}) b;
insert into app.page_context_profiles (id, workspace_id, business_profile_id, name, created_at)
select ${uuidOf('page', 'g')}, ${uuidOf('ws', `(g - 1) / ${P} + 1`)}, ${uuidOf('bp', `((g - 1) / ${P}) * ${B} + ((g - 1) % ${P}) % ${B} + 1`)}, 'ws905 page ' || g, ${base}
  from generate_series(1, ${W * P}) g;
insert into app.content_items (id, workspace_id, business_profile_id, page_context_profile_id, title, content_type, status, created_at, deleted_at)
select ${uuidOf('ci', 'c')}, ${uuidOf('ws', ws('c'))}, ${uuidOf('bp', bp('c'))}, ${page('c')}, 'ws905 content ' || c,
       (array['post', 'carousel', 'reel'])[c % 3 + 1], (array['draft', 'in_review', 'approved', 'scheduled', 'published'])[c % 5 + 1],
       ${base} + c * interval '7 seconds', case when c % 50 = 0 then ${base} + interval '40 days' end
  from generate_series(1, ${p.contentRows}) c;
insert into app.content_versions (id, workspace_id, business_profile_id, content_item_id, version_no, body, source)
select ${uuidOf('ver', 'c')}, ${uuidOf('ws', ws('c'))}, ${uuidOf('bp', bp('c'))}, ${uuidOf('ci', 'c')}, 1, 'ws905 body ' || c, 'manual'
  from generate_series(1, ${posts}) c;
insert into app.content_variants (id, workspace_id, business_profile_id, content_version_id, platform, body)
select ${uuidOf('var', 'c')}, ${uuidOf('ws', ws('c'))}, ${uuidOf('bp', bp('c'))}, ${uuidOf('ver', 'c')}, 'facebook', 'ws905 variant ' || c
  from generate_series(1, ${posts}) c;
insert into app.meta_connections (id, workspace_id, display_name)
select ${uuidOf('mc', 'w')}, ${uuidOf('ws', 'w')}, 'ws905 connection ' || w from generate_series(1, ${W}) w;
insert into app.social_accounts (id, workspace_id, meta_connection_id, account_kind, display_name, external_account_hash)
select ${uuidOf('sa', 'w')}, ${uuidOf('ws', 'w')}, ${uuidOf('mc', 'w')}, 'fb', 'ws905 page account ' || w, sha256(convert_to('ws905:sa:' || w, 'UTF8'))
  from generate_series(1, ${W}) w;
insert into app.content_targets (id, workspace_id, business_profile_id, content_item_id, social_account_id, content_variant_id)
select ${uuidOf('ct', 'c')}, ${uuidOf('ws', ws('c'))}, ${uuidOf('bp', bp('c'))}, ${uuidOf('ci', 'c')}, ${uuidOf('sa', ws('c'))}, ${uuidOf('var', 'c')}
  from generate_series(1, ${posts}) c;
insert into app.publish_intents (id, workspace_id, business_profile_id, content_item_id, content_version_id, requested_by, request_kind, idempotency_key)
select ${uuidOf('pi', 'c')}, ${uuidOf('ws', ws('c'))}, ${uuidOf('bp', bp('c'))}, ${uuidOf('ci', 'c')}, ${uuidOf('ver', 'c')}, ${owner(ws('c'))}, 'now', 'ws905:pi:' || c
  from generate_series(1, ${posts}) c;
insert into app.publish_targets (id, workspace_id, business_profile_id, publish_intent_id, content_target_id, social_account_id, content_variant_id,
                                 status, dispatched_at, completed_at)
select ${uuidOf('pt', 'c')}, ${uuidOf('ws', ws('c'))}, ${uuidOf('bp', bp('c'))}, ${uuidOf('pi', 'c')}, ${uuidOf('ct', 'c')}, ${uuidOf('sa', ws('c'))}, ${uuidOf('var', 'c')},
       'published', ${base} + c * interval '1 minute', ${base} + c * interval '1 minute' + interval '20 seconds'
  from generate_series(1, ${posts}) c;
insert into app.published_posts (id, workspace_id, business_profile_id, publish_target_id, social_account_id, platform, external_post_hash, published_at)
select ${uuidOf('pp', 'c')}, ${uuidOf('ws', ws('c'))}, ${uuidOf('bp', bp('c'))}, ${uuidOf('pt', 'c')}, ${uuidOf('sa', ws('c'))}, 'facebook',
       sha256(convert_to('ws905:pp:' || c, 'UTF8')), ${base} + c * interval '1 minute' + interval '20 seconds'
  from generate_series(1, ${posts}) c;
insert into app.performance_snapshots (workspace_id, business_profile_id, published_post_id, metric_time, metrics, metrics_schema_version)
select ${uuidOf('ws', ws('pc'))}, ${uuidOf('bp', bp('pc'))}, ${uuidOf('pp', 'pc')}, ${base} + ((r - 1) / ${posts}) * interval '1 hour',
       jsonb_build_object('impressions', r % 100000, 'reach', r % 50000, 'likes', r % 1000), 1
  from generate_series(1, ${p.metricRows}) r, lateral (select (r - 1) % ${posts} + 1 as pc) x;
insert into app.calendar_items (workspace_id, business_profile_id, content_item_id, scheduled_local_date)
select ${uuidOf('ws', ws('c'))}, ${uuidOf('bp', bp('c'))}, ${uuidOf('ci', 'c')}, date '2026-10-01' + (c % 120)
  from generate_series(${p.calendarEvery}, ${p.contentRows}, ${p.calendarEvery}) c;
insert into app.assets (workspace_id, business_profile_id, kind, title, source, created_at)
select ${uuidOf('ws', ws('a'))}, ${uuidOf('bp', bp('a'))}, (array['image', 'video'])[a % 2 + 1], 'ws905 asset ' || a, 'upload', ${base} + a * interval '13 seconds'
  from generate_series(1, ${Math.floor(p.contentRows / p.assetEvery)}) a;
insert into app.jobs (id, workspace_id, job_type, job_version, priority, available_at, max_attempts, timeout_seconds, dedupe_key, input_ref, progress_stage)
select ${uuidOf('job', 'j')}, ${uuidOf('ws', `(j - 1) % ${W} + 1`)}, 'ws905.synthetic', 1, j % 3, now() + (j % 7 - 3) * interval '1 hour', 3, 60,
       'ws905:job:' || j, 'job:ws905-' || j, 'queued'
  from generate_series(1, ${W * p.jobsPerWorkspace}) j;
insert into app.usage_events (occurred_at, dimension, quantity_amount, quantity_unit, workspace_id, business_profile_id, job_id, provider_key,
                              cost_amount, cost_currency, cost_basis, dedupe_key)
select t, 'ai_tokens', r % 4000, 'token', ${uuidOf('ws', ws('r'))}, ${uuidOf('bp', bp('r'))}, ${uuidOf('job', job('r'))}, 'synthetic',
       (r % 100) / 100.0, 'THB', 'estimated',
       'usg:' || ${uuidOf('ws', ws('r'))} || ':' || ${uuidOf('job', job('r'))} || ':ai_tokens:estimated:' || to_char(t at time zone 'UTC', 'YYYYMMDD"T"HH24MISS') || 'Z'
  from generate_series(1, ${p.usageRows}) r, lateral (select ${base} + r * interval '1 second' as t) x;
insert into app.audit_logs (workspace_id, business_profile_id, occurred_at, actor_kind, actor_id, action_category, action_name, outcome,
                            reason_key, request_id, correlation_id, secret_redacted, content_redacted, pii_redacted, retention_policy_ref)
select ${uuidOf('ws', ws('r'))}, ${uuidOf('bp', bp('r'))}, ${base} + r * interval '1 second', 'user', (${owner(ws('r'))})::text,
       'publish', 'publish.ws905_synthetic', 'succeeded', 'audit.ws905_synthetic', 'ws905-req-' || r, 'ws905-cor-' || r, true, true, true, 'retention.ws905_synthetic'
  from generate_series(1, ${p.auditRows}) r;
`;
}
