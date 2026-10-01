# Project structure

```text
plan_viz/
├── src/
│   ├── analysis/           # Operator contracts, task specialization, counts, routing
│   ├── types/              # ExecutionPlanNode, PlanDocument, diagnostics, scene types
│   ├── parsers/            # Snapshot sections, single trees, boxed stages, recordings
│   ├── generators/
│   │   ├── generators/     # Registered/inferred operator strategies
│   │   ├── utils/          # Layout, geometry, bindings, omissions, scene composition
│   │   ├── factories/      # Excalidraw element creation
│   │   ├── renderers/      # Column labels
│   │   ├── builders/       # Detail text
│   │   ├── types/          # Strategy context and node metadata
│   │   ├── constants.ts
│   │   ├── excalidraw.generator.ts              # Single operator-tree renderer
│   │   └── distributed-excalidraw.generator.ts  # Task/stage scene composition
│   ├── services/           # ConverterService and detailed conversion result
│   ├── cli.ts
│   └── index.ts            # Public library exports
├── tests/
│   ├── *.sql               # Single-plan EXPLAIN fixtures, sometimes including SQL
│   ├── expected/           # Corresponding expected Excalidraw scenes
│   ├── distributed/
│   │   ├── *.sql           # Distributed/recorded fixtures
│   │   └── expected/       # One matching scene per distributed fixture
│   ├── integration.test.ts # Both fixture directories and pairing/binding checks
│   └── usage-example.ts
├── scripts/                # Operator checks, upstream audit, corpus review, browser checks
├── docs/
│   ├── API.md / CLI.md     # Public interfaces and options
│   ├── DISTRIBUTED_PLANS.md / CUSTOM_OPERATORS.md
│   ├── CORPUS_REVIEW.md     # Saved-plan inventory and gallery workflow
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

The npm package includes compiled production code, README, LICENSE, and package
metadata. Source fixtures, expected drawings, browser tooling, and local research
are repository/development artifacts.
