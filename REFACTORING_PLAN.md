# Excalidraw Generator Refactoring Plan

## Overview
This document outlines the refactoring plan for `excalidraw.generator.ts` to follow SOLID principles, DRY, and best practices while maintaining 100% functional compatibility.

## Current Issues

### 1. **Single Responsibility Principle Violations**
- The `ExcalidrawGenerator` class handles:
  - Element creation (rectangles, text, arrows, ellipses)
  - Property parsing
  - Layout calculations
  - Arrow positioning
  - Column label rendering
  - 15+ different node type generators

### 2. **DRY Violations**
- Repeated element creation code (rectangles, text, arrows)
- Duplicated property parsing logic (`parseCommaSeparated` appears multiple times)
- Repeated arrow position calculations
- Similar child processing patterns across node types

### 3. **Code Complexity**
- File is 6071 lines long
- Methods exceed 500 lines
- Deep nesting and complex conditionals
- Magic numbers scattered throughout

### 4. **Open/Closed Principle Violations**
- Adding new node types requires modifying the main class
- No clear extension points

## Refactoring Strategy

### Phase 1: Extract Utilities and Constants

#### 1.1 Constants Module (`constants.ts`)
```typescript
export const NODE_DIMENSIONS = {
  DEFAULT_WIDTH: 200,
  DEFAULT_HEIGHT: 80,
  DATASOURCE_WIDTH: 300,
  DATASOURCE_HEIGHT: 100,
  // ... other dimensions
};

export const SPACING = {
  VERTICAL: 100,
  HORIZONTAL: 50,
  ARROW_VERTICAL_RATIO: 3/5,
  // ...
};

export const COLORS = {
  NODE_DEFAULT: '#1e1e1e',
  ARROW_DEFAULT: '#1e1e1e',
  ORDERED_COLUMN: '#1e90ff',
  ORANGE_BORDER: '#f08c00',
  PURPLE_MODE: '#9b59b6',
  DARK_RED: '#8b0000',
  // ...
};

export const ARROW_CONSTANTS = {
  MAX_ARROWS_FOR_ELLIPSIS: 8,
  ARROWS_BEFORE_ELLIPSIS: 2,
  ARROWS_AFTER_ELLIPSIS: 2,
  MIN_ARROW_SPACING: 20,
  CENTRAL_REGION_RATIO: 0.6,
};
```

#### 1.2 Element Factory (`factories/element.factory.ts`)
```typescript
export class ElementFactory {
  createRectangle(options: RectangleOptions): ExcalidrawRectangle
  createText(options: TextOptions): ExcalidrawText
  createArrow(options: ArrowOptions): ExcalidrawArrow
  createEllipse(options: EllipseOptions): ExcalidrawEllipse
}
```

#### 1.3 Property Parser (`utils/property.parser.ts`)
```typescript
export class PropertyParser {
  parseCommaSeparated(text: string): string[]
  extractColumns(property: string): string[]
  extractSortOrder(property: string): string[]
  parseFileGroups(properties: Record<string, string>): string[][]
  extractJoinKeys(onProperty: string): string[]
  // ... other parsing methods
}
```

#### 1.4 Arrow Position Calculator (`utils/arrow-position.calculator.ts`)
```typescript
export class ArrowPositionCalculator {
  calculateOutputPositions(count: number, x: number, width: number): ArrowPositions
  distributeArrows(count: number, left: number, right: number): number[]
  calculateEllipsisPositions(positions: number[]): EllipsisResult
}
```

#### 1.5 Column Label Renderer (`renderers/column-label.renderer.ts`)
```typescript
export class ColumnLabelRenderer {
  renderLabels(
    columns: string[],
    sortOrder: string[],
    position: { x: number; y: number },
    alignment: 'left' | 'right'
  ): ExcalidrawText[]
}
```

### Phase 2: Extract Node Generators

#### 2.1 Node Generator Strategy Interface (`generators/node-generator.strategy.ts`)
```typescript
export interface NodeInfo {
  x: number;
  y: number;
  width: number;
  height: number;
  rectId: string;
  inputArrowCount: number;
  inputArrowPositions: number[];
  outputColumns: string[];
  outputSortOrder: string[];
}

export interface NodeGeneratorStrategy {
  generate(
    node: ExecutionPlanNode,
    x: number,
    y: number,
    elements: ExcalidrawElement[],
    isRoot: boolean,
    context: GenerationContext
  ): NodeInfo;
}
```

#### 2.2 Base Node Generator (`generators/base-node.generator.ts`)
```typescript
export abstract class BaseNodeGenerator implements NodeGeneratorStrategy {
  protected elementFactory: ElementFactory;
  protected propertyParser: PropertyParser;
  protected arrowCalculator: ArrowPositionCalculator;
  
  abstract generate(...): NodeInfo;
  
  protected createNodeRectangle(...): ExcalidrawRectangle
  protected processChildren(...): ChildProcessingResult
  protected createArrows(...): void
  // Common functionality
}
```

#### 2.3 Individual Node Generators
- `generators/data-source-node.generator.ts`
- `generators/filter-node.generator.ts`
- `generators/coalesce-batches-node.generator.ts`
- `generators/repartition-node.generator.ts`
- `generators/aggregate-node.generator.ts`
- `generators/projection-node.generator.ts`
- `generators/sort-node.generator.ts`
- `generators/sort-preserving-merge-node.generator.ts`
- `generators/coalesce-partitions-node.generator.ts`
- `generators/hash-join-node.generator.ts`
- `generators/sort-merge-join-node.generator.ts`
- `generators/union-node.generator.ts`
- `generators/default-node.generator.ts` (for unimplemented operators)

