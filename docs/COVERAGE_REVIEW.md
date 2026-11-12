# Coverage review — 2026-11-12

The palette release adds direct tests for the optional CLI, while retaining the
compiled-command tests. Direct tests cover option validation, conversion modes,
stdin/files, diagnostics, sidecars, failed writes and symlink destination aliases.
The public API test also verifies that callers can recognize validation failures
with the exported `PlanViewError` class.

Renderer tests now cover a registered zero-stream child under AnalyzeExec,
unresolved DistributedUnion assignments, and multiple partitioned scalar
subqueries with parallel bound arrows clamped to both edges of the parent.
These tests characterize existing behavior; they do not change expected scenes.

## Remaining coverage limits

- AnalyzeExec's missing-child fallback is outside its unary operator contract.
- ScalarSubquery's missing element width/arrow points and absent child-body
  fallbacks require violating the typed custom-generator contract. Do not add
  malformed typed mocks solely to raise coverage.
- Compiled CLI subprocesses, browser checks and installed-package checks are not
  included in Jest's source coverage. They remain required independent checks.
- Global coverage thresholds do not establish per-file or semantic completeness.

## Follow-up: custom arrows during scalar-subquery packing

An existing issue was reproduced in
`src/generators/generators/scalar-subquery-node.generator.ts`, `shiftElementsX`:
when a custom child renderer supplies an unbound decorative arrow, horizontal
packing shifts both its origin and its relative point offsets. This translates
the arrow twice. A synthetic custom leaf with offsets `[20, 60]` acquired offsets
`[-155, -115]` when packed with a horizontal shift of `-175`.

Built-in bound arrows and the approved heatmap palettes are unaffected. The
investigation did not change production geometry or accept the faulty scene as
an expectation. The local reproduction and report are in ignored
`tmp/release-0.1.30/custom-arrow-probe.cjs` and `custom-arrow-probe-report.json`.

For a separate fix, verify arrows with neither, one, and both endpoints bound.
Each arrow must move exactly once with its child, retain valid binding targets,
and remain editable after export. Preserve built-in scenes, add a regression,
and present current/proposed custom-renderer visuals for approval under
[AGENTS.md](../AGENTS.md#visualization-stability-and-user-approval).
Only the fully unbound case was reproduced; partial bindings and browser
behavior remain to be checked.
