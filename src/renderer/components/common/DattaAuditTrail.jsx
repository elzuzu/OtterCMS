import React from 'react';

export default function DattaAuditTrail({ entries = [] }) {
  return (
    <ul className="list-group">
      {entries.map((entry, idx) => (
        <li key={idx} className="list-group-item d-flex justify-content-between">
          <span>{entry.action}</span>
          <small className="text-muted">{entry.date}</small>
        </li>
      ))}
    </ul>
  );
}
