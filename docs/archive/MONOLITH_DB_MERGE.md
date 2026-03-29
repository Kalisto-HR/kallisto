# Archive: Monolith DB Merge

Historical reference only.

This document covers the retired migration period when Kallisto moved from a split `client_db` plus `admin_db` setup to the current single-`admin_db` runtime. It is intentionally archived so it does not compete with the supported setup and migration path.

Use the current docs for active work:

- `docs/MIGRATIONS.md`
- `docs/SETUP.md`
- `docs/ARCHITECTURE.md`

What the archived runbook covered:

- split-to-single database cutover planning
- merge dry-runs and apply workflows
- duplicate-email and university-drift reconciliation
- rollback guidance for the temporary dual-database period

That workflow is complete and no longer part of bootstrap, deployment, or rollback guidance for the supported runtime.
