import React, { useState } from 'react';

export default function CacheBanner({ cached, latencyMs, fingerprint, onInvalidate }) {
  const [copied, setCopied] = useState(false);
  const [invalidating, setInvalidating] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(fingerprint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvalidateClick = async () => {
    setInvalidating(true);
    try {
      await onInvalidate(fingerprint);
    } finally {
      setInvalidating(false);
    }
  };

  return (
    <div className="cache-banner">
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <span className={`cache-status-pill ${cached ? 'cached' : 'fresh'}`}>
          {cached ? '⚡ Instant Redis Cache Hit' : '🤖 Fresh AI Evaluation'}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Latency: <strong style={{ color: cached ? 'var(--emerald-text)' : 'var(--cyan-text)' }}>{latencyMs} ms</strong>
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <div className="fingerprint-text" title={`SHA-256: ${fingerprint}`}>
          <span>SHA-256: {fingerprint.slice(0, 12)}...{fingerprint.slice(-6)}</span>
          <button
            onClick={handleCopy}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.75rem',
              padding: '2px 4px'
            }}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {cached && onInvalidate && (
          <button
            onClick={handleInvalidateClick}
            disabled={invalidating}
            style={{
              padding: '0.35rem 0.65rem',
              borderRadius: '6px',
              fontSize: '0.75rem',
              background: 'rgba(244, 63, 94, 0.15)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              color: 'var(--rose-text)',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            {invalidating ? 'Clearing...' : 'Clear Cache'}
          </button>
        )}
      </div>
    </div>
  );
}
