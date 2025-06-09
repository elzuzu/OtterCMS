import React, { useState, useEffect, useCallback } from 'react';
import DattaDataTable from './DattaDataTable';
import DattaAlert from './DattaAlert';
import DattaButton from './DattaButton';
import { useOperations } from './DattaOperationQueue';

export default function DattaNetworkDataTable({
  onLoadData,
  refreshInterval = 60000,
  maxRetries = 3,
  ...props
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);
  const { addOperation, updateOperation, removeOperation } = useOperations();

  const loadData = useCallback(
    async (showProgress = true) => {
      let operationId = null;

      if (showProgress) {
        operationId = addOperation({
          description: 'Chargement des données...',
          status: 'running',
        });
      }

      try {
        setLoading(true);
        setError(null);

        const result = await onLoadData();
        setData(result);
        setRetryCount(0);
        setLastRefresh(new Date());

        if (operationId) {
          updateOperation(operationId, {
            status: 'completed',
            description: 'Données chargées',
          });
          setTimeout(() => removeOperation(operationId), 2000);
        }
      } catch (err) {
        console.error('Erreur chargement données:', err);
        setError(err.message);
        setRetryCount((prev) => prev + 1);

        if (operationId) {
          updateOperation(operationId, {
            status: 'error',
            description: 'Erreur de chargement',
            error: err.message,
          });
          setTimeout(() => removeOperation(operationId), 5000);
        }

        if (retryCount < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
          setTimeout(() => loadData(false), delay);
        }
      } finally {
        setLoading(false);
      }
    },
    [onLoadData, retryCount, maxRetries, addOperation, updateOperation, removeOperation]
  );

  useEffect(() => {
    if (!refreshInterval || error) return;

    const interval = setInterval(() => {
      loadData(false);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [loadData, refreshInterval, error]);

  useEffect(() => {
    loadData();
  }, []);

  if (error && retryCount >= maxRetries) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <div className="avtar avtar-xl bg-light-danger mb-4">
            <i className="feather icon-wifi-off f-36"></i>
          </div>
          <h5 className="mb-3">Impossible de charger les données</h5>
          <DattaAlert type="danger" className="mb-3">
            Erreur réseau: {error}
          </DattaAlert>
          <div className="d-flex gap-2 justify-content-center">
            <DattaButton
              variant="primary"
              onClick={() => {
                setRetryCount(0);
                loadData();
              }}
            >
              <i className="feather icon-refresh-cw me-2"></i>
              Réessayer
            </DattaButton>
            <DattaButton variant="secondary" onClick={() => window.location.reload()}>
              <i className="feather icon-rotate-ccw me-2"></i>
              Recharger l'application
            </DattaButton>
          </div>
        </div>
      </div>
    );
  }

  const tableActions = (
    <div className="d-flex align-items-center gap-2">
      {props.actions}
      <DattaButton
        variant="outline-secondary"
        size="sm"
        onClick={() => loadData()}
        disabled={loading}
        title="Actualiser"
      >
        <i className={`feather icon-refresh-cw ${loading ? 'fa-spin' : ''}`}></i>
      </DattaButton>
      {lastRefresh && (
        <small className="text-muted">Dernière màj: {lastRefresh.toLocaleTimeString()}</small>
      )}
    </div>
  );

  return (
    <DattaDataTable {...props} data={data} loading={loading} actions={tableActions} />
  );
}
