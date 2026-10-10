import React, { useState, useEffect, useRef } from 'react';
import ScoreGauge from './components/ScoreGauge';
import SkillsBadges from './components/SkillsBadges';
import CacheBanner from './components/CacheBanner';
import FeedbackSection from './components/FeedbackSection';
import { SAMPLES } from './data/samples';

export default function App() {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'text'
  const [file, setFile] = useState(null);
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState(SAMPLES[0].jobDescription);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const [health, setHealth] = useState({
    redis_connected: false,
    redis_backend: 'Connecting...',
    openai_configured: false,
    model: 'gpt-4o-mini'
  });

  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Poll system health
  const checkHealth = async () => {
    try {
      const res = await fetch('/api/v1/health');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (e) {
      console.warn("Backend not reachable yet", e);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith('.pdf')) {
        setError('Please select a valid PDF file.');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      if (!dropped.name.toLowerCase().endsWith('.pdf')) {
        setError('Please upload a valid PDF document.');
        return;
      }
      setFile(dropped);
      setError(null);
    }
  };

  const handleLoadSample = (sample) => {
    setActiveTab('text');
    setResumeText(sample.resumeText);
    setJobDescription(sample.jobDescription);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (activeTab === 'upload' && !file) {
      setError('Please choose or drop a PDF resume file.');
      return;
    }

    if (activeTab === 'text' && resumeText.trim().length < 20) {
      setError('Please enter at least 20 characters of resume content.');
      return;
    }

    if (jobDescription.trim().length < 20) {
      setError('Please provide a complete Job Description (at least 20 characters).');
      return;
    }

    setLoading(true);

    try {
      let res;
      if (activeTab === 'upload') {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('job_description', jobDescription);

        res = await fetch('/api/v1/rank', {
          method: 'POST',
          body: formData,
        });
      } else {
        res = await fetch('/api/v1/rank-text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            resume_text: resumeText,
            job_description: jobDescription,
          }),
        });
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Server error (${res.status})`);
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'An unexpected error occurred during evaluation.');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateCache = async (fingerprint) => {
    try {
      const res = await fetch(`/api/v1/cache/${fingerprint}`, { method: 'DELETE' });
      if (res.ok) {
        // Automatically re-run evaluation to demonstrate fresh processing
        await handleSubmit({ preventDefault: () => {} });
      }
    } catch (err) {
      console.error('Failed to invalidate cache:', err);
    }
  };

  return (
    <>
      <div className="ambient-bg" />
      <div className="ambient-grid" />

      <main className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="brand-wrapper">
            <div className="brand-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div>
              <h1 className="brand-title">AI-Powered Resume Ranker</h1>
              <p className="brand-subtitle">Automated ATS screening with Redis SHA-256 fingerprint caching</p>
            </div>
          </div>

          {/* System Status Indicators */}
          <div className="system-status-group">
            <div className="status-chip" title={`Cache Provider: ${health.redis_backend}`}>
              <span className={`status-dot ${health.redis_connected ? 'active' : 'warning'}`} />
              <span>Redis: {health.redis_backend || 'Checking...'}</span>
            </div>

            <div className="status-chip" title={health.openai_configured ? 'Live OpenAI API Connected' : 'Local Heuristic Engine Active'}>
              <span className={`status-dot ${health.openai_configured ? 'active' : 'warning'}`} />
              <span>
                {health.openai_configured ? `AI: ${health.model}` : 'AI: Local Screener Engine'}
              </span>
            </div>
          </div>
        </header>

        {/* Main Grid: Form Inputs vs Results Dashboard */}
        <div className="main-grid">
          {/* Left Column: Input Form */}
          <section className="glass-card">
            <div className="card-header">
              <h2 className="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Resume & Job Description
              </h2>
            </div>

            {/* Resume Input Format Switcher */}
            <div className="tab-switcher">
              <button
                type="button"
                className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
                onClick={() => setActiveTab('upload')}
              >
                📄 Upload PDF Resume
              </button>
              <button
                type="button"
                className={`tab-btn ${activeTab === 'text' ? 'active' : ''}`}
                onClick={() => setActiveTab('text')}
              >
                📝 Paste Resume Text
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              {activeTab === 'upload' ? (
                <div>
                  <label className="form-label">Resume Document (.pdf)</label>
                  <div
                    className={`dropzone ${dragOver ? 'dragover' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg className="dropzone-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <div className="dropzone-text">Click or drag & drop resume PDF here</div>
                    <div className="dropzone-hint">Standard text-based PDF resumes supported (up to 10MB)</div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept=".pdf"
                      style={{ display: 'none' }}
                    />
                  </div>

                  {file && (
                    <div className="file-preview">
                      <div className="file-info">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--accent-primary)' }}>
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                        </svg>
                        <span>{file.name}</span>
                        <span style={{ color: 'var(--text-dim)', fontSize: '0.78rem' }}>
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        className="remove-file-btn"
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                      >
                        ✕ Remove
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <label className="form-label" htmlFor="resume-text">Paste Resume Text</label>
                  <textarea
                    id="resume-text"
                    className="form-textarea"
                    rows={6}
                    placeholder="Paste resume content here..."
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                  />
                </div>
              )}

              {/* Job Description Input */}
              <div style={{ marginTop: '1.25rem' }}>
                <label className="form-label" htmlFor="job-description">Job Description (JD)</label>
                <textarea
                  id="job-description"
                  className="form-textarea"
                  rows={6}
                  placeholder="Paste target job description and skill requirements..."
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                />
              </div>

              {/* Sample Presets for 1-click test */}
              <div className="presets-bar">
                <span className="presets-title">Load Sample:</span>
                {SAMPLES.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    className="preset-chip"
                    onClick={() => handleLoadSample(sample)}
                  >
                    ⚡ {sample.title}
                  </button>
                ))}
              </div>

              {error && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--rose-bg)',
                  border: '1px solid var(--rose-border)',
                  color: 'var(--rose-text)',
                  fontSize: '0.85rem'
                }}>
                  ⚠️ {error}
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner" />
                    <span>Analyzing & Checking Cache...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <span>Analyze & Rank Candidate</span>
                  </>
                )}
              </button>
            </form>
          </section>

          {/* Right Column: Results Dashboard */}
          <section className="glass-card">
            <div className="card-header">
              <h2 className="card-title">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                Screening Assessment Results
              </h2>
            </div>

            {result ? (
              <div className="results-container">
                {/* Redis Fingerprint & Cache Banner */}
                <CacheBanner
                  cached={result.cached}
                  latencyMs={result.latency_ms}
                  fingerprint={result.fingerprint}
                  onInvalidate={handleInvalidateCache}
                />

                {/* Score Overview Gauge & Category Bars */}
                <ScoreGauge
                  score={result.analysis.match_score}
                  categoryScores={result.analysis.category_scores}
                />

                {/* Summary Box */}
                <div className="summary-box">
                  <strong style={{ color: '#fff', display: 'block', marginBottom: '0.35rem' }}>
                    Executive Summary:
                  </strong>
                  {result.analysis.summary}
                </div>

                {/* Skills Comparison */}
                <SkillsBadges
                  matchedSkills={result.analysis.matched_skills}
                  missingSkills={result.analysis.missing_skills}
                />

                {/* Actionable Feedback */}
                <FeedbackSection
                  strengths={result.analysis.strengths}
                  weaknesses={result.analysis.weaknesses_and_gaps}
                  feedback={result.analysis.actionable_feedback}
                />
              </div>
            ) : (
              <div className="empty-state">
                <svg className="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <circle cx="12" cy="14" r="3" />
                  <line x1="12" y1="17" x2="12" y2="19" />
                </svg>
                <div className="empty-state-title">No Evaluation Yet</div>
                <div className="empty-state-text">
                  Upload a PDF resume or click a preset sample on the left to compute the match score and trigger Redis SHA-256 caching.
                </div>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
