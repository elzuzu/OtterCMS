import React, { useState, useEffect, useCallback } from 'react';
import Dashboard from './Dashboard';
import IndividusList from './IndividusList';
import ImportData from './ImportData';
import MassAttribution from './MassAttribution';
import AdminCategories from './AdminCategories';
import AdminUsersSection from './AdminUsersSection';
import AdminTemplate from './AdminTemplate';
import UserSettings from './UserSettings';
import LayoutManager from './layout/LayoutManager';
import PageWrapper from './layout/PageWrapper';

/**
 * Composant MainContent
 * Gère la navigation principale par onglets et le contenu affiché.
 * Inclut la logique pour gérer les demandes de navigation spécifiques (par exemple, depuis le Dashboard vers une vue filtrée des Individus).
 */
export default function MainContent({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [requestedViewForIndividus, setRequestedViewForIndividus] = useState(null);
  const [appTitle, setAppTitle] = useState('indi-suivi-nodejs');


  useEffect(() => {
    async function fetchTitle() {
      if (window.api && window.api.getConfig) {
        const result = await window.api.getConfig();
        if (result.success && result.data && result.data.appTitle) {
          setAppTitle(result.data.appTitle);
        }
      }
    }
    fetchTitle();
  }, []);

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

    const nonDefaultTabs = ['import', 'attribution', 'categories', 'users', 'template', 'settings'];
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
        return <AdminUsersSection user={user} />;
      case 'template':
        return <AdminTemplate />;
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

  return (
    <LayoutManager
      user={user}
      onLogout={onLogout}
      activeTab={activeTab}
      title={appTitle}
      onTabChange={(id) => {
        if (activeTab !== id) {
          setRequestedViewForIndividus(null);
          setActiveTab(id);
        }
      }}
    >
      <PageWrapper>{renderContent()}</PageWrapper>
    </LayoutManager>
  );
}
