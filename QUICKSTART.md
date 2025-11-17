# Quick Start Guide

Get up and running with datafusion-plan-viz in minutes!

## Installation

```bash
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

Create a file `example.ts`:

```typescript
import { convertPlanToExcalidraw } from './src/index';

const plan = `
ProjectionExec: expr=[id, name]
  FilterExec: predicate=age > 18
    TableScan: table=users
`;

const result = convertPlanToExcalidraw(plan);
console.log(JSON.stringify(result, null, 2));
```

Run it:
```bash
npx ts-node example.ts
```

### 2. As a CLI Tool

After building:

```bash
# From file
node dist/cli.js -i examples/simple-plan.txt -o output.json

# From stdin
cat examples/simple-plan.txt | node dist/cli.js > output.json
```

## Viewing the Output

1. Go to [Excalidraw](https://excalidraw.com/)
2. Click "Open" in the top menu
3. Upload your generated JSON file
4. View your execution plan diagram!

## Next Steps

- Read the [README.md](README.md) for detailed documentation
- Check out [CONTRIBUTING.md](CONTRIBUTING.md) to contribute
- Explore [examples/](examples/) for more use cases
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
- Review example files in `examples/`

