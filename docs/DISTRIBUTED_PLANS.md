# Distributed physical plans

Requires **plan-viz 0.1.25 or newer**. Use the [same installation](../README.md#installation)
as single-node plans. See the [README examples](../README.md#distributed-physical-plans)
for text inputs and diagrams.

The library function and CLI automatically recognize boxed distributed plans:

~~~sh
npx plan-viz --input distributed-plan.snap --output distributed-plan.excalidraw
npx plan-viz --input mixed-snapshots.snap --section 2 --output selected.excalidraw
npx plan-viz --input distributed-plan.snap --all-workers --output expanded.excalidraw
~~~

A stage is drawn as a row of task slots, with consumers above producers. Equivalent
tasks show their first and last instances by default. Blue annotations give output
partitions per operator in one task. Purple arrows bundle logical streams between
tasks and terminate at the receiving network operator; purple ellipses count omitted connections. Task slots do not identify physical
machines, and a purple bundle is not a claim about TCP connections.

Grouped gathers assign contiguous producer groups to receivers. Their network operators
show output partition capacity, assigned streams, and empty padding separately; padding
has no incoming network connection. Groups with different assigned counts remain distinct.
For grouped gathers with up to three producer tasks, all producers are shown.

DistributedLeafExec selects the source variant for the current task.
DistributedUnionExec uses a transparent background and shows active and inactive children. Its child
task context determines network routing: a three-task stage can contain a local UNION
branch and only two shuffle receivers. Unequal assignments display assigned partitions
separately from the UNION's padded output capacity.

~~~typescript
import { ConverterService } from 'plan-viz';

const result = new ConverterService({
  input: { section: 2 }, // Optional, 1-based; required for multiple snapshot sections.
  distributed: { workerDisplay: 'representative' }, // Or 'all'.
}).convertDetailed(planText);

const { scene, diagnostics } = result;
~~~

Existing convertPlanToExcalidraw() and ConverterService.convert() still return an
Excalidraw scene. ExecutionPlanParser and ExcalidrawGenerator retain their single-tree
interfaces; use PlanDocumentParser for stage-aware parsing. Custom generators remain
supported.

Complete plans support gather to one or multiple receivers, direct hash shuffle, worker-local
joins and task-specific UNION. Empty file groups retain their partition slots and appear as labeled empty groups with input arrows. Printed repartition input counts and network-gather capacity also establish upstream output counts, including custom sources, through known partition-preserving operators. Counts without sufficient evidence stay unknown. Broadcast and two-phase shuffle are supported with explicit stream multiplicity. Shuffle routing with insufficient evidence remains visibly unresolved rather than
guessed. Worker recordings without their full document render as incomplete views
with no invented inter-stage connections. Malformed complete graphs fail with a
stage/line diagnostic. Time-partition panels and physical-host placement are not inferred.

## Examples and execution contracts

[Distributed fixtures](../tests/distributed/) cover gathers, grouped gathers,
broadcast, direct/two-phase shuffle, joins, task-specific UNION, and legacy isolation.
Their [expected drawings](../tests/distributed/expected/) are editable Excalidraw files.

See the [Distributed DataFusion operator audit](operators/distributed-datafusion.md)
for source references, execution contracts, coverage, and metadata limitations.
Use the [API reference](API.md) for configuration and [corpus review](CORPUS_REVIEW.md)
for larger collections of plans.
