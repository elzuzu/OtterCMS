import React, { useEffect, useState, useCallback } from 'react';
import DattaPageTitle from './common/DattaPageTitle';
import CircularProgress from './common/CircularProgress';
import DattaButton from './common/DattaButton';

export default function Dashboard({ user, onNavigateToMyIndividus, onNavigateToAllIndividus }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      <div className="pc-content">
        <DattaPageTitle title="Tableau de bord" />
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', marginTop: '2rem' }}>
            <CircularProgress value={50} label="Chargement..." />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pc-content">
        <DattaPageTitle title="Tableau de bord" />
        <div className="card">
          <div className="card-body">
            <div className="error-message" style={{ margin: 'var(--spacing-4) 0' }}>
              {error}
              <DattaButton variant="secondary" onClick={loadStats} style={{ marginLeft: 'var(--spacing-3)' }}>
                Réessayer
              </DattaButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pc-content">
      <DattaPageTitle title="Tableau de bord" />
      {!stats ? (
        <div className="card">
          <div className="card-body">
            <div className="no-data-message" style={{ margin: 'var(--spacing-4) 0' }}>
              Aucune statistique disponible pour le moment.
              <DattaButton variant="primary" onClick={loadStats} style={{ marginTop: 'var(--spacing-3)' }}>
                Recharger
              </DattaButton>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="row">
              {stats.mesIndividus !== undefined && (
                <div className="col-xl-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex align-items-center">
                        <div className="flex-shrink-0">
                          <div className="avtar avtar-s bg-light-success">
                            <i className="feather icon-user-check"></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <h6 className="mb-0">Dossiers en charge</h6>
                          <p className="mb-0 text-muted">{stats.mesIndividus}</p>
                          {stats.totalIndividus > 0 && (
                            <small className="text-success">
                              {((stats.mesIndividus / stats.totalIndividus) * 100).toFixed(0)}% du total
                            </small>
                          )}
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
                            <i className="feather icon-users"></i>
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
                            <i className="feather icon-user-x"></i>
                          </div>
                        </div>
                        <div className="flex-grow-1 ms-3">
                          <h6 className="mb-0">Individus non attribués</h6>
                          <p className="mb-0 text-muted">{stats.individusNonAttribues}</p>
                        </div>
                        <div className="flex-shrink-0 ms-3">
                          {stats.individusNonAttribues > 0 ? (
                            <div className="badge bg-light-warning text-warning">
                              <i className="feather icon-alert-triangle"></i> {stats.individusNonAttribues}
                            </div>
                          ) : (
                            <div className="badge bg-light-success text-success">
                              <i className="feather icon-check"></i> Tous attribués
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="col-xl-3 col-md-6">
                <div className="card bg-light-info">
                  <div className="card-body">
                    <div className="d-flex align-items-center">
                      <div className="avtar avtar-lg bg-info me-3">
                        <i className="feather icon-user"></i>
                      </div>
                      <div>
                        <h6 className="mb-1">Connecté en tant que</h6>
                        <p className="mb-1"><strong>{user.username}</strong></p>
                        <span className="badge bg-info">{user.role}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {(user.role === 'admin' || user.role === 'manager') && (
                <div className="row mt-4">
                  {stats.totalUsers !== undefined && (
                    <div className="col-xl-4 col-md-6">
                      <div className="card">
                        <div className="card-body">
                          <div className="d-flex align-items-center">
                            <div className="flex-shrink-0">
                              <div className="avtar avtar-s bg-light-secondary">
                                <i className="feather icon-folder"></i>
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
                  {user.role === 'admin' &&
                    stats.categoriesMasquees !== undefined &&
                    stats.categoriesMasquees > 0 && (
                      <div className="col-xl-4 col-md-6">
                        <div className="card">
                          <div className="card-body">
                            <div className="d-flex align-items-center">
                              <div className="flex-shrink-0">
                                <div className="avtar avtar-s bg-light-danger">
                                  <i className="feather icon-folder"></i>
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
          </div>
        </div>
      )}
    </div>
  );
}