#### 2.4 Node Generator Registry (`generators/node-generator.registry.ts`)
```typescript
export class NodeGeneratorRegistry {
  private generators: Map<string, NodeGeneratorStrategy>;
  
  register(operator: string, generator: NodeGeneratorStrategy): void
  getGenerator(operator: string): NodeGeneratorStrategy
  hasGenerator(operator: string): boolean
}
```

### Phase 3: Extract Supporting Utilities

#### 3.1 Layout Calculator (`utils/layout.calculator.ts`)
```typescript
export class LayoutCalculator {
  calculateChildPosition(parent: NodeInfo, childIndex: number): Position
  centerChildren(children: NodeInfo[], parentX: number, parentWidth: number): Position[]
  calculateMaxChildY(children: NodeInfo[]): number
}
```

#### 3.2 Child Processor (`utils/child.processor.ts`)
```typescript
export class ChildProcessor {
  processChildren(
    node: ExecutionPlanNode,
    parentInfo: NodeInfo,
    elements: ExcalidrawElement[],
    context: GenerationContext
  ): ChildProcessingResult
}
```

#### 3.3 Geometry Utils (`utils/geometry.utils.ts`)
```typescript
export class GeometryUtils {
  getEllipseEdgePoint(
    pointX: number,
    pointY: number,
    ellipseCenterX: number,
    ellipseCenterY: number,
    ellipseWidth: number,
    ellipseHeight: number
  ): [number, number]
  
  calculateCenteredRegion(left: number, right: number, ratio: number): Region
}
```

#### 3.4 ID Generator (`utils/id.generator.ts`)
```typescript
export class IdGenerator {
  generateId(): string
  generateIndex(): string
  generateSeed(): number
  reset(): void
}
```

#### 3.5 Text Measurement (`utils/text-measurement.ts`)
```typescript
export class TextMeasurement {
  measureText(text: string, fontSize: number): number
}
```

#### 3.6 Detail Text Builder (`builders/detail-text.builder.ts`)
```typescript
export class DetailTextBuilder {
  addLine(text: string, color?: string): this
  build(): ExcalidrawText[]
}
```

### Phase 4: Refactor Main Generator

#### 4.1 Simplified ExcalidrawGenerator
```typescript
export class ExcalidrawGenerator {
  private registry: NodeGeneratorRegistry;
  private idGenerator: IdGenerator;
  private config: Required<ExcalidrawConfig>;
  
  constructor(config: ExcalidrawConfig = {}) {
    // Initialize dependencies
    // Register all node generators
  }
  
  generate(root: ExecutionPlanNode | null): ExcalidrawData {
    // High-level orchestration only
  }
  
  private generateNodeElements(...): NodeInfo {
    // Simple dispatch using registry
  }
}
```

## File Structure After Refactoring

```
src/generators/
├── excalidraw.generator.ts          # Main coordinator (simplified)
├── constants.ts                      # All constants
├── factories/
│   └── element.factory.ts           # Element creation
├── generators/
│   ├── node-generator.strategy.ts   # Interface
│   ├── base-node.generator.ts        # Base class
│   ├── data-source-node.generator.ts
│   ├── filter-node.generator.ts
│   ├── coalesce-batches-node.generator.ts
│   ├── coalesce-partitions-node.generator.ts
│   ├── repartition-node.generator.ts
│   ├── aggregate-node.generator.ts
│   ├── projection-node.generator.ts
│   ├── sort-node.generator.ts
│   ├── sort-preserving-merge-node.generator.ts
│   ├── hash-join-node.generator.ts
│   ├── sort-merge-join-node.generator.ts
│   ├── union-node.generator.ts
│   ├── default-node.generator.ts
│   └── node-generator.registry.ts
├── utils/
│   ├── property.parser.ts
│   ├── arrow-position.calculator.ts
│   ├── layout.calculator.ts
│   ├── child.processor.ts
│   ├── geometry.utils.ts
│   ├── id.generator.ts
│   └── text-measurement.ts
├── renderers/
│   └── column-label.renderer.ts
└── builders/
    └── detail-text.builder.ts
```

## Benefits

1. **Single Responsibility**: Each class has one clear purpose
2. **DRY**: Common patterns extracted and reused
3. **Open/Closed**: New node types can be added without modifying existing code
4. **Testability**: Smaller, focused classes are easier to test
5. **Maintainability**: Easier to locate and fix bugs
6. **Readability**: Smaller files and methods are easier to understand

## Migration Strategy

1. **Step 1**: Extract utilities and constants (no functionality change)
2. **Step 2**: Create interfaces and base classes
3. **Step 3**: Extract one node generator at a time, test after each
4. **Step 4**: Refactor main generator to use registry
5. **Step 5**: Remove old code, verify all tests pass

## Testing Strategy

- Run existing test suite after each phase
- Ensure no visual changes in generated Excalidraw files
- Compare JSON output before/after refactoring
- Add unit tests for new utility classes

## Risk Mitigation

- Refactor incrementally
- Keep old code until new code is verified
- Maintain backward compatibility
- Comprehensive test coverage before removing old code

