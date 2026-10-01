# Quick start

Use Node.js 20 or newer and npm. The distributed-plan examples require
**plan-viz 0.1.25 or newer**.

## Build from source

```sh
git clone https://github.com/NGA-TRAN/plan_viz.git
cd plan_viz
npm ci
npm run build

# Ordinary operator tree
node dist/cli.js -i tests/join.sql -o output.excalidraw

# Distributed plan: representative tasks
node dist/cli.js -i tests/distributed/gather_four_tasks.sql -o gather.excalidraw

# Expand all tasks
node dist/cli.js -i tests/distributed/grouped_gather_partial_reduction.sql \
  --all-workers -o grouped-gather.excalidraw
```

The examples in `tests/` contain saved physical plans. Matching expected drawings
are in `tests/expected/` and `tests/distributed/expected/`.

## Use a published package

```sh
npm install plan-viz
npx plan-viz -i plan.txt -o output.excalidraw
```

Here `plan.txt` is your saved physical EXPLAIN output. Repository fixtures are not
included in the npm package. A global installation (`npm install -g plan-viz`)
also exposes the `plan-viz` command directly.

## Use the library

```javascript
const { convertPlanToExcalidraw } = require('plan-viz');
const fs = require('node:fs');

const plan = `ProjectionExec: expr=[id, name]
  FilterExec: age > 18
    DataSourceExec: file_groups={1 groups: [[users.parquet]]}, projection=[id, name, age], file_type=parquet`;

fs.writeFileSync('output.excalidraw',
  JSON.stringify(convertPlanToExcalidraw(plan), null, 2));
```

For a source checkout, use `require('./dist')` after building. TypeScript callers
can use `import { convertPlanToExcalidraw } from 'plan-viz'`.

For diagnostics and snapshot selection on the current source version:

```javascript
const { ConverterService } = require('./dist');
const fs = require('node:fs');

const result = new ConverterService({
  input: { section: 2 }, // 1-based; omit for a file with one section.
  distributed: { workerDisplay: 'all' },
}).convertDetailed(fs.readFileSync('mixed-snapshots.snap', 'utf8'));

console.error(result.diagnostics);
fs.writeFileSync('selected.excalidraw', JSON.stringify(result.scene, null, 2));
```

The CLI equivalent writes diagnostics to stderr:

```sh
node dist/cli.js -i mixed-snapshots.snap --section 2 --all-workers -o selected.excalidraw
```
Multiple snapshot sections require a selection; the error lists available sections.

## Open and read the drawing

Open the generated `.excalidraw` file in [Excalidraw](https://excalidraw.com/)
or an IDE Excalidraw extension. The separate
[plan-visualizer app](https://nga-tran.github.io/plan-visualizer) also accepts plan
text; its available features depend on the library version deployed there.

Read data flow from bottom to top. Ordinary arrows represent partition streams;
blue column labels identify known ordering. In distributed drawings, blue badges
show output partitions per task and purple arrows bundle streams between tasks,
ending at the receiving network operator. Ellipses mark omitted partitions,
tasks, or connections. Empty padding has no incoming network arrow.

Unknown counts and incomplete worker topology remain explicit. See
[diagram conventions and limits](README.md#distributed-physical-plans).

## Development checks

```sh
npm run lint
npm run test:coverage
```

To rebuild from scratch, run `npm run clean && npm run build`. For browser checks:

```sh
npx playwright install chromium
node scripts/verify-distributed.cjs
```

See [README](README.md#api) for the full API, [CONTRIBUTING](CONTRIBUTING.md)
for review/release checks, and [the distributed fixture directory](tests/distributed/)
for gather, broadcast, shuffle, join, UNION, and legacy examples.
