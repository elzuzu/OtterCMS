import React, { useState, useEffect, useCallback, Suspense } from 'react';
// import Dashboard from './Dashboard'; // Removed
// import IndividusList from './IndividusList'; // Removed
// import ImportData from './ImportData'; // Removed
// import MassAttribution from './MassAttribution'; // Removed
// import AdminCategories from './AdminCategories'; // Removed
// import AdminUsersSection from './AdminUsersSection'; // Removed
// import AdminTemplate from './AdminTemplate'; // Removed
// import UserSettings from './UserSettings'; // Removed
import * as LazyComponents from './LazyComponents';
import CircularProgress from './common/CircularProgress'; // Path confirmed to be correct
import LayoutManager from './layout/LayoutManager'; // Kept

// Composant de loading optimisé
function ComponentLoader() {
  return (
    <>
      <div className="loading-bar"></div>
      <div
        className="pc-content"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '400px',
        }}
      >
        <CircularProgress value={50} label="Chargement..." />
      </div>
    </>
  );
}

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
      return; // Keep the explicitly clicked non-default tab.
    }

    // Case 4: Apply role-based default.
    // If we are here, it means:
    //   - `requestedViewForIndividus` is null (no specific 'individus' view is active).
    //   - `activeTab` is NOT one of the `nonDefaultTabs` (e.g., it's 'dashboard', 'individus', or initial state).
    // This is where we apply the default tab based on the user's role,
    // typically on initial load or if the role changes and the user is on a "defaultable" tab.
    if (user.role === 'admin' || user.role === 'manager') {
      if (activeTab !== 'dashboard') {
        setActiveTab('dashboard');
      }
    } else { // user.role === 'user'
      if (activeTab !== 'individus') {
        setActiveTab('individus');
      }
    }
  }, [user.role, requestedViewForIndividus, activeTab]);

  const handleNavigateToMyIndividus = useCallback(() => {
    setActiveTab('individus');
    setRequestedViewForIndividus('mine');
  }, []);

  const handleNavigateToAllIndividus = useCallback(() => {
    setActiveTab('individus');
    setRequestedViewForIndividus('all');
  }, []);

  const handleRequestedViewConsumed = useCallback(() => {
    setRequestedViewForIndividus(null);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.Dashboard
              user={user}
              onNavigateToMyIndividus={handleNavigateToMyIndividus}
              onNavigateToAllIndividus={handleNavigateToAllIndividus}
            />
          </Suspense>
        );
      case 'individus':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.IndividusList
              user={user}
              requestedView={requestedViewForIndividus}
              onRequestedViewConsumed={handleRequestedViewConsumed}
            />
          </Suspense>
        );
      case 'import':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.ImportData user={user} />
          </Suspense>
        );
      case 'attribution':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.MassAttribution user={user} />
          </Suspense>
        );
      case 'categories':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.AdminCategories />
          </Suspense>
        );
      case 'users':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.AdminUsersSection user={user} />
          </Suspense>
        );
      case 'template':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.AdminTemplate />
          </Suspense>
        );
      case 'settings':
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.UserSettings user={user} />
          </Suspense>
        );
      default: // Default case should also be lazy-loaded
        return (
          <Suspense fallback={<ComponentLoader />}>
            <LazyComponents.Dashboard
              user={user}
              onNavigateToMyIndividus={handleNavigateToMyIndividus}
              onNavigateToAllIndividus={handleNavigateToAllIndividus}
            />
          </Suspense>
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
      {renderContent()}
    </LayoutManager>
  );
}
