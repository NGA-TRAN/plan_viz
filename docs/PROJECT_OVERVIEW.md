# Project overview

plan-viz is a TypeScript library and CLI that turns Apache DataFusion physical
EXPLAIN output into editable Excalidraw JSON. It supports ordinary operator trees,
boxed Distributed DataFusion plans, and incomplete worker recordings.

This overview follows the current repository. Distributed-plan support starts
with **v0.1.25**; see [the changelog](../CHANGELOG.md) for release details.
See [package.json](../package.json) for package version and Node.js requirements.

## Main capabilities

- Render operator details, stream multiplicity, columns, and known sort order.
- Infer unfamiliar source/aggregate/repartition/hash-join shapes from printed
  properties while preserving their names; use neutral boxes for unknown shapes.
- Render inline wrappers, fit long labels, align unary chains, and compact large
  partition sets with omission markers.
- Specialize distributed stages per task, including source variants and active
  UNION branches. Show representative tasks or every task.
- Draw gathers, grouped gathers, broadcasts, and direct/two-phase shuffles with
  arrows bound to the receiving operator. Distinguish capacity from assigned
  streams and empty padding.
- Select snapshot sections and return diagnostics when routing or counts cannot
  be established. Worker recordings remain visibly incomplete.

Counts describe logical partitions, not row counts, physical machines, or network
connections. The [operator catalog](operators/README.md) describes local renderers;
the [distributed audit](operators/distributed-datafusion.md) records the pinned
upstream contracts and limits.

## Components

`ConverterService` uses `PlanDocumentParser` to select and classify the input.
Single trees go to `ExcalidrawGenerator`. Distributed documents first pass through
task specialization, partition analysis, and routing analysis, then
`DistributedExcalidrawGenerator` composes task trees into stage rows.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the data flow and extension points,
and [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for source and fixture locations.

## Usage and development

Start with [QUICKSTART.md](../QUICKSTART.md). The [README API](../README.md#api)
covers `convertPlanToExcalidraw`, `ConverterService.convertDetailed`, configuration,
and CLI options. `customGenerators` can add or replace operator renderers.

```sh
npm ci
npm run build
npm run lint
npm run test:coverage
```

Jest enforces 80% global coverage across all four metrics. Integration tests
compare scenes against checked-in expected drawings, including the distributed
fixtures in `tests/distributed/expected/`. Browser checks and local corpus galleries
support visual review beyond JSON comparisons.

[CONTRIBUTING.md](../CONTRIBUTING.md) documents review checks, conventional commits,
and the tag-triggered release workflow. Production builds exclude tests and their
helpers; corpus exports stay in ignored local directories.

## Documentation map

| Document | Purpose |
|---|---|
| [README](../README.md) | Usage, API, diagram conventions, limitations, and corpus tools |
| [Quick start](../QUICKSTART.md) | Build or install, convert a plan, open the drawing |
| [Architecture](ARCHITECTURE.md) | Parsing, analysis, rendering, and extension boundaries |
| [Project structure](PROJECT_STRUCTURE.md) | Source, tests, scripts, and generated artifacts |
| [Operator workflow](operators/WORKFLOW.md) | Add a renderer or execution contract with focused tests |
| [Changelog](../CHANGELOG.md) | Unreleased changes and historical releases |
