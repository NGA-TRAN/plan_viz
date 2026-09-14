#!/usr/bin/env bash
# Run isolated tests for one operator so a reviewer can check a single spec.
# Usage: ./scripts/verify-operator.sh <prefix>
# Example: ./scripts/verify-operator.sh window
#          ./scripts/verify-operator.sh join_nested_loop

set -euo pipefail

prefix="${1:-}"
if [[ -z "${prefix}" ]]; then
  echo "Usage: $0 <prefix>" >&2
  echo "Prefix matches unit test paths and integration test names." >&2
  exit 1
fi

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "${root}"

echo "==> Unit tests matching *${prefix}*"
npx jest --coverage=false --testPathPattern="${prefix}" src/generators

echo "==> Integration goldens matching ${prefix}"
npx jest --coverage=false tests/integration.test.ts -t "${prefix}"

echo "OK: ${prefix}"
