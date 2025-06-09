import React, { useState } from 'react';
import DattaCard from '../common/DattaCard';
import DattaButton from '../common/DattaButton';
import DattaModal from '../common/DattaModal';
import DattaAlert from '../common/DattaAlert';
import DattaBackupManager from '../common/DattaBackupManager';
import DattaDiagnosticPanel from '../common/DattaDiagnosticPanel';
import { useNotifications } from '../common/DattaNotificationCenter';

export default function DattaAdminToolkit({ user }) {
  const [activeModal, setActiveModal] = useState(null);
  const [isPerformingMaintenance, setIsPerformingMaintenance] = useState(false);
  const { showSuccess, showError } = useNotifications();

  if (user.role !== 'admin') {
    return (
      <DattaCard>
        <div className="text-center py-5">
          <div className="avtar avtar-xl bg-light-warning mb-4">
            <i className="feather icon-lock f-36"></i>
          </div>
          <h5>Accès restreint</h5>
          <p className="text-muted">Cette section est réservée aux administrateurs.</p>
        </div>
      </DattaCard>
    );
  }

  const performMaintenance = async (type) => {
    setIsPerformingMaintenance(true);
    try {
      switch (type) {
        case 'vacuum':
          await window.api.performDatabaseVacuum();
          showSuccess('Nettoyage de la base de données terminé');
          break;
        case 'reindex':
          await window.api.rebuildDatabaseIndexes();
          showSuccess('Reconstruction des index terminée');
          break;
        case 'analyze':
          await window.api.analyzeDatabaseStatistics();
          showSuccess('Analyse des statistiques terminée');
          break;
        case 'cleanup':
          await window.api.cleanupTempFiles();
          showSuccess('Nettoyage des fichiers temporaires terminé');
          break;
      }
    } catch (error) {
      showError(`Erreur lors de la maintenance: ${error.message}`);
    } finally {
      setIsPerformingMaintenance(false);
      setActiveModal(null);
    }
  };

  const MaintenanceModal = () => (
    <DattaModal
      open={activeModal === 'maintenance'}
      onClose={() => setActiveModal(null)}
      title="Outils de maintenance"
      size="lg"
    >
      <DattaAlert type="warning" className="mb-4">
        <i className="feather icon-alert-triangle me-2"></i>
        <strong>Attention :</strong> Ces opérations peuvent prendre du temps et affecter les performances.
        Assurez-vous qu'aucun autre utilisateur n'utilise l'application.
      </DattaAlert>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="avtar avtar-s bg-light-primary mb-3">
                <i className="feather icon-database"></i>
              </div>
              <h6>VACUUM Database</h6>
              <p className="text-muted small">
                Nettoie et compacte la base de données pour optimiser l'espace disque.
              </p>
              <DattaButton
                variant="primary"
                size="sm"
                onClick={() => performMaintenance('vacuum')}
                disabled={isPerformingMaintenance}
              >
                Exécuter
              </DattaButton>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="avtar avtar-s bg-light-info mb-3">
                <i className="feather icon-refresh-cw"></i>
              </div>
              <h6>Reconstruire les index</h6>
              <p className="text-muted small">
                Reconstruit tous les index pour améliorer les performances des requêtes.
              </p>
              <DattaButton
                variant="info"
                size="sm"
                onClick={() => performMaintenance('reindex')}
                disabled={isPerformingMaintenance}
              >
                Exécuter
              </DattaButton>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="avtar avtar-s bg-light-success mb-3">
                <i className="feather icon-bar-chart"></i>
              </div>
              <h6>Analyser statistiques</h6>
              <p className="text-muted small">
                Met à jour les statistiques pour optimiser le planificateur de requêtes.
              </p>
              <DattaButton
                variant="success"
                size="sm"
                onClick={() => performMaintenance('analyze')}
                disabled={isPerformingMaintenance}
              >
                Exécuter
              </DattaButton>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="avtar avtar-s bg-light-warning mb-3">
                <i className="feather icon-trash-2"></i>
              </div>
              <h6>Nettoyer fichiers temp</h6>
              <p className="text-muted small">
                Supprime les fichiers temporaires et les logs anciens.
              </p>
              <DattaButton
                variant="warning"
                size="sm"
                onClick={() => performMaintenance('cleanup')}
                disabled={isPerformingMaintenance}
              >
                Exécuter
              </DattaButton>
            </div>
          </div>
        </div>
      </div>

      {isPerformingMaintenance && (
        <div className="text-center mt-4">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span>Maintenance en cours...</span>
        </div>
      )}
    </DattaModal>
  );

  return (
    <>
      <div className="row g-4">
        <div className="col-12">
          <DattaCard
            title="Outils d'administration"
            actions={
              <div className="d-flex gap-2">
                <DattaButton
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveModal('maintenance')}
                >
                  <i className="feather icon-tool me-2"></i>
                  Maintenance
                </DattaButton>
              </div>
            }
          >
            <div className="row g-3">
              <div className="col-md-3">
                <div className="card bg-light-primary h-100">
                  <div className="card-body text-center">
                    <div className="avtar avtar-s bg-primary text-white mb-2">
                      <i className="feather icon-users"></i>
                    </div>
                    <h6>Utilisateurs actifs</h6>
                    <h4 className="mb-0 text-primary">12</h4>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card bg-light-success h-100">
                  <div className="card-body text-center">
                    <div className="avtar avtar-s bg-success text-white mb-2">
                      <i className="feather icon-database"></i>
                    </div>
                    <h6>Taille DB</h6>
                    <h4 className="mb-0 text-success">2.3 GB</h4>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card bg-light-info h-100">
                  <div className="card-body text-center">
                    <div className="avtar avtar-s bg-info text-white mb-2">
                      <i className="feather icon-activity"></i>
                    </div>
                    <h6>Performance</h6>
                    <h4 className="mb-0 text-info">98%</h4>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card bg-light-warning h-100">
                  <div className="card-body text-center">
                    <div className="avtar avtar-s bg-warning text-white mb-2">
                      <i className="feather icon-shield"></i>
                    </div>
                    <h6>Dernier backup</h6>
                    <h4 className="mb-0 text-warning">2h</h4>
                  </div>
                </div>
              </div>
            </div>
          </DattaCard>
        </div>

        <div className="col-12">
          <DattaDiagnosticPanel />
        </div>

        <div className="col-12">
          <DattaBackupManager />
        </div>
      </div>

      <MaintenanceModal />
    </>
  );
}
