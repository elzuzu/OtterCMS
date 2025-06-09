import React from 'react';
import DattaAlert from './DattaAlert';

export default function DattaNetworkStatus({ isOnline, lastSync }) {
  if (!isOnline) {
    return (
      <DattaAlert type="warning" className="fixed-top m-3">
        <i className="feather icon-wifi-off me-2"></i>
        Reseau indisponible - Mode hors ligne
      </DattaAlert>
    );
  }
  return (
    <div className="badge bg-success">
      <i className="feather icon-wifi me-1"></i>
      Connecte
    </div>
  );
}
