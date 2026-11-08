# Keeping upstream support current

Periodically review Apache DataFusion and
**datafusion-contrib/datafusion-distributed** for changes that affect plan-viz.
Turn relevant changes into verified parser, analysis, rendering, metric, fixture,
and documentation updates. This is ongoing maintenance, separate from individual
feature requests.

[AGENTS.md](../AGENTS.md) contains the standing instruction.
[UPSTREAM_REVIEW_LOG.md](UPSTREAM_REVIEW_LOG.md) records review progress, source
baselines, decisions, and follow-up tasks. Existing operator catalogs and audits
remain the source of truth for implemented support.

## When to review

- **Suggested cadence:** monthly while the project is actively developed. The
  exact frequency remains open; no scheduled automation has been configured.
- **Release preparation:** check for relevant upstream changes since the last
  completed review, especially compatibility fixes and changed printed formats.
- **Event-driven:** review when changing the supported upstream baseline, adding
  an operator/metric, or investigating an unfamiliar or broken plan.

An `AGENTS.md` instruction does not run work on a timer. A calendar or automation
would be a separate setup once the desired frequency and scope are chosen.

## Sources and scope

| Project                | Primary sources                                                                                                                                                                                                                                       | What to inspect                                                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Apache DataFusion      | [Official blog and release announcements](https://datafusion.apache.org/blog/), [source and tags](https://github.com/apache/datafusion), [upgrade guides](https://datafusion.apache.org/library-user-guide/upgrading.html)                            | EXPLAIN formats, operators, properties, ordering/partitioning, metrics, optimizer changes that alter plan shapes                |
| DataFusion Distributed | [Repository and tags](https://github.com/datafusion-contrib/datafusion-distributed), [releases](https://github.com/datafusion-contrib/datafusion-distributed/releases), [documentation](https://datafusion-contrib.github.io/datafusion-distributed/) | Stage/task representation, network routing, task variants, metrics ownership/aggregation, adaptive execution, worker recordings |

Here, “Distributed DataFusion” means `datafusion-contrib/datafusion-distributed`.
Ballista and Comet are distinct projects; include them when a supported input or
specific task requires it.

Check release dates and exact tags/commits. Distinguish released changes from
unreleased work on the main branch. Prefer primary implementation/tests for
execution semantics; use release notes to identify what needs investigation.
When inspecting a custom fork or connector, record its revision separately.

## Review procedure

1. **Establish the baseline.** Read the latest completed entry in the review log,
   the [operator catalog](operators/README.md), the
   [distributed audit](operators/distributed-datafusion.md), and its
   [machine-readable inventory](operators/distributed-datafusion-audit.json).
   Identify both the last source range inspected and the revisions actually
   supported/tested. Inspecting a newer release does not establish support.
2. **Collect changes since that baseline.** Read release notes/upgrade guides,
   then relevant source diffs and upstream fixtures. Record exact source ranges,
   release dates, and links. Use an isolated checkout/worktree for a new revision
   rather than switching a checkout that has user work.
3. **Assess plan-viz impact.** For each relevant change, identify affected input
   examples, parser fields, semantic contracts, renderers, public behavior, and
   documentation. Include renamed/removed operators and changed meanings of
   existing fields, not only new features. State whether existing diagrams or
   defaults would change; an upstream update is not permission to redesign them.
4. **Classify and prioritize.** Record each item as already supported, update
   needed, investigate, deferred with reason, or not applicable. Prioritize
   misleading diagrams/data attribution and broken existing inputs before
   optional visualization improvements. Give each actionable item a concrete
   acceptance criterion and a local task/spec link; external issue creation is
   a separate action if requested.
5. **Implement scoped support changes.** When implementation is in the task's
   scope, follow [the operator workflow](operators/WORKFLOW.md) and TDD in
   [AGENTS.md](../AGENTS.md). Add a representative new-format regression and
   retain relevant historical-format coverage. Keep unknown behavior explicit.
   For visual changes, prepare current/proposed previews and obtain user approval
   under [the visualization policy](../AGENTS.md#visualization-stability-and-user-approval)
   before integration. Preserve the current default within the approved scope.
6. **Verify and update support claims.** Run focused semantic tests, inspect
   changed diagrams, and use [corpus review](CORPUS_REVIEW.md) when the change
   affects a wider set of plans. Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for
   required gates. Update catalogs, audits, documentation and the changelog only
   to match validated behavior.
7. **Close the review honestly.** Record sources checked, findings, implementation
   status, validation, unresolved items, and the next review trigger. A review
   may be complete while implementation tasks remain open; report both states.

For the first review, establish the comparison and prioritize concrete gaps
before choosing upgrades. Resolve any compatibility issue that would invalidate
planned feature work first; unrelated additions can remain separate follow-up
tasks. Completing every available upstream upgrade is not a prerequisite for
returning to feature design.

## Compatibility checks to consider

- Physical EXPLAIN and EXPLAIN ANALYZE text, named sections, wrappers, nested
  expressions, task maps, and schema/metric properties.
- Input/output partition counts, key/range semantics, ordering direction/null
  order, empty partitions, task specialization, and network routing.
- Metric units, precision, query/operator/task/partition scope, ownership,
  duplicate reporting, and aggregation rules.
- New, renamed, removed or changed operators, including partial/ordered
  aggregates, joins, sorting, dynamic filtering and write operators.
- Scene readability, bindings, representative task selection, diagnostics, and
  compatibility with existing defaults and custom generators.

Select the checks relevant to the diff; this is not a requirement to exercise
every area on every review.

## Pinned audit behavior

`scripts/audit-upstream-operators.cjs` deliberately requires the revision recorded
in `docs/operators/distributed-datafusion-audit.json`. It is a baseline integrity
check, not a general “test any latest checkout” command. A failure on a newer
revision does not alone show missing support.

Inspect the new inventory and contracts before changing that pin. Update the
inventory, source references, implementation and tests together when advancing
the audited baseline. Keep the previous revision available to check historical
compatibility. Use corpus tooling to investigate candidate inputs independently
of the pinned inventory check.

## Done for one review

- Sources and comparison range are recorded with dates and exact revisions.
- Relevant changes have a disposition, evidence, and follow-up where needed.
- Implemented support is distinguished from proposed or unverified support.
- Any performed implementation has relevant test/visual evidence and updated
  documentation; unresolved access or evidence gaps are explicit.
- The review log has a next trigger and a clear starting point for resuming.
