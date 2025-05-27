import React, { useEffect, useState, useCallback } from 'react';
import DattaPageTitle from './common/DattaPageTitle';
import CircularProgress from './common/CircularProgress';
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
          <button onClick={loadStats} className="btn-secondary" style={{ marginLeft: 'var(--spacing-3)' }}>Réessayer</button>
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
          <button onClick={loadStats} className="btn-primary" style={{ marginTop: 'var(--spacing-3)' }}>Recharger</button>
        </div>
      ) : (
        <div className="row">
          {stats.mesIndividus !== undefined && (
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body text-center">
                  <IconUserCheck size={32} style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }} />
                  <div className="h5 mb-2 font-weight-bold text-gray-800">{stats.mesIndividus}</div>
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-2">Dossiers en charge</div>
                  <p className="mb-2 small">Nombre de dossiers relevant de votre responsabilité directe.</p>
                  <button className="btn btn-primary btn-block btn-sm" onClick={() => typeof onNavigateToMyIndividus === 'function' && onNavigateToMyIndividus()}>Voir mes individus suivis</button>
                </div>
              </div>
            </div>
          )}

          {stats.totalIndividus !== undefined && (
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body text-center">
                  <IconUsers size={32} style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }} />
                  <div className="h5 mb-2 font-weight-bold text-gray-800">{stats.totalIndividus}</div>
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-2">Total des individus</div>
                  <p className="mb-2 small">Nombre total d'individus enregistrés dans le système.</p>
                  <button className="btn btn-primary btn-block btn-sm" onClick={() => typeof onNavigateToAllIndividus === 'function' && onNavigateToAllIndividus()}>Voir tous les individus</button>
                </div>
              </div>
            </div>
          )}

          {(user.role === 'admin' || user.role === 'manager') && stats.individusNonAttribues !== undefined && (
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-warning shadow h-100 py-2">
                <div className="card-body text-center">
                  <IconUserX size={32} style={{ color: 'var(--color-warning-500)', marginBottom: 'var(--spacing-2)' }} />
                  <div className="h5 mb-2 font-weight-bold" style={{ color: stats.individusNonAttribues > 0 ? 'var(--color-warning-500)' : 'var(--color-success-500)' }}>
                    {stats.individusNonAttribues}
                  </div>
                  <div className="text-xs font-weight-bold text-uppercase mb-2">Individus non attribués</div>
                  <p className="mb-0 small">Individus en attente d'assignation à un responsable.</p>
                </div>
              </div>
            </div>
          )}

          <div className="col-xl-3 col-md-6 mb-4">
            <div className="card shadow h-100 py-2">
              <div className="card-body">
                <h6 className="mb-2">Vos Informations</h6>
                <p className="mb-1">Nom d'utilisateur: <strong>{user.username}</strong></p>
                <p className="mb-1">Rôle: <strong>{user.role}</strong></p>
                <p className="mb-0">ID Utilisateur: <strong>{user.id || user.userId}</strong></p>
              </div>
            </div>
          </div>

          {(user.role === 'admin' || user.role === 'manager') && stats.totalUsers !== undefined && (
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card border-left-primary shadow h-100 py-2">
                <div className="card-body text-center">
                  <IconFolder size={32} style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }} />
                  <div className="h5 mb-2 font-weight-bold text-gray-800">{stats.totalUsers}</div>
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-2">Total des utilisateurs</div>
                  <p className="mb-0 small">Nombre total de comptes utilisateurs actifs.</p>
                </div>
              </div>
            </div>
          )}

          {user.role === 'admin' && stats.categoriesMasquees !== undefined && stats.categoriesMasquees > 0 && (
            <div className="col-xl-3 col-md-6 mb-4">
              <div className="card shadow h-100 py-2">
                <div className="card-body text-center">
                  <IconFolder size={32} style={{ color: 'var(--color-neutral-500)', marginBottom: 'var(--spacing-2)' }} />
                  <div className="h5 mb-2 font-weight-bold" style={{ color: 'var(--color-neutral-500)' }}>{stats.categoriesMasquees}</div>
                  <div className="text-xs font-weight-bold text-uppercase mb-2">Catégories masquées</div>
                  <p className="mb-0 small">Catégories archivées non disponibles pour de nouvelles saisies.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
