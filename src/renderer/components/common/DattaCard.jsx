import React from 'react';

/**
 * Lightweight card wrapper using DattaAble classes instead of MUI Card.
 */
export default function DattaCard({ title, actions, children, className = '', ...props }) {
  return (
    <div className={`card pc-card mb-3 ${className}`} {...props}>
      {title && (
        <div className="card-header d-flex justify-content-between align-items-start">
          <h5 className="mb-0">{title}</h5>
          {actions && <div className="card-header-right">{actions}</div>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
    </div>
  );
}
