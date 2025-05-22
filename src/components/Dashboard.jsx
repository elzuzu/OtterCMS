import React, { useEffect, useState, useCallback } from 'react';

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
    <div>
      <h2 style={{ color: 'var(--color-neutral-900)', marginBottom: 'var(--spacing-6)' }}>Tableau de bord</h2>
      {!stats ? (
        <div className="no-data-message" style={{ margin: 'var(--spacing-4) 0'}}>
          Aucune statistique disponible pour le moment.
          <button onClick={loadStats} className="btn-primary" style={{ marginTop: 'var(--spacing-3)'}}>Recharger</button>
        </div>
      ) : (
        <div className="stats-container">
          
          {/* Carte: Dossiers en charge (Vos individus) */}
          {stats.mesIndividus !== undefined && (
            <div className="stats-card"> 
              <UserCheckIcon />
              <div className="stat-value" style={valueStyle}>
                {stats.mesIndividus}
              </div>
              <div className="stat-label" style={labelStyle}>
                Dossiers en charge
              </div>
               <p style={descriptionStyle}>
                Nombre de dossiers relevant de votre responsabilité directe.
              </p>
              <button
                className="btn-primary"
                style={cardButtonStyle}
                onClick={() => {
                  console.log("[Dashboard] Clic sur bouton 'Voir mes individus suivis'.");
                  if (typeof onNavigateToMyIndividus === 'function') {
                    onNavigateToMyIndividus();
                  } else {
                    console.error("[Dashboard] onNavigateToMyIndividus n'est pas une fonction.");
                  }
                }}
              >
                Voir mes individus suivis
              </button>
            </div>
          )}

          {/* Carte: Total des individus */}
          {stats.totalIndividus !== undefined && (
            <div className="stats-card">
              <UsersIcon />
              <div className="stat-value" style={valueStyle}>
                {stats.totalIndividus}
              </div>
              <div className="stat-label" style={labelStyle}>
                Total des individus
              </div>
              <p style={descriptionStyle}>
                  Nombre total d'individus enregistrés dans le système.
              </p>
              <button
                className="btn-primary"
                style={cardButtonStyle}
                onClick={() => {
                  console.log("[Dashboard] Clic sur bouton 'Voir tous les individus'.");
                  if (typeof onNavigateToAllIndividus === 'function') {
                    onNavigateToAllIndividus();
                  } else {
                    console.error("[Dashboard] onNavigateToAllIndividus n'est pas une fonction.");
                  }
                }}
              >
                Voir tous les individus
              </button>
            </div>
          )}
          
          {/* Carte: Individus non attribués (pour admin/manager) */}
          {(user.role === 'admin' || user.role === 'manager') && stats.individusNonAttribues !== undefined && (
            <div className="stats-card">
              <UserXIcon />
              <div className="stat-value" style={{...valueStyle, color: stats.individusNonAttribues > 0 ? 'var(--color-warning-500)' : 'var(--color-success-500)'}}>
                {stats.individusNonAttribues}
              </div>
              <div className="stat-label" style={labelStyle}>
                Individus non attribués
              </div>
              <p style={descriptionStyle}>
                Individus en attente d'assignation à un responsable.
              </p>
            </div>
          )}

          {/* Carte: Informations utilisateur */}
          <div className="user-info-card">
            <h3 style={{ color: 'var(--color-neutral-700)', fontSize: '1.125rem', borderBottom: '1px solid var(--border-color-light)', paddingBottom: 'var(--spacing-3)', marginBottom: 'var(--spacing-4)'}}>
              Vos Informations
            </h3>
            <div className="user-info-item">
              <span className="user-info-label">Nom d'utilisateur:</span>
              <span className="user-info-value">{user.username}</span>
            </div>
            <div className="user-info-item">
              <span className="user-info-label">Rôle:</span>
              <span className="user-info-value" style={{ textTransform: 'capitalize' }}>{user.role}</span>
            </div>
            <div className="user-info-item">
              <span className="user-info-label">ID Utilisateur:</span>
              <span className="user-info-value">{user.id || user.userId}</span>
            </div>
          </div>

          {/* Carte: Total des utilisateurs (pour admin/manager) */}
          {(user.role === 'admin' || user.role === 'manager') && stats.totalUsers !== undefined && (
            <div className="stats-card">
              <FolderIcon /> 
              <div className="stat-value" style={valueStyle}>
                {stats.totalUsers}
              </div>
              <div className="stat-label" style={labelStyle}>
                Total des utilisateurs
              </div>
              <p style={descriptionStyle}>
                Nombre total de comptes utilisateurs actifs.
              </p>
            </div>
          )}

           {/* Carte: Catégories masquées (pour admin) */}
          {user.role === 'admin' && stats.categoriesMasquees !== undefined && stats.categoriesMasquees > 0 && (
            <div className="stats-card">
              <FolderIcon /> 
              <div className="stat-value" style={{...valueStyle, color: 'var(--color-neutral-500)'}}>
                {stats.categoriesMasquees}
              </div>
              <div className="stat-label" style={labelStyle}>
                Catégories masquées
              </div>
              <p style={descriptionStyle}>
                Catégories archivées non disponibles pour de nouvelles saisies.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
