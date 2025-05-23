import React from 'react';

export default function WindowControls() {
  return (
    <div className="window-controls">
      <button className="window-control minimize" onClick={() => window.api.minimizeWindow()}>
        <span className="window-control-icon">−</span>
      </button>
      <button className="window-control maximize" onClick={() => window.api.maximizeWindow()}>
        <span className="window-control-icon">□</span>
      </button>
      <button className="window-control close" onClick={() => window.api.closeWindow()}>
        <span className="window-control-icon">×</span>
      </button>
    </div>
  );
}
