import React from 'react';
import DattaModal from './DattaModal';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';

export default function DattaConflictModal({ conflicts, onResolve, onClose }) {
  return (
    <DattaModal open title="Conflit detecte" size="lg" onClose={onClose}>
      <DattaAlert type="warning">
        <i className="feather icon-alert-triangle me-2"></i>
        Un autre utilisateur a modifie ces donnees simultanement.
      </DattaAlert>
      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6><i className="feather icon-user me-2"></i>Vos modifications</h6>
            </div>
            <div className="card-body">
              {/* Afficher les changements locaux */}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6><i className="feather icon-users me-2"></i>Modifications distantes</h6>
            </div>
            <div className="card-body">
              {/* Afficher les changements distants */}
            </div>
          </div>
        </div>
      </div>
      <div className="d-flex justify-content-end gap-2 mt-3">
        <DattaButton variant="secondary" onClick={onClose}>Annuler</DattaButton>
        <DattaButton variant="primary" onClick={() => onResolve('local')}>Garder mes modifications</DattaButton>
        <DattaButton variant="warning" onClick={() => onResolve('remote')}>Garder les modifications distantes</DattaButton>
      </div>
    </DattaModal>
  );
}
