import React from 'react';
import DattaModal from './DattaModal';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';

export default function DattaConflictResolver({ isOpen, conflicts, onResolve, onClose }) {
  const handleResolve = (strategy, fieldResolutions = {}) => {
    onResolve({ strategy, fieldResolutions });
  };

  return (
    <DattaModal open={isOpen} onClose={onClose} title="Résolution de conflit de données" size="xl">
      <DattaAlert type="warning" className="mb-4">
        <i className="feather icon-alert-triangle me-2"></i>
        <strong>Conflit détecté !</strong> Un autre utilisateur a modifié ces données.
        Choisissez comment résoudre le conflit.
      </DattaAlert>

      <div className="row">
        <div className="col-md-6">
          <div className="card border-primary">
            <div className="card-header bg-light-primary">
              <h6 className="mb-0">
                <i className="feather icon-user me-2"></i>
                Vos modifications
              </h6>
              <small className="text-muted">
                Modifié le {new Date(conflicts.local.timestamp).toLocaleString()}
              </small>
            </div>
            <div className="card-body">
              {Object.entries(conflicts.local.changes).map(([field, value]) => (
                <div key={field} className="mb-2">
                  <strong>{field}:</strong> {String(value)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-warning">
            <div className="card-header bg-light-warning">
              <h6 className="mb-0">
                <i className="feather icon-users me-2"></i>
                Modifications distantes
              </h6>
              <small className="text-muted">
                Modifié par {conflicts.remote.user} le {new Date(conflicts.remote.timestamp).toLocaleString()}
              </small>
            </div>
            <div className="card-body">
              {Object.entries(conflicts.remote.changes).map(([field, value]) => (
                <div key={field} className="mb-2">
                  <strong>{field}:</strong> {String(value)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <DattaButton variant="secondary" onClick={onClose}>
          <i className="feather icon-x me-2"></i>
          Annuler
        </DattaButton>
        <DattaButton variant="primary" onClick={() => handleResolve('local')}>
          <i className="feather icon-check me-2"></i>
          Garder mes modifications
        </DattaButton>
        <DattaButton variant="warning" onClick={() => handleResolve('remote')}>
          <i className="feather icon-download me-2"></i>
          Garder les modifications distantes
        </DattaButton>
        <DattaButton variant="info" onClick={() => handleResolve('merge')}>
          <i className="feather icon-git-merge me-2"></i>
          Fusionner (avancé)
        </DattaButton>
      </div>
    </DattaModal>
  );
}
