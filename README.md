# datafusion-plan-viz

Convert Apache Data Fusion Physical Execution Plans to Excalidraw JSON format for beautiful visualization.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Code Style](https://img.shields.io/badge/code%20style-google-blueviolet)](https://google.github.io/styleguide/tsguide.html)

## Features

- 📊 Parse Apache Data Fusion Physical Execution Plans
- 🎨 Generate Excalidraw-compatible JSON diagrams
- 🔧 Use as a library or CLI tool
- ✅ TypeScript support with full type definitions
- 🧪 Comprehensive test coverage (>80%)
- 🏗️ Built with Clean Code and SOLID principles
- ⚡ Fast and lightweight

## Prerequisites

- Node.js 20+ (LTS)
- npm or yarn

## Installation

### For Development

```bash
git clone <repository-url>
cd plan_viz
npm install
npm run build
```

### As a Package (once published)

```bash
npm install datafusion-plan-viz
```

## Usage

### As a Library

```typescript
import { convertPlanToExcalidraw } from 'datafusion-plan-viz';

const executionPlan = `
PhysicalPlan
  ProjectionExec
    FilterExec
      TableScan
`;

const excalidrawJson = convertPlanToExcalidraw(executionPlan);
console.log(JSON.stringify(excalidrawJson, null, 2));
```

### As a CLI

```bash
# From file
datafusion-plan-viz -i plan.txt -o diagram.json

# From stdin
echo "PhysicalPlan..." | datafusion-plan-viz > diagram.json
```

## API

### `convertPlanToExcalidraw(plan: string): ExcalidrawData`

Converts an Apache Data Fusion Physical Execution Plan to Excalidraw JSON format.

**Parameters:**
- `plan` - The physical execution plan as a string

**Returns:**
- `ExcalidrawData` - Excalidraw-compatible JSON object

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run tests with coverage
npm test:coverage

# Lint
npm run lint

# Format
npm run format
```

## Project Structure

```
plan_viz/
├── src/
│   ├── types/              # Type definitions
│   ├── parsers/            # Execution plan parsers
│   ├── generators/         # Excalidraw generators
│   ├── services/           # Business logic services
│   ├── cli.ts             # CLI entry point
│   └── index.ts           # Library entry point
├── examples/              # Example execution plans
├── dist/                  # Compiled output (gitignored)
├── coverage/              # Test coverage reports
└── package.json           # Project configuration
```

## Architecture

The project follows Clean Code principles and SOLID design patterns:

- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Extensible through configuration
- **Liskov Substitution**: Interfaces are contract-based
- **Interface Segregation**: Minimal, focused interfaces
- **Dependency Inversion**: Depends on abstractions, not implementations

### Components

1. **ExecutionPlanParser**: Parses raw plan text into a tree structure
2. **ExcalidrawGenerator**: Converts plan trees to Excalidraw JSON
3. **ConverterService**: Orchestrates the conversion process

## Testing

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

Current coverage: >80% (branches, functions, lines, statements)

## Code Quality

- **Linting**: ESLint with Google TypeScript style guide
- **Formatting**: Prettier
- **Type Safety**: Strict TypeScript configuration
- **Testing**: Jest with comprehensive test suites

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

```bash
# Use commitizen for commits
npm run commit
```

### Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `test:` - Test updates
- `refactor:` - Code refactoring

## Roadmap

- [ ] Support for more DataFusion operators
- [ ] Interactive web interface
- [ ] Custom styling options
- [ ] Export to other diagram formats
- [ ] Performance optimizations for large plans

## Resources

- [Apache DataFusion](https://arrow.apache.org/datafusion/)
- [Excalidraw API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)

## License

MIT - see [LICENSE](LICENSE) for details

## Authors

Created with ❤️ for the Apache DataFusion community

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

