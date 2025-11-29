# Architecture Documentation

## System Overview

This document describes the architecture of the `plan-viz` package, which converts Apache Data Fusion Physical Execution Plans into Excalidraw JSON format.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
├─────────────────────────────┬───────────────────────────────┤
│         CLI Tool            │      Library API              │
│      (src/cli.ts)           │    (src/index.ts)             │
└──────────────┬──────────────┴──────────────┬────────────────┘
               │                              │
               └──────────────┬───────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │     Converter Service          │
              │  (Facade/Orchestrator)         │
              │  - Validates input             │
              │  - Coordinates conversion      │
              └───────┬───────────────┬────────┘
                      │               │
            ┌─────────▼──────┐   ┌───▼─────────────┐
            │ Parser Layer   │   │ Generator Layer │
            └─────────┬──────┘   └───┬─────────────┘
                      │               │
                      │               │
                      ▼               ▼
```

## Layer Breakdown

### 1. Interface Layer

#### CLI Interface (`src/cli.ts`)
- **Responsibility**: Command-line argument parsing and file I/O
- **Dependencies**: Commander.js, fs, path
- **Key Features**:
  - Read from file or stdin
  - Write to file or stdout
  - Configurable options via flags
  - Error handling and user feedback

#### Library Interface (`src/index.ts`)
- **Responsibility**: Public API for programmatic use
- **Exports**:
  - Main function: `convertPlanToExcalidraw()`
  - All types for TypeScript consumers
  - Core classes for advanced usage

### 2. Service Layer

#### Converter Service (`src/services/converter.service.ts`)
- **Pattern**: Facade
- **Responsibility**: Orchestrate the conversion process
- **Key Operations**:
  1. Validate input
  2. Delegate parsing to parser
  3. Delegate generation to generator
  4. Return result or throw error
- **Benefits**:
  - Simple interface for complex operations
  - Single point of configuration
  - Easy to extend with new features

```typescript
class ConverterService {
  constructor(config: ConverterConfig)
  convert(planText: string): ExcalidrawData
}
```

### 3. Parser Layer

#### Execution Plan Parser (`src/parsers/execution-plan.parser.ts`)
- **Pattern**: Builder
- **Responsibility**: Parse text into structured tree
- **Algorithm**:
  1. Preprocess lines (trim, filter empty)
  2. Calculate indentation levels
  3. Extract operators and properties
  4. Build hierarchical tree structure
- **Key Features**:
  - Configurable indentation size
  - Property extraction (key=value pairs)
  - Handles tabs and spaces
  - Preserves tree hierarchy

```typescript
class ExecutionPlanParser {
  constructor(config?: ParserConfig)
  parse(planText: string): ParsedExecutionPlan
}
```

### 4. Generator Layer

#### Excalidraw Generator (`src/generators/excalidraw.generator.ts`)
- **Pattern**: Coordinator
- **Responsibility**: Coordinate conversion by delegating to specialized node generators
- **Algorithm**:
  1. Initialize utility classes and register node generators
  2. Traverse tree recursively
  3. For each node:
     - Look up appropriate generator from registry
     - Delegate generation to specialized generator strategy
     - Collect generated elements
  4. Return complete Excalidraw data structure
- **Key Features**:
  - Acts as coordinator, not implementer
  - Extensible through registry pattern
  - Configurable dimensions and colors
  - Delegates all node-specific logic to strategies

```typescript
class ExcalidrawGenerator {
  private nodeGeneratorRegistry: NodeGeneratorRegistry;
  private elementFactory: ElementFactory;
  private propertyParser: PropertyParser;
  // ... other utilities
  
  constructor(config?: ExcalidrawConfig) {
    // Initialize utilities
    // Register node generators
  }
  
  generate(root: ExecutionPlanNode | null): ExcalidrawData {
    // Coordinate generation
  }
  
