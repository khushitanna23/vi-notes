import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  BarElement,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import apiClient from '../apiClient';
import type { SessionDoc } from '../types/api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, BarElement);

const Report: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [session, setSession] = useState<SessionDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const fetchSessionData = useCallback(async () => {
    if (!sessionId) return;
    try {
      setLoading(true);
      const response = await apiClient.get<{ success: boolean; data: SessionDoc }>(`/sessions/${sessionId}`);

      if (response.data.success) {
        setSession(response.data.data);
      } else {
        setError('Failed to load session data');
      }
    } catch (err) {
      console.error('Error fetching session:', err);
      setError('Error loading session data');
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    fetchSessionData();
  }, [fetchSessionData]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Human':
        return '#10b981';
      case 'Suspicious':
        return '#f59e0b';
      case 'AI':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10b981';
    if (score >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const prepareTypingSpeedData = () => {
    if (!session || session.keystrokes.length === 0) return null;

    const intervals = session.keystrokes.map((k) => k.keyInterval);
    const labels = intervals.map((_, index) => `${index + 1}`);

    return {
      labels,
      datasets: [
        {
          label: 'Key interval (ms)',
          data: intervals,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.1,
        },
      ],
    };
  };

  const preparePasteData = () => {
    if (!session || session.pasteEvents.length === 0) return null;

    const pasteLengths = session.pasteEvents.map((p) => p.length);
    const labels = pasteLengths.map((_, index) => `Paste ${index + 1}`);

    return {
      labels,
      datasets: [
        {
          label: 'Pasted length (chars)',
          data: pasteLengths,
          backgroundColor: '#ef4444',
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading report...</p>
      </div>
    );
  }

  if (error || !session || !session.authenticityScore) {
    return (
      <div className="error-container">
        <h2>Error</h2>
        <p>{error || 'Session not found'}</p>
        <button type="button" onClick={() => navigate('/dashboard')} className="btn-primary">
          Back to dashboard
        </button>
      </div>
    );
  }

  const typingSpeedData = prepareTypingSpeedData();
  const pasteData = preparePasteData();
  const ascore = session.authenticityScore;
  const analysis = ascore.analysis;

  return (
    <div className="report-container">
      <div className="report-header">
        <h2>Authenticity report</h2>
        <div className="report-actions">
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
            Dashboard
          </button>
          <button type="button" onClick={() => navigate('/editor')} className="btn-primary">
            New session
          </button>
        </div>
      </div>

      <div className="report-content">
        <div className="score-card">
          <div className="score-header">
            <h3>Authenticity score</h3>
          </div>
          <div className="score-content">
            <div
              className="score-circle"
              style={{
                borderColor: getScoreColor(ascore.score),
                color: getScoreColor(ascore.score),
              }}
            >
              <span className="score-number">{ascore.score}</span>
              <span className="score-max">/100</span>
            </div>
            <div className="status-badge" style={{ backgroundColor: getStatusColor(ascore.status) }}>
              {ascore.status}
            </div>
          </div>
          <p className="behavioral-summary">{ascore.behavioralSummary}</p>
          {ascore.ml?.note && <p className="ml-placeholder">{ascore.ml.note}</p>}
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <h4>Session metrics (no body text stored)</h4>
            <div className="stat-items">
              <div className="stat-item">
                <span className="stat-label">Characters (aggregate)</span>
                <span className="stat-value">{session.metrics.characterCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Words (aggregate)</span>
                <span className="stat-value">{session.metrics.wordCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Active span</span>
                <span className="stat-value">
                  {analysis.totalActiveTypingMs > 0 ? `${Math.round(analysis.totalActiveTypingMs / 1000)}s` : 'N/A'}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h4>Timing & rhythm</h4>
            <div className="stat-items">
              <div className="stat-item">
                <span className="stat-label">Mean interval</span>
                <span className="stat-value">{Math.round(analysis.meanKeyIntervalMs)} ms</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Std. dev.</span>
                <span className="stat-value">{Math.round(analysis.intervalStdDevMs)} ms</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Coefficient of variation</span>
                <span className="stat-value">{analysis.coefficientOfVariation.toFixed(3)}</span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h4>Revisions & paste</h4>
            <div className="stat-items">
              <div className="stat-item">
                <span className="stat-label">Revision events</span>
                <span className="stat-value">{analysis.revisionEventCount}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Revision ratio</span>
                <span className="stat-value">{(analysis.revisionRatio * 100).toFixed(1)}%</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Paste events / chars</span>
                <span className="stat-value">
                  {analysis.pasteEventCount} / {analysis.totalPastedChars}
                </span>
              </div>
            </div>
          </div>

          <div className="stat-card">
            <h4>Pauses</h4>
            <div className="stat-items">
              <div className="stat-item">
                <span className="stat-label">&lt;500 ms</span>
                <span className="stat-value">{analysis.pauseBuckets.short}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">500 ms – 2 s</span>
                <span className="stat-value">{analysis.pauseBuckets.medium}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">&gt;2 s</span>
                <span className="stat-value">{analysis.pauseBuckets.long}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">Long pauses (&gt;2.5 s)</span>
                <span className="stat-value">{analysis.longPauseCount}</span>
              </div>
            </div>
          </div>
        </div>

        {analysis.anomalyFlags.length > 0 && (
          <div className="content-card">
            <h3>Anomaly signals</h3>
            <ul className="anomaly-list">
              {analysis.anomalyFlags.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
        )}

        {ascore.suspiciousSegments.length > 0 && (
          <div className="content-card">
            <h3>Suspicious segments (time only)</h3>
            <p className="muted">
              Ranges are relative to session start. No written text is stored or shown.
            </p>
            <ul className="segment-list">
              {ascore.suspiciousSegments.map((s, idx) => (
                <li key={`${s.startMs}-${idx}`}>
                  {Math.round(s.startMs)} ms – {Math.round(s.endMs)} ms: {s.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {typingSpeedData && (
          <div className="chart-card">
            <h3>Key intervals</h3>
            <div className="chart-container">
              <Line
                data={typingSpeedData}
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Intervals between tracked keys (metadata only)',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Interval (ms)',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        {pasteData && (
          <div className="chart-card">
            <h3>Paste lengths</h3>
            <div className="chart-container">
              <Bar
                data={pasteData}
                options={{
                  responsive: true,
                  plugins: {
                    title: {
                      display: true,
                      text: 'Characters per paste (content not stored)',
                    },
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: 'Characters',
                      },
                    },
                  },
                }}
              />
            </div>
          </div>
        )}

        <div className="content-card privacy-card">
          <h3>Privacy</h3>
          <p className="no-content">
            Vi-Notes keeps your wording on your device for drafting. The service stores timing categories, paste sizes,
            and aggregate counts for scoring — not what you typed.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Report;
