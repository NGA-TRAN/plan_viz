# Project Structure

```
plan_viz/
├── src/
│   ├── types/              # Type definitions
│   ├── parsers/            # Execution plan parsers
│   ├── generators/         # Excalidraw generators
│   │   ├── utils/          # Utility classes (ID generation, text measurement, property parsing, etc.)
│   │   ├── factories/      # Element creation factories
│   │   ├── generators/     # Node generator strategies (13 specialized generators)
│   │   ├── renderers/      # Rendering utilities
│   │   ├── builders/       # Builder classes
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

