import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function WindowControls() {
  return (
    <div className="window-controls">
      <button className="window-control minimize" onClick={() => window.api.minimizeWindow()}>
        <Minus size={16} />
      </button>
      <button className="window-control maximize" onClick={() => window.api.maximizeWindow()}>
        <Square size={14} />
      </button>
      <button className="window-control close" onClick={() => window.api.closeWindow()}>
        <X size={16} />
      </button>
    </div>
  );
}
