import React from 'react';

export function DattaTextField({ label, error, helperText, ...props }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className={`form-control ${error ? 'is-invalid' : ''}`}
        {...props}
      />
      {error && <div className="invalid-feedback">{error}</div>}
      {helperText && !error && <small className="form-text text-muted">{helperText}</small>}
    </div>
  );
}

export function DattaSelect({ label, options = [], error, helperText, ...props }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <select className={`form-control ${error ? 'is-invalid' : ''}`} {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}

export default { DattaTextField, DattaSelect };
