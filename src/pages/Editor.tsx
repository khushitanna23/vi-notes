import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../apiClient';
import type { KeystrokeMeta, KeystrokeCategory, PasteEventMeta } from '../types/api';
import { computeLiveWarnings, wordCountFromText } from '../utils/typingRealtime';

function categorizeKey(key: string): KeystrokeCategory {
  if (key === 'Backspace') return 'backspace';
  if (key === 'Delete') return 'delete';
  if (key === 'Enter') return 'enter';
  if (key.length === 1) return 'printable';
  if (key.startsWith('Arrow') || key === 'Home' || key === 'End' || key === 'PageUp' || key === 'PageDown' || key === 'Tab')
    return 'navigation';
  return 'other';
}

const Editor: React.FC = () => {
  const [content, setContent] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [keystrokes, setKeystrokes] = useState<KeystrokeMeta[]>([]);
  const [pasteEvents, setPasteEvents] = useState<PasteEventMeta[]>([]);
  const [isTracking, setIsTracking] = useState(false);

  const lastKeyTimeRef = useRef<number>(Date.now());
  const firstKeyRef = useRef(true);
  const ksSentRef = useRef(0);
  const pasteSentRef = useRef(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { token } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete apiClient.defaults.headers.common['Authorization'];
    }
  }, [token]);

  const revisionCount = useMemo(
    () => keystrokes.filter((k) => k.category === 'backspace' || k.category === 'delete').length,
    [keystrokes]
  );

  const wpmWindow = useMemo(() => {
    const ks = keystrokes.filter((k) => k.category === 'printable').slice(-40);
    if (ks.length < 8) return 0;
    const t0 = ks[0].timestamp;
    const t1 = ks[ks.length - 1].timestamp;
    const minutes = (t1 - t0) / 60000;
    if (minutes <= 0) return 0;
    const words = ks.length / 5;
    return words / minutes;
  }, [keystrokes]);

  const liveWarnings = useMemo(
    () =>
      computeLiveWarnings({
        keystrokes,
        pasteCount: pasteEvents.length,
        wpmWindow,
      }),
    [keystrokes, pasteEvents.length, wpmWindow]
  );

  const initializeSession = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiClient.post<{ success: boolean; data: { _id: string } }>('/sessions', {});

      if (response.data.success) {
        setSessionId(response.data.data._id);
        setIsTracking(true);
        firstKeyRef.current = true;
        ksSentRef.current = 0;
        pasteSentRef.current = 0;
        lastKeyTimeRef.current = Date.now();
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }
    } catch (error) {
      console.error('Error initializing session:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      initializeSession();
    }
  }, [token, initializeSession]);

  const saveMetadata = useCallback(async () => {
    if (!sessionId) return;

    try {
      setSaving(true);
      const ksBatch = keystrokes.slice(ksSentRef.current);
      const pasteBatch = pasteEvents.slice(pasteSentRef.current);

      const response = await apiClient.put<{ success: boolean }>(`/sessions/${sessionId}`, {
        metrics: {
          characterCount: content.length,
          wordCount: wordCountFromText(content),
          revisionEventCount: revisionCount,
        },
        ...(ksBatch.length ? { keystrokes: ksBatch } : {}),
        ...(pasteBatch.length ? { pasteEvents: pasteBatch } : {}),
      });

      if (response.data.success) {
        ksSentRef.current += ksBatch.length;
        pasteSentRef.current += pasteBatch.length;
      }
    } catch (error) {
      console.error('Error saving session metadata:', error);
    } finally {
      setSaving(false);
    }
  }, [sessionId, keystrokes, pasteEvents, content, revisionCount]);

  useEffect(() => {
    if (!sessionId) return;

    const timeoutId = window.setTimeout(() => {
      saveMetadata();
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [content, sessionId, saveMetadata]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!isTracking) return;

    const now = Date.now();
    const category = categorizeKey(e.key);
    const interval = firstKeyRef.current ? 0 : now - lastKeyTimeRef.current;
    firstKeyRef.current = false;

    if (
      category === 'printable' ||
      category === 'backspace' ||
      category === 'delete' ||
      category === 'enter' ||
      category === 'navigation'
    ) {
      const stroke: KeystrokeMeta = {
        keyInterval: Math.min(interval, 60000),
        timestamp: now,
        category,
      };
      setKeystrokes((prev) => [...prev, stroke]);
      lastKeyTimeRef.current = now;
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!isTracking) return;

    const pastedText = e.clipboardData.getData('text');
    const next: PasteEventMeta = {
      length: pastedText.length,
      timestamp: Date.now(),
    };

    setPasteEvents((prev) => [...prev, next]);
  };

  const endSession = async () => {
    if (!sessionId) return;

    try {
      setLoading(true);
      await saveMetadata();

      const response = await apiClient.post<{ success: boolean }>(`/sessions/${sessionId}/end`);

      if (response.data.success) {
        navigate(`/report/${sessionId}`);
      }
    } catch (error) {
      console.error('Error ending session:', error);
    } finally {
      setLoading(false);
    }
  };

  const newSession = async () => {
    setContent('');
    setKeystrokes([]);
    setPasteEvents([]);
    ksSentRef.current = 0;
    pasteSentRef.current = 0;
    firstKeyRef.current = true;
    lastKeyTimeRef.current = Date.now();
    await initializeSession();
  };

  if (loading && !sessionId) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Initializing editor...</p>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="editor-header">
        <div className="editor-title">
          <h2>Writing Editor</h2>
          {saving && <span className="saving-indicator">Syncing metadata...</span>}
        </div>
        <div className="editor-actions">
          <button type="button" onClick={newSession} className="btn-secondary">
            New Session
          </button>
          <button type="button" onClick={endSession} className="btn-primary" disabled={!sessionId}>
            End Session & View Report
          </button>
        </div>
      </div>

      <div className="editor-body">

        <div className="editor-stats">
          <div className="stat-item">
            <span className="stat-label">Characters (local)</span>
            <span className="stat-value">{content.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Words (local)</span>
            <span className="stat-value">{wordCountFromText(content)}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Keystroke events</span>
            <span className="stat-value">{keystrokes.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Paste events</span>
            <span className="stat-value">{pasteEvents.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Est. WPM (recent)</span>
            <span className="stat-value">{wpmWindow ? Math.round(wpmWindow) : '—'}</span>
          </div>
        </div>

        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Write here — timing and edits are analyzed; wording is not uploaded."
          className="editor-textarea"
          disabled={!sessionId}
          spellCheck
        />
      </div>
    </div>
  );
};

export default Editor;
