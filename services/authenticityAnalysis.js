/**
 * Computes authenticity score and behavioral metadata from timing-only data.
 * Does not use or expect actual written text — only intervals, categories, and paste lengths.
 */

const PAUSE_SHORT_MAX = 500;
const PAUSE_MEDIUM_MAX = 2000;
const FIRST_KEY_SKIP_MS = 15000; // ignore implausible warm-up gap
const CV_SUSPICIOUS_MAX = 0.35; // very steady rhythm
const LONG_PAUSE_MS = 2500;

function safeIntervals(keystrokes) {
  if (!keystrokes || keystrokes.length < 2) return [];
  const sorted = [...keystrokes].sort((a, b) => a.timestamp - b.timestamp);
  const intervals = [];
  for (let i = 1; i < sorted.length; i++) {
    const dt = sorted[i].keyInterval;
    if (typeof dt !== 'number' || dt < 0) continue;
    if (intervals.length === 0 && dt > FIRST_KEY_SKIP_MS) continue;
    intervals.push(dt);
  }
  return intervals;
}

function mean(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr) {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
}

function stdDev(arr) {
  return Math.sqrt(variance(arr));
}

/**
 * Basic anomaly flags: z-score on log(intervals) to reduce skew from long pauses.
 */
function anomalyFlags(intervals) {
  const flags = [];
  if (intervals.length < 8) return flags;

  const logs = intervals.map((x) => Math.log1p(Math.min(x, 60000)));
  const m = mean(logs);
  const sd = stdDev(logs);
  if (sd < 1e-6) {
    flags.push('extremely_uniform_timing');
    return flags;
  }

  let outliers = 0;
  for (const v of logs) {
    if (Math.abs(v - m) / sd > 3) outliers += 1;
  }
  if (outliers / logs.length > 0.15) {
    flags.push('timing_outlier_burst');
  }

  return flags;
}

function pauseBuckets(intervals) {
  let short = 0;
  let medium = 0;
  let long = 0;
  for (const dt of intervals) {
    if (dt <= PAUSE_SHORT_MAX) short += 1;
    else if (dt <= PAUSE_MEDIUM_MAX) medium += 1;
    else long += 1;
  }
  return { short, medium, long };
}

function revisionCount(keystrokes) {
  if (!keystrokes) return 0;
  return keystrokes.filter(
    (k) => k.category === 'backspace' || k.category === 'delete'
  ).length;
}

/**
 * Heuristic suspicious segments: time ranges (ms from session start) with paste or flat typing.
 */
function buildSuspiciousSegments(sessionStartMs, keystrokes, pasteEvents, intervals) {
  const segments = [];
  const start = sessionStartMs || 0;

  if (pasteEvents && pasteEvents.length) {
    for (const p of pasteEvents) {
      const t = typeof p.timestamp === 'number' ? p.timestamp : 0;
      segments.push({
        startMs: Math.max(0, t - start - 50),
        endMs: Math.max(0, t - start + 50),
        reason: `Large paste (${p.length} chars) — content not stored`,
      });
    }
  }

  if (intervals.length >= 12) {
    const windowSize = 10;
    for (let i = 0; i <= intervals.length - windowSize; i++) {
      const slice = intervals.slice(i, i + windowSize);
      const cv = stdDev(slice) / (mean(slice) || 1);
      if (cv < 0.12) {
        const approxMs = (keystrokes[i + 1]?.timestamp || 0) - start;
        segments.push({
          startMs: Math.max(0, approxMs - 400),
          endMs: Math.max(0, approxMs + 400),
          reason: 'Unusually constant key intervals (possible automation)',
        });
        break;
      }
    }
  }

  return segments.slice(0, 20);
}

function behavioralSummary(analysis, status) {
  const parts = [
    `Status: ${status}.`,
    `Keystrokes recorded: ${analysis.keystrokeCount} (metadata only).`,
    `Mean interval ${Math.round(analysis.meanKeyIntervalMs)} ms; CV ${analysis.coefficientOfVariation.toFixed(2)}.`,
    `Pauses — short: ${analysis.pauseBuckets.short}, medium: ${analysis.pauseBuckets.medium}, long: ${analysis.pauseBuckets.long}.`,
    `Revisions (backspace/delete events): ${analysis.revisionEventCount} (ratio ${(analysis.revisionRatio * 100).toFixed(1)}%).`,
    `Paste events: ${analysis.pasteEventCount} (${analysis.totalPastedChars} chars indicated, text not stored).`,
  ];
  if (analysis.anomalyFlags.length) {
    parts.push(`Signals: ${analysis.anomalyFlags.join(', ')}.`);
  }
  return parts.join(' ');
}

