import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../apiClient';
import type { SessionDoc } from '../types/api';

type SessionListItem = Pick<
  SessionDoc,
  '_id' | 'startTime' | 'endTime' | 'metrics' | 'createdAt' | 'authenticityScore'
>;

const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<SessionListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<{ success: boolean; data: SessionListItem[] }>('/sessions');
      if (res.data.success) {
        setSessions(res.data.data);
      } else {
        setError('Could not load sessions');
      }
    } catch {
      setError('Failed to fetch sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your sessions...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <h2>Dashboard</h2>
          <p className="muted">Recent writing sessions (metadata only on the server).</p>
        </div>
        <Link className="btn-primary" to="/editor">
          Start writing
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      {sessions.length === 0 ? (
        <div className="empty-dashboard">
          <p>No sessions yet. Open the editor to capture your first timing profile.</p>
          <Link className="btn-secondary" to="/editor">
            Go to editor
          </Link>
        </div>
      ) : (
        <div className="session-grid">
          {sessions.map((s) => {
            const score = s.authenticityScore?.score;
            const status = s.authenticityScore?.status;
            return (
              <article key={s._id} className="session-card">
                <div className="session-card-top">
                  <span className="session-date">
                    {new Date(s.createdAt).toLocaleString()}
                  </span>
                  {typeof score === 'number' && (
                    <span className="session-score-pill">
                      {score}/100{status ? ` · ${status}` : ''}
                    </span>
                  )}
                </div>
                <div className="session-meta">
                  <span>{s.metrics?.characterCount ?? 0} chars (aggregate)</span>
                  <span>{s.metrics?.wordCount ?? 0} words (aggregate)</span>
                </div>
                <div className="session-actions">
                  <Link className="link-button" to={`/report/${s._id}`}>
                    View report
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
