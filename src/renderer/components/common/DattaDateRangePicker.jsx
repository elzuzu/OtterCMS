import React from 'react';

export default function DattaDateRangePicker({ start, end, onChange }) {
  const handleStart = (e) => onChange({ start: e.target.value, end });
  const handleEnd = (e) => onChange({ start, end: e.target.value });

  return (
    <div className="d-flex align-items-center gap-2">
      <input type="date" className="form-control" value={start} onChange={handleStart} />
      <span className="mx-2">-</span>
      <input type="date" className="form-control" value={end} onChange={handleEnd} />
    </div>
  );
}
