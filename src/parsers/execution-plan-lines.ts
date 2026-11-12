export interface ExecutionPlanLine { text: string; lineNumber: number }

/** Preserve original line numbers while normalizing copied physical-plan text. */
export function preprocessExecutionPlanLines(planText: string): ExecutionPlanLine[] {
  return planText.split('\n').map((line, index) => {
    // Copied plan-column output can retain its trailing table border.
    let processed = line.trimEnd();
    if (!processed.trimStart().startsWith('|')) processed = processed.replace(/\s+\|$/, '').trimEnd();

    // Preserve indentation in the last nonempty table column.
    if (processed.trimStart().startsWith('|')) {
      const parts = processed.split('|').map((part) => part.trimEnd());
      for (let i = parts.length - 1; i >= 0; i--) {
        if (parts[i].trim().length > 0) {
          processed = parts[i];
          break;
        }
      }
    } else {
      processed = processed.trimEnd();
    }
    return { text: processed, lineNumber: index + 1 };
  }).filter(({ text }) => {
    const trimmed = text.trim();
    if (trimmed.length === 0) return false;
    // Historical copied inputs may contain isolated backticks or pipe borders.
    return !(trimmed.length <= 2 && /^[^a-zA-Z0-9]+$/.test(trimmed));
  });
}