/**
 * @param {object} params
 * @param {import('mongoose').Document & { keystrokes: any[]; pasteEvents: any[]; metrics?: any; startTime?: Date }} params.doc
 */
function analyzeSessionDocument(doc) {
  const keystrokes = doc.keystrokes || [];
  const pasteEvents = doc.pasteEvents || [];
  const metrics = doc.metrics || {};
  const revisionEventCount =
    metrics.revisionEventCount != null
      ? metrics.revisionEventCount
      : revisionCount(keystrokes);

  const intervals = safeIntervals(keystrokes);
  const meanKeyIntervalMs = mean(intervals);
  const intervalVarianceMs = variance(intervals);
  const intervalStdDevMs = stdDev(intervals);
  const coefficientOfVariation =
    meanKeyIntervalMs > 0 ? intervalStdDevMs / meanKeyIntervalMs : 0;

  const pasteEventCount = pasteEvents.length;
  const totalPastedChars = pasteEvents.reduce((s, p) => s + (p.length || 0), 0);

  const longPauseCount = intervals.filter((x) => x >= LONG_PAUSE_MS).length;
  const buckets = pauseBuckets(intervals);

  const keystrokeCount = keystrokes.length;
  const revisionRatio =
    keystrokeCount > 0 ? revisionEventCount / keystrokeCount : 0;

  const firstTs = keystrokes.length
    ? Math.min(...keystrokes.map((k) => k.timestamp))
    : Date.now();
  const lastTs = keystrokes.length
    ? Math.max(...keystrokes.map((k) => k.timestamp))
    : firstTs;
  const totalActiveTypingMs =
    keystrokeCount > 1 ? Math.max(0, lastTs - firstTs) : 0;

  const flags = anomalyFlags(intervals);

  const charCount = metrics.characterCount || 0;
  const suspiciousContent =
    charCount > 80 && keystrokeCount > 0 && keystrokeCount < charCount * 0.25;

  let score = 100;
  if (charCount > 0 && keystrokeCount === 0) score = 15;
  else if (suspiciousContent) score -= 35;
  if (pasteEventCount > 0) {
    score -= Math.min(40, pasteEventCount * 12 + Math.min(20, totalPastedChars / 50));
  }
  if (intervals.length >= 10 && coefficientOfVariation < CV_SUSPICIOUS_MAX) {
    score -= 22;
    flags.push('low_timing_variance');
  }
  if (revisionRatio < 0.02 && charCount > 200) {
    score -= 12;
    flags.push('very_low_revision_rate');
  }
  if (longPauseCount === 0 && intervals.length > 30) {
    score -= 8;
    flags.push('no_long_pauses');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let status = 'Human';
  if (score < 40) status = 'AI';
  else if (score < 72) status = 'Suspicious';

  const sessionStartMs = doc.startTime ? new Date(doc.startTime).getTime() : firstTs;
  const suspiciousSegments = buildSuspiciousSegments(
    sessionStartMs,
    keystrokes,
    pasteEvents,
    intervals
  );

  const analysis = {
    meanKeyIntervalMs,
    intervalVarianceMs,
    intervalStdDevMs,
    coefficientOfVariation: Number(coefficientOfVariation.toFixed(4)),
    pasteEventCount,
    totalPastedChars,
    keystrokeCount,
    revisionEventCount,
    longPauseCount,
    pauseBuckets: buckets,
    totalActiveTypingMs,
    revisionRatio: Number(revisionRatio.toFixed(4)),
    anomalyFlags: flags,
  };

  return {
    score,
    status,
    analysis,
    suspiciousSegments,
    behavioralSummary: behavioralSummary(
      { ...analysis, keystrokeCount, revisionEventCount },
      status
    ),
    ml: {
      placeholder: true,
      note:
        'Future: TensorFlow.js / PyTorch server hook for sequence models on interval vectors only.',
    },
  };
}

export { analyzeSessionDocument };
