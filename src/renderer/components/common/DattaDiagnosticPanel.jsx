import React, { useState, useEffect } from 'react';
import DattaCard from './DattaCard';
import DattaButton from './DattaButton';
import DattaLoadingOverlay from './DattaLoadingOverlay';

export default function DattaDiagnosticPanel() {
  const [diagnostics, setDiagnostics] = useState({});
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const results = await window.api.runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      setDiagnostics({ error: error.message });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <DattaLoadingOverlay isLoading={isRunning} message="Diagnostic...">
      <DattaCard
        title="Diagnostics systeme"
        actions={
          <DattaButton variant="primary" size="sm" onClick={runDiagnostics} disabled={isRunning}>
            <i className="feather icon-refresh-cw me-2"></i>
            {isRunning ? 'Diagnostic...' : 'Lancer diagnostic'}
          </DattaButton>
        }
      >
      <div className="row">
        <div className="col-md-6">
          <h6><i className="feather icon-database me-2"></i>Base de donnees</h6>
          <ul className="list-unstyled">
            <li className="d-flex justify-content-between">
              <span>Connexion</span>
              <span className={`badge bg-${diagnostics.databaseConnected ? 'success' : 'danger'}`}>{diagnostics.databaseConnected ? 'OK' : 'Echec'}</span>
            </li>
            <li className="d-flex justify-content-between">
              <span>Temps de reponse</span>
              <span className="badge bg-info">{diagnostics.databaseLatency}ms</span>
            </li>
          </ul>
        </div>
        <div className="col-md-6">
          <h6><i className="feather icon-wifi me-2"></i>Reseau</h6>
          <ul className="list-unstyled">
            <li className="d-flex justify-content-between">
              <span>Partage accessible</span>
              <span className={`badge bg-${diagnostics.networkShareAccessible ? 'success' : 'danger'}`}>{diagnostics.networkShareAccessible ? 'OK' : 'Echec'}</span>
            </li>
            <li className="d-flex justify-content-between">
              <span>Permissions</span>
              <span className={`badge bg-${diagnostics.hasWritePermissions ? 'success' : 'warning'}`}>{diagnostics.hasWritePermissions ? 'Lecture/Ecriture' : 'Lecture seule'}</span>
            </li>
          </ul>
        </div>
      </div>
    </DattaCard>
    </DattaLoadingOverlay>
  );
}
