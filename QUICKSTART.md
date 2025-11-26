# Quick Start Guide

Get up and running with plan-viz in minutes!

## Prerequisites

- Node.js 20+ (LTS)
- npm or yarn

## Installation

```bash
# Clone the repository
git clone https://github.com/NGA-TRAN/plan_viz.git
cd plan_viz

# Install dependencies
npm install
```

## Build the Project

```bash
npm run build
```

## Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage
```

## Basic Usage

### 1. As a Library

You can use the existing example file or create your own:

**Option A: Use the provided example**
```bash
npx ts-node tests/usage-example.ts
```

**Option B: Create your own file**

Create a file `example.ts`:

```typescript
import { convertPlanToExcalidraw } from './src/index';
import * as fs from 'fs';

const plan = `
ProjectionExec: expr=[id, name]
  FilterExec: predicate=age > 18
    DataSourceExec: file_groups={1 groups: [[users.parquet]]}, projection=[id, name, age], file_type=parquet
`;

const result = convertPlanToExcalidraw(plan);
console.log(JSON.stringify(result, null, 2));

// Save to file
fs.writeFileSync('output.excalidraw', JSON.stringify(result, null, 2));
```

Run it:
```bash
npx ts-node example.ts
```

### 2. As a CLI Tool

After building:

```bash
# From file
node dist/cli.js -i tests/join.sql -o output.excalidraw

# From stdin
cat tests/join.sql | node dist/cli.js > output.excalidraw

# With custom options
node dist/cli.js -i tests/join.sql -o output.excalidraw \
  --node-width 250 \
  --node-height 100 \
  --vertical-spacing 120 \
  --horizontal-spacing 60
```

## Viewing the Output

1. Go to [Excalidraw](https://excalidraw.com/)
2. Click "Open" in the top menu
3. Upload your generated `.excalidraw` file
4. View your execution plan diagram!

## Available Examples

> **Note:** The `tests/` directory serves a dual purpose:
> - **Test fixtures**: SQL files and expected outputs (`tests/expected/`) for integration tests
> - **Examples**: SQL files you can use directly with the CLI

The `tests/` directory contains many sample execution plans you can try:

- **Data sources**: `dataSource.sql`, `dataSource_2_inputs.sql`, `dataSource_3_inputs.sql`, `dataSource_4_inputs.sql`
- **Filters**: `fillter_coalesceBatch.sql`, `filter_coalesceBatch_read_seq_2.sql`
- **Joins**: `join.sql`, `join_hash_collectLeft.sql`, `join_aggregates.sql`
- **Aggregations**: `aggregate_single.sql`, `aggregate_single_sorted.sql`, `aggregate_partial_final.sql`
- **Sorting**: `sort.sql`, `sortPreservingMerge.sql`
- **Repartitioning**: `repartition.sql`, `coalescePartition.sql`

Each example includes:
- A `.sql` file with the execution plan (in `tests/`)
- A `.excalidraw` file showing the expected visualization (in `tests/expected/`)

## Next Steps

- Read the [README.md](README.md) for detailed documentation
- Check out [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- Explore [tests/](tests/) for more use cases (SQL files serve as examples)
- Review the [API documentation](README.md#api)

## Troubleshooting

### Build Errors

```bash
# Clean and rebuild
npm run clean
npm run build
```

### Test Failures

```bash
# Run tests in watch mode to debug
npm run test:watch
```

### Linting Issues

```bash
# Auto-fix linting issues
npm run lint:fix
```

## Need Help?

- Open an issue on GitHub
- Check existing documentation
- Review example files in `tests/` (SQL files can be used as examples)

[EOF]
