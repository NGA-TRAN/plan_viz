# Working on plan-viz

plan-viz converts DataFusion physical plans into editable Excalidraw diagrams.
Prioritize correct execution meaning, clear diagrams, and compatibility with
existing inputs and public interfaces.

Read [CONTRIBUTING.md](CONTRIBUTING.md) for development and release checks,
[the architecture](docs/ARCHITECTURE.md) for module boundaries, and
[the operator workflow](docs/operators/WORKFLOW.md) for operator changes. These
documents own their detailed procedures; link to them rather than duplicating
instructions. Apply the user's current scope and decisions when following them.

## Development principles

- **Clean code:** use precise names, cohesive functions, explicit inputs and
  outputs, and comments that explain decisions or constraints. Follow the
  surrounding TypeScript conventions; remove dead code in the changed area.
- **DRY:** keep each semantic rule and configuration definition in one place.
  Reuse established helpers. Extract an abstraction when callers share the same
  behavior and reasons to change; similar-looking code alone is not sufficient.
- **Keep it simple:** implement the current requirement with the smallest clear
  design. Avoid speculative frameworks, configuration, and dependencies.
- **Separate responsibilities:** parsing retains input, analysis establishes
  facts, and rendering presents them. Keep semantic decisions out of geometry
  helpers and avoid analysis that depends on a particular visual layout.
- **Use types and explicit errors:** preserve strict TypeScript checks. Model
  meaningful states explicitly; do not use `any`, unchecked casts, or swallowed
  errors to hide uncertainty or malformed input. Include useful source context
  in diagnostics.
- **Preserve compatibility:** keep existing defaults, public APIs, supported
  historical formats, and custom-generator contracts unless changing them is
  part of the task. Document intentional behavior changes and migration needs.
- **Make evidence visible:** distinguish observed values, estimates, declared
  contracts, and inferred facts. Unknown is different from zero or false.
  Renderer compatibility does not establish execution semantics. Verify new
  operator and metric contracts against a recorded upstream revision.
- **Keep changes focused:** use small, reviewable changes; avoid unrelated
  refactors or upgrades. Preserve user work and keep temporary investigations
  out of production modules.
- **Measure performance claims:** use representative inputs and a reproducible
  baseline before claiming an improvement. Consider large plans, task expansion,
  memory use, and output size when changing traversal or layout.
- **Maintain documentation:** update the relevant guide, operator audit, and
  changelog when their described behavior changes. Keep private plans and local
  research in ignored locations; sanitize fixtures used in the repository.

## Visualization stability and user approval

Preserve today's visualization as the default. Keep new metrics, structural
analysis, and upstream support additive and optional where practical. Avoid broad
changes to existing layouts, styles, labels, routing, or task presentation as a
side effect of unrelated work.

Before integrating any proposed user-visible visualization change:

1. Explain what will change, why, which plans are affected, and whether the
   existing default or an optional view is affected.
2. Prepare concrete current/proposed visualizations using the same representative
   inputs. Include single-node and distributed examples when affected. Use an
   isolated prototype or mockup to make the proposal reviewable; label mockups
   and their limits. Show rendered previews and provide the scene artifacts
   where available; code, JSON diffs, or a written description alone are not
   sufficient for visual approval.
3. Obtain the user's explicit approval of those visuals before integrating the
   change into normal rendering or adopting changed expected scenes. General
   approval of research, a feature, or an upstream upgrade does not by itself
   approve a new visual design. Reuse approval within its agreed scope; present
   another preview only if the proposal materially changes.
4. Protect existing default output with regression checks and add focused
   coverage for approved new behavior, including optional views.

This requirement comes from the user's visualization-stability instruction.
Research, compatibility reviews, and changes with no visual effect can proceed
within their authorized scope without a separate visual approval.

## Test-driven development

For new executable behavior and bug fixes:

1. Define the observable behavior and the important edge cases.
2. Add a focused test, and run it to confirm it fails for the intended reason.
3. Implement the smallest correct change that makes it pass.
4. Refactor for clarity and shared semantics, keeping the tests green.
5. Run the relevant regression checks and required contribution gates.

Test behavior and invariants rather than copying the implementation into the
test. Cover malformed input, missing metadata, zero versus unknown values, and
relevant task/partition boundaries. Keep fixtures deterministic and sanitized.
Use focused unit tests for rules, integration fixtures for end-to-end conversion,
and visual/browser checks for layout and editor interactions.

Inspect changed diagrams before accepting new expected scenes; a passing
snapshot alone does not establish visual correctness. Do not weaken assertions
or overwrite expectations merely to make a failure disappear.

For behavior-preserving refactors, establish a passing baseline and add a
characterization test first if existing coverage cannot protect the behavior.
For documentation-only or formatting changes, validate content, links, and
formatting; executable tests are unnecessary unless executable behavior changes.
Research probes should record what they check and what remains unverified.

Start with the narrowest meaningful checks. Use the commands and PR/release gates
in [CONTRIBUTING.md](CONTRIBUTING.md); avoid rerunning unrelated suites without a
reason. Report checks actually run and any remaining limitations.

## Upstream compatibility maintenance

Maintain support for Apache DataFusion and **datafusion-contrib/datafusion-distributed**
using [the upstream maintenance workflow](docs/UPSTREAM_MAINTENANCE.md).
During upstream-review, release, or dependency/format upgrade work, consult
[the review log](docs/UPSTREAM_REVIEW_LOG.md), compare with its recorded baseline,
and record findings and follow-up work there. Keep release/source provenance and
audited support separate. Follow this workflow when upstream maintenance is
requested or included in release preparation; it is not a prerequisite to every
unrelated edit.

## Background reading

These explain the testing principles; repository instructions above are the
working policy:

- [Martin Fowler: Test Driven Development](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Google Testing Blog: test behavior rather than implementation](https://testing.googleblog.com/2013/08/testing-on-toilet-test-behavior-not.html)
