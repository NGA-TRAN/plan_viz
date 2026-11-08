# Upstream compatibility review log

Use [the maintenance workflow](UPSTREAM_MAINTENANCE.md) for each review. This log
tracks comparisons and follow-up work; the operator catalog/audit track supported
behavior. Add the newest review first.

## Current status

| Item                                    | Status                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------- |
| Maintenance workflow                    | Established 2026-11-08                                                                 |
| Last completed periodic upstream review | Not yet recorded                                                                       |
| Next review                             | First full comparison against the existing documented baselines                        |
| Suggested cadence                       | Monthly during active development, plus release/upgrade triggers; frequency still open |
| Scheduled automation                    | None                                                                                   |

## Existing baselines to use for the first review

| Area                        | Existing evidence                                                                                                                                             | Limit                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| DataFusion operator catalog | [Catalog](operators/README.md) documents physical operators against **55.1.0**, September 2026                                                                | A documented catalog baseline, not proof of coverage of later versions |
| DataFusion Distributed      | [Audited revision](operators/distributed-datafusion.md): `b32ee66e5f12227a5fe8e8444a022991da0758ea`; [inventory](operators/distributed-datafusion-audit.json) | Contracts are audited at that revision; later changes need comparison  |

The workflow setup and feature-specific research on 2026-11-08 do not constitute
a complete comparison with current upstream. No “up to date” claim is made.

Recommended sequence: commit the maintenance/development documentation, perform
this first review, then return to the feature requests with any relevant
compatibility gaps identified. Select upgrades from the findings rather than
assuming a blanket upgrade is required. Proposed visual changes require previews
and user approval under [AGENTS.md](../AGENTS.md#visualization-stability-and-user-approval).

## Review entry template

Copy this section for a new review and replace the placeholders. Record “none”
explicitly for no relevant findings; use “unverified” when access is incomplete.

### YYYY-MM-DD — review title

- **Trigger and scope:** monthly review, release preparation, or named change.
- **Review status:** in progress / complete / incomplete (with reason).
- **Source comparison:** project, previous inspected tag/commit, new tag/commit,
  release dates, and primary source links.
- **Validated support baseline:** revisions actually covered by plan-viz checks.
- **Visual impact:** unchanged, or links to current/proposed previews and the
  user's approval status for each proposed visual change.

| Upstream change and source | Impact on plan-viz                       | Disposition                                                                 | Follow-up / acceptance criterion                                   | Implementation status                              |
| -------------------------- | ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------- |
| Link and concrete change   | Affected format/operator/metric/contract | Already supported / update needed / investigate / deferred / not applicable | Local task/spec link and observable result, or reason for deferral | Pending / implemented and validated / not required |

- **Validation performed:** commands/results, fixtures, source revisions and
  visual review. Distinguish checks run from checks proposed.
- **Documentation/support updates:** links to changed catalog, audit, or guide.
- **Remaining questions or access gaps:** explicit missing evidence.
- **Next trigger and starting point:** date if agreed, release event, or task.