  private generateNodeElements(...): NodeInfo {
    // Delegate to registered generator
  }
}
```

#### Node Generator Strategies (`src/generators/generators/`)
- **Pattern**: Strategy
- **Responsibility**: Generate Excalidraw elements for specific operator types
- **Key Generators**:
  - `DataSourceNodeGenerator`: Handles file groups, ellipses, DynamicFilter
  - `FilterNodeGenerator`: Handles filter predicates and projections
  - `AggregateNodeGenerator`: Handles aggregation modes, grouping, ordering
  - `HashJoinNodeGenerator`: Handles hash joins with hash table visualization
  - `SortMergeJoinNodeGenerator`: Handles sort-merge joins with validation
  - `UnionNodeGenerator`: Handles multiple children with horizontal layout
  - `LocalLimitNodeGenerator`: Handles local limit per partition
  - `GlobalLimitNodeGenerator`: Handles global limit across partitions
  - `DefaultNodeGenerator`: Fallback for unimplemented operators
  - And 6 more specialized generators (CoalesceBatchesNodeGenerator, CoalescePartitionsNodeGenerator, RepartitionNodeGenerator, ProjectionNodeGenerator, SortNodeGenerator, SortPreservingMergeNodeGenerator)
- **Benefits**:
  - Single Responsibility: Each generator handles one operator type
  - Open/Closed: New operators can be added without modifying existing code
  - Testability: Each generator can be tested independently

#### Utility Classes (`src/generators/utils/`)
- **IdGenerator**: Generates unique IDs, indices, and seeds for Excalidraw elements
- **TextMeasurement**: Calculates text width for layout
- **PropertyParser**: Extracts and parses node properties (file groups, expressions, etc.)
- **ArrowPositionCalculator**: Calculates arrow positions with ellipsis support
- **GeometryUtils**: Geometric calculations (ellipse intersections, centered regions)
- **LayoutCalculator**: Node positioning and layout calculations

#### Factories (`src/generators/factories/`)
- **ElementFactory**: Centralized creation of Excalidraw elements (rectangles, text, arrows, ellipses)
  - Ensures consistent element properties
  - Handles version detection for different Excalidraw formats

#### Renderers (`src/generators/renderers/`)
- **ColumnLabelRenderer**: Renders column labels with color coding for sorted columns

#### Builders (`src/generators/builders/`)
- **DetailTextBuilder**: Constructs multi-line detail text with color coding

## Data Flow

### Parsing Flow

```
Input Text:
┌───────────────────────────────────────┐
│ ProjectionExec: expr=[a, b]           │
│   FilterExec: predicate=x>10          │
│     DataSourceExec: file_groups={...} │
└───────────────────────────────────────┘
              │
              ▼
      [Preprocessing]
              │
              ▼
      Lines with levels:
      0: "ProjectionExec: expr=[a, b]"
      1: "FilterExec: predicate=x>10"
      2: "DataSourceExec: file_groups={...}"
              │
              ▼
      [Extract Operators]
              │
              ▼
      Operator nodes with properties
              │
              ▼
      [Build Hierarchy]
              │
              ▼
      Tree Structure:
┌─────────────────────────────┐
│ ProjectionExec              │
│ properties: {expr: "[a,b]"} │
│   └─ FilterExec             │
│      properties: {...}      │
│        └─ DataSourceExec    │
│           properties: {...} │
└─────────────────────────────┘
```

### Generation Flow

```
Tree Structure
      │
      ▼
[Traverse Tree]
      │
      ├─► [Create Rectangle] ──► Rectangle Element
      │                            (position, size, style)
      │
      ├─► [Create Text] ──────► Text Element
      │                         (operator name + properties)
      │
      ├─► [Create Arrow] ─────► Arrow Element
      │                         (parent to child)
      │
      └─► [Calculate Positions]
              │
              ▼
      Excalidraw JSON:
      {
        type: "excalidraw",
        elements: [
          { type: "rectangle", x, y, ... },
          { type: "text", text, ... },
          { type: "arrow", points, ... },
          ...
        ]
      }
```

## Type System

### Core Types

```
ExecutionPlanNode
├── operator: string
├── properties?: Record<string, string>
├── children: ExecutionPlanNode[]
└── level: number

