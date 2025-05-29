import React from 'react';

export default function DattaCheckbox({ id, label, className = '', checked, onChange, ...props }) {
  return (
    <div className={`form-check ${className}`}>
      <input
        type="checkbox"
        className="form-check-input"
        id={id}
        checked={checked}
        onChange={onChange}
        {...props}
      />
      {label && (
        <label className="form-check-label" htmlFor={id}>
          {label}
        </label>
      )}
    </div>
  );
}
