# Project Overview: plan-viz

## 📋 Summary

A professional Node.js/npm package for converting Apache DataFusion Physical Execution Plans to Excalidraw JSON format. Built with TypeScript following Clean Code principles and SOLID design patterns.

## 🏗️ Complete Project Structure

```
plan_viz/
├── 📄 Configuration Files
│   ├── package.json              # Project configuration & dependencies
│   ├── tsconfig.json             # TypeScript compiler configuration
│   ├── jest.config.js            # Jest testing configuration
│   ├── .eslintrc.json            # ESLint configuration (Google style)
│   ├── .prettierrc               # Prettier formatting configuration
│   ├── .czrc                     # Commitizen configuration
│   ├── .editorconfig             # Editor configuration
│   ├── .gitignore                # Git ignore rules
│   └── .npmignore                # NPM ignore rules
│
├── 📚 Documentation
│   ├── README.md                 # Main documentation
│   ├── QUICKSTART.md             # Quick start guide
│   ├── CONTRIBUTING.md           # Contributing guidelines
│   ├── CHANGELOG.md              # Version history
│   ├── LICENSE                   # MIT License
│   └── PROJECT_OVERVIEW.md       # This file
│
├── 🎯 Source Code (src/)
│   ├── types/                    # TypeScript type definitions
│   │   ├── execution-plan.types.ts
│   │   ├── excalidraw.types.ts
│   │   └── index.ts
│   │
│   ├── parsers/                  # Execution plan parsers
│   │   ├── execution-plan.parser.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── execution-plan.parser.test.ts
│   │
│   ├── generators/               # Excalidraw generators
│   │   ├── excalidraw.generator.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── excalidraw.generator.test.ts
│   │
│   ├── services/                 # Business logic services
│   │   ├── converter.service.ts
│   │   ├── index.ts
│   │   └── __tests__/
│   │       └── converter.service.test.ts
│   │
│   ├── index.ts                  # Library main entry point
│   ├── index.test.ts             # Library integration tests
│   └── cli.ts                    # CLI entry point
│
├── 🧪 Tests & Examples (tests/)
│   ├── *.sql                     # Example execution plans (also used as test fixtures)
│   ├── expected/                  # Expected Excalidraw outputs for integration tests
│   │   └── *.excalidraw          # Reference visualizations
│   ├── integration.test.ts       # Integration tests
│   └── usage-example.ts          # TypeScript usage examples
│
└── 🔧 Scripts
    ├── setup.sh                  # Unix/Linux setup script
    └── setup.ps1                 # Windows PowerShell setup script
```

## 🎨 Architecture Overview

### Design Patterns & Principles

**SOLID Principles:**
- ✅ **S**ingle Responsibility: Each class has one clear purpose
- ✅ **O**pen/Closed: Extensible through configuration interfaces
- ✅ **L**iskov Substitution: Interfaces are contract-based
- ✅ **I**nterface Segregation: Minimal, focused interfaces
- ✅ **D**ependency Inversion: Depends on abstractions

**Patterns Used:**
- **Facade Pattern**: ConverterService provides simple interface
- **Strategy Pattern**: Configurable parsing and generation
- **Builder Pattern**: Progressive construction of Excalidraw elements

### Component Flow

```
┌─────────────────┐
│  Input: Plan    │
│  Text String    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│  ExecutionPlanParser    │
│  • Parse text           │
│  • Extract operators    │
│  • Build tree structure │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  ExecutionPlanNode Tree │
│  (Internal Representation)│
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  ExcalidrawGenerator    │
│  • Create rectangles    │
│  • Add text labels      │
│  • Connect with arrows  │
└────────┬────────────────┘
         │
         ▼
┌─────────────────────────┐
│  Output: Excalidraw     │
│  JSON Format            │
└─────────────────────────┘
```

## 🚀 Quick Start

### 1. Setup

**Windows:**
```powershell
cd path\to\plan_viz
npm install
npm run build
```

