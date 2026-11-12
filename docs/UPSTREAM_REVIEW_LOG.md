# Upstream compatibility review log

Use [the maintenance workflow](UPSTREAM_MAINTENANCE.md) for each review. This log
tracks comparisons and follow-up work; the operator catalog/audit track supported
behavior. Add the newest review first.

## Current status

| Item                     | Status                                                                                                      |
| ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Maintenance workflow     | Merged through [PR #77](https://github.com/NGA-TRAN/plan_viz/pull/77), 2026-11-08                           |
| Latest review            | [2026-11-11 release compatibility check](upstream-reviews/2026-11-11.md), complete within its stated incremental scope |
| Follow-up implementation | [F4/F5 validated, including the approved TopK correction](upstream-reviews/2026-11-08-follow-up.md); merged through [PR #79](https://github.com/NGA-TRAN/plan_viz/pull/79) as `5f595c4` |
| Next work                | Optional metrics/structural views and reusable samples merged through [PR #83](https://github.com/NGA-TRAN/plan_viz/pull/83). Use the packaged integration guide for viewer adoption; newer upstream semantic/profile upgrades remain separate R1–R6 follow-ups. |
| Next comparison baseline | DataFusion stable 55.2.0, main `51960dbad4586e41fc8995c816e6158cc77351e8`; Distributed stable v4.0.0, main `cb6c9c437d5886cce2dde545e4216dec220b75eb` |
| Audited support          | Existing catalog and Distributed `b32ee66e5f12227a5fe8e8444a022991da0758ea` pin retained                    |
| Suggested cadence        | Monthly during active development, plus release/upgrade triggers; frequency still open                      |
| Scheduled automation     | None                                                                                                        |

## 2026-11-11 — optional-view release compatibility check

**Trigger:** the user authorized full validation, commit/push, feature PR, merge
and release of the approved optional metrics/structural views and sample inputs.

**Comparison:** DataFusion stable remains 55.2.0; main advanced 26 commits /
126 paths from `14b3edd...` to `51960db...`. Distributed stable remains v4.0.0;
main advanced five commits from `70869b0...` to `cb6c9c4...`. Its large crate move
required paginated per-commit inspection beyond the 300-file comparison cap.
The [detailed source-backed review](upstream-reviews/2026-11-11.md) records
exact ranges, dispositions and R4–R6 acceptance criteria.

**Outcome:** no blocker identified at the retained support/profile baselines.
New main semantics include exact reverse Parquet scans and incremental
aggregation on grouped, potentially unsorted input. They do not advance the
release's producer assumptions or justify new ordering/memory claims. Distributed
changes reorganize crates/tests and refactor dynamic-stage preparation; no changed
supported display, routing or metric-export contract was identified.

**Validation:** the pinned 20-operator inventory passes. All 11 new reverse-scan
physical-plan expectations pass conversion, property/node retention,
geometry/binding checks and exact legacy/optional-off scene equality. These are
saved-text probes; native upstream execution and visual acceptance of their
scenes were not performed. Full release/package/CI/publication checks are tracked
separately. No rendering changes or new expected scenes are adopted by this review.

**Next trigger:** next release, relevant format/semantic change, or agreed review,
starting from the exact main revisions above. Keep the Distributed `b32ee66...`
audit and recorded metric/operator profiles unchanged until a scoped upgrade.

## 2026-11-09 — patch-release compatibility check

**Trigger:** prepare a stable 0.1.28 checkpoint before implementing the optional
structural and metric features. [PR #80](https://github.com/NGA-TRAN/plan_viz/pull/80)
merged on November 8 as `b805c7d`; its merged-master CI passed. This release
preparation passed local review; the user authorized continuing through the
release PR, checks, merge and publication sequence.

**Comparison:** DataFusion's stable tag remains 55.2.0. Its main advanced by
7 commits / 35 files from `32dd1d2...` to `14b3edd...`. Distributed main advanced
by 2 commits / 9 files from `64a0a13...` to `70869b...`; its published release
remains v4.0.0. The audited support pin is unchanged.

**Outcome:** no blocking converter incompatibility found in the inspected
increment. Five changed upstream printed-plan examples converted with correct
empty-group/partition counts and expected aggregate/shuffle structure. Preserve
version-specific locality and memory qualifications for future F2/F3 work;
R1–R3 in the [detailed review](upstream-reviews/2026-11-09.md) record follow-ups.

**Validation:** clean build, lint and 71 suites / 933 tests passed, with every
coverage threshold exceeded. Local package inspection and packed CLI checks
passed. No new renderer behavior, expected scenes or upstream native execution.
Publication is tracked separately by the release PR, version tag and npm workflow;
the validation here records the local preparation checkpoint.

**Next trigger:** next release, relevant format change or agreed review, starting
from the exact main revisions above and stable DataFusion 55.2.0.

## 2026-11-08 — first compatibility triage

**Follow-up:** [PR #78](https://github.com/NGA-TRAN/plan_viz/pull/78) merged.
Subsequent [F4/F5 work](upstream-reviews/2026-11-08-follow-up.md) corrected corpus
classification, added nine compatibility regressions and passed 14 native upstream
tests. All 338 current-corpus/fixture scenes exported; representative visual
inspection found an existing TopK label overflow. The user approved its visual
correction, which is implemented and validated. The user subsequently authorized
committing, pushing and opening its implementation PR, followed by three coverage
improvements on a separate branch. The user merged PR #79 as `5f595c4` after
CI passed. The coverage follow-up passes 933 tests locally with five additional
expected drawings. The user approved local review and authorized its separate
commit, push and PR.
Distributed rendering and the audited support pin remain unchanged.
All nine upstream-review inputs also have matching expected drawings checked by
the shared integration runner, alongside the semantic assertions (F5-V2).
The paragraphs below preserve the original triage evidence and limits.

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
