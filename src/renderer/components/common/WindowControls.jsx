import React from 'react';
import DattaButton from './DattaButton';

export default function WindowControls() {
  return (
    <div className="window-controls">
      <DattaButton
        variant="link"
        size="sm"
        className="window-control minimize"
        onClick={() => window.api.minimizeWindow()}
      >
        <span className="window-control-icon">−</span>
      </DattaButton>
      <DattaButton
        variant="link"
        size="sm"
        className="window-control maximize"
        onClick={() => window.api.maximizeWindow()}
      >
        <span className="window-control-icon">□</span>
      </DattaButton>
      <DattaButton
        variant="link"
        size="sm"
        className="window-control close"
        onClick={() => window.api.closeWindow()}
      >
        <span className="window-control-icon">×</span>
      </DattaButton>
    </div>
  );
}
