# Focused upstream compatibility fixtures

Each `.sql` file is a saved physical EXPLAIN plan used as test input. Each has a
matching `expected/<name>.excalidraw` drawing. The shared
[integration suite](../../integration.test.ts) discovers all dated upstream
fixture directories, checks input/output pairing and text bindings, and compares
the complete scenes after normalizing generated identifiers.

[upstream-review.test.ts](../../upstream-review.test.ts) additionally checks the
execution meaning: partition counts, shuffle pairs, task-specific files, ordering
metadata and text containment. Keep these assertions alongside the scene checks.
These are conversion regressions, not a claim that plan-viz executes SQL or
certifies every feature in the source revisions.

The TopK containment tests also cover the approved F5-V1 sizing correction,
including `fetch=0`. `expected/derived/distributed-topk.excalidraw` is an additional
baseline for `replacement-topk.sql` wrapped in a coordinator stage by the test.
The derived baseline sits in its own subdirectory because it has no separate
`.sql` input. That drawing already fitted its labels and must remain unchanged.

Run both kinds of checks:

```sh
npx jest --runInBand --coverage=false tests/integration.test.ts tests/upstream-review.test.ts
```

To regenerate one expected drawing after an approved rendering change:

```sh
npm run build
node dist/cli.js -i tests/upstream/2026-11-08/sorted-direct.sql -o tests/upstream/2026-11-08/expected/sorted-direct.excalidraw
```

Inspect the rendered result before accepting it. Follow the
[visual approval policy](../../../AGENTS.md#visualization-stability-and-user-approval)
for future changes to existing drawings.

## Distributed source

Revision: `64a0a13d59d27f5facb05838d47adb2afe8a843d`.

The following fixtures adapt inline snapshots in
[`tests/sorted_data_source.rs`](https://github.com/datafusion-contrib/datafusion-distributed/blob/64a0a13d59d27f5facb05838d47adb2afe8a843d/tests/sorted_data_source.rs).
Only the public fixture path prefix changes from `testdata/sorted_csv/` to
`public_fixture/`; upstream `<int>` byte-range placeholders are retained.

| Fixture | Upstream test | Contract checked |
| --- | --- | --- |
| `empty-task.sql` | `sorted_csv_with_embedded_newlines_static` | An empty file-group slot remains a partition on the second task. |
| `sorted-direct.sql` | `sorted_csv_aggregation_static_direct_shuffle` | Ordered sources, sorted aggregation and direct shuffle with two streams per pair. |
| `sorted-two-phase.sql` | `sorted_csv_aggregation_static_two_step_shuffle` | Ordering metadata survives two-phase shuffle with one stream per pair. |
| `unordered-ranges.sql` | `sorted_csv_files_with_unordered_ranges` | A local sort remains present when sources lack a common ordering. |
| `uneven-file-groups.sql` | `unsplittable_csv_files_with_unordered_groups` | Three files versus two files do not change the two partition slots per task. |

`iceberg-assigned-files.sql` is the plan portion of
[`assigned_file_routing__tests__routing_uses_the_files_assigned_to_each_task.snap`](https://github.com/datafusion-contrib/datafusion-distributed/blob/64a0a13d59d27f5facb05838d47adb2afe8a843d/iceberg/tests/snapshots/assigned_file_routing__tests__routing_uses_the_files_assigned_to_each_task.snap).
Routing logs and the result table are omitted; the plan is unchanged. Planned
files are 3/2/2, while the downstream input contract implies four partitions per
task. Without that contract, `planned_files` alone must not imply partitions.

## DataFusion source

Revision: 55.2.0, `500744d5c25499055e3b2ca46b022bc425989203`.

`coalesce-fetch.sql`, `ordered-merge-fetch.sql` and `replacement-topk.sql` are
minimal **synthetic** examples of the fetched coalesce/merge and replacement TopK
shapes discussed in
[`enforce_distribution.rs`](https://github.com/apache/datafusion/blob/500744d5c25499055e3b2ca46b022bc425989203/datafusion/physical-optimizer/src/ensure_requirements/enforce_distribution.rs).
They use invented `a.parquet`/`b.parquet` files and `c` column names. They check
retained selection labels and partition counts; they do not assert optimizer
execution or a new structural classification.
