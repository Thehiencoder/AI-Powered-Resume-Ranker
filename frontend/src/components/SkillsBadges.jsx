import React from 'react';

export default function SkillsBadges({ matchedSkills = [], missingSkills = [] }) {
  return (
    <div className="skills-grid">
      <div className="skills-column">
        <div className="column-title matched">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Matched Skills ({matchedSkills.length})
        </div>
        <div className="badges-flow">
          {matchedSkills.length > 0 ? (
            matchedSkills.map((skill, index) => (
              <span key={index} className="skill-pill matched">
                ✓ {skill}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              No direct technology matches identified.
            </span>
          )}
        </div>
      </div>

      <div className="skills-column">
        <div className="column-title missing">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Missing Skills / Gaps ({missingSkills.length})
        </div>
        <div className="badges-flow">
          {missingSkills.length > 0 ? (
            missingSkills.map((skill, index) => (
              <span key={index} className="skill-pill missing">
                ! {skill}
              </span>
            ))
          ) : (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              All core requirements satisfied.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
