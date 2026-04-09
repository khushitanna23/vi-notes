import type { KeystrokeMeta } from '../types/api';

/**
 * Client-side heuristics for live warnings. Uses only local timing metadata.
 */
export function computeLiveWarnings(params: {
  keystrokes: KeystrokeMeta[];
  pasteCount: number;
  wpmWindow: number;
}): string[] {
  const warnings: string[] = [];
  const { keystrokes, pasteCount, wpmWindow } = params;

  if (pasteCount > 0) {
    warnings.push('Paste detected — only length/timing is analyzed; text stays on your device until you finish.');
  }

  const recent = keystrokes.slice(-40);
  const intervals = recent
    .map((k) => k.keyInterval)
    .filter((n) => typeof n === 'number' && n >= 0 && n < 30000);

  if (intervals.length >= 15) {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance =
      intervals.reduce((s, x) => s + (x - mean) ** 2, 0) / intervals.length;
    const sd = Math.sqrt(variance);
    const cv = mean > 0 ? sd / mean : 0;
    if (cv < 0.18 && mean > 0 && mean < 400) {
      warnings.push('Typing rhythm is unusually steady — may lower authenticity score.');
    }
  }

  if (wpmWindow > 95 && keystrokes.length > 30) {
    warnings.push('Very high sustained speed — verify you are typing naturally.');
  }

  return warnings.slice(0, 4);
}

export function wordCountFromText(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}
