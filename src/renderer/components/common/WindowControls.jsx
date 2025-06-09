import React from 'react';
import DattaButton from './DattaButton';

export default function WindowControls() {
  return (
    <div
      className="d-flex justify-content-end w-100"
      style={{ WebkitAppRegion: 'drag', userSelect: 'none' }}
    >
      <DattaButton
        variant="link"
        size="sm"
        className="minimize"
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={() => window.api.minimizeWindow()}
      >
        <span className="window-control-icon">−</span>
      </DattaButton>
      <DattaButton
        variant="link"
        size="sm"
        className="maximize"
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={() => window.api.maximizeWindow()}
      >
        <span className="window-control-icon">□</span>
      </DattaButton>
      <DattaButton
        variant="link"
        size="sm"
        className="close"
        style={{ WebkitAppRegion: 'no-drag' }}
        onClick={() => window.api.closeWindow()}
      >
        <span className="window-control-icon">×</span>
      </DattaButton>
    </div>
  );
}
