# Project Structure

```
plan_viz/
├── src/
│   ├── types/              # Type definitions
│   ├── parsers/            # Execution plan parsers
│   ├── generators/         # Excalidraw generators
│   │   ├── utils/          # Utility classes
│   │   │   ├── id.generator.ts          # Unique ID generation
│   │   │   ├── text-measurement.ts       # Text width calculation
│   │   │   ├── property.parser.ts        # Property extraction and parsing
│   │   │   ├── arrow-position.calculator.ts  # Arrow positioning logic
│   │   │   ├── geometry.utils.ts         # Geometric calculations
│   │   │   └── layout.calculator.ts      # Layout calculations
│   │   ├── factories/      # Element creation factories
│   │   │   └── element.factory.ts       # Centralized element creation
│   │   ├── generators/     # Node generator strategies
│   │   │   ├── node-generator.strategy.ts    # Strategy interface
│   │   │   ├── node-generator.registry.ts    # Generator registry
│   │   │   ├── base-node.generator.ts        # Base generator class
│   │   │   ├── default-node.generator.ts     # Default generator
│   │   │   ├── data-source-node.generator.ts
│   │   │   ├── filter-node.generator.ts
│   │   │   ├── coalesce-batches-node.generator.ts
│   │   │   ├── coalesce-partitions-node.generator.ts
│   │   │   ├── repartition-node.generator.ts
│   │   │   ├── aggregate-node.generator.ts
│   │   │   ├── projection-node.generator.ts
│   │   │   ├── sort-node.generator.ts
│   │   │   ├── sort-preserving-merge-node.generator.ts
│   │   │   ├── hash-join-node.generator.ts
│   │   │   ├── sort-merge-join-node.generator.ts
│   │   │   └── union-node.generator.ts
│   │   ├── renderers/      # Rendering utilities
│   │   │   └── column-label.renderer.ts  # Column label rendering
│   │   ├── builders/       # Builder classes
│   │   │   └── detail-text.builder.ts    # Multi-line text builder
│   │   ├── constants.ts    # Centralized configuration constants
│   │   └── excalidraw.generator.ts       # Main coordinator
│   ├── services/           # Business logic services
│   ├── cli.ts             # CLI entry point
│   └── index.ts           # Library entry point
├── tests/                 # Test fixtures and example execution plans
│   ├── *.sql              # Example SQL files (also used as test fixtures)
│   ├── expected/          # Expected Excalidraw outputs for tests
│   └── usage-example.ts   # Usage example script
├── dist/                  # Compiled output (gitignored)
├── coverage/              # Test coverage reports (gitignored)
└── package.json           # Project configuration
```

## Key Directories

- **`src/types/`**: TypeScript type definitions for execution plans and Excalidraw data structures
- **`src/parsers/`**: Parsing logic to convert plan text into structured tree format
- **`src/generators/`**: Core generation logic organized into utilities, factories, generators, renderers, and builders
- **`src/services/`**: High-level service layer that orchestrates parsing and generation
- **`tests/`**: Test fixtures (SQL files) and expected outputs (Excalidraw JSON files)

