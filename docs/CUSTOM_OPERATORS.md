# Custom and unfamiliar operators

No additional installation is needed. Automatic inference works with both the CLI
and library; registering a renderer requires the library API.

## Automatic inference and inline wrappers

Unregistered operators can reuse the file-source, aggregate, repartition, or hash-join renderer when their properties and number of children match that renderer's contract. Their original names remain on the diagram. Exact registrations, including `customGenerators`, take precedence. Ambiguous operators get a neutral box with property summaries and their input connections.

Inline wrappers share a composite box with the inner operator:

```text
BudgetGuardExec(rows<=10000): HashJoinExec: mode=CollectLeft, join_type=Inner, on=[(id@0, id@0)]
  MeadowScanExec: file_groups={1 group: [[context.dat]]}, projection=[id]
  BufferExec: capacity=_
    BrookScanExec: file_groups={2 groups: [[points_1.dat], [points_2.dat]]}, projection=[id, value]
```

Use two spaces for each tree level, as in ordinary physical plans. Wrapper arguments stay separate from the inner properties. Long labels use bounded summaries; the parsed plan retains the full values. Large sources and partitioned hash joins show representative first/last partitions while preserving the actual stream count. Valid `output_partitioning` takes precedence over file-group count for source outputs.

`BufferExec` preserves known input metadata and displays `capacity=_` literally. Aggregate summaries show `SinglePartitioned` and `PartiallySorted` explicitly. Column names such as `@host` keep their leading `@`.

## Registering a renderer

Implement `NodeGeneratorStrategy` in your application, then pass an instance through
`generator.customGenerators`. The following registration assumes your implementation
is exported from `./my-custom-exec-generator` and `planText` contains your plan:

```typescript
import { convertPlanToExcalidraw } from 'plan-viz';
import { MyCustomExecGenerator } from './my-custom-exec-generator';

const scene = convertPlanToExcalidraw(planText, {
  generator: {
    customGenerators: [
      { operator: 'MyCustomExec', generator: new MyCustomExecGenerator() },
    ],
  },
});
```

Custom generators are registered after built-ins, so the same operator key overrides
its built-in renderer for that conversion. Exact registrations take precedence over
inference in both single-node and distributed plans. The CLI has no option to load
custom generator code.

A strategy's `generate(node, x, y, isRoot, context)` method adds scene elements to
`context.elements` and returns `NodeInfo` with geometry, the operator rectangle ID,
connection positions, stream count, columns, and sort order. Use the context's
factories, layout helpers, and `generateChildNode` callback to draw child operators.
`NodeGeneratorStrategy`, `GenerationContext`, `NodeInfo`, and `BaseNodeGenerator`
are exported from `plan-viz`.

A renderer changes appearance; it does not add a distributed partition or routing
contract. A custom network renderer must expose its operator rectangle for incoming
network bindings. See [architecture and extension boundaries](ARCHITECTURE.md#extending-support)
and the [operator workflow](operators/WORKFLOW.md) for adding built-in support.
