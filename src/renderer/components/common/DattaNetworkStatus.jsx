import React, { useState, useEffect } from 'react';
import DattaAlert from './DattaAlert';

export default function DattaNetworkStatus() {
  const [networkState, setNetworkState] = useState({
    isOnline: true,
    dbConnected: true,
    lastSync: new Date(),
    latency: null
  });

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const start = Date.now();
        await window.api.pingDatabase();
        const latency = Date.now() - start;

        setNetworkState(prev => ({
          ...prev,
          isOnline: true,
          dbConnected: true,
          lastSync: new Date(),
          latency
        }));
      } catch (error) {
        setNetworkState(prev => ({
          ...prev,
          isOnline: false,
          dbConnected: false
        }));
      }
    };

    const interval = setInterval(checkNetwork, 30000);
    checkNetwork();

    return () => clearInterval(interval);
  }, []);

  if (!networkState.isOnline || !networkState.dbConnected) {
    return (
      <DattaAlert type="warning" className="mb-3">
        <div className="d-flex align-items-center">
          <i className="feather icon-wifi-off me-2"></i>
          <div>
            <strong>Connexion interrompue</strong>
            <br />
            <small>Tentative de reconnexion automatique...</small>
          </div>
        </div>
      </DattaAlert>
    );
  }

  return (
    <div className="d-flex align-items-center text-success small">
      <i className="feather icon-wifi me-1"></i>
      <span>Connecté</span>
      {networkState.latency && (
        <span className="ms-2 text-muted">({networkState.latency}ms)</span>
      )}
    </div>
  );
}
