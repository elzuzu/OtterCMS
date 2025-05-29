import React from 'react';
import MUICircularProgress from '@mui/material/CircularProgress';

export default function CircularProgress({ value, label, size = 120 }) {
  return (
    <div className="circular-progress-wrapper" style={{ position: 'relative', display: 'inline-flex' }}>
      <MUICircularProgress variant="determinate" value={value} size={size} />
      <div
        className="circular-progress-labels"
        style={{
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          position: 'absolute',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
        }}
      >
        <span className="text-muted">{`${Math.round(value)}%`}</span>
        {label && <span>{label}</span>}
      </div>
    </div>
  );
}
