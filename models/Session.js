import mongoose from 'mongoose';
import { analyzeSessionDocument } from '../services/authenticityAnalysis.js';

const keystrokeSchema = new mongoose.Schema({
  keyInterval: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Number,
    required: true,
  },
  // No actual keys — category only (privacy).
  category: {
    type: String,
    enum: ['printable', 'backspace', 'delete', 'enter', 'navigation', 'other'],
    default: 'other',
  },
});

const pasteEventSchema = new mongoose.Schema({
  length: {
    type: Number,
    required: true,
  },
  timestamp: {
    type: Number,
    required: true,
  },
});

const metricsSchema = new mongoose.Schema(
  {
    characterCount: { type: Number, default: 0 },
    wordCount: { type: Number, default: 0 },
    revisionEventCount: { type: Number, default: 0 },
  },
  { _id: false }
);

const suspiciousSegmentSchema = new mongoose.Schema(
  {
    startMs: { type: Number, required: true },
    endMs: { type: Number, required: true },
    reason: { type: String, required: true },
  },
  { _id: false }
);

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** Aggregate counts only — never stores note body text */
    metrics: {
      type: metricsSchema,
      default: () => ({}),
    },
    keystrokes: [keystrokeSchema],
    pasteEvents: [pasteEventSchema],
    startTime: {
      type: Date,
      default: Date.now,
    },
    endTime: {
      type: Date,
    },
    authenticityScore: {
      score: {
        type: Number,
        min: 0,
        max: 100,
      },
      status: {
        type: String,
        enum: ['Human', 'Suspicious', 'AI'],
        default: 'Human',
      },
      analysis: {
        meanKeyIntervalMs: Number,
        intervalVarianceMs: Number,
        intervalStdDevMs: Number,
        coefficientOfVariation: Number,
        pasteEventCount: Number,
        totalPastedChars: Number,
        keystrokeCount: Number,
        revisionEventCount: Number,
        longPauseCount: Number,
        pauseBuckets: {
          short: Number,
          medium: Number,
          long: Number,
        },
        totalActiveTypingMs: Number,
        revisionRatio: Number,
        anomalyFlags: [String],
      },
      suspiciousSegments: [suspiciousSegmentSchema],
      behavioralSummary: String,
      ml: {
        placeholder: Boolean,
        note: String,
      },
    },
  },
  {
    timestamps: true,
  }
);

sessionSchema.index({ userId: 1, createdAt: -1 });

sessionSchema.methods.calculateAuthenticity = function calculateAuthenticity() {
  const result = analyzeSessionDocument(this);
  this.authenticityScore = {
    score: result.score,
    status: result.status,
    analysis: result.analysis,
    suspiciousSegments: result.suspiciousSegments,
    behavioralSummary: result.behavioralSummary,
    ml: result.ml,
  };
  return this.authenticityScore;
};

export default mongoose.model('Session', sessionSchema);
