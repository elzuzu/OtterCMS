import React, { useState, useEffect } from 'react';
import DattaCard from './DattaCard';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';
import { useOperations } from './DattaOperationQueue';

export default function DattaBackupManager() {
  const [backupStatus, setBackupStatus] = useState({
    lastBackup: null,
    autoBackupEnabled: true,
    backupLocation: '',
    availableBackups: []
  });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const { addOperation, updateOperation, removeOperation } = useOperations();

  useEffect(() => {
    loadBackupStatus();
  }, []);

  const loadBackupStatus = async () => {
    try {
      const status = await window.api.getBackupStatus();
      setBackupStatus(status);
    } catch (error) {
      console.error('Erreur chargement statut backup:', error);
    }
  };

  const createBackup = async () => {
    const operationId = addOperation({
      description: 'Création de sauvegarde...',
      status: 'running',
      progress: 0
    });

    try {
      setIsCreatingBackup(true);

      await window.api.createBackup({
        includeData: true,
        includeConfig: true,
        compress: true
      });

      updateOperation(operationId, {
        status: 'completed',
        description: 'Sauvegarde créée avec succès',
        progress: 100
      });

      setTimeout(() => removeOperation(operationId), 3000);
      loadBackupStatus();
    } catch (error) {
      updateOperation(operationId, {
        status: 'error',
        description: 'Erreur lors de la sauvegarde',
        error: error.message
      });

      setTimeout(() => removeOperation(operationId), 5000);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupFile) => {
    if (!confirm(`Êtes-vous sûr de vouloir restaurer la sauvegarde "${backupFile}" ? Cette action est irréversible.`)) {
      return;
    }

    const operationId = addOperation({
      description: 'Restauration en cours...',
      status: 'running'
    });

    try {
      await window.api.restoreBackup(backupFile);

      updateOperation(operationId, {
        status: 'completed',
        description: 'Restauration terminée'
      });

      setTimeout(() => {
        removeOperation(operationId);
        window.location.reload();
      }, 2000);
    } catch (error) {
      updateOperation(operationId, {
        status: 'error',
        description: 'Erreur de restauration',
        error: error.message
      });

      setTimeout(() => removeOperation(operationId), 5000);
    }
  };

  return (
    <DattaCard
      title="Gestionnaire de sauvegardes"
      actions={
        <DattaButton
          variant="primary"
          size="sm"
          onClick={createBackup}
          disabled={isCreatingBackup}
        >
          <i className="feather icon-plus me-2"></i>
          Nouvelle sauvegarde
        </DattaButton>
      }
    >
      <div className="row">
        <div className="col-md-6">
          <h6><i className="feather icon-info me-2"></i>Statut</h6>
          <ul className="list-unstyled">
            <li className="d-flex justify-content-between align-items-center mb-2">
              <span>Sauvegarde automatique</span>
              <span className={`badge bg-${backupStatus.autoBackupEnabled ? 'success' : 'warning'}`}>
                {backupStatus.autoBackupEnabled ? 'Activée' : 'Désactivée'}
              </span>
            </li>
            <li className="d-flex justify-content-between align-items-center mb-2">
              <span>Dernière sauvegarde</span>
              <span className="text-muted">
                {backupStatus.lastBackup ? new Date(backupStatus.lastBackup).toLocaleString() : 'Aucune'}
              </span>
            </li>
            <li className="d-flex justify-content-between align-items-center">
              <span>Emplacement</span>
              <span className="text-muted small">
                {backupStatus.backupLocation || 'Non configuré'}
              </span>
            </li>
          </ul>
        </div>

        <div className="col-md-6">
          <h6><i className="feather icon-archive me-2"></i>Sauvegardes disponibles</h6>
          {backupStatus.availableBackups.length === 0 ? (
            <DattaAlert type="info">Aucune sauvegarde disponible.</DattaAlert>
          ) : (
            <div className="list-group list-group-flush">
              {backupStatus.availableBackups.slice(0, 5).map((backup, index) => (
                <div key={index} className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <div>
                    <div className="fw-medium">{backup.name}</div>
                    <small className="text-muted">
                      {new Date(backup.date).toLocaleString()} - {backup.size}
                    </small>
                  </div>
                  <DattaButton
                    variant="outline-primary"
                    size="sm"
                    onClick={() => restoreBackup(backup.file)}
                  >
                    <i className="feather icon-download me-1"></i>
                    Restaurer
                  </DattaButton>
                </div>
              ))}
              {backupStatus.availableBackups.length > 5 && (
                <div className="text-center pt-2">
                  <small className="text-muted">
                    +{backupStatus.availableBackups.length - 5} autres sauvegardes
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DattaCard>
  );
}
