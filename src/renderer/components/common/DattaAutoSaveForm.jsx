import React, { useEffect, useState, useCallback } from 'react';
import { useOperations } from './DattaOperationQueue';
import DattaAlert from './DattaAlert';

export default function DattaAutoSaveForm({
  data,
  onSave,
  onError,
  saveInterval = 30000,
  conflictResolver = null,
  children,
}) {
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const { addOperation, updateOperation, removeOperation } = useOperations();

  const performSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    const operationId = addOperation({
      description: 'Sauvegarde automatique...',
      status: 'running',
    });

    try {
      setSaveStatus('saving');
      await onSave(data);

      updateOperation(operationId, {
        status: 'completed',
        description: 'Sauvegarde terminée',
      });

      setLastSaved(new Date());
      setSaveStatus('saved');
      setHasUnsavedChanges(false);

      setTimeout(() => removeOperation(operationId), 2000);
    } catch (error) {
      updateOperation(operationId, {
        status: 'error',
        description: 'Erreur de sauvegarde',
        error: error.message,
      });

      if (error.type === 'CONFLICT') {
        setConflictData(error.conflictData);
        setSaveStatus('conflict');
      } else {
        setSaveStatus('error');
        onError?.(error);
      }

      setTimeout(() => removeOperation(operationId), 5000);
    }
  }, [data, hasUnsavedChanges, onSave, onError, addOperation, updateOperation, removeOperation]);

  useEffect(() => {
    if (saveStatus === 'saved' || !hasUnsavedChanges) return;

    const timer = setTimeout(performSave, saveInterval);
    return () => clearTimeout(timer);
  }, [performSave, saveInterval, hasUnsavedChanges, saveStatus]);

  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setHasUnsavedChanges(true), 100);
      return () => clearTimeout(timer);
    }
  }, [data, saveStatus]);

  const getStatusBadge = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <span className="badge bg-success">
            <i className="feather icon-check me-1"></i>
            Sauvegardé
          </span>
        );
      case 'saving':
        return (
          <span className="badge bg-primary">
            <div className="spinner-border spinner-border-sm me-1" role="status"></div>
            Sauvegarde...
          </span>
        );
      case 'error':
        return (
          <span className="badge bg-danger">
            <i className="feather icon-alert-circle me-1"></i>
            Erreur
          </span>
        );
      case 'conflict':
        return (
          <span className="badge bg-warning">
            <i className="feather icon-alert-triangle me-1"></i>
            Conflit
          </span>
        );
      default:
        return (
          <span className="badge bg-warning">
            <i className="feather icon-clock me-1"></i>
            Non sauvegardé
          </span>
        );
    }
  };

  const handleConflictResolution = async (resolution) => {
    setConflictData(null);
    setSaveStatus('saved');
    // TODO: apply resolution strategy
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          {getStatusBadge()}
          {lastSaved && (
            <small className="text-muted">
              Dernière sauvegarde: {lastSaved.toLocaleTimeString()}
            </small>
          )}
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-outline-primary btn-sm"
            onClick={performSave}
            disabled={saveStatus === 'saving' || !hasUnsavedChanges}
          >
            <i className="feather icon-save me-1"></i>
            Sauvegarder maintenant
          </button>
        </div>
      </div>

      {saveStatus === 'error' && (
        <DattaAlert type="danger" className="mb-3">
          <i className="feather icon-alert-circle me-2"></i>
          Impossible de sauvegarder. Vérifiez votre connexion réseau.
          <button className="btn btn-sm btn-outline-danger ms-2" onClick={performSave}>
            Réessayer
          </button>
        </DattaAlert>
      )}

      {children}

      {conflictData && conflictResolver && (
        (() => {
          const ConflictResolver = conflictResolver;
          return (
            <ConflictResolver
              isOpen={true}
              conflicts={conflictData}
              onResolve={handleConflictResolution}
              onClose={() => setConflictData(null)}
            />
          );
        })()
      )}
    </>
  );
}