**Unix/Linux/Mac:**
```bash
cd /path/to/plan_viz
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### 2. Run Tests

```bash
npm test                  # Run all tests
npm run test:coverage     # Generate coverage report
```

Expected: >80% coverage across all metrics

### 3. Try the CLI

```bash
# Convert a simple plan
node dist/cli.js -i tests/dataSource.sql -o output.excalidraw

# Convert a complex plan
node dist/cli.js -i tests/join.sql -o output.excalidraw

# With custom dimensions
node dist/cli.js -i tests/join.sql -o custom.excalidraw \
  --node-width 300 \
  --node-height 120 \
  --vertical-spacing 120
```

### 4. Use as Library

**Option A: Use the provided example**
```bash
npx ts-node tests/usage-example.ts
```

**Option B: Create your own file**

Create `test.ts`:
```typescript
import { convertPlanToExcalidraw } from './src/index';

const plan = `
ProjectionExec: expr=[id, name]
  FilterExec: predicate=age > 18
    DataSourceExec: file_groups={1 groups: [[users.parquet]]}, projection=[id, name, age], file_type=parquet
`;

const result = convertPlanToExcalidraw(plan);
console.log(JSON.stringify(result, null, 2));
```

Run:
```bash
npx ts-node test.ts
```

### 5. Available Examples

> **Note:** The `tests/` directory serves a dual purpose:
> - **Test fixtures**: SQL files and expected outputs (`tests/expected/`) for integration tests
> - **Examples**: SQL files you can use directly with the CLI

The `tests/` directory contains many sample execution plans:

- **Data sources**: `dataSource.sql`, `dataSource_2_inputs.sql`, `dataSource_3_inputs.sql`, `dataSource_4_inputs.sql`, `dataSource_read_seq_3.sql`, `dataSource_read_seq_4.sql`
- **Filters**: `fillter_coalesceBatch.sql`, `filter_coalesceBatch_read_seq_2.sql`, `filter_coalesceBatch_read_seq_many.sql`
- **Repartitioning**: `repartition.sql`, `coalescePartition.sql`
- **Aggregations**: `aggregate_single.sql`, `aggregate_single_sorted.sql`, `aggregate_partial_final.sql`
- **Joins**: `join.sql`, `join_hash_collectLeft.sql`, `join_aggregates.sql`
- **Sorting**: `sort.sql`, `sortPreservingMerge.sql`

Each example includes:
- A `.sql` file with the execution plan (in `tests/`)
- A `.excalidraw` file showing the expected visualization (in `tests/expected/`)

## 📊 Features Implemented

### Core Features
- ✅ Parse Apache DataFusion execution plans
- ✅ Extract operator properties (key=value pairs)
- ✅ Handle nested tree structures
- ✅ Generate Excalidraw-compatible JSON
- ✅ Support for multiple children per node
- ✅ Configurable dimensions and spacing
- ✅ Configurable colors and styling
- ✅ Separate font sizes for operator names and details

### Development Features
- ✅ TypeScript with strict type checking
- ✅ ESLint with Google style guide
- ✅ Prettier for code formatting
- ✅ Jest with >80% test coverage
- ✅ Commitizen for conventional commits
- ✅ Comprehensive documentation
- ✅ Example files
- ✅ Setup scripts (Unix & Windows)

## 🧪 Testing Strategy

### Test Coverage

```
File                         | % Stmts | % Branch | % Funcs | % Lines |
-----------------------------|---------|----------|---------|---------|
All files                    |   >80   |   >80    |   >80   |   >80   |
 parsers/                    |         |          |         |         |
  execution-plan.parser.ts   |         |          |         |         |
 generators/                 |         |          |         |         |
  excalidraw.generator.ts    |         |          |         |         |
 services/                   |         |          |         |         |
  converter.service.ts       |         |          |         |         |