ExcalidrawData
├── type: "excalidraw"
├── version: number
├── elements: ExcalidrawElement[]
│   ├── ExcalidrawRectangle
│   ├── ExcalidrawText
│   └── ExcalidrawArrow
└── appState: {...}
```

## Design Patterns

The codebase follows SOLID principles and DRY through focused utility classes and design patterns:

### 1. Coordinator Pattern
- **ExcalidrawGenerator**: Acts as a coordinator, delegating node generation to specialized strategies
- **Benefits**: Separation of concerns, extensibility

### 2. Strategy Pattern
- **Node Generator Strategies**: Each operator type has its own generator strategy (14 specialized generators + default)
- **NodeGeneratorRegistry**: Manages generator registration and lookup
- **Benefits**: Open/Closed principle - new operators can be added without modifying existing code

### 3. Factory Pattern
- **ElementFactory**: Centralized creation of Excalidraw elements for consistent element generation
- **Benefits**: Consistent element properties, version handling

### 4. Builder Pattern
- **DetailTextBuilder**: Constructs multi-line text elements with color coding
- **Parser & Generator**: Step-by-step construction
- **Benefits**: Flexible, readable, maintainable

### 5. Renderer Pattern
- **ColumnLabelRenderer**: Consistent column label formatting and color coding
- **Benefits**: Separation of rendering logic

### 6. Facade Pattern
- **ConverterService**: Single, simplified interface for complex subsystems
- **Benefits**: Easy to use, hides complexity

### 7. Utility Classes
Common functionality extracted into focused utilities:
- `IdGenerator`, `TextMeasurement`, `PropertyParser` for core operations
- `ArrowPositionCalculator`, `LayoutCalculator`, `GeometryUtils` for layout and positioning
- **Benefits**: DRY principle, testability, maintainability

### 8. Dependency Injection
- **Problem**: Tight coupling between components
- **Solution**: Pass dependencies via constructor
- **Benefits**: Testable, flexible, follows DIP

### 9. Configuration Objects
- **Problem**: Many constructor parameters
- **Solution**: Single config object with defaults
- **Benefits**: Optional parameters, extensible

## SOLID Principles Applied

The project follows Clean Code principles and SOLID design patterns:

- **Single Responsibility**: Each class has one clear purpose
- **Open/Closed**: Extensible through configuration and strategy pattern
- **Liskov Substitution**: Interfaces are contract-based
- **Interface Segregation**: Minimal, focused interfaces
- **Dependency Inversion**: Depends on abstractions, not implementations

### Single Responsibility Principle (SRP)
- ✅ `ExecutionPlanParser`: Only parses plans
- ✅ `ExcalidrawGenerator`: Only coordinates generation (delegates to strategies)
- ✅ `ConverterService`: Only orchestrates conversion
- ✅ Each node generator: Handles one operator type
- ✅ Each utility class: Performs one specific function
- ✅ Each class has one reason to change

### Open/Closed Principle (OCP)
- ✅ Extensible via configuration
- ✅ New features don't require modifying existing code
- ✅ Can add new parsers/generators by implementing interfaces
- ✅ New operator types can be added by creating a new generator strategy and registering it
- ✅ No need to modify `ExcalidrawGenerator` when adding new operators

### Liskov Substitution Principle (LSP)
- ✅ Interfaces define clear contracts
- ✅ Implementations can be swapped
- ✅ Configuration objects are composable

### Interface Segregation Principle (ISP)
- ✅ Minimal, focused interfaces
- ✅ ParserConfig separate from GeneratorConfig
- ✅ Clients only depend on what they use

### Dependency Inversion Principle (DIP)
- ✅ High-level modules depend on abstractions
- ✅ Configuration injected via constructors
- ✅ No direct instantiation of dependencies in services

## Error Handling Strategy

### Validation Points

1. **Input Validation** (ConverterService)
   - Empty strings
   - Null/undefined values
   - Invalid format

2. **Parse Validation** (ExecutionPlanParser)
   - No valid operators found
   - Malformed indentation
   - Invalid syntax

3. **Generation Validation** (ExcalidrawGenerator)
   - Null tree node
   - Invalid configuration values

### Error Types

```typescript
// User errors (bad input)
throw new Error('Execution plan text cannot be empty');

