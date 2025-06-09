import React, { useState, useEffect, useCallback } from 'react';
import { useOperations } from './DattaOperationQueue';
import DattaAlert from './DattaAlert';
import DattaButton from './DattaButton';

export default function DattaSyncManager({ 
  onSync,
  syncInterval = 60000, // 1 minute par défaut
  maxRetries = 3,
  children 
}) {
  const [syncState, setSyncState] = useState({
    lastSync: null,
    isSyncing: false,
    error: null,
    retryCount: 0,
    pendingChanges: false
  });

  const { addOperation, updateOperation, removeOperation } = useOperations();

  const performSync = useCallback(async (showProgress = true) => {
    if (syncState.isSyncing) return;

    let operationId = null;
    if (showProgress) {
      operationId = addOperation({
        description: 'Synchronisation des données...',
        status: 'running'
      });
    }

    try {
      setSyncState(prev => ({ ...prev, isSyncing: true, error: null }));
      
      await onSync();
      
      setSyncState(prev => ({
        ...prev,
        lastSync: new Date(),
        isSyncing: false,
        retryCount: 0,
        pendingChanges: false
      }));

      if (operationId) {
        updateOperation(operationId, {
          status: 'completed',
          description: 'Synchronisation terminée'
        });
        setTimeout(() => removeOperation(operationId), 2000);
      }
    } catch (error) {
      console.error('Erreur de synchronisation:', error);
      
      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        error: error.message,
        retryCount: prev.retryCount + 1,
        pendingChanges: true
      }));

      if (operationId) {
        updateOperation(operationId, {
          status: 'error',
          description: 'Erreur de synchronisation',
          error: error.message
        });
        setTimeout(() => removeOperation(operationId), 5000);
      }

      // Auto-retry avec backoff exponentiel
      if (syncState.retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, syncState.retryCount), 10000);
        setTimeout(() => performSync(false), delay);
      }
    }
  }, [onSync, syncState.isSyncing, syncState.retryCount, maxRetries, addOperation, updateOperation, removeOperation]);

  // Synchronisation périodique
  useEffect(() => {
    if (!syncInterval || syncState.error) return;

    const interval = setInterval(() => {
      if (syncState.pendingChanges) {
        performSync(false);
      }
    }, syncInterval);

    return () => clearInterval(interval);
  }, [syncInterval, syncState.error, syncState.pendingChanges, performSync]);

  // Synchronisation initiale
  useEffect(() => {
    performSync();
  }, []);

  const renderSyncStatus = () => {
    if (syncState.error && syncState.retryCount >= maxRetries) {
      return (
        <DattaAlert type="danger" className="mb-3">
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <i className="feather icon-alert-circle me-2"></i>
              <strong>Erreur de synchronisation</strong>
              <br />
              <small>{syncState.error}</small>
            </div>
            <DattaButton
              variant="outline-danger"
              size="sm"
              onClick={() => {
                setSyncState(prev => ({ ...prev, retryCount: 0 }));
                performSync();
              }}
            >
              <i className="feather icon-refresh-cw me-1"></i>
              Réessayer
            </DattaButton>
          </div>
        </DattaAlert>
      );
    }

    if (syncState.isSyncing) {
      return (
        <div className="d-flex align-items-center text-primary small mb-3">
          <div className="spinner-border spinner-border-sm me-2" role="status"></div>
          <span>Synchronisation en cours...</span>
        </div>
      );
    }

    if (syncState.pendingChanges) {
      return (
        <div className="d-flex align-items-center text-warning small mb-3">
          <i className="feather icon-clock me-2"></i>
          <span>Modifications en attente de synchronisation</span>
          <DattaButton
            variant="outline-warning"
            size="sm"
            className="ms-2"
            onClick={() => performSync()}
          >
            <i className="feather icon-refresh-cw me-1"></i>
            Synchroniser
          </DattaButton>
        </div>
      );
    }

    if (syncState.lastSync) {
      return (
        <div className="d-flex align-items-center text-success small mb-3">
          <i className="feather icon-check-circle me-2"></i>
          <span>Dernière synchronisation: {syncState.lastSync.toLocaleTimeString()}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <>
      {renderSyncStatus()}
      {children}
    </>
  );
} 