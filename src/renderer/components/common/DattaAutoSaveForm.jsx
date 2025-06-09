import React, { useEffect, useState } from 'react';
import DattaAlert from './DattaAlert';

export default function DattaAutoSaveForm({ data, onSave, onError, saveInterval = 30000, children }) {
  const [lastSaved, setLastSaved] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');

  useEffect(() => {
    const interval = setInterval(async () => {
      if (saveStatus === 'modified') {
        setIsSaving(true);
        try {
          await onSave(data);
          setLastSaved(new Date());
          setSaveStatus('saved');
        } catch (error) {
          setSaveStatus('error');
          onError?.(error);
        } finally {
          setIsSaving(false);
        }
      }
    }, saveInterval);

    return () => clearInterval(interval);
  }, [data, saveInterval, saveStatus]);

  const getStatusBadge = () => {
    switch (saveStatus) {
      case 'saved':
        return <span className="badge bg-success">Sauvegarde</span>;
      case 'modified':
        return <span className="badge bg-warning">Non sauvegarde</span>;
      case 'error':
        return <span className="badge bg-danger">Erreur sauvegarde</span>;
      default:
        return null;
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          {isSaving && <div className="spinner-border spinner-border-sm" role="status"></div>}
          {getStatusBadge()}
          {lastSaved && <small className="text-muted">Derniere sauvegarde: {lastSaved.toLocaleTimeString()}</small>}
        </div>
      </div>
      {saveStatus === 'error' && (
        <DattaAlert type="danger" className="mb-3">
          <i className="feather icon-alert-circle me-2"></i>
          Impossible de sauvegarder. Verifiez votre connexion reseau.
        </DattaAlert>
      )}
      {children}
    </div>
  );
}
