# plan-viz


[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Code Style](https://img.shields.io/badge/code%20style-google-blueviolet)](https://google.github.io/styleguide/tsguide.html)
[![CI/CD](https://github.com/NGA-TRAN/plan_viz/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/NGA-TRAN/plan_viz/actions/workflows/ci-cd.yml)

Convert Apache DataFusion physical execution plans into Excalidraw JSON format for easier visualization and understanding. The diagrams highlight key properties using different colors and propagate them throughout the plan, making it clear how many streams or partitions are executed in parallel at each operator and whether the sort order is preserved and leveraged.


<!-- > **Repository**: [GitHub](https://github.com/NGA-TRAN/plan_viz) | **Issues**: [Report a bug](https://github.com/NGA-TRAN/plan_viz/issues) -->

<!-- ## Features

- 📊 Parse Apache DataFusion Physical Execution Plans
- 🎨 Generate Excalidraw-compatible JSON diagrams
- 🔧 Use as a library or CLI tool
- ✅ TypeScript support with full type definitions
- 🧪 Comprehensive test coverage (>80%)
- 🏗️ Built with Clean Code and SOLID principles
- ⚡ Fast and lightweight -->

## Example

- **Input**: Full EXPLAIN output in indent format (including or excluding SQL query) or just the physical plan portion

  ```SQL
  | physical_plan | SortExec: expr=[env@0 ASC NULLS LAST, time_bin@1 ASC NULLS LAST], preserve_partitioning=[false]                                                                                                                                                                                                                                                                                                                                                                                            |
  |               |   AggregateExec: mode=Single, gby=[env@1 as env, time_bin@0 as time_bin], aggr=[avg(a.max_bin_val)]                                                                                                                                                                                                                                                                                                                                                                                        |
  |               |     ProjectionExec: expr=[date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)@1 as time_bin, max(j.env)@2 as env, max(j.value)@3 as max_bin_val]                                                                                                                                                                                                                                                                           |
  |               |       AggregateExec: mode=Final, gby=[f_dkey@0 as f_dkey, date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)@1 as date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)], aggr=[max(j.env), max(j.value)], ordering_mode=Sorted                                                                                                                             |
  |               |         SortPreservingMergeExec: [f_dkey@0 ASC NULLS LAST, date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)@1 ASC NULLS LAST]                                                                                                                                                                                                                                                                                           |
  |               |           AggregateExec: mode=Partial, gby=[f_dkey@0 as f_dkey, date_bin(IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }, timestamp@1) as date_bin(IntervalMonthDayNano("IntervalMonthDayNano { months: 0, days: 0, nanoseconds: 30000000000 }"),j.timestamp)], aggr=[max(j.env), max(j.value)], ordering_mode=Sorted                                                                                                                                                |
  |               |             ProjectionExec: expr=[f_dkey@1 as f_dkey, timestamp@2 as timestamp, env@0 as env, value@3 as value]                                                                                                                                                                                                                                                                                                                                                                            |
  |               |               CoalesceBatchesExec: target_batch_size=8192                                                                                                                                                                                                                                                                                                                                                                                                                                  |
  |               |                 HashJoinExec: mode=CollectLeft, join_type=Inner, on=[(d_dkey@0, f_dkey@0)], projection=[env@1, f_dkey@2, timestamp@3, value@4]                                                                                                                                                                                                                                                                                                                                             |
  |               |                   AggregateExec: mode=Final, gby=[d_dkey@0 as d_dkey, env@1 as env], aggr=[]                                                                                                                                                                                                                                                                                                                                                                                               |
  |               |                     CoalescePartitionsExec                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
  |               |                       AggregateExec: mode=Partial, gby=[d_dkey@0 as d_dkey, env@1 as env], aggr=[]                                                                                                                                                                                                                                                                                                                                                                                         |
  |               |                         CoalesceBatchesExec: target_batch_size=8192                                                                                                                                                                                                                                                                                                                                                                                                                        |
  |               |                           FilterExec: service@2 = log, projection=[d_dkey@0, env@1]                                                                                                                                                                                                                                                                                                                                                                                                        |
  |               |                             DataSourceExec: file_groups={2 groups: [[d1.parquet], [d2.parquet]]}, projection=[d_dkey, env, service], file_type=parquet, predicate=service@2 = log, pruning_predicate=service_null_count@2 != row_count@3 AND service_min@0 <= log AND log <= service_max@1, required_guarantees=[service in (log)] |
  |               |                   DataSourceExec: file_groups={3 groups: [[f1.parquet, f4.parquet, f5.parquet, f6.parquet, f7.parquet, f8.parquet], [f2.parquet], [f3.parquet, f9.parquet, f10.parquet]]}, projection=[f_dkey, timestamp, value], output_ordering=[f_dkey@0 ASC NULLS LAST, timestamp@1 ASC NULLS LAST], file_type=parquet, predicate=DynamicFilter [ empty ]             |
  ```


- **Output**: JSON format rendered in Excalidraw display

   - **Arrows between nodes** represent streams or partitions of data. Multiple arrows indicate that data is being streamed in parallel and independently.
   - **Blue highlights** denote attributes that are sorted.

  ![Execution Plan Visualization](docs/assets/join_aggregates.png)



## Prerequisites

- Node.js 20+ (LTS)
- npm or yarn

## Installation

### For Development

```bash
git clone https://github.com/NGA-TRAN/plan_viz.git
cd plan_viz
npm install
npm run build
```

### As a Package (published at https://www.npmjs.com/package/plan-viz)

```bash
npm install plan-viz
```

## Usage

### As a Library

```typescript
import { convertPlanToExcalidraw } from 'plan-viz';

const executionPlan = `
ProjectionExec: expr=[id, name, age]
  FilterExec: age > 18
    DataSourceExec: file_groups={1 groups: [[data.parquet]]}
      
`;

const excalidrawJson = convertPlanToExcalidraw(executionPlan);
console.log(JSON.stringify(excalidrawJson, null, 2));
```

**With Custom Configuration:**

```typescript
import { convertPlanToExcalidraw } from 'plan-viz';

const excalidrawJson = convertPlanToExcalidraw(executionPlan, {
  generator: {
    nodeWidth: 250,
    nodeHeight: 100,
    verticalSpacing: 120,
    horizontalSpacing: 60,
    operatorFontSize: 20,
    detailsFontSize: 16,
    nodeColor: '#64748b',
    arrowColor: '#64748b',
  },
});
```

### As a CLI

**After package installation `npm install plan-viz`:**

```bash
# Basic usage: from file
plan-viz -i examples/join.sql -o output.excalidraw

# From stdin
cat examples/join.sql | plan-viz > output.excalidraw

# With custom dimensions and spacing
plan-viz -i examples/join.sql -o output.excalidraw \
  --node-width 250 \
  --node-height 100 \
  --vertical-spacing 120 \
  --horizontal-spacing 60
```

**Building from Source Code:**
```bash
# After building the project
npm run build

# Basic usage: from file
node dist/cli.js -i examples/join.sql -o output.excalidraw

# From stdin
cat examples/join.sql | node dist/cli.js > output.excalidraw

# With custom dimensions and spacing
node dist/cli.js -i examples/join.sql -o output.excalidraw \
  --node-width 250 \
  --node-height 100 \
  --vertical-spacing 120 \
  --horizontal-spacing 60
```

**CLI Options:**
- `-i, --input <file>` - Input file containing the execution plan
- `-o, --output <file>` - Output file for Excalidraw JSON
- `--node-width <number>` - Width of each node box (default: 200)
- `--node-height <number>` - Height of each node box (default: 80)
- `--vertical-spacing <number>` - Vertical spacing between nodes (default: 100)
- `--horizontal-spacing <number>` - Horizontal spacing between sibling nodes (default: 50)

### Viewing the Output

#### Option 1: Use Online [Excalidraw](https://excalidraw.com/)

1. Go to [Excalidraw](https://excalidraw.com/)
2. Click "Open" in the top menu
3. Upload your generated `.excalidraw` file
4. View your execution plan diagram!

#### Option 2: Directly in your IDE

If you use an IDE such as VSCode or Cursor, you can install the Excalidraw extension and view the diagram directly in your IDE:

1. Install the Excalidraw extension from the marketplace (e.g., "Excalidraw" by pomdtr)
2. Open your generated `.excalidraw` file in your IDE
3. The diagram will render automatically in the editor

See the [`examples/`](examples/) directory for sample execution plans and their visualizations.

## API

#### `convertPlanToExcalidraw(plan: string, config?: ConverterConfig): ExcalidrawData`

Converts an Apache DataFusion Physical Execution Plan to Excalidraw JSON format.

**Parameters:**
- `plan` - The physical execution plan as a string
- `config` - Optional configuration object (see below)

**Returns:**
- `ExcalidrawData` - Excalidraw-compatible JSON object

**Throws:**
- `Error` - If the plan text is invalid or empty

**Configuration Options:**

```typescript
interface ConverterConfig {
  parser?: {
    indentationSize?: number;      // Default: 2
    extractProperties?: boolean;    // Default: true
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

**Example:**

```typescript
import { convertPlanToExcalidraw } from 'plan-viz';

const plan = `
ProjectionExec: expr=[id, name, age]
  FilterExec: age > 18
    DataSourceExec: file_groups={1 groups: [[data.parquet]]}
`;

const result = convertPlanToExcalidraw(plan, {
  generator: {
    nodeWidth: 250,
    nodeHeight: 100,
    nodeColor: '#64748b',
  },
});
```

## Examples

The project includes numerous example execution plans in the [`examples/`](examples/) directory, including:

- Data source plans (`dataSource*.sql`)
- Filter operations (`filter*.sql`)
- Repartitioning (`repartition*.sql`)
- Aggregation examples (`*aggregate*.sql`)
- Join operations (`join*.sql`)
- Sorting (`sort*.sql`)
- And many more!

Each example includes:
- A `.sql` file with the execution plan
- A `.excalidraw` file showing the generated visualization

Try them out:

```bash
# Convert an example (after building)
npm run build
node dist/cli.js -i examples/join.sql -o output.excalidraw

# Or use the usage example script
npx ts-node examples/usage-example.ts
```

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
├── coverage/              # Test coverage reports (gitignored)
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
- [ ] Enhanced custom styling options
- [ ] Export to other diagram formats (SVG, PNG, PDF)
- [ ] Performance optimizations for large plans
- [ ] Plan comparison and diff visualization

## Resources

- [Apache DataFusion](https://arrow.apache.org/datafusion/)
- [Excalidraw API](https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api)
- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Quick Start Guide](QUICKSTART.md) - Get started quickly
- [Project Overview](PROJECT_OVERVIEW.md) - Detailed architecture and design

## License

MIT - see [LICENSE](LICENSE) for details

## Authors

Created with ❤️ for the Apache DataFusion community

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

