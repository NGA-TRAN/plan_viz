# Project structure

```text
plan_viz/
├── AGENTS.md               # Development principles, TDD, and workflow entry points
├── src/
│   ├── analysis/           # Operator contracts, task specialization, counts, routing
│   │   ├── metrics/        # Qualified definitions, values, ownership and ranking
│   │   └── structure/      # Conditional physical-plan explanations
│   ├── inspection/        # Input capture, source maps, identity and evidence
│   ├── types/              # ExecutionPlanNode, PlanDocument, diagnostics, scene types
│   ├── parsers/            # Snapshot sections, single trees, boxed stages, recordings
│   ├── generators/
│   │   ├── annotations/    # Optional overlays after the existing layout
│   │   ├── generators/     # Registered/inferred operator strategies
│   │   ├── utils/          # Layout, geometry, bindings, omissions, scene composition
│   │   ├── factories/      # Excalidraw element creation
│   │   ├── renderers/      # Column labels
│   │   ├── builders/       # Detail text
│   │   ├── types/          # Strategy context and node metadata
│   │   ├── constants.ts
│   │   ├── excalidraw.generator.ts              # Single operator-tree renderer
│   │   └── distributed-excalidraw.generator.ts  # Task/stage scene composition
│   ├── services/           # Legacy converter and optional async plan-view API
│   ├── cli.ts
│   ├── plan-view-cli.ts    # Optional CLI modes sharing the public service
│   └── index.ts            # Public library exports
├── tests/
│   ├── *.sql               # Single-plan EXPLAIN fixtures, sometimes including SQL
│   ├── expected/           # Corresponding expected Excalidraw scenes
│   ├── distributed/
│   │   ├── *.sql           # Distributed/recorded fixtures
│   │   └── expected/       # One matching scene per distributed fixture
│   ├── integration.test.ts # Both fixture directories and pairing/binding checks
│   ├── plan-views/         # Synthetic inputs, option manifests and expected scenes
│   └── usage-example.ts
├── samples/                # Packaged synthetic single-node/distributed metric plans
├── scripts/                # Operator checks, upstream audit, corpus review, browser checks
├── docs/
│   ├── API.md / CLI.md     # Public interfaces and options
│   ├── PLAN_VIEWS.md       # Optional view API, reports and viewer-app handoff
│   ├── PLAN_VISUALIZER_INTEGRATION.md # Packaged application upgrade guide
│   ├── DISTRIBUTED_PLANS.md / CUSTOM_OPERATORS.md
│   ├── CORPUS_REVIEW.md     # Saved-plan inventory and gallery workflow
│   ├── UPSTREAM_MAINTENANCE.md / UPSTREAM_REVIEW_LOG.md
│   ├── assets/             # README illustrations and their text/scene sources
│   └── operators/          # Operator specs and pinned distributed inventory
├── .github/workflows/      # CI and tag-triggered npm publishing
├── tsconfig.json           # Shared TypeScript settings
├── tsconfig.build.json     # Production build excludes tests and helpers
├── jest.config.js          # Test discovery and global coverage thresholds
├── package.json
├── package-lock.json
├── dist/                   # Generated JS/declarations/maps (ignored)
├── coverage/               # Generated coverage reports (ignored)
└── tmp/                    # Local corpus inputs, galleries, and research (ignored)
```

Unit tests live under `src/**/__tests__/` alongside the relevant code. Distributed
parsing, routing, and count regressions are in `src/parsers/__tests__/`; generator
geometry and binding tests live in `src/generators/__tests__/`.

The `.sql` fixtures are saved EXPLAIN text, not queries executed by the test runner.
Expected scenes can be opened directly in Excalidraw or an IDE extension. Tests
normalize generated identifiers before comparison.

## Review tools

| Script | Purpose |
|---|---|
| `verify-operator.sh` | Focused operator tests and matching integration cases |
| `audit-upstream-operators.cjs` | Compare the pinned upstream checkout with the operator inventory |
| `audit-corpus.cjs` | Single-plan snapshot audit; explicitly excludes distributed/worker sections |
| `review-corpus.cjs` | Mixed corpus inventory, conversion, gallery, and optional PNG export |
| `corpus-contact-sheets.cjs` | Thumbnail overview of an exported gallery |
| `verify-distributed.cjs` | CLI and real Excalidraw editing/binding checks |
| `check-plan-views.cjs` | Discover local SQL examples and exercise default/metric views |
| `verify-plan-views.cjs` | Browser/API parity and annotation dragging in Excalidraw |
| `verify-plan-view-package.cjs` | Packed API/types, sample inputs, CLI and browser bundle checks |

The npm package includes compiled production code, README, LICENSE, CHANGELOG,
the plan-view and app integration guides, `samples/`, and package metadata.
Test fixtures, expected drawings, browser tooling, and local research are
repository/development artifacts.
