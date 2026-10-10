import React from 'react';

export default function ScoreGauge({ score, categoryScores }) {
  // SVG gauge constants
  const size = 140;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = (val) => {
    if (val >= 75) return '#10b981'; // Emerald
    if (val >= 50) return '#f59e0b'; // Amber
    return '#f43f5e'; // Rose
  };

  const primaryColor = getScoreColor(score);

  return (
    <div className="score-overview">
      <div className="gauge-wrapper">
        <svg className="gauge-svg" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={primaryColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="none"
            style={{
              transition: 'stroke-dashoffset 1s ease-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 8px ${primaryColor}80)`
            }}
          />
        </svg>
        <div className="gauge-content">
          <div className="gauge-number">{score}%</div>
          <div className="gauge-label">Match Score</div>
        </div>
      </div>

      <div className="category-bars">
        <div>
          <div className="bar-header">
            <span>Technical Skills</span>
            <span style={{ color: '#818cf8' }}>{categoryScores.technical_skills}%</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill tech"
              style={{ width: `${categoryScores.technical_skills}%` }}
            />
          </div>
        </div>

        <div>
          <div className="bar-header">
            <span>Experience Alignment</span>
            <span style={{ color: '#34d399' }}>{categoryScores.experience_alignment}%</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill exp"
              style={{ width: `${categoryScores.experience_alignment}%` }}
            />
          </div>
        </div>

        <div>
          <div className="bar-header">
            <span>Education & Degrees</span>
            <span style={{ color: '#fbbf24' }}>{categoryScores.education_and_certifications}%</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill edu"
              style={{ width: `${categoryScores.education_and_certifications}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