```

### Test Files
- `execution-plan.parser.test.ts` - 15+ test cases
- `excalidraw.generator.test.ts` - 12+ test cases
- `converter.service.test.ts` - 8+ test cases
- `index.test.ts` - 5+ integration tests

## 📦 Package Information

**Package Name:** `plan-viz`  
**Version:** 0.1.4  
**License:** MIT  
**Node Version:** >=20.0.0 (LTS)  
**Language:** TypeScript 5.4  

### Dependencies
- `commander` - CLI argument parsing

### Dev Dependencies
- TypeScript toolchain
- Jest testing framework
- ESLint + Prettier
- Commitizen
- Type definitions (@types/node, @types/jest)

## 🔄 Git Workflow

**Strategy:** Trunk-based development  
**Commits:** Conventional commits via Commitizen  

### Making Commits
```bash
# Stage your changes
git add .

# Use commitizen for conventional commits
npm run commit

# Follow the prompts:
# - Select type (feat, fix, docs, etc.)
# - Enter scope (optional)
# - Write short description
# - Write long description (optional)
# - Confirm
```

## 📈 Next Steps

### For Development
1. Run `npm install` to install dependencies
2. Run `npm run build` to compile TypeScript
3. Run `npm test` to verify everything works
4. Start developing!

### For Publishing
1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Run `npm run prepublishOnly` (builds & tests)
4. Run `npm publish`

### For Contributing
1. Read `CONTRIBUTING.md`
2. Create feature branch
3. Make changes following code style
4. Write tests (maintain >80% coverage)
5. Use `npm run commit` for commits
6. Submit pull request

## 🛠️ Available Scripts

```bash
npm run build           # Compile TypeScript
npm run clean           # Remove dist/ and coverage/
npm test                # Run tests
npm run test:watch      # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
npm run lint            # Check code style
npm run lint:fix        # Auto-fix code style issues
npm run format          # Format code with Prettier
npm run commit          # Make a conventional commit
```

## 📖 API Reference

### Main Function

```typescript
convertPlanToExcalidraw(
  planText: string,
  config?: ConverterConfig
): ExcalidrawData
```

### Configuration Options

```typescript
interface ConverterConfig {
  parser?: {
    indentationSize?: number;        // Default: 2
    extractProperties?: boolean;      // Default: true
  };
  generator?: {
    nodeWidth?: number;               // Default: 200
    nodeHeight?: number;              // Default: 80
    verticalSpacing?: number;         // Default: 100
    horizontalSpacing?: number;       // Default: 50
    operatorFontSize?: number;       // Default: 18 (for operator name)
    detailsFontSize?: number;         // Default: 14 (for properties/details)
    nodeColor?: string;               // Default: '#1971c2'
    arrowColor?: string;              // Default: '#495057'
  };
}
```

## 🎯 Code Quality Metrics

- ✅ TypeScript strict mode enabled
- ✅ 0 `any` types allowed (enforced by ESLint)
- ✅ Max line length: 100 characters
- ✅ Indentation: 2 spaces
- ✅ Quotes: Single quotes
- ✅ Semicolons: Required
- ✅ Test coverage: >80%

## 📚 Resources

- [Apache DataFusion Docs](https://arrow.apache.org/datafusion/)
- [Excalidraw API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api)
- [Google TypeScript Guide](https://google.github.io/styleguide/tsguide.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Clean Code Principles](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)

## ✨ Key Highlights

1. **Professional Setup**: Complete npm package structure ready for publishing
2. **Type Safety**: Full TypeScript support with strict configuration
3. **Well Tested**: Comprehensive test suite with >80% coverage
4. **Clean Code**: Follows Google style guide and SOLID principles
5. **Developer Friendly**: Setup scripts, examples, and detailed documentation
6. **Production Ready**: Linting, formatting, and conventional commits configured
7. **Flexible**: Both library and CLI interfaces
8. **Extensible**: Easy to add new features through configuration

---

**Status:** ✅ Project Complete and Ready for Development

**Created:** November 17, 2025  
**Last Updated:** November 22, 2025

