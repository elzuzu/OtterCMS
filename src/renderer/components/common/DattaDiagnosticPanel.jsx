import React, { useState, useEffect } from 'react';
import DattaCard from './DattaCard';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';

export default function DattaDiagnosticPanel() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    runDiagnostics();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(runDiagnostics, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const results = await window.api.runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      setDiagnostics({ error: error.message, timestamp: new Date() });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status, value = null) => {
    switch (status) {
      case true:
      case 'ok':
        return <span className="badge bg-success">OK</span>;
      case false:
      case 'error':
        return <span className="badge bg-danger">Erreur</span>;
      case 'warning':
        return <span className="badge bg-warning">Attention</span>;
      default:
        return <span className="badge bg-secondary">{value || 'N/A'}</span>;
    }
  };

  const getLatencyBadge = (latency) => {
    if (latency === null || latency === undefined) return getStatusBadge('N/A');
    if (latency < 100) return <span className="badge bg-success">{latency}ms</span>;
    if (latency < 500) return <span className="badge bg-warning">{latency}ms</span>;
    return <span className="badge bg-danger">{latency}ms</span>;
  };

  if (!diagnostics && !isRunning) {
    return null;
  }

  return (
    <DattaCard
      title="Diagnostic système"
      actions={
        <div className="d-flex align-items-center gap-2">
          <div className="form-check form-switch">
            <input
              className="form-check-input"
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="autoRefresh">
              Auto-refresh
            </label>
          </div>
          <DattaButton
            variant="primary"
            size="sm"
            onClick={runDiagnostics}
            disabled={isRunning}
          >
            <i className={`feather icon-refresh-cw ${isRunning ? 'fa-spin' : ''} me-2`}></i>
            {isRunning ? 'Diagnostic...' : 'Actualiser'}
          </DattaButton>
        </div>
      }
    >
      {diagnostics?.error ? (
        <DattaAlert type="danger">
          <i className="feather icon-alert-circle me-2"></i>
          Erreur lors du diagnostic: {diagnostics.error}
        </DattaAlert>
      ) : (
        <div className="row">
          <div className="col-md-4">
            <h6><i className="feather icon-database me-2"></i>Base de données</h6>
            <ul className="list-unstyled">
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Connexion</span>
                {getStatusBadge(diagnostics?.database_connected)}
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Latence</span>
                {getLatencyBadge(diagnostics?.database_latency)}
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Intégrité</span>
                {getStatusBadge(diagnostics?.database_integrity)}
              </li>
              <li className="d-flex justify-content-between align-items-center">
                <span>Verrous actifs</span>
                <span className="badge bg-info">
                  {diagnostics?.active_locks || 0}
                </span>
              </li>
            </ul>
          </div>

          <div className="col-md-4">
            <h6><i className="feather icon-wifi me-2"></i>Réseau</h6>
            <ul className="list-unstyled">
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Partage accessible</span>
                {getStatusBadge(diagnostics?.network_share_accessible)}
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Permissions</span>
                {getStatusBadge(
                  diagnostics?.has_write_permissions ? 'ok' : 'warning',
                  diagnostics?.has_write_permissions ? 'R/W' : 'R seule'
                )}
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Ping réseau</span>
                {getLatencyBadge(diagnostics?.network_latency)}
              </li>
              <li className="d-flex justify-content-between align-items-center">
                <span>DNS</span>
                {getStatusBadge(diagnostics?.dns_resolution)}
              </li>
            </ul>
          </div>

          <div className="col-md-4">
            <h6><i className="feather icon-monitor me-2"></i>Système</h6>
            <ul className="list-unstyled">
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Mémoire utilisée</span>
                <span className="badge bg-info">
                  {diagnostics?.memory_usage || 'N/A'}
                </span>
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Espace disque</span>
                <span className="badge bg-info">
                  {diagnostics?.disk_space || 'N/A'}
                </span>
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Version app</span>
                <span className="badge bg-secondary">
                  {diagnostics?.app_version || 'N/A'}
                </span>
              </li>
              <li className="d-flex justify-content-between align-items-center">
                <span>Uptime</span>
                <span className="badge bg-secondary">
                  {diagnostics?.uptime || 'N/A'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {diagnostics?.timestamp && (
        <div className="text-center mt-3 pt-3 border-top">
          <small className="text-muted">
            Dernière vérification: {new Date(diagnostics.timestamp).toLocaleString()}
          </small>
        </div>
      )}
    </DattaCard>
  );
}
