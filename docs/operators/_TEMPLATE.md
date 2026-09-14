# OperatorNameExec

| Field | Value |
|---|---|
| Status | Proposed |
| Priority | P0 / P1 / P2 |
| Wave | A / B / C |
| Children | 0 / 1 / 2 / N |
| Copy from | `path/to/gold-standard.generator.ts` |
| DataFusion | `datafusion-physical-plan` 55.x module path |

## What it does

One paragraph. Why it appears in a physical plan.

## EXPLAIN contract

```
OperatorNameExec: key=value, ...
  ChildExec: ...
```

Properties the parser already extracts as `node.properties`.

## Visualization

- Layout: vertical children / horizontal two-input / multi-child
- Arrows in → arrows out (partition math)
- Sort-order: preserve / lose / add
- Special glyphs: none / ellipse / color
- Details lines to render

## Tests

Unit (`src/generators/__tests__/operators/<kebab>-exec.test.ts`):

- Happy path renders operator name (not red `unimplemented`)
- Properties appear in detail text
- Arrow / column / sort propagation
- Invalid child count throws when the operator requires a fixed arity

Integration:

- `tests/<prefix>_basic.sql` + `tests/expected/<prefix>_basic.excalidraw`
- One extra fixture only if layout stress matters (many partitions, 2+ children)

## Verify

```bash
./scripts/verify-operator.sh <prefix>
```

## Files this operator may touch

Owned files only, plus one register line in `excalidraw.generator.ts`.

## Out of scope

Parser changes, new public API, styling overhaul.
