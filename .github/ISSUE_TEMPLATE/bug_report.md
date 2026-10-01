---
name: Bug report
about: Report incorrect plan conversion, rendering, or CLI behavior
title: ''
labels: ''
assignees: ''
---

**Describe the problem**
What did you expect, and what happened instead?

**Input plan and reproduction**
Include a minimal saved physical EXPLAIN plan with its original indentation.
For distributed plans, include stage headers, task counts, network references,
and source/UNION variants needed to reproduce the routing. Replace private names
without changing the structure or counts.

Include the CLI command or library call, including `--section`, `--all-workers`,
or the corresponding configuration if used.

**Output**
Attach the generated `.excalidraw` file or a screenshot, and include any error or
diagnostic messages. Identify the affected operator/stage and arrow when relevant.

**Environment**
- plan-viz version (`plan-viz --version`) or source commit:
- Node.js version (`node --version`):
- Operating system:
- Viewer (Excalidraw web, IDE extension, or plan-visualizer) and version if known:
- DataFusion / Distributed DataFusion version or source revision if known:

**Additional context**
Is this a complete EXPLAIN plan, an abbreviated documentation example, or a
worker/planner recording? Include any other context needed to reproduce it.
