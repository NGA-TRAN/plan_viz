# Architecture Documentation

## System Overview

This document describes the architecture of the `datafusion-plan-viz` package, which converts Apache Data Fusion Physical Execution Plans into Excalidraw JSON format.

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
- **Pattern**: Builder
- **Responsibility**: Transform tree into Excalidraw JSON
- **Algorithm**:
  1. Traverse tree recursively
  2. For each node:
     - Create rectangle element
     - Create text element
     - Create arrow to parent (if not root)
  3. Calculate positions for layout
  4. Generate unique IDs and seeds
- **Key Features**:
  - Configurable dimensions
  - Configurable colors
  - Automatic layout calculation
  - Support for multiple children

```typescript
class ExcalidrawGenerator {
  constructor(config?: ExcalidrawConfig)
  generate(root: ExecutionPlanNode | null): ExcalidrawData
}
```

## Data Flow

### Parsing Flow

```
Input Text:
┌─────────────────────────────┐
│ ProjectionExec: expr=[a, b] │
│   FilterExec: predicate=x>10│
│     TableScan: table=users  │
└─────────────────────────────┘
              │
              ▼
      [Preprocessing]
              │
              ▼
      Lines with levels:
      0: "ProjectionExec: expr=[a, b]"
      1: "FilterExec: predicate=x>10"
      2: "TableScan: table=users"
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
│        └─ TableScan         │
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

### 1. Facade Pattern (ConverterService)
**Problem**: Complex subsystems (parser + generator)  
**Solution**: Single, simplified interface  
**Benefits**: Easy to use, hides complexity

### 2. Builder Pattern (Parser & Generator)
**Problem**: Complex object construction  
**Solution**: Step-by-step construction  
**Benefits**: Flexible, readable, maintainable

### 3. Dependency Injection
**Problem**: Tight coupling between components  
**Solution**: Pass dependencies via constructor  
**Benefits**: Testable, flexible, follows DIP

### 4. Configuration Objects
**Problem**: Many constructor parameters  
**Solution**: Single config object with defaults  
**Benefits**: Optional parameters, extensible

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
- ✅ `ExecutionPlanParser`: Only parses plans
- ✅ `ExcalidrawGenerator`: Only generates Excalidraw
- ✅ `ConverterService`: Only orchestrates conversion
- ✅ Each class has one reason to change

### Open/Closed Principle (OCP)
- ✅ Extensible via configuration
- ✅ New features don't require modifying existing code
- ✅ Can add new parsers/generators by implementing interfaces

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
        ├─ fontSize
        ├─ nodeColor
        └─ arrowColor
```

### Default Values
All configuration is optional with sensible defaults:
- Parser: 2-space indentation, property extraction enabled
- Generator: 200x80 nodes, 100/50 spacing, blue theme

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

---

**Last Updated**: November 17, 2025  
**Version**: 0.1.0

