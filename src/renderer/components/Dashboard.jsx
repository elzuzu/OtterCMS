import React, { useEffect, useState, useCallback } from 'react';
import StatCard from './common/StatCard';
import CircularProgress from './common/CircularProgress';

// SVG Icon Components
const FolderIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }}>
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
);

const UserCheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary-500)', marginBottom: 'var(--spacing-2)' }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <polyline points="17 11 19 13 23 9"></polyline>
    </svg>
);

const UserXIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-warning-500)', marginBottom: 'var(--spacing-2)' }}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="8.5" cy="7" r="4"></circle>
        <line x1="18" y1="8" x2="23" y2="13"></line>
        <line x1="23" y1="8" x2="18" y2="13"></line>
    </svg>
);

/**
 * Composant Dashboard
 * Affiche les statistiques clés et fournit des boutons de navigation.
 * @param {object} user - L'objet utilisateur connecté.
 * @param {function} onNavigateToMyIndividus - Callback pour naviguer vers "Mes individus".
 * @param {function} onNavigateToAllIndividus - Callback pour naviguer vers "Tous les individus".
 */
export default function Dashboard({ user, onNavigateToMyIndividus, onNavigateToAllIndividus }) {
  const [stats, setStats] = useState(null); // État pour les statistiques
  const [loading, setLoading] = useState(true); // État de chargement
  const [error, setError] = useState(null); // État pour les erreurs

  // Styles pour les cartes de statistiques
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
  
  const descriptionStyle = {
    fontSize: '0.7rem',
    color: 'var(--text-color-placeholder)',
    textAlign: 'center',
    marginTop: 'var(--spacing-1)',
    minHeight: '2em',
    marginBottom: 'var(--spacing-2)',
  };

  const cardButtonStyle = {
    display: 'block',
    width: 'calc(100% - var(--spacing-4))',
    margin: 'auto auto 0',
    padding: 'var(--spacing-1) var(--spacing-2)',
    fontSize: '0.8rem',
  };

  // Fonction pour charger les statistiques depuis l'API.
  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (!user || (!user.id && !user.userId)) {
      setError("Utilisateur invalide. Impossible de charger les statistiques.");
      setLoading(false);
      return;
    }
    const params = {
      userId: user.id || user.userId,
      role: user.role,
    };
    console.log("[Dashboard] Chargement des statistiques pour l'utilisateur:", params.userId, "Rôle:", params.role);
    try {
      const result = await window.api.getDashboardStats(params);
      if (result && result.success && result.data) {
        console.log("[Dashboard] Statistiques reçues:", result.data);
        setStats(result.data);
      } else {
        console.error("[Dashboard] Erreur lors du chargement des statistiques:", result?.error);
        setError(result?.error || "Erreur lors du chargement des statistiques.");
        setStats(null);
      }
    } catch (err) {
      console.error("[Dashboard] Erreur de communication avec le serveur:", err);
      setError(`Erreur de communication avec le serveur: ${err.message}`);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [user]); // Dépendance: `user`

  // Charger les statistiques au montage du composant et si `loadStats` change.
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  // Affichage pendant le chargement.
  if (loading) {
    return (
      <div>
        <h2 style={{ color: 'var(--color-neutral-900)', marginBottom: 'var(--spacing-6)' }}>Tableau de bord</h2>
        <div className="loading">Chargement des statistiques...</div>
      </div>
    );
  }

  // Affichage en cas d'erreur.
  if (error) {
    return (
      <div>
        <h2 style={{ color: 'var(--color-neutral-900)', marginBottom: 'var(--spacing-6)' }}>Tableau de bord</h2>
        <div className="error-message" style={{ margin: 'var(--spacing-4) 0'}}>
          {error}
          <button onClick={loadStats} className="btn-secondary" style={{ marginLeft: 'var(--spacing-3)'}}>Réessayer</button>
        </div>
      </div>
    );
  }

  // Rendu principal du Dashboard.
  return (
    <div className="dashboard-grid">
      {!stats ? (
        <div className="no-data-message" style={{ margin: 'var(--spacing-4) 0' }}>
          Aucune statistique disponible pour le moment.
          <button onClick={loadStats} className="btn btn-primary" style={{ marginTop: 'var(--spacing-3)' }}>Recharger</button>
        </div>
      ) : (
        <>
          <div className="stats-row">
            {stats.totalIndividus !== undefined && (
              <StatCard
                icon={<UsersIcon />}
                title="Total Individus"
                value={stats.totalIndividus}
                gradient="blue"
              />
            )}
            {stats.mesIndividus !== undefined && (
              <StatCard
                icon={<UserCheckIcon />}
                title="Mes individus"
                value={stats.mesIndividus}
                gradient="green"
                change=""
              />
            )}
            {(user.role === 'admin' || user.role === 'manager') && stats.individusNonAttribues !== undefined && (
              <StatCard
                icon={<UserXIcon />}
                title="Non attribués"
                value={stats.individusNonAttribues}
                gradient="orange"
              />
            )}
            {(user.role === 'admin' || user.role === 'manager') && stats.totalUsers !== undefined && (
              <StatCard
                icon={<FolderIcon />}
                title="Utilisateurs"
                value={stats.totalUsers}
                gradient="purple"
              />
            )}
          </div>
          <div className="charts-row">
            <div className="card chart-card">
              <canvas id="mainChart"></canvas>
            </div>
            <div className="card progress-card">
              <CircularProgress value={78} label="Taux de completion" />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
