# Upstream compatibility review log

Use [the maintenance workflow](UPSTREAM_MAINTENANCE.md) for each review. This log
tracks comparisons and follow-up work; the operator catalog/audit track supported
behavior. Add the newest review first.

## Current status

| Item                     | Status                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Maintenance workflow     | Merged through [PR #77](https://github.com/NGA-TRAN/plan_viz/pull/77), 2026-11-08                           |
| Latest review            | [2026-11-08 initial compatibility triage](upstream-reviews/2026-11-08.md), complete within its stated scope |
| Follow-up implementation | Pending; no converter or visualization changes made                                                         |
| Next work                | Carry F1–F3 into shared/Pierre/Wenqi design; keep independent maintenance items separate                    |
| Next comparison baseline | DataFusion 55.2.0; Distributed `64a0a13d59d27f5facb05838d47adb2afe8a843d`                                   |
| Audited support          | Existing catalog and Distributed `b32ee66e5f12227a5fe8e8444a022991da0758ea` pin retained                    |
| Suggested cadence        | Monthly during active development, plus release/upgrade triggers; frequency still open                      |
| Scheduled automation     | None                                                                                                        |

## 2026-11-08 — first compatibility triage

**Trigger:** user-requested first upstream review accompanying the documentation
push/PR/merge sequence. Documentation PR #77 passed CI and merged as `0e866f8`.

**Review status:** initial triage complete; follow-up implementation and broader
semantic/visual validation remain open. This is not a blanket claim of support
for every current upstream feature.

**Comparison:** DataFusion 55.1.0 → 55.2.0 (8 commits, 26 files), and Distributed
`b32ee66...` → `64a0a13...` (53 commits). Distributed's latest published release
is still 4.0.0; the inspected newer changes are on main. DataFusion main was
screened only for selected recent subjects, not exhaustively audited.

**Findings and follow-up:** see the
[detailed source-backed report](upstream-reviews/2026-11-08.md) and its
[F1–F6 acceptance criteria](upstream-reviews/2026-11-08.md#follow-up-work-and-acceptance-criteria).
The strongest implications concern metric export scope, stage/task metadata,
and version-specific structural rules. No broad visualization upgrade was
established as a prerequisite to feature design.

**Validation:** pinned 20-operator inventory passed; the new source inventory
has the same operator/source pairs. Current-source corpus conversion generated
344 scenes with geometry/binding checks; 16 rejected candidates were classified
as debug sketches, mixed output or a header-only fragment. Targeted probes
checked fetch labels, Iceberg partition/file distinctions and the missing
structured stage-metric field. Native engine execution and whole-corpus visual
review were not performed. Full evidence and limitations are in the report.

**Visual impact:** none. Future user-visible proposals still require
[current/proposed previews and user approval](../AGENTS.md#visualization-stability-and-user-approval).

**Next trigger:** use these findings in the feature designs; revisit upstream
on the next release, relevant format change, or agreed periodic review. Keep the
last inspected source range separate from the audited support pin.

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
