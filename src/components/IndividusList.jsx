import React, { useEffect, useState, useMemo, useCallback } from 'react';
import IndividuFiche from './IndividuFiche';
import NouvelIndividu from './NouvelIndividu';
import { hasPermission } from '../utils/permissions';

// Icône d'édition simple
const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" style={{ verticalAlign: 'middle' }}>
    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207l-1.586 1.586zM10.5 3.207 4 9.707V12h2.293l6.5-6.5-2.293-2.293z"/>
  </svg>
);

// Icône de tri
const SortIcon = ({ direction }) => {
  if (direction === 'ascending') return <span style={{ marginLeft: '5px', fontSize: '0.8em' }}>▲</span>;
  if (direction === 'descending') return <span style={{ marginLeft: '5px', fontSize: '0.8em' }}>▼</span>;
  return <span style={{ marginLeft: '5px', color: '#aaa', fontSize: '0.8em' }}>↕</span>;
};

// Icône de recherche (Loupe)
const SearchIcon = () => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="16" 
    height="16" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" // Utilise la couleur du texte parent (placeholder ou input)
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{
      position: 'absolute',
      left: 'var(--spacing-3)', // Ajuster selon le padding désiré
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-color-placeholder)' // Couleur de l'icône
    }}
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);


const ITEMS_PER_PAGE = 20; // Nombre d'éléments par page pour la pagination

// Fonction pour déterminer le mode de vue initial à partir de l'URL (hash).
const getViewModeFromUrl = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hash) {
    if (window.location.hash.includes('/mine')) {
      return 'mine'; // Vue "Mes individus"
    }
  }
  return 'all'; // Vue "Tous les individus" par défaut
};

/**
 * Composant IndividusList
 * Affiche et gère la liste des individus, avec filtres, tri, pagination, et sélection de vue.
 * @param {object} user - L'objet utilisateur connecté.
 * @param {string|null} requestedView - La vue demandée par un composant parent (par exemple, 'mine' ou 'all').
 * @param {function} onRequestedViewConsumed - Callback à appeler une fois que la vue demandée a été traitée.
 */
