/** Shared API response shapes for axios typing (privacy-first: no body text on wire beyond local editor). */

export interface ApiUser {
  _id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthPayload {
  user: ApiUser;
  token: string;
}

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
}

export interface ApiErrorBody {
  success: false;
  message: string;
  errors?: unknown;
}

export type AuthResponse = ApiSuccess<AuthPayload>;

export interface SessionDoc {
  _id: string;
  userId: string;
  metrics: SessionMetrics;
  keystrokes: KeystrokeMeta[];
  pasteEvents: PasteEventMeta[];
  startTime: string;
  endTime?: string;
  /** Present after analysis; may be absent on brand-new sessions */
  authenticityScore?: AuthenticityScore;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMetrics {
  characterCount: number;
  wordCount: number;
  revisionEventCount: number;
}

export interface KeystrokeMeta {
  keyInterval: number;
  timestamp: number;
  category: KeystrokeCategory;
}

export type KeystrokeCategory =
  | 'printable'
  | 'backspace'
  | 'delete'
  | 'enter'
  | 'navigation'
  | 'other';

export interface PasteEventMeta {
  length: number;
  timestamp: number;
}

export interface SuspiciousSegment {
  /** Milliseconds from session start */
  startMs: number;
  /** Milliseconds from session start */
  endMs: number;
  reason: string;
}

export interface AuthenticityScore {
  score: number;
  status: 'Human' | 'Suspicious' | 'AI';
  analysis: AuthenticityAnalysis;
  suspiciousSegments: SuspiciousSegment[];
  behavioralSummary: string;
  ml?: {
    placeholder: true;
    note: string;
  };
}

export interface AuthenticityAnalysis {
  meanKeyIntervalMs: number;
  intervalVarianceMs: number;
  intervalStdDevMs: number;
  coefficientOfVariation: number;
  pasteEventCount: number;
  totalPastedChars: number;
  keystrokeCount: number;
  revisionEventCount: number;
  longPauseCount: number;
  pauseBuckets: { short: number; medium: number; long: number };
  totalActiveTypingMs: number;
  revisionRatio: number;
  anomalyFlags: string[];
}
