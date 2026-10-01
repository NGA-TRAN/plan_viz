# Operator delivery workflow

This repo already has a repeatable pattern for adding a DataFusion operator.
Generic Spec Kit (`specify → plan → tasks → implement`) is heavier than that
pattern and is not checked into this project. Use this workflow instead.

## Why not Spec Kit here

- Adding an operator is a **closed shape**: generator + register + unit tests +
  golden fixture/expected-drawing pair. A full SDD cycle recreates that every time.
- Spec Kit is not initialized in this repo (no `.specify/`).
- Review is easier when each operator is one short spec with a **verify
  command**, not a long plan/tasks tree.

If you later want Spec Kit for larger product work (new output format, UI, etc.),
initialize it separately. Do not use it for one-operator additions.

## Review → implement loop

```
1. Spec (this folder)     you review, one file per operator
2. Approve N specs        comment "approved" or pick a wave
3. Implement one operator (default) or a unary wave of 2–3
4. You verify with the isolated commands in the spec
5. Next operator
```

Default is **one operator at a time**. Parallel implementation is optional and
only safe when the operators do not share files (see below).

## File ownership (what makes review and tests isolatable)

Each operator owns these files. No other operator should touch them:

| Owned file | Purpose |
|---|---|
| `src/generators/generators/<kebab>-node.generator.ts` | Renderer |
| `src/generators/__tests__/operators/<kebab>-exec.test.ts` | Unit tests |
| `tests/<scenario>.sql` | Integration fixture (name prefixed with operator) |
| `tests/expected/<scenario>.excalidraw` | Golden diagram |

Shared integration points (coordinate changes):

- `src/generators/excalidraw.generator.ts` — `register('FooExec', ...)`
- `docs/operators/README.md` and `MISSING_OPERATORS.md` — status
- `CHANGELOG.md` — one bullet
- `src/generators/__tests__/builders/node.builder.ts` — only if a helper is needed

## Parallel vs one-by-one

**Recommended:** one-by-one after you approve a spec. Shared registration and
golden-file generation are sequential anyway.

**Safe parallel wave:** 2–3 **unary** operators that do not share a generator
class (for example `UnnestExec` + `EmptyExec` + `AnalyzeExec`). Each agent or
PR owns only its files; registration lines are added in a tiny follow-up commit.

**Do not parallelize** two join operators in the same working tree. They both
copy HashJoin/CrossJoin layout and tend to collide on helpers and constants.

## How you verify (do not run the full suite first)

From the spec's **Verify** section:

```bash
# Unit tests for one operator
npx jest --coverage=false src/generators/__tests__/operators/<kebab>-exec.test.ts

# Integration goldens whose names contain the operator prefix
npx jest --coverage=false tests/integration.test.ts -t '<prefix>'
```

Or:

```bash
./scripts/verify-operator.sh <kebab-or-prefix>
```

Open `tests/expected/<scenario>.excalidraw` in the Excalidraw IDE extension
to review the picture, not just the JSON diff.

Full build, `npm run test:coverage`, and `npm run lint` are the PR gate. See [CONTRIBUTING.md](../../CONTRIBUTING.md) for package and browser checks.

## Implementation checklist (agent)

1. Read `docs/operators/<operator>.md` and `_TEMPLATE.md`.
2. Copy the gold-standard generator named in the spec.
3. Register the operator in `excalidraw.generator.ts`.
4. Write unit tests with `NodeBuilder` + `TestHelpers`.
5. Add `tests/<prefix>_*.sql` and generate the matching `.excalidraw`.
6. Run the isolated verify commands until they pass.
7. Flip the spec status to `Implemented` and update the catalog.

Parser changes belong in the spec when the printed format requires them,
including positional properties, inline wrappers, stage headers, or task variants.

## Distributed operators and execution contracts

A registered renderer alone does not establish distributed behavior. Use the
[source-backed audit](distributed-datafusion.md) when extending a public upstream
operator; private extensions should be inferred from structure and use invented
fixture names.

1. Record printed metadata and execution semantics: effective task context,
   logical partitions, network producer/receiver pairs, and padding.
2. Update the relevant `src/analysis/` contract and parser only as needed. Keep
   unknown counts explicit when the text lacks evidence.
3. Add semantic regressions in `src/parsers/__tests__/` and any drawing/binding
   tests in `src/generators/__tests__/`.
4. Add `tests/distributed/<scenario>.sql` and its matching
   `tests/distributed/expected/<scenario>.excalidraw`. Preserve source indentation
   and counts when sanitizing names.
5. Generate expected output with the built CLI and visually inspect it. Check
   arrows end at their receiving operators, omission markers, and empty padding.
6. Update `distributed-datafusion-audit.json` and its documentation if the public
   inventory or execution contract changes. Run the pinned inventory check.

```sh
npm run build
node dist/cli.js -i tests/distributed/shuffle_two_phase.sql \
  -o tests/distributed/expected/shuffle_two_phase.excalidraw
npx jest --runInBand --coverage=false tests/integration.test.ts -t shuffle_two_phase
npx jest --runInBand --coverage=false distributed-plan.parser grouped-gather partition-inference upstream-operators
node scripts/audit-upstream-operators.cjs /path/to/datafusion-distributed
```

After changing distributed layout/bindings, run `scripts/verify-distributed.cjs`
with Playwright Chromium installed. Use the local corpus gallery for broader
visual review; external source snapshots and gallery artifacts stay untracked.
