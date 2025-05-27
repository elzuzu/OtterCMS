import React from 'react';

export function DattaTextField({ label, error, helperText, id, ...props }) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input
        id={id}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        {...props}
      />
      {error && <div className="invalid-feedback">{error}</div>}
      {helperText && !error && <small className="form-text text-muted">{helperText}</small>}
    </div>
  );
}

export function DattaSelect({ label, options = [], error, helperText, id, ...props }) {
  return (
    <div className="mb-3">
      <label className="form-label" htmlFor={id}>{label}</label>
      <select id={id} className={`form-select ${error ? 'is-invalid' : ''}`} {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {error && <div className="invalid-feedback">{error}</div>}
    </div>
  );
}

export default { DattaTextField, DattaSelect };
