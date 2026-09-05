# DB-00 deterministic command contract (data package §12.5).
#
# DATA-DEC-02 (Approved, RFC-2026-015) fixes the contract as COMMANDS AND OUTCOMES, with no tool
# named. Every target below is a wrapper: what runs behind it is a DB-00 implementation choice,
# reviewable in its diff, and changing it is not a reopened decision.
#
# Determinism is set here rather than assumed of the caller.
export LC_ALL := C
export TZ := UTC
export PGTZ := UTC

DB := node scripts/db/run.mjs

.PHONY: db-reset-test db-migrate-clean db-migrate-upgrade db-seed-replay db-schema-lint \
        db-rls-smoke db-contract-check db-generated-drift-check db-test-foundation db-verify

db-reset-test:            ; @$(DB) reset-test
db-migrate-clean:         ; @$(DB) migrate-clean
db-migrate-upgrade:       ; @$(DB) migrate-upgrade $(if $(FIXTURE),--fixture=$(FIXTURE),)
db-seed-replay:           ; @$(DB) seed-replay
db-schema-lint:           ; @$(DB) schema-lint
db-rls-smoke:             ; @$(DB) rls-smoke
db-contract-check:        ; @$(DB) contract-check
db-generated-drift-check: ; @$(DB) generated-drift-check
db-test-foundation:       ; @$(DB) test-foundation

# Runs every target in order and stops with a readable failure summary (§12.5).
db-verify:                ; @$(DB) verify