export default function IndividusList({ user, requestedView, onRequestedViewConsumed }) {
  // État pour le mode de vue ('all' ou 'mine'). Initialisé à partir de l'URL.
  const [viewMode, setViewMode] = useState(getViewModeFromUrl);
  
  // États pour les données
  const [individus, setIndividus] = useState([]); // Liste complète des individus (avant filtrage local)
  const [categories, setCategories] = useState([]); // Liste des catégories (pour les champs personnalisés)
  const [users, setUsers] = useState([]); // Liste des utilisateurs (pour afficher le nom de l'utilisateur "en charge")
  
  // États pour l'interface utilisateur
  const [loading, setLoading] = useState(true); // Indicateur de chargement
  const [error, setError] = useState(null); // Message d'erreur
  const [filtre, setFiltre] = useState(''); // Terme de recherche global
  const [colonnesAffichees, setColonnesAffichees] = useState([]); // Clés des colonnes de champs supplémentaires à afficher
  const [showColonnesPicker, setShowColonnesPicker] = useState(false); // Afficher/masquer le sélecteur de colonnes
  const [champsDisponibles, setChampsDisponibles] = useState([]); // Liste des champs personnalisés disponibles pour sélection
  const [selectedIndividuId, setSelectedIndividuId] = useState(null); // ID de l'individu sélectionné pour édition
  const [showAddForm, setShowAddForm] = useState(false); // Afficher/masquer le formulaire d'ajout
  const [currentPage, setCurrentPage] = useState(1); // Page actuelle pour la pagination
  const [sortConfig, setSortConfig] = useState(null); // Configuration du tri ({ key: string, direction: 'ascending'|'descending' })
  const [columnFilters, setColumnFilters] = useState({}); // Filtres par colonne ({ columnKey: filterValue })
  
  // Clé pour forcer le re-rendu si nécessaire (utilisé pour s'assurer que les changements de vue sont bien pris en compte visuellement)
  const [renderKey, setRenderKey] = useState(0); 
  
  // ID de l'utilisateur courant (memoized).
  const currentUserId = useMemo(() => Number(user.id || user.userId), [user.id, user.userId]);

  // Récupère le nom d'un utilisateur à partir de son ID (memoized).
  const getUserName = useCallback((userId, ind = null) => {
    if (userId === null || userId === undefined || userId === '') {
      return 'Non assigné';
    }
    const numId = Number(userId);
    const foundUser = users.find(u => u.id === numId);
    if (foundUser) return foundUser.username;
    // Fallback si l'utilisateur n'est pas dans la liste `users` mais que l'info est dans l'individu
    if (ind && ind.en_charge_username) return ind.en_charge_username; 
    return `Utilisateur #${userId}`;
  }, [users]);

  // Version de getUserName pour l'affichage dans le JSX, avec style pour "Non assigné".
  const getUserNameForDisplay = useCallback((userId, ind = null) => {
    if (userId === null || userId === undefined || userId === '') {
      return <span className="text-color-secondary" style={{ fontStyle: 'italic' }}>Non assigné</span>;
    }
    return getUserName(userId, ind);
  }, [getUserName]);

  // Filtre et trie les individus (memoized).
  const filteredIndividus = useMemo(() => {
    console.log(`[IndividusList] Filtrage (viewMode=${viewMode}, count=${individus.length})`);
    if (loading || individus.length === 0) return [];
    
    let result = [...individus]; // Copie pour éviter de modifier l'état original.
    
    // Filtre principal: 'mine' vs 'all'
    if (viewMode === 'mine') {
      const beforeCount = result.length;
      result = result.filter(ind => String(ind.en_charge) === String(currentUserId));
      console.log(`[IndividusList] Après filtre 'mine': ${result.length}/${beforeCount}`);
    }
    
    // Filtre de recherche globale
    if (filtre && filtre.trim() !== '') {
      const searchTerm = filtre.toLowerCase().trim();
      result = result.filter(ind => {
        if (String(ind.numero_unique || '').toLowerCase().includes(searchTerm)) return true;
        const username = getUserName(ind.en_charge, ind);
        if (username.toLowerCase().includes(searchTerm)) return true;
        const champsSupp = ind.champs_supplementaires || {};
        return Object.values(champsSupp).some(val => String(val || '').toLowerCase().includes(searchTerm));
      });
    }
    
    // Filtres par colonne
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value && value.trim() !== '') {
        const term = value.toLowerCase().trim();
        result = result.filter(ind => {
          if (key === 'numero_unique') return String(ind.numero_unique || '').toLowerCase().includes(term);
          if (key === 'en_charge') return getUserName(ind.en_charge, ind).toLowerCase().includes(term);
          const champsSupp = ind.champs_supplementaires || {};
          return String(champsSupp[key] || '').toLowerCase().includes(term);
        });
      }
    });
    
    // Tri
    if (sortConfig) {
      result.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === 'numero_unique') { aValue = a.numero_unique; bValue = b.numero_unique; }
        else if (sortConfig.key === 'en_charge') { aValue = getUserName(a.en_charge, a); bValue = getUserName(b.en_charge, b); }
        else { aValue = (a.champs_supplementaires || {})[sortConfig.key]; bValue = (b.champs_supplementaires || {})[sortConfig.key]; }
        
        aValue = aValue === null || aValue === undefined ? '' : String(aValue).toLowerCase();
        bValue = bValue === null || bValue === undefined ? '' : String(bValue).toLowerCase();
        
        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [individus, viewMode, currentUserId, filtre, columnFilters, sortConfig, loading, getUserName]);
  
  // Calcule les individus à afficher pour la page actuelle (pagination, memoized).
  const individusToShow = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredIndividus.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredIndividus, currentPage]);
  
  const totalPages = Math.max(1, Math.ceil(filteredIndividus.length / ITEMS_PER_PAGE));

  // Gère les changements de hash dans l'URL pour mettre à jour `viewMode`.
  useEffect(() => {
    const handleHashChange = () => {
      const newMode = getViewModeFromUrl();
      if (viewMode !== newMode) {
        console.log(`[IndividusList] URL changée, passage en mode: ${newMode}`);
        setViewMode(newMode);
        setRenderKey(prev => prev + 1); // Force un re-rendu pour assurer la mise à jour visuelle.
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [viewMode]);

  // Traite les demandes de changement de vue venant d'un composant parent (ex: Dashboard).
  useEffect(() => {
    if (requestedView) {
      console.log(`[IndividusList] Vue demandée externe: ${requestedView}`);
      if (viewMode !== requestedView) {
        console.log(`[IndividusList] Application directe du mode: ${requestedView}`);
        setViewMode(requestedView);
        setRenderKey(prev => prev + 1);
      }
      
      // Synchronise l'URL avec le mode de vue actuel.
      if (typeof window !== 'undefined' && window.location) {
        const newHash = requestedView === 'mine' ? '#individus/mine' : '#individus/all';
        if (window.location.hash !== newHash) {
          console.log(`[IndividusList] Mise à jour URL: ${newHash}`);
          window.location.hash = newHash;
        }
      }
      
      // Notifie le parent que la vue demandée a été consommée.
      // Le délai peut aider à s'assurer que tous les changements d'état sont propagés.
      if (onRequestedViewConsumed) {
        setTimeout(() => {
          console.log('[IndividusList] Notification de consommation de la vue demandée');
          onRequestedViewConsumed();
        }, 100); 
      }
    }
  }, [requestedView, onRequestedViewConsumed, viewMode]);

  // Charge les données principales (individus, catégories).
  const loadData = useCallback(async () => {
    console.log(`[IndividusList] Chargement des données (mode=${viewMode})...`);
    setLoading(true);
    setError(null);
    try {
      if (!window.api || !window.api.getIndividus || !window.api.getCategories) {
        setError("API non disponible pour charger les données.");
        setLoading(false);
        return;
      }
      
      // Charge les catégories pour déterminer les champs personnalisés et colonnes.
      const catResponse = await window.api.getCategories();
      if (catResponse && catResponse.success && Array.isArray(catResponse.data)) {
        setCategories(catResponse.data);
        const fields = [];
        catResponse.data.forEach(cat => {
          if (cat.champs && Array.isArray(cat.champs)) {
            cat.champs.forEach(champ => {
              if (champ.visible && !fields.find(f => f.key === champ.key)) { // Assure l'unicité par clé
                fields.push({ ...champ, categorieId: cat.id, categorieNom: cat.nom });
              }
            });
          }
        });
        setChampsDisponibles(fields);
        // Initialise les colonnes affichées par défaut si non configurées.
        if (colonnesAffichees.length === 0 && fields.length > 0) {
          const defaultCols = fields.filter(f => f.visible_par_defaut_tableau).map(f => f.key);
          if (defaultCols.length > 0) setColonnesAffichees(defaultCols);
        }
      } else {
        console.warn("Erreur chargement catégories:", catResponse?.message);
        // Ne pas bloquer si les catégories ne chargent pas, mais logger.
      }
      
      if (!user || !currentUserId) {
        setError("Utilisateur invalide pour le chargement des données.");
        setLoading(false);
        return;
      }
      
      // Charge les individus.
      const indResponse = await window.api.getIndividus(currentUserId, user.role);
      if (indResponse && indResponse.success) {
        const loadedData = Array.isArray(indResponse.data) ? indResponse.data : [];
        console.log(`[IndividusList] ${loadedData.length} individus chargés`);
        setIndividus(loadedData);
      } else {
        console.error("Erreur chargement individus:", indResponse?.message);
        setError(indResponse?.message || "Erreur lors du chargement des données des individus.");
        setIndividus([]);
      }
    } catch (err) {
      console.error("Erreur critique lors du chargement des données:", err);
      setError(`Erreur: ${err.message}`);
      setIndividus([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentUserId, viewMode, colonnesAffichees.length]); // `colonnesAffichees.length` est une dépendance indirecte pour recharger si les colonnes par défaut sont appliquées.

  // Charge la liste des utilisateurs (pour les noms "en charge").
  const loadUsers = useCallback(async () => {
    try {
      if (!window.api || !window.api.getUsers) {
        console.warn("API getUsers non disponible.");
        return;
      }
      const response = await window.api.getUsers();
      if (response && response.success && Array.isArray(response.data)) {
        setUsers(response.data);
      }
    } catch (err) {
      console.error("Erreur chargement utilisateurs:", err);
    }
  }, []);

  // Effet pour le chargement initial des données et la configuration des colonnes.
  useEffect(() => {
    loadUsers(); // Charger les utilisateurs en premier ou en parallèle.
    loadData();   // Charger les données principales.
    
    // Charge la configuration des colonnes (depuis l'API ou localStorage).
    const loadColumnsConfig = async () => {
      try {
        let config = null;
        if (window.api && window.api.loadColumnConfiguration) { // Préférence pour l'API si disponible
          config = await window.api.loadColumnConfiguration();
        } else { // Fallback sur localStorage
          const localConfig = localStorage.getItem('individusListColumnConfig');
          if (localConfig) config = JSON.parse(localConfig);
        }
        if (Array.isArray(config)) setColonnesAffichees(config);
      } catch (err) {
        console.error("Erreur chargement configuration colonnes:", err);
      }
    };
    loadColumnsConfig();
  }, [loadUsers, loadData]); // Dépendances: `loadUsers` et `loadData`.
  
  // Recharger les données et réinitialiser la pagination lorsque `viewMode` change.
  useEffect(() => {
    loadData();
    setCurrentPage(1); // Revenir à la première page
  }, [viewMode, loadData]); // Dépendances: `viewMode` et `loadData`.

  // Gestionnaires d'événements UI
  const handleViewChange = useCallback((newMode) => {
    console.log(`[IndividusList] Changement manuel vers mode: ${newMode}`);
    if (viewMode !== newMode) {
      setViewMode(newMode);
      setRenderKey(prev => prev + 1);
    }
    // Synchronise l'URL avec le changement de mode.
    if (typeof window !== 'undefined' && window.location) {
      const newHash = newMode === 'mine' ? '#individus/mine' : '#individus/all';
      if (window.location.hash !== newHash) window.location.hash = newHash;
    }
  }, [viewMode]);
  
  const handleAddIndividu = useCallback(() => setShowAddForm(true), []);
  const handleAddSuccess = useCallback(() => { loadData(); setShowAddForm(false); }, [loadData]);
  const handleEditSuccess = useCallback(() => { loadData(); setSelectedIndividuId(null); }, [loadData]);
  const handleConfigColonnes = useCallback(() => setShowColonnesPicker(prev => !prev), []);
  
  const handleToggleColonne = useCallback((key) => {
    const newConfig = colonnesAffichees.includes(key)
      ? colonnesAffichees.filter(c => c !== key)
      : [...colonnesAffichees, key];
    setColonnesAffichees(newConfig);
    
    // Sauvegarde la configuration des colonnes (via API si admin, sinon localStorage).
    if (hasPermission(user, 'manage_columns') && window.api && window.api.saveColumnConfiguration) {
      window.api.saveColumnConfiguration(newConfig).catch(err => console.error("Erreur sauvegarde config colonnes (API):", err));
    } else {
      localStorage.setItem('individusListColumnConfig', JSON.stringify(newConfig));
    }
  }, [colonnesAffichees, user.permissions]);
  
  const handleSort = useCallback((key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') direction = 'descending';
      else { setSortConfig(null); return; } // Troisième clic: annule le tri sur cette colonne
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  // Affichage pendant le chargement initial.
  if (loading && individus.length === 0) {
    return (
      <div className="content-container">
        <h2>Gestion des individus</h2>
        <div className="loading-message">Chargement des données initiales...</div>
      </div>
    );
  }
  
  // Affichage en cas d'erreur majeure.
  if (error) {
    return (
      <div className="content-container">
        <h2>Gestion des individus</h2>
        <div className="error-message">
          {error}
          <button onClick={loadData} className="btn-secondary" style={{marginTop: '10px'}}>Réessayer de charger</button>
        </div>
      </div>
    );
  }

  // Rendu principal de la liste.
  return (
    <div className="content-container" key={`list-container-${renderKey}`}> {/* Clé pour forcer le re-rendu */}
      <h2>Gestion des individus</h2>
      
      <div style={{ marginBottom: "10px", padding: "8px", backgroundColor: "var(--color-neutral-50)", borderRadius: "4px", fontSize: "0.9em", color: "var(--text-color-secondary)" }}>
        <strong>Mode d'affichage:</strong> {viewMode === 'mine' ? 'Mes individus' : 'Tous les individus'} | 
        <strong> Individus affichés:</strong> {filteredIndividus.length}
      </div>
      
      <div className="actions-bar">
        <div className="view-mode-selector">
          <button onClick={() => handleViewChange('all')} className={viewMode === 'all' ? 'active-view-button' : ''}>Tous les individus</button>
          <button onClick={() => handleViewChange('mine')} className={viewMode === 'mine' ? 'active-view-button' : ''}>Mes individus</button>
        </div>
        {/* Modification ici pour le champ de recherche */}
        <div className="search-container" style={{ position: 'relative' }}> {/* Assurez-vous que search-container a position: relative si ce n'est pas déjà le cas via CSS global */}
          <SearchIcon />
          <input 
            type="text" 
            placeholder="Rechercher (N°, En charge, Champs...)" 
            value={filtre} 
            onChange={e => setFiltre(e.target.value)} 
            className="search-input" // La classe .search-input dans app.css doit avoir le padding-left ajusté
            style={{ 
              paddingLeft: 'calc(var(--spacing-3) + 16px + var(--spacing-2))' /* Ajustement: padding-gauche-icone + largeur-icone + espace-icone-texte */
            }}
          />
        </div>
        <div className="buttons-container">
          <button onClick={handleAddIndividu} className="btn-success add-button">Ajouter un individu</button>
          {hasPermission(user, 'manage_columns') && (
            <button onClick={handleConfigColonnes} className="btn-secondary columns-button">
              {showColonnesPicker ? 'Masquer le sélecteur de colonnes' : 'Configurer les colonnes'}
            </button>
          )}
        </div>
      </div>
      
      {hasPermission(user, 'manage_columns') && showColonnesPicker && (
        <div className="colonnes-picker">
          <h4>Choisir les colonnes de champs supplémentaires à afficher:</h4>
          <div className="colonnes-grid">
            {champsDisponibles.map(champ => (
              <div key={champ.key} className="colonne-option">
                <label htmlFor={`col-${champ.key}`}>
                  <input type="checkbox" id={`col-${champ.key}`} checked={colonnesAffichees.includes(champ.key)} onChange={() => handleToggleColonne(champ.key)}/>
                  {champ.label} <span className="text-color-secondary" style={{fontSize: '0.8em'}}>({champ.categorieNom})</span>
                </label>
              </div>
            ))}
            {champsDisponibles.length === 0 && <p className="text-color-secondary" style={{fontStyle: 'italic'}}>Aucun champ supplémentaire configurable n'est défini dans les catégories.</p>}
          </div>
        </div>
      )}
      
      {loading && <div className="loading-message" style={{marginTop: '10px'}}>Mise à jour des données...</div>}
      
      {!loading && filteredIndividus.length === 0 && (
        <div className="no-data-message" style={{marginTop: '20px', textAlign: 'center'}}>
          <p>
            {filtre || Object.keys(columnFilters).some(k => columnFilters[k]) || viewMode === 'mine'
              ? "Aucun individu ne correspond à vos critères de recherche ou de filtre actuels."
              : "Aucun individu n'est actuellement enregistré dans le système."}
          </p>
          {viewMode === 'mine' && individus.length > 0 && ( // Si en mode "mine" et qu'il y a des individus au total
            <div style={{marginTop: '20px'}}>
              <p className="text-color-secondary" style={{marginBottom: '10px'}}>
                Vous n'avez aucun individu spécifiquement assigné. {individus.length} individu(s) au total dans le système.
              </p>
              <button className="btn-secondary" onClick={() => handleViewChange('all')}>Voir tous les individus</button>
            </div>
          )}
        </div>
      )}
      
      {!loading && individusToShow.length > 0 && (
        <div className="table-container" key={`table-${renderKey}-${viewMode}`}> {/* Clé pour forcer le re-rendu de la table */}
          <table className="individus-table">
            <thead>
              <tr>
                <th style={{ width: '60px', textAlign: 'center' }}>Actions</th>
                <th onClick={() => handleSort('numero_unique')} style={{cursor: 'pointer'}}>N° Individu <SortIcon direction={sortConfig?.key === 'numero_unique' ? sortConfig.direction : undefined} /></th>
                <th onClick={() => handleSort('en_charge')} style={{cursor: 'pointer'}}>En charge <SortIcon direction={sortConfig?.key === 'en_charge' ? sortConfig.direction : undefined} /></th>
                {colonnesAffichees.map(key => {
                  const champ = champsDisponibles.find(c => c.key === key);
                  return champ ? (<th key={key} onClick={() => handleSort(key)} style={{cursor: 'pointer'}}>{champ.label} <SortIcon direction={sortConfig?.key === key ? sortConfig.direction : undefined} /></th>) : null;
                })}
              </tr>
              <tr className="filter-row">
                <td></td>
                <td><input type="text" placeholder="Filtrer N°..." value={columnFilters.numero_unique || ''} onChange={e => setColumnFilters({...columnFilters, numero_unique: e.target.value})} onClick={e => e.stopPropagation()} className="filter-input"/></td>
                <td><input type="text" placeholder="Filtrer En charge..." value={columnFilters.en_charge || ''} onChange={e => setColumnFilters({...columnFilters, en_charge: e.target.value})} onClick={e => e.stopPropagation()} className="filter-input"/></td>
                {colonnesAffichees.map(key => {
                  const champ = champsDisponibles.find(c => c.key === key);
                  return champ ? (<td key={`filter-${key}`}><input type="text" placeholder={`Filtrer ${champ.label}...`} value={columnFilters[key] || ''} onChange={e => setColumnFilters({...columnFilters, [key]: e.target.value})} onClick={e => e.stopPropagation()} className="filter-input"/></td>) : null;
                })}
              </tr>
            </thead>
            <tbody>
              {individusToShow.map(ind => (
                <tr key={ind.id || ind.numero_unique}>
                  <td data-label="Actions" style={{ textAlign: 'center' }}>
                    <button onClick={() => setSelectedIndividuId(ind.id)} className="btn-tertiary btn-icon" title="Éditer l'individu"><EditIcon /></button>
                  </td>
                  <td data-label="N° Individu">{ind.numero_unique || ind.id}</td>
                  <td data-label="En charge">{getUserNameForDisplay(ind.en_charge, ind)}</td>
                  {colonnesAffichees.map(key => {
                    const champsSupp = ind.champs_supplementaires || {};
                    const value = champsSupp[key];
                    let displayValue = '';
                    if (typeof value === 'boolean') displayValue = value ? 'Oui' : 'Non';
                    else if (value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)) && value.match(/^\d{4}-\d{2}-\d{2}/))) {
                      try { displayValue = new Date(value).toLocaleDateString(); } catch (e) { displayValue = String(value); }
                    } else displayValue = value === null || value === undefined ? '' : String(value);
                    const champLabel = champsDisponibles.find(c => c.key === key)?.label || key;
                    return <td key={key} data-label={champLabel}>{displayValue}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {totalPages > 1 && (
        <div className="pagination-controls" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="btn-tertiary">Précédent</button>
          <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.875rem'}}>Page {currentPage} sur {totalPages} (Total filtré: {filteredIndividus.length})</span>
          <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="btn-tertiary">Suivant</button>
        </div>
      )}
      
      {showAddForm && (
        <div className="modal-overlay">
          <NouvelIndividu user={user} onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} />
        </div>
      )}
      
      {selectedIndividuId && (
        <div className="modal-overlay">
          <IndividuFiche individuId={selectedIndividuId} onClose={() => setSelectedIndividuId(null)} onUpdate={handleEditSuccess} user={user} />
        </div>
      )}
    </div>
  );
}
