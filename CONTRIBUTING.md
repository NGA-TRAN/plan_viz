# Contributing to plan-viz

Use feature branches from `master` and Conventional Commits. See
[the architecture](docs/ARCHITECTURE.md) and
[operator workflow](docs/operators/WORKFLOW.md) before changing rendering or
execution contracts.

## Setup

Use Node.js 20 or newer.

```sh
git clone https://github.com/YOUR_USERNAME/plan_viz.git
cd plan_viz
npm ci
git switch -c feature/your-change
npm run build
```

`npm run build` uses `tsconfig.build.json` to exclude tests and test helpers from
production output. `npm run clean` removes `dist/` and `coverage/`.

## Development checks

```sh
npm test                     # All unit and integration tests
npm run test:watch           # Watch mode
npm run test:coverage        # Coverage report and thresholds
npm run lint                 # ESLint
npm run lint:fix             # Apply lint fixes
npm run format               # Format src/**/*.ts
```

Follow the existing TypeScript style and keep changes focused. Jest enforces
80% global coverage for statements, branches, functions, and lines. Add meaningful
regressions for changed behavior, including count/routing evidence and malformed
input where relevant.

## Fixtures and visual review

Single-tree fixtures live in `tests/*.sql` with matching
`tests/expected/*.excalidraw`. Distributed fixtures live in
`tests/distributed/*.sql` with matching `tests/distributed/expected/*.excalidraw`.
The files contain saved EXPLAIN text; tests do not execute SQL. Keep representative
indentation and replace private names with invented names while preserving plan
structure, task counts, and empty partition slots.

Generate one expected drawing after building:

```sh
node dist/cli.js -i tests/distributed/gather_four_tasks.sql \
  -o tests/distributed/expected/gather_four_tasks.excalidraw
npx jest --runInBand --coverage=false tests/integration.test.ts -t gather_four_tasks
```

Review the drawing itself before accepting a changed expected file. Integration
tests normalize generated identifiers, compare scenes, check text bindings, and
require a matching expected file for each fixture in both directories.

For distributed parser, count, and routing work:

```sh
npx jest --runInBand --coverage=false distributed-plan.parser grouped-gather partition-inference upstream-operators
npx playwright install chromium
node scripts/verify-distributed.cjs
node scripts/audit-upstream-operators.cjs /path/to/datafusion-distributed
```

The operator inventory check requires the revision pinned in
[the distributed audit](docs/operators/distributed-datafusion.md). Browser checks
exercise the CLI and actual Excalidraw worker/operator/network-input dragging.
For larger input collections, use [corpus review tooling](docs/CORPUS_REVIEW.md).
Keep external inputs and generated galleries in ignored local directories.

## Before opening a pull request

```sh
npm run clean
npm run build
npm run lint
npm run test:coverage
npm pack --dry-run --ignore-scripts
```

Update affected documentation and the **Unreleased** changelog. Describe the
observable behavior, why it changed, the relevant tests, and remaining limits.
Include fixture paths so reviewers can open the expected drawings. Review
requirements are enforced by repository settings.

## Commits

Use `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, or `chore:` followed by a concrete
description. `npm run commit` opens the Commitizen prompt. For example:

```text
fix: connect grouped gather streams to their receiving operators
test: cover empty padding in uneven gathers
docs: explain distributed stream bundles and task slots
```

## CI and releases

[ci-cd.yml](.github/workflows/ci-cd.yml) runs on pull requests targeting `master`,
pushes to `master`, and `v*` tags. It runs lint, coverage tests on Node 20, 22, and
latest, then a production build. Only a pushed version tag triggers publishing.
Merging a feature PR does not publish a package.

For a release:

1. Prepare a release branch from updated `master`. Move the appropriate Unreleased
   changelog entries into a dated version section and update both `package.json`
   and `package-lock.json` (for example, `npm version patch --no-git-tag-version`).
2. Run the checks above, review the package contents, and merge the release PR.
3. Fetch the merged release commit and create its matching tag. Push that exact
   tag, for example `git tag vX.Y.Z <release-commit>` followed by
   `git push origin vX.Y.Z`.
4. Check the publish workflow result. It verifies that the tag version matches
   `package.json`, runs tests/build, and publishes to npm.

The current workflow grants `id-token: write` and uses npm trusted publishing;
it does not configure an `NPM_TOKEN` secret. The npm package's trusted publisher
must match this repository and workflow. Keep this guide aligned with the
checked-in workflow when changing release authentication.