// System errors (unexpected)
throw new Error('Failed to parse execution plan: ...');
```

## Testing Strategy

### Unit Tests
- **Parser Tests**: 15+ test cases
  - Various plan structures
  - Edge cases (empty, malformed)
  - Property extraction
  - Indentation handling

- **Generator Tests**: 12+ test cases
  - Single node
  - Multiple children
  - Deep nesting
  - Custom configuration

- **Service Tests**: 8+ test cases
  - End-to-end conversion
  - Error handling
  - Configuration passing

### Integration Tests
- Full conversion flow
- CLI argument parsing
- File I/O operations

### Coverage Target
- Minimum 80% across all metrics
- Branches, functions, lines, statements

## Configuration Architecture

### Layered Configuration

```
User Config
    │
    ▼
ConverterConfig
    ├─► ParserConfig
    │   ├─ indentationSize
    │   └─ extractProperties
    │
    └─► ExcalidrawConfig
        ├─ nodeWidth
        ├─ nodeHeight
        ├─ verticalSpacing
        ├─ horizontalSpacing
        ├─ operatorFontSize
        ├─ detailsFontSize
        ├─ nodeColor
        └─ arrowColor
```

### Default Values
All configuration is optional with sensible defaults:
- Parser: 2-space indentation, property extraction enabled
- Generator: 200x80 nodes, 100/50 spacing, operator font size 18, details font size 14, blue theme

## Extension Points

### Adding New Features

1. **New Operator Types**
   - No code changes needed
   - Parser handles any operator name
   - Generator treats all nodes uniformly

2. **Custom Layouts**
   - Extend `ExcalidrawGenerator`
   - Override layout calculation methods
   - Maintain same interface

3. **Additional Output Formats**
   - Create new generator (e.g., `MermaidGenerator`)
   - Implement same interface
   - Plug into `ConverterService`

4. **Enhanced Parsing**
   - Extend `ExecutionPlanParser`
   - Add new parsing rules
   - Maintain backward compatibility

## Performance Considerations

### Time Complexity
- **Parsing**: O(n) where n = number of lines
- **Tree Building**: O(n) with stack-based approach
- **Generation**: O(m) where m = number of nodes
- **Overall**: O(n + m) ≈ O(n)

### Space Complexity
- **Tree Storage**: O(m) for node objects
- **Element Storage**: O(3m) for rect, text, arrow per node
- **Overall**: O(m) where m = number of operators

### Optimizations
- Single-pass parsing
- No redundant tree traversals
- Efficient ID generation
- Minimal object copying

## Security Considerations

1. **Input Sanitization**
   - No code execution from input
   - Text-only processing
   - Safe JSON generation

2. **File System Access** (CLI only)
   - Path validation
   - Error handling for missing files
   - No arbitrary file access

3. **Dependencies**
   - Minimal dependencies (only Commander for CLI)
   - All dev dependencies are well-known packages
   - Regular security audits recommended

## Future Architecture Enhancements

### Potential Improvements

1. **Plugin System**
   - Allow custom parsers/generators
   - Plugin discovery mechanism
   - Configuration per plugin

2. **Streaming API**
   - Handle very large plans
   - Stream parsing and generation
   - Reduce memory footprint

3. **Caching Layer**
   - Cache parsed trees
   - Reuse generation results
   - Invalidation strategy

4. **Validation Layer**
   - Schema validation for plans
   - Type checking for operators
   - Metadata enrichment

## Refactoring Summary

### Major Refactoring (v0.1.7)

The `ExcalidrawGenerator` class underwent a comprehensive refactoring to follow SOLID principles:

**Before**: 6071 lines, monolithic class handling all operator types
**After**: 176 lines, coordinator pattern delegating to specialized generators

**Key Improvements**:
- **97.1% code reduction** in main generator class
- **14 specialized node generators** extracted (one per operator type)
- **6 utility classes** for common operations
- **Factory, Strategy, Builder, Renderer patterns** implemented
- **100% test coverage maintained** throughout refactoring
- **Zero functionality changes** - all tests passing

**Architecture Benefits**:
- Single Responsibility: Each class has one clear purpose
- Open/Closed: New operators can be added without modifying existing code
- Testability: Smaller, focused classes are easier to test
- Maintainability: Easier to locate and fix bugs
- Readability: Smaller files and methods are easier to understand

---

**Last Updated**: November 28, 2025  
**Version**: 0.1.7

