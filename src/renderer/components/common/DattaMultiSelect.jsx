import React from 'react';

export default function DattaMultiSelect({ options = [], value = [], onChange }) {
  const toggleValue = (val) => {
    if (value.includes(val)) {
      onChange(value.filter(v => v !== val));
    } else {
      onChange([...value, val]);
    }
  };

  return (
    <div className="d-flex flex-wrap gap-2">
      {options.map(opt => (
        <label key={opt.value} className="form-check-label">
          <input
            type="checkbox"
            className="form-check-input me-1"
            checked={value.includes(opt.value)}
            onChange={() => toggleValue(opt.value)}
          />
          {opt.label}
        </label>
      ))}
    </div>
  );
}
