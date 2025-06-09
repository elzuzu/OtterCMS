import React from 'react';

export default function DattaPasswordStrength({ value = '' }) {
  const calcStrength = () => {
    let score = 0;
    if (value.length >= 8) score++;
    if (/[A-Z]/.test(value)) score++;
    if (/[0-9]/.test(value)) score++;
    if (/[^A-Za-z0-9]/.test(value)) score++;
    return score;
  };

  const score = calcStrength();
  const labels = ['Faible', 'Moyen', 'Bon', 'Fort'];
  const colors = ['danger', 'warning', 'info', 'success'];

  return (
    <div className="mt-1">
      <div className="progress" style={{ height: '6px' }}>
        <div className={`progress-bar bg-${colors[score - 1] || 'danger'}`} style={{ width: `${(score / 4) * 100}%` }}></div>
      </div>
      <small className={`text-${colors[score - 1] || 'danger'}`}>{labels[score - 1] || labels[0]}</small>
    </div>
  );
}
