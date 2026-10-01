# Corpus review tooling

These scripts run from a [source checkout](../CONTRIBUTING.md#setup) with development
dependencies installed. Normal CLI/library conversion does not need Playwright or Chromium.

## Mixed-corpus gallery

After building, generate an inventory and local gallery without modifying input files:

~~~sh
npm run build
npx playwright install chromium
node scripts/review-corpus.cjs \
  --upstream /path/to/datafusion-distributed \
  --connector /path/to/snapshots \
  --output tmp/corpus-review \
  --render
~~~

The script finds stored physical plans in snapshot sections, Rust inline snapshots/raw
strings, and Markdown code blocks. It records excluded sections, unsupported sketches,
conversion failures and missing runtime outputs explicitly. Each rendered entry links
to its original plan text, editable Excalidraw and PNG. PNG exports check that every
expected label was drawn; large previews are scaled to browser-safe dimensions.
Source revisions/hashes and the local converter revision/changes are recorded.
`--connector` accepts any directory of saved connector plans.
Use `--fixtures tests/distributed` to include the public distributed fixtures, and
`--runtime /path/to/captured/snapshots` for additional locally captured plans.

Create the thumbnail overview and run the browser editability checks with:

~~~sh
node scripts/corpus-contact-sheets.cjs tmp/corpus-review
node scripts/verify-distributed.cjs
node scripts/audit-upstream-operators.cjs /path/to/datafusion-distributed
~~~

The inventory audit requires the pinned upstream revision documented in the [operator audit](operators/distributed-datafusion.md).
Local corpus galleries belong in ignored directories such as `tmp/`.

The browser checks exercise worker-group dragging, individual operator dragging and
network bindings in the actual Excalidraw editor, plus CLI section/error handling.

See the [Distributed DataFusion operator audit](operators/distributed-datafusion.md) for source references, execution contracts, coverage, and metadata limitations.

## Single-plan audit

This audit excludes distributed plans and worker recordings.

```sh
npm run build
node scripts/audit-corpus.cjs /path/to/snapshots --out /path/to/report.json
```

The audit separates physical-plan sections from distributed/worker plans, logical plans, and result tables, then checks geometry, text bounds, and bindings. Add `--render-dir /path/to/scenes` to save generated Excalidraw files. Synthetic regression fixtures use invented operator names and the same two-space indentation. Use the mixed-corpus workflow above to include distributed plans, worker recordings, and upstream examples.
