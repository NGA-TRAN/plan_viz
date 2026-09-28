/** Positions outside nested expressions and quoted literals. */
function scan(text: string): { positions: number[]; balanced: boolean } {
  const positions: number[] = [];
  const stack: string[] = [];
  let quote = '';
  let valid = true;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      if (char === '\\') i++;
      else if (char === quote) {
        if (text[i + 1] === quote) i++;
        else quote = '';
      }
      continue;
    }
    if (char === '"' || char === '\'') {
      quote = char;
      continue;
    }
    if (stack.length === 0) positions.push(i);
    if ('([{'.includes(char)) stack.push(char);
    else if (')]}'.includes(char)) {
      const opening = '([{'[')]}'.indexOf(char)];
      if (stack.at(-1) === opening) stack.pop();
      else valid = false;
    }
  }
  return { positions, balanced: valid && !quote && stack.length === 0 };
}

export function topLevelPositions(text: string): number[] {
  return scan(text).positions;
}

export function isBalanced(text: string): boolean {
  return scan(text).balanced;
}

export function splitTopLevel(text: string, delimiter: string = ','): string[] {
  const result: string[] = [];
  let start = 0;
  for (const index of topLevelPositions(text)) {
    if (text[index] === delimiter) {
      result.push(text.slice(start, index).trim());
      start = index + 1;
    }
  }
  const tail = text.slice(start).trim();
  if (tail) result.push(tail);
  return result;
}

/** Remove only the enclosing list, never a nested expression's closing bracket. */
export function listContent(text: string): string {
  const value = text.trim();
  return value.startsWith('[') && value.endsWith(']') ? value.slice(1, -1) : value;
}

/** A column can itself start with @; only numeric position annotations are removed. */
export function withoutColumnIndex(text: string): string {
  const positions = new Set(topLevelPositions(text));
  return text.replace(/@[0-9]+\b/g, (match, offset: number) => positions.has(offset) ? '' : match);
}

export function expressionAlias(text: string): string | undefined {
  for (const index of topLevelPositions(text)) {
    const match = text.slice(index).match(/^\s+as\s+(.+)$/i);
    if (match) return withoutColumnIndex(match[1].trim());
  }
  return undefined;
}
