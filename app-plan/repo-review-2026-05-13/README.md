# CurateDS Repo Review - 2026-05-13

This folder contains a planning-session review of the current CurateDS repository.

Read in this order:

1. `00-repo-overview-and-rating.md`
2. `01-targeted-refactors.md`
3. `02-feature-roadmap.md`
4. `03-open-questions-and-decisions.md`

Local verification used for the review:

- Backend: `dotnet test CurateDS.sln --no-restore --verbosity minimal` passed.
- Web tests: `npm.cmd run test:web -- --run` passed.
- Web build: `npm.cmd run build:web` passed with a bundle-size warning.
- Mobile typecheck: `npm.cmd run typecheck:mobile` failed because mobile dependencies were not resolved in the local install.

