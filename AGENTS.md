# CurateDS agent workflow

## Start here

- Read the relevant handoff in `docs/refactor/` and inspect the current code before choosing an implementation. For V2 web work, follow `apps/web-v2/AGENTS.md`.
- Start from current `origin/develop` on a clean `feature/<short-description>` branch or isolated worktree. Preserve existing changes. Keep the diff within the task and follow the repo's test-first convention for behavior changes.

## Verify and open a draft PR

- Run the smallest relevant regression check first. For V2, use `npm run test:web` and `npm run build:web` as applicable. For backend changes, use `dotnet test CurateDS.sln`. Use `npm run verify` for cross-cutting changes. Local backend tests can use SQLite where CI uses PostgreSQL.
- When the task authorizes publishing, commit the reviewed diff, push the topic branch, and open a draft PR into `develop`. With GitHub CLI, use `gh pr create --draft --base develop --head <branch>`. Describe the behavior change, acceptance evidence, and any checks still pending.
- Confirm the PR targets `develop` and the latest pushed commit is under review. Watch the `backend` and `frontend` checks through completion with `gh pr checks <PR> --watch` or the equivalent GitHub tool. The frontend job includes fixture-backed Playwright against the deployment image.
- Inspect failed job logs. Fix failures attributable to the task and watch the replacement run. If access, infrastructure, or an unrelated failure blocks verification, leave the draft open and record the blocker. Never count missing, skipped, or cancelled checks as passed.
- Hand back the PR link, latest commit, summary, and local and hosted check results. The owner reviews and merges. Direct pushes to `develop` or `main`, merging, and deployment are outside this workflow.
