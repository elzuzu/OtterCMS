import React, { useEffect, useState, useCallback } from 'react';
import DattaPageTitle from './common/DattaPageTitle';
import CircularProgress from './common/CircularProgress';
import DattaButton from './common/DattaButton';
import { IconFolder, IconUsers, IconUserCheck, IconUserX } from '@tabler/icons-react';

export default function Dashboard({ user, onNavigateToMyIndividus, onNavigateToAllIndividus }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Styles kept for backward compatibility although not heavily used
  const valueStyle = {
    fontSize: '1.8rem',
    fontWeight: '700',
    color: 'var(--color-primary-600)',
    lineHeight: '1.2',
    marginBottom: 'var(--spacing-1)',
    textAlign: 'center',
  };
  const labelStyle = {
    fontSize: '0.8rem',
    color: 'var(--text-color-secondary)',
    textAlign: 'center',
    minHeight: '2em',
  };

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user || (!user.id && !user.userId)) {
      setError('Utilisateur invalide. Impossible de charger les statistiques.');
      setLoading(false);
      return;
    }
    const params = { userId: user.id || user.userId, role: user.role };
    try {
      const result = await window.api.getDashboardStats(params);
      if (result && result.success && result.data) {
        setStats(result.data);
      } else {
        setError(result?.error || 'Erreur lors du chargement des statistiques.');
        setStats(null);
      }
    } catch (err) {
      setError(`Erreur de communication avec le serveur: ${err.message}`);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadStats(); }, [loadStats]);

  if (loading) {
    return (
      <div>
        <DattaPageTitle title="Tableau de bord" />
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <CircularProgress value={50} label="Chargement..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <DattaPageTitle title="Tableau de bord" />
        <div className="error-message" style={{ margin: 'var(--spacing-4) 0' }}>
          {error}
          <DattaButton variant="secondary" onClick={loadStats} style={{ marginLeft: 'var(--spacing-3)' }}>
            Réessayer
          </DattaButton>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DattaPageTitle title="Tableau de bord" />
      {!stats ? (
        <div className="no-data-message" style={{ margin: 'var(--spacing-4) 0' }}>
          Aucune statistique disponible pour le moment.
          <DattaButton variant="primary" onClick={loadStats} style={{ marginTop: 'var(--spacing-3)' }}>
            Recharger
          </DattaButton>
        </div>
      ) : (
        <div className="row">
          {stats.mesIndividus !== undefined && (
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avtar avtar-s bg-light-primary">
                        <IconUserCheck size={24} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">Dossiers en charge</h6>
                      <p className="mb-0 text-muted">{stats.mesIndividus}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {stats.totalIndividus !== undefined && (
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avtar avtar-s bg-light-primary">
                        <IconUsers size={24} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">Total Individus</h6>
                      <p className="mb-0 text-muted">{stats.totalIndividus}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {(user.role === 'admin' || user.role === 'manager') && stats.individusNonAttribues !== undefined && (
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avtar avtar-s bg-light-warning">
                        <IconUserX size={24} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">Individus non attribués</h6>
                      <p className="mb-0 text-muted">{stats.individusNonAttribues}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="col-xl-3 col-md-6">
            <div className="card">
              <div className="card-body">
                <h6 className="mb-2">Vos Informations</h6>
                <p className="mb-1">Nom d'utilisateur: <strong>{user.username}</strong></p>
                <p className="mb-1">Rôle: <strong>{user.role}</strong></p>
                <p className="mb-0">ID Utilisateur: <strong>{user.id || user.userId}</strong></p>
              </div>
            </div>
          </div>

          {(user.role === 'admin' || user.role === 'manager') && stats.totalUsers !== undefined && (
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avtar avtar-s bg-light-primary">
                        <IconFolder size={24} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">Total Utilisateurs</h6>
                      <p className="mb-0 text-muted">{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {user.role === 'admin' && stats.categoriesMasquees !== undefined && stats.categoriesMasquees > 0 && (
            <div className="col-xl-3 col-md-6">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex align-items-center">
                    <div className="flex-shrink-0">
                      <div className="avtar avtar-s bg-light-secondary">
                        <IconFolder size={24} />
                      </div>
                    </div>
                    <div className="flex-grow-1 ms-3">
                      <h6 className="mb-0">Catégories masquées</h6>
                      <p className="mb-0 text-muted">{stats.categoriesMasquees}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
