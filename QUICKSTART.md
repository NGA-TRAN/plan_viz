# Quick Start Guide

Get up and running with plan-viz in minutes!

## Prerequisites

- Node.js 20+ (LTS)
- npm or yarn

## Installation

### Option 1: Install from npm (Recommended for usage)

```bash
npm install plan-viz
```

### Option 2: Build from source (For development)

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

**If installed from npm:**
```typescript
import { convertPlanToExcalidraw } from 'plan-viz';

const plan = `
ProjectionExec: expr=[id, name]
  FilterExec: predicate=age > 18
    DataSourceExec: file_groups={1 groups: [[users.parquet]]}, projection=[id, name, age], file_type=parquet
`;

const result = convertPlanToExcalidraw(plan);
console.log(JSON.stringify(result, null, 2));
```

**If building from source:**

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

**If installed from npm:**
```bash
# From file
plan-viz -i tests/join.sql -o output.excalidraw

# From stdin
cat tests/join.sql | plan-viz > output.excalidraw

# With custom options
plan-viz -i tests/join.sql -o output.excalidraw \
  --node-width 250 \
  --node-height 100 \
  --vertical-spacing 120 \
  --horizontal-spacing 60
```

**If building from source (after `npm run build`):**
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

**Option 1: Use the UI App [plan-visualizer](https://nga-tran.github.io/plan-visualizer)** (Recommended)
1. Enter your `EXPLAIN` output in the input panel
2. Click the **Visualize** button to see the graphical output

**Option 2: Use Online [Excalidraw](https://excalidraw.com/)**
1. Go to [Excalidraw](https://excalidraw.com/)
2. Click "Open" in the top menu
3. Upload your generated `.excalidraw` file
4. View your execution plan diagram!

**Option 3: Directly in your IDE**
1. Install the Excalidraw extension from the marketplace (e.g., "Excalidraw" by pomdtr)
2. Open your generated `.excalidraw` file in your IDE
3. The diagram will render automatically in the editor

## Available Examples

The `tests/` directory contains many sample execution plans you can try. Each example includes:
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

