import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './Dashboard';
import IndividusList from './IndividusList';
import ImportData from './ImportData';
import MassAttribution from './MassAttribution';
import AdminCategories from './AdminCategories';
import AdminUsers from './AdminUsers';
import UserSettings from './UserSettings';
import {
  Home,
  List,
  Upload,
  Users as UsersIcon,
  Settings as SettingsIcon,
  Tag,
  User2,
} from 'lucide-react';

const tabIcons = {
  dashboard: <Home size={18} aria-hidden="true" />,
  individus: <List size={18} aria-hidden="true" />,
  import: <Upload size={18} aria-hidden="true" />,
  attribution: <UsersIcon size={18} aria-hidden="true" />,
  categories: <Tag size={18} aria-hidden="true" />,
  users: <User2 size={18} aria-hidden="true" />,
  settings: <SettingsIcon size={18} aria-hidden="true" />,
};

/**
 * Composant MainContent
 * Gère la navigation principale par onglets et le contenu affiché.
 * Inclut la logique pour gérer les demandes de navigation spécifiques (par exemple, depuis le Dashboard vers une vue filtrée des Individus).
 */
export default function MainContent({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requestedViewForIndividus, setRequestedViewForIndividus] = useState(null);

  useEffect(() => {
    // Case 1: A specific view for 'individus' was requested (e.g., from Dashboard buttons)
    // and has now been consumed by IndividusList. `requestedViewForIndividus` becomes null.
    // We must ensure `activeTab` remains 'individus'.
    if (activeTab === 'individus' && requestedViewForIndividus === null) {
      console.log("[MainContent Effect] Vue pour 'individus' consommée ou pas de vue initialement demandée. Maintien de l'onglet 'individus'.");
      return; // Explicitly stay on 'individus'
    }

    // Case 2: A specific view for 'individus' is currently active/requested from Dashboard.
    // `activeTab` should have been set to 'individus' by the navigation handlers.
    // We don't want the default role-based logic to override this.
    if (requestedViewForIndividus !== null) {
      if (activeTab !== 'individus') {
        // This is a corrective measure, ideally not hit if nav handlers are correct.
        console.warn(`[MainContent Effect] requestedViewForIndividus ('${requestedViewForIndividus}') est défini, mais activeTab ('${activeTab}') n'est pas 'individus'. Correction vers 'individus'.`);
        setActiveTab('individus');
      } else {
        console.log(`[MainContent Effect] Vue '${requestedViewForIndividus}' pour 'individus' active. activeTab est '${activeTab}'. Pas de changement.`);
      }
      return; // A specific 'individus' navigation is in progress or active.
    }

    // Case 3: No specific 'individus' view is active (requestedViewForIndividus is null).
    // This means either:
    //   a) Initial load.
    //   b) User clicked a tab directly in the main navigation.
    // We need to decide if we should apply a role-based default tab,
    // but ONLY if the current activeTab is not an explicitly chosen non-default tab.

    const nonDefaultTabs = ['import', 'attribution', 'categories', 'users', 'settings'];
    // If the user explicitly clicked on a non-default tab (like 'Import de données'),
    // `activeTab` would be, for example, 'import'. We must respect that choice.
    if (nonDefaultTabs.includes(activeTab)) {
      console.log(`[MainContent Effect] Onglet explicite '${activeTab}' sélectionné via clic direct. Pas de changement par défaut basé sur le rôle.`);
      return; // Keep the explicitly clicked non-default tab.
    }

    // Case 4: Apply role-based default.
    // If we are here, it means:
    //   - `requestedViewForIndividus` is null (no specific 'individus' view is active).
    //   - `activeTab` is NOT one of the `nonDefaultTabs` (e.g., it's 'dashboard', 'individus', or initial state).
    // This is where we apply the default tab based on the user's role,
    // typically on initial load or if the role changes and the user is on a "defaultable" tab.
    console.log(`[MainContent Effect] Application de la logique d'onglet par défaut. activeTab actuel: ${activeTab}, role: ${user.role}`);
    if (user.role === 'admin' || user.role === 'manager') {
      if (activeTab !== 'dashboard') {
        console.log("[MainContent Effect] Rôle admin/manager. Passage à l'onglet 'dashboard' par défaut.");
        setActiveTab('dashboard');
      } else {
        console.log("[MainContent Effect] Rôle admin/manager. Déjà sur 'dashboard'. Maintien.");
      }
    } else { // user.role === 'user'
      if (activeTab !== 'individus') {
        console.log("[MainContent Effect] Rôle utilisateur. Passage à l'onglet 'individus' par défaut.");
        setActiveTab('individus');
      } else {
        console.log("[MainContent Effect] Rôle utilisateur. Déjà sur 'individus'. Maintien.");
      }
    }
  }, [user.role, requestedViewForIndividus, activeTab]);

  const handleNavigateToMyIndividus = useCallback(() => {
    console.log("[MainContent] handleNavigateToMyIndividus: Début. Demande de vue 'mine'.");
    setActiveTab('individus'); 
    setRequestedViewForIndividus('mine');
    console.log("[MainContent] handleNavigateToMyIndividus: Fin. activeTab='individus', requestedViewForIndividus='mine'.");
  }, []);

  const handleNavigateToAllIndividus = useCallback(() => {
    console.log("[MainContent] handleNavigateToAllIndividus: Début. Demande de vue 'all'.");
    setActiveTab('individus'); 
    setRequestedViewForIndividus('all');
    console.log("[MainContent] handleNavigateToAllIndividus: Fin. activeTab='individus', requestedViewForIndividus='all'.");
  }, []);

  const handleRequestedViewConsumed = useCallback(() => {
    console.log("[MainContent] handleRequestedViewConsumed: Vue demandée consommée, réinitialisation de requestedViewForIndividus à null.");
    setRequestedViewForIndividus(null);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard
            user={user}
            onNavigateToMyIndividus={handleNavigateToMyIndividus}
            onNavigateToAllIndividus={handleNavigateToAllIndividus}
          />
        );
      case 'individus':
        return (
          <IndividusList
            user={user}
            requestedView={requestedViewForIndividus}
            onRequestedViewConsumed={handleRequestedViewConsumed}
          />
        );
      case 'import':
        return <ImportData user={user} />;
      case 'attribution':
        return <MassAttribution user={user} />;
      case 'categories':
        return <AdminCategories />;
      case 'users':
        return <AdminUsers />;
      case 'settings':
        return <UserSettings user={user} />;
      default:
        return (
          <Dashboard
            user={user}
            onNavigateToMyIndividus={handleNavigateToMyIndividus}
            onNavigateToAllIndividus={handleNavigateToAllIndividus}
          />
        );
    }
  };

  const tabs = [];
  tabs.push(
    { id: 'dashboard', label: 'Tableau de bord' },
    { id: 'individus', label: 'Individus' }
  );

  if (user.role === 'admin' || user.role === 'manager') {
    tabs.push(
      { id: 'import', label: 'Import de données' },
      { id: 'attribution', label: 'Attribution de masse' }
    );
  }

  if (user.role === 'admin') {
    tabs.push(
      { id: 'categories', label: 'Gérer les catégories' },
      { id: 'users', label: 'Gérer les utilisateurs' }
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>indi-suivi-nodejs</h1>
        </div>
        <div className="user-section" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <span className="user-info">
            <strong>{user.windows_login || user.username}</strong> ({user.role})
          </span>
          <button onClick={onLogout} className="logout-button">Déconnexion</button>
        </div>
      </header>
      <div className="app-body">
        <nav className="main-nav" aria-label="Navigation principale">
          <ul>
            {tabs.map(tab => (
              <li key={tab.id}>
                <button
                  className={activeTab === tab.id ? 'active' : ''}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  onClick={() => {
                    if (activeTab !== tab.id) {
                      console.log(
                        `[MainContent] Clic sur onglet '${tab.label}'. Passage à activeTab='${tab.id}', requestedViewForIndividus=null.`
                      );
                      setRequestedViewForIndividus(null);
                      setActiveTab(tab.id);
                    } else {
                      console.log(
                        `[MainContent] Clic sur onglet '${tab.label}', déjà actif. Pas de changement d'état.`
                      );
                    }
                  }}
                >
                  <span className="tab-icon">{tabIcons[tab.id]}</span>
                  <span className="tab-label">{tab.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
        <main className="content">{renderContent()}</main>
      </div>
      <footer
        className="main-footer"
        style={{
          textAlign: 'center',
          marginTop: '2rem',
          paddingTop: '1rem',
          borderTop: '1px solid var(--border-color-light)',
          fontSize: '0.875rem',
          color: 'var(--text-color-secondary)',
        }}
      >
        <div className="app-info">Version 1.1.0 &bull; &copy; 2025</div>
      </footer>
    </div>
  );
}
