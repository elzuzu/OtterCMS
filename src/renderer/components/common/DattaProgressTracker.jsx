import React from 'react';

export default function DattaProgressTracker({ steps = [], current = 0 }) {
  return (
    <ol className="list-unstyled d-flex gap-3">
      {steps.map((step, idx) => (
        <li key={step} className={`badge ${idx <= current ? 'bg-primary' : 'bg-secondary'}`}>{step}</li>
      ))}
    </ol>
  );
}
