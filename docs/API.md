# API reference

Single-node and distributed plans use the same `plan-viz` package and entry point.
See [installation and basic usage](../README.md#installation), [CLI options](CLI.md),
and [custom renderers](CUSTOM_OPERATORS.md#registering-a-renderer).

## `convertPlanToExcalidraw(plan: string, config?: ConverterConfig): ExcalidrawData`

Converts a single or distributed physical plan into Excalidraw-compatible JSON. This convenience function returns the scene; use `ConverterService.convertDetailed()` to inspect the selected document and diagnostics.

**Parameters:**

- `plan` - The physical execution plan as a string
- `config` - Optional configuration object (see below)

**Returns:**

- `ExcalidrawData` - Excalidraw-compatible JSON object

**Throws:**

- `Error` - If the input is empty, the section selection is missing/invalid, parsing fails, or a complete distributed graph violates its contracts

**Configuration Options:**

```typescript
interface ConverterConfig {
  input?: { section?: number }; // 1-based snapshot section
  distributed?: { workerDisplay?: 'representative' | 'all' };
  parser?: {
    indentationSize?: number;      // Default: 2
    extractProperties?: boolean;    // Default: true
  };
  generator?: {
    nodeWidth?: number;               // Default: 200
    nodeHeight?: number;              // Default: 80
    verticalSpacing?: number;         // Default: 100
    horizontalSpacing?: number;       // Default: 50
    fontSize?: number;                // Default: 16; base for derived font sizes
    operatorFontSize?: number;        // Default: 20 (for operator name)
    detailsFontSize?: number;         // Default: 14 (for properties/details)
    nodeColor?: string;               // Default: '#1e1e1e'
    arrowColor?: string;              // Default: '#1e1e1e'
    customGenerators?: Array<{
      operator: string;
      generator: NodeGeneratorStrategy;
    }>;
  };
}
```

**Example:**

```typescript
import { convertPlanToExcalidraw } from 'plan-viz';

const plan = `
ProjectionExec: expr=[id@0 as id, name@1 as name]
  FilterExec: age@2 > 18
    DataSourceExec: file_groups={1 groups: [[data.parquet]]}, projection=[id, name, age], file_type=parquet
`;

const result = convertPlanToExcalidraw(plan, {
  generator: {
    nodeWidth: 250,
    nodeHeight: 100,
    nodeColor: '#64748b',
  },
});
```

## Detailed conversion and parsing

```typescript
import { ConverterService, PlanDocumentParser } from 'plan-viz';

const result = new ConverterService({
  distributed: { workerDisplay: 'all' },
}).convertDetailed(executionPlan);

// result.scene: ExcalidrawData
// result.document.kind: 'single' | 'distributed' | 'recorded'
// result.diagnostics: Array<{ code: string; message: string; node?: string }>

const document = new PlanDocumentParser().parse(executionPlan);
```

`convertDetailed()` exposes incomplete topology, unknown counts, and unresolved
routing for distributed/recorded documents. Single-tree conversions currently
return an empty diagnostics list. `ConverterService.convert()` returns only the
scene, like `convertPlanToExcalidraw()`.

`PlanDocumentParser.parse(text, section?)` accepts the same 1-based section
selection. `ExecutionPlanParser.parse()` and `ExcalidrawGenerator.generate()`
remain available for a single operator tree.

Dimensions and fonts are layout defaults; specialized renderers and label fitting
may increase box sizes or use operator-specific settings.

## Input formats

Pass a physical operator tree, a boxed distributed plan, or saved EXPLAIN output.
SQL alongside a physical plan is allowed; plan-viz reads the saved plan and does
not execute SQL. Supported physical EXPLAIN table row labels are `physical_plan`,
`Plan with Metrics`, and `Plan with Full Metrics`. Use two spaces per tree level
unless configuring a different `parser.indentationSize`.

Files containing multiple snapshot sections require `input.section` (1-based).
See [distributed plans](DISTRIBUTED_PLANS.md) for routing and incomplete views.
