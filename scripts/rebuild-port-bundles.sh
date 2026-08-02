#!/usr/bin/env bash
# Rebuild browser ESM bundles from ShiftPlanConverter-Mobile (sibling repo).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MOBILE="${MOBILE_SRC:-$ROOT/../ShiftPlanConverter-Mobile/src}"
TMP="${TMPDIR:-/tmp}/spc-port-$$"
mkdir -p "$TMP" "$ROOT/src/parsers" "$ROOT/src/payroll"
ln -sfn "$MOBILE" "$TMP/mobile-src"
printf '%s\n' "export { looksLikeCodeGrid, parsePdfCodeGrid } from './mobile-src/convert/parsers/engines/pdf-code-grid.ts';" > "$TMP/code-grid-entry.ts"
printf '%s\n' \
  "export { parsePayslipText, isLikelyPayslipText } from './mobile-src/convert/parsers/engines/pdf-payslip.ts';" \
  "export { runPayrollCheck } from './mobile-src/payroll/check.ts';" \
  > "$TMP/payroll-entry.ts"
npx --yes esbuild@0.25.0 "$TMP/code-grid-entry.ts" --bundle --format=esm --platform=browser \
  --outfile="$ROOT/src/parsers/codeGrid.bundle.js"
npx --yes esbuild@0.25.0 "$TMP/payroll-entry.ts" --bundle --format=esm --platform=browser \
  --outfile="$ROOT/src/payroll/payroll.bundle.js"
rm -rf "$TMP"
echo "Bundles updated."
