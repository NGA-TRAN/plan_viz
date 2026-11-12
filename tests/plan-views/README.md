# Optional-view fixtures

Each case contains saved physical EXPLAIN text in `input.sql`, a `case.json` map
of view names to API options, and `expected/<view>.excalidraw`. These are synthetic
inputs, not executable SQL and not copies of private plans.

`QueryMetricsExec` is a synthetic, neutral wrapper carrying query-metric fields.
It exercises generic operator rendering; it does not claim an upstream operator
implementation or execution guarantees. Metric interpretation requires the
explicit metric profile and does not depend on a vendor-specific wrapper name.

Every case has a default expected scene. Optional expectations cover labels,
three palettes, missing values, conflicts, raw fields, structural/combined views,
task-map ownership, a hidden maximum, and a scalar that must not be copied onto
task boxes. Profiles in manifests are explicit assumptions.

`tests/plan-views.test.ts` checks full deterministic scenes, pairing and bindings.
`tests/plan-view.test.ts` separately checks every existing SQL fixture against the
legacy API with both modes off. Use `node scripts/verify-plan-views.cjs` after
building for browser/API parity and actual editor dragging. Inspect drawings
before updating expectations; follow the visualization policy in `AGENTS.md`.
