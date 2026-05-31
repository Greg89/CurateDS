# CurateDS Repo Review - 2026-05-13

This folder contains the planning-session review of the CurateDS repository
captured on 2026-05-13, plus a follow-up progress and re-prioritization pass on
2026-05-31.

Read in this order:

1. `00-repo-overview-and-rating.md` — original baseline assessment.
2. `01-targeted-refactors.md` — refactor list, now annotated with current status.
3. `02-feature-roadmap.md` — feature roadmap, refined on 2026-05-31.
4. `03-open-questions-and-decisions.md` — product questions to lock before the next cycle.
5. `04-cross-reference-and-assessment.md` — independent code-vs-review check, with status updated.
6. `05-progress-and-next-priorities.md` — **start here for current state** — what's done, what's left, and re-ordered next priorities.

Local verification used for the original review (2026-05-13):

- Backend: `dotnet test CurateDS.sln --no-restore --verbosity minimal` passed.
- Web tests: `npm.cmd run test:web -- --run` passed.
- Web build: `npm.cmd run build:web` passed with a bundle-size warning.
- Mobile typecheck: `npm.cmd run typecheck:mobile` failed because mobile dependencies were not resolved in the local install.

## Progress snapshot — 2026-05-31

Original P1 refactors are **complete**:

- API endpoint decomposition (P1-A) — done.
- Shared item attribute validator (P1-B) — done.
- `ItemQueryBuilder` extraction + tag-match-mode + composite indexes (P1-C) — done.
- Web API split + zod validation (P1-D, short-term path) — done.
- `ItemsPage` workflow extraction (P1-E) — done.
- Standardized `ApiResponses.NotFound` + machine-readable error codes via `ValidationFailure.ErrorCode` (P1-F) — short-term path done.
- Bucket provisioning lifted out of upload path (P2-A, code-bug half) — done.
- Mobile typecheck/test reproducibility (P0-1) — verified passing.
- Root `verify` script extended to include mobile (P0-2) — done.

Still open: media-privacy product decision (P2-A long tail), transaction
boundaries (P2-B), collector domain models (P2-C → roadmap M3), web design
system (P2-D), perf hardening (P3), OpenAPI generation (P1-D long tail),
and the five gap findings (A–E) from `04-cross-reference-and-assessment.md`.

See `05-progress-and-next-priorities.md` for full detail and the refined work
order.

