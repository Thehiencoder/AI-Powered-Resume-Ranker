import React from 'react';

export default function FeedbackSection({ strengths = [], weaknesses = [], feedback = [] }) {
  return (
    <div className="feedback-section">
      {strengths.length > 0 && (
        <div className="feedback-card strengths">
          <div className="feedback-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Key Candidate Strengths
          </div>
          <ul className="feedback-list">
            {strengths.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {weaknesses.length > 0 && (
        <div className="feedback-card" style={{ background: 'rgba(244, 63, 94, 0.04)', borderColor: 'rgba(244, 63, 94, 0.2)' }}>
          <div className="feedback-card-title" style={{ color: 'var(--rose-text)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            Identified Vulnerabilities & Gaps
          </div>
          <ul className="feedback-list">
            {weaknesses.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      {feedback.length > 0 && (
        <div className="feedback-card improvements">
          <div className="feedback-card-title">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
              <polyline points="17 6 23 6 23 12" />
            </svg>
            Actionable Optimization Recommendations
          </div>
          <ul className="feedback-list">
            {feedback.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
