import { Client } from 'pg';
import { describe, expect, it } from 'vitest';

// WP-1A-A0-006 (the Product Owner's answer of 2026-10-20, header `Deps + CI`): CI's application job starts
// the bootstrap job's postgres:17 service container and applies the foundation migrations to it before the
// application tests (.github/workflows/ci.yml, "Database for the application tests"). This proves only that
// the adapters' tests can reach it: a connection through `pg`, the driver RFC-2026-029 §3.1 allows here, and
// the schema the migrations create. It tests no adapter; the adapters' tests come with the adapters.
//
// DB_TEST_URL names the container and carries no password (pg reads PGPASSWORD from the environment). Where
// CI is set the URL is required, so the job cannot pass with the database left out; elsewhere, with no URL,
// the connection test is skipped and says so.
const url = process.env['DB_TEST_URL'];
const inCi = process.env['CI'] === 'true';

describe('the CI Postgres service the platform-kernel adapters are tested against', () => {
  it('is configured wherever CI runs the application tests', () => {
    if (inCi) expect(url, 'DB_TEST_URL must be set in CI').toMatch(/^postgresql:\/\/[^:@/]+@[^/]+\/[a-z_]+$/);
  });

  it.skipIf(url === undefined)('answers through pg and holds the foundation migrations', async () => {
    const client = new Client({ connectionString: url });
    await client.connect();
    try {
      const result = await client.query<{ jobs: boolean; outbox: boolean; ledger: boolean; worker: boolean }>(
        "select to_regclass('app.jobs') is not null as jobs, to_regclass('app.outbox_events') is not null as outbox, "
          + "to_regclass('app.consumer_ledger') is not null as ledger, "
          + "exists (select 1 from pg_roles where rolname = 'app_worker') as worker",
      );
      expect(result.rows).toEqual([{ jobs: true, outbox: true, ledger: true, worker: true }]);
    } finally {
      await client.end();
    }
  });
});
