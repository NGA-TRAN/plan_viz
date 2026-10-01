# CLI reference

Install `plan-viz` using the [shared installation instructions](../README.md#installation).
The same command accepts single-node and distributed physical plans, including
structurally inferred operators.

## Input and output

```sh
# Convert a saved physical plan.
npx plan-viz -i plan.txt -o output.excalidraw

# Read stdin and write JSON to stdout.
cat plan.txt | npx plan-viz > output.excalidraw

# Select one snapshot section and expand every distributed task.
npx plan-viz -i plans.snap --section 2 --all-workers -o expanded.excalidraw

# Adjust layout defaults.
npx plan-viz -i plan.txt -o output.excalidraw \
  --node-width 250 --node-height 100 \
  --vertical-spacing 120 --horizontal-spacing 60
```

With a global installation (`npm install -g plan-viz`), use `plan-viz` directly.
From a source checkout, run `npm ci` and `npm run build`, then replace `npx plan-viz`
with `node dist/cli.js`. Repository fixtures are not included in the npm package.

## Options

| Option | Meaning | Default |
|---|---|---|
| `-i, --input <file>` | Input file | stdin |
| `-o, --output <file>` | Excalidraw JSON output | stdout |
| `--section <number>` | Select a 1-based snapshot section | Required if multiple sections exist |
| `--all-workers` | Draw every distributed task | First/last equivalent tasks |
| `--node-width <number>` | Operator box width | 200 |
| `--node-height <number>` | Operator box height | 80 |
| `--vertical-spacing <number>` | Vertical spacing | 100 |
| `--horizontal-spacing <number>` | Horizontal spacing | 50 |
| `-V, --version` | Show package version | — |
| `-h, --help` | Show help | — |

Dimensions are layout defaults; individual renderers and label fitting may enlarge
boxes. Diagnostics go to stderr. Invalid input or malformed complete graphs fail
with a nonzero exit status; incomplete recordings may convert with diagnostics.

See [input formats and API](API.md#input-formats), [distributed conventions](DISTRIBUTED_PLANS.md),
and [custom renderers](CUSTOM_OPERATORS.md).
