import type { JobStorePort } from '../application/jobs/job-store-port';

// The job store adapter's file (RFC-2026-029 §3.1, `pg`'s cell; §6.1; WP-1A-A0-006 scope.include[1]).
//
// Created by WP-1A-A0-006's dependencies-and-CI pull request, with which the Product Owner bundled the
// KERNEL_CREATED pin on 2026-10-20 (header `Deps + CI`), so that the foundation contract suite can require
// this file to stay (A1-300-I2). It holds no behaviour yet: it imports no package, opens no connection,
// reads no environment variable and implements no method. The Postgres implementation of JobStorePort over
// app.jobs, through `pg` under RFC-2026-028's worker login role, with `set local role app_worker` in every
// job transaction and RFC-2026-028's A1R-2 checks, is the package's next increment, after the forward
// migration that gives app_worker its policies. Nothing imports this file, and index.ts does not
// re-export it (RFC-2026-029 §6.3/5).

// What the adapter implements: exactly WP-1A-A0-004's port, no more.
export type PostgresJobStore = JobStorePort;
