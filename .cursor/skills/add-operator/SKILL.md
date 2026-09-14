---
name: add-operator
description: >-
  Add a DataFusion physical operator to plan-viz using the repo's operator
  spec workflow. Use when implementing WindowAggExec, NestedLoopJoinExec,
  UnnestExec, or any docs/operators/*.md spec; when the user approves an
  operator spec; or when asked to add / implement a missing operator.
---

# Add a plan-viz operator

Read `docs/operators/WORKFLOW.md` and the approved spec
`docs/operators/<operator>.md` before writing code.

## Do

1. Implement only the files the spec lists as owned.
2. Extend `BaseNodeGenerator`. Register in
   `src/generators/excalidraw.generator.ts`.
3. Put unit tests in `src/generators/__tests__/operators/<kebab>-exec.test.ts`
   using `NodeBuilder` and `TestHelpers`.
4. Add `tests/<prefix>_*.sql` + `tests/expected/<prefix>_*.excalidraw`.
5. Run `./scripts/verify-operator.sh <prefix>` until it passes.
6. Do not change the parser unless the spec says so.
7. Do not edit other operators' generators.
8. Mark the spec `Implemented` and update `docs/operators/README.md`.

## Do not

- Run Spec Kit. This repo uses `docs/operators/`, not `.specify/`.
- Implement an operator whose spec status is still `Proposed` unless the
  user explicitly approved it in chat.
- Parallelize two join operators in one working tree.

## Gold standards

- Unary: `filter-node.generator.ts` or `aggregate-node.generator.ts`
- Two-input join: `cross-join-node.generator.ts` + `hash-join-node.generator.ts`
- Multi-child: `union-node.generator.ts`
- Newest end-to-end example: `cross-join-node.generator.ts` + `tests/cross_join_*.sql`
