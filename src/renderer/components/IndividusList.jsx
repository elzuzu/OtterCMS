import React, { useEffect, useState, useMemo, useCallback } from 'react';
// Utilisation de la fiche d'individu standard
import IndividuFiche from './IndividuFiche';
import NouvelIndividu from './NouvelIndividu';
import { formatDateToDDMMYYYY } from '../utils/date';

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
    stroke="currentColor"
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round"
    style={{
      position: 'absolute',
      left: 'var(--spacing-3)',
      top: '50%',
      transform: 'translateY(-50%)',
      color: 'var(--text-color-placeholder)'
    }}
  >
    <circle cx="11" cy="11" r="8"></circle>
    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
  </svg>
);

const ITEMS_PER_PAGE = 20;

const getViewModeFromUrl = () => {
  if (typeof window !== 'undefined' && window.location && window.location.hash) {
    if (window.location.hash.includes('/mine')) {
      return 'mine';
    }
  }
  return 'all';
};

const calculateColumnWidth = (columnKey, champsDisponibles) => {
  if (columnKey === 'actions') return '80px';
  if (columnKey === 'numero_unique') return '120px';
  if (columnKey === 'en_charge') return '150px';
  
  const champ = champsDisponibles.find(c => c.key === columnKey);
  if (!champ) return '130px'; 
  
  switch (champ.type) {
    case 'date':
      return '110px';
    case 'boolean':
      return '80px';
    case 'number':
      return '100px';
    case 'list':
      return '140px'; 
    default: 
      const labelLength = champ.label?.length || 12; 
      const baseWidth = Math.max(120, labelLength * 8 + 40); 
      return `${Math.min(baseWidth, 250)}px`; 
  }
};

export default function IndividusList({ user, requestedView, onRequestedViewConsumed }) {
  const [viewMode, setViewMode] = useState(getViewModeFromUrl);
  
  const [individus, setIndividus] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtre, setFiltre] = useState('');
  const [colonnesAffichees, setColonnesAffichees] = useState([]);
  const [showColonnesPicker, setShowColonnesPicker] = useState(false);
  const [champsDisponibles, setChampsDisponibles] = useState([]);
  const [selectedIndividuId, setSelectedIndividuId] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState(null);
  const [columnFilters, setColumnFilters] = useState({});
  const [renderKey, setRenderKey] = useState(0);
  
  const currentUserId = useMemo(() => Number(user.id || user.userId), [user.id, user.userId]);

  const columnWidths = useMemo(() => {
    const widths = {
      actions: calculateColumnWidth('actions', champsDisponibles),
      numero_unique: calculateColumnWidth('numero_unique', champsDisponibles),
      en_charge: calculateColumnWidth('en_charge', champsDisponibles)
    };
    
    colonnesAffichees.forEach(key => {
      const champ = champsDisponibles.find(c => c.key === key);
      if (champ && !widths[key]) { // S'assurer que le champ existe avant de calculer sa largeur
        widths[key] = calculateColumnWidth(key, champsDisponibles);
      }
    });
    
    return widths;
  }, [champsDisponibles, colonnesAffichees]);

  const getUserName = useCallback((userId, ind = null) => {
    if (userId === null || userId === undefined || userId === '') {
      return 'Non assigné';
    }
    const numId = Number(userId);
    const foundUser = users.find(u => u.id === numId);
    if (foundUser) return foundUser.username;
    if (ind && ind.en_charge_username) return ind.en_charge_username; 
    return `Utilisateur #${userId}`;
  }, [users]);

  const getUserNameForDisplay = useCallback((userId, ind = null) => {
    if (userId === null || userId === undefined || userId === '') {
      return <span className="text-color-secondary" style={{ fontStyle: 'italic' }}>Non assigné</span>;
    }
    return getUserName(userId, ind);
  }, [getUserName]);

  const filteredIndividus = useMemo(() => {
    if (loading || individus.length === 0) return [];
    let result = [...individus];
    if (viewMode === 'mine') {
      result = result.filter(ind => String(ind.en_charge) === String(currentUserId));
    }
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
  
  const individusToShow = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredIndividus.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredIndividus, currentPage]);
  
  const totalPages = Math.max(1, Math.ceil(filteredIndividus.length / ITEMS_PER_PAGE));

  useEffect(() => {
    const handleHashChange = () => {
      const newMode = getViewModeFromUrl();
      if (viewMode !== newMode) {
        setViewMode(newMode);
        setRenderKey(prev => prev + 1);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [viewMode]);

  useEffect(() => {
    if (requestedView) {
      if (viewMode !== requestedView) {
        setViewMode(requestedView);
        setRenderKey(prev => prev + 1);
      }
      if (typeof window !== 'undefined' && window.location) {
        const newHash = requestedView === 'mine' ? '#individus/mine' : '#individus/all';
        if (window.location.hash !== newHash) window.location.hash = newHash;
      }
      if (onRequestedViewConsumed) {
        setTimeout(() => { onRequestedViewConsumed(); }, 100); 
      }
    }
  }, [requestedView, onRequestedViewConsumed, viewMode]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (!window.api || !window.api.getIndividus || !window.api.getCategories) {
        setError("API non disponible pour charger les données.");
        setLoading(false); return;
      }
      const catResponse = await window.api.getCategories();
      let loadedChampsDisponibles = [];
      if (catResponse && catResponse.success && Array.isArray(catResponse.data)) {
        setCategories(catResponse.data);
        const fields = [];
        catResponse.data.forEach(cat => {
          if (cat.champs && Array.isArray(cat.champs)) {
            cat.champs.forEach(champ => {
              if (champ.key && champ.visible && !fields.find(f => f.key === champ.key)) {
                fields.push({ ...champ, categorieId: cat.id, categorieNom: cat.nom });
              }
            });
          }
        });
        setChampsDisponibles(fields);
        loadedChampsDisponibles = fields; // Garder une référence locale pour la configuration des colonnes
      } else {
        console.warn("Erreur chargement catégories:", catResponse?.message);
      }
      
      // Configurer colonnesAffichees après que champsDisponibles est potentiellement mis à jour
      // Et seulement si colonnesAffichees est vide (initialisation)
      if (colonnesAffichees.length === 0 && loadedChampsDisponibles.length > 0) {
        const localConfig = localStorage.getItem('individusListColumnConfig');
        let parsedConfig = null;
        if (localConfig) {
          try { parsedConfig = JSON.parse(localConfig); } catch (e) { console.error("Erreur parsing config locale colonnes:", e); }
        }

        if (Array.isArray(parsedConfig)) {
          // Filtrer les colonnes de la config locale pour ne garder que celles qui existent encore dans loadedChampsDisponibles
          const validConfig = parsedConfig.filter(key => loadedChampsDisponibles.some(champ => champ.key === key));
          setColonnesAffichees(validConfig);
        } else {
          const defaultCols = loadedChampsDisponibles.filter(f => f.visible_par_defaut_tableau).map(f => f.key);
          if (defaultCols.length > 0) setColonnesAffichees(defaultCols);
        }
      } else if (colonnesAffichees.length > 0) {
        // Si colonnesAffichees a déjà des valeurs, les valider contre les nouveaux champs disponibles
        const validConfig = colonnesAffichees.filter(key => loadedChampsDisponibles.some(champ => champ.key === key));
        if (validConfig.length !== colonnesAffichees.length) {
            setColonnesAffichees(validConfig); // Mettre à jour si des colonnes sont devenues invalides
        }
      }


      if (!user || !currentUserId) {
        setError("Utilisateur invalide pour le chargement des données.");
        setLoading(false); return;
      }
      const indResponse = await window.api.getIndividus(currentUserId, user.role);
      if (indResponse && indResponse.success) {
        setIndividus(Array.isArray(indResponse.data) ? indResponse.data : []);
      } else {
        setError(indResponse?.message || "Erreur lors du chargement des données des individus.");
        setIndividus([]);
      }
    } catch (err) {
      setError(`Erreur: ${err.message}`);
      setIndividus([]);
    } finally {
      setLoading(false);
    }
  }, [user, currentUserId, viewMode, colonnesAffichees.length]); // Ajout de colonnesAffichees.length pour potentiellement revalider

  const loadUsers = useCallback(async () => {
    try {
      if (!window.api || !window.api.getUsers) { console.warn("API getUsers non disponible."); return; }
      const response = await window.api.getUsers();
      if (response && response.success && Array.isArray(response.data)) {
        setUsers(response.data);
      }
    } catch (err) { console.error("Erreur chargement utilisateurs:", err); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);
  useEffect(() => { loadData(); setCurrentPage(1); }, [viewMode, loadData]); 

  const handleViewChange = useCallback((newMode) => {
    if (viewMode !== newMode) { setViewMode(newMode); setRenderKey(prev => prev + 1); }
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
    localStorage.setItem('individusListColumnConfig', JSON.stringify(newConfig));
  }, [colonnesAffichees]); 
  
  const handleSort = useCallback((key) => {
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') direction = 'descending';
      else { setSortConfig(null); return; }
    }
    setSortConfig({ key, direction });
  }, [sortConfig]);

  if (loading && individus.length === 0) {
    return <div className="content-container"><h2>Gestion des individus</h2><div className="loading-message">Chargement des données initiales...</div></div>;
  }
  if (error) {
    return <div className="content-container"><h2>Gestion des individus</h2><div className="error-message">{error}<button onClick={loadData} className="btn-secondary" style={{marginTop: '10px'}}>Réessayer de charger</button></div></div>;
  }

  return (
    <div className="content-container" key={`list-container-${renderKey}`}>
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
        <div className="search-container" style={{ position: 'relative' }}>
          <SearchIcon />
          <input type="text" placeholder="Rechercher (N°, En charge, Champs...)" value={filtre} onChange={e => setFiltre(e.target.value)} className="search-input" style={{ paddingLeft: 'calc(var(--spacing-3) + 16px + var(--spacing-2))'}}/>
        </div>
        <div className="buttons-container">
          <button onClick={handleAddIndividu} className="btn-success add-button">Ajouter un individu</button>
          <button onClick={handleConfigColonnes} className="btn-secondary columns-button">{showColonnesPicker ? 'Masquer le sélecteur' : 'Configurer les colonnes'}</button>
        </div>
      </div>
      {showColonnesPicker && (
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
            {champsDisponibles.length === 0 && <p className="text-color-secondary" style={{fontStyle: 'italic'}}>Aucun champ supplémentaire configurable n'est défini.</p>}
          </div>
        </div>
      )}
      {loading && <div className="loading-message" style={{marginTop: '10px'}}>Mise à jour des données...</div>}
      {!loading && filteredIndividus.length === 0 && (
        <div className="no-data-message" style={{marginTop: '20px', textAlign: 'center'}}>
          <p>{filtre || Object.keys(columnFilters).some(k => columnFilters[k]) || viewMode === 'mine' ? "Aucun individu ne correspond à vos critères." : "Aucun individu enregistré."}</p>
          {viewMode === 'mine' && individus.length > 0 && (
            <div style={{marginTop: '20px'}}><p className="text-color-secondary" style={{marginBottom: '10px'}}>Vous n'avez aucun individu assigné. {individus.length} au total.</p><button className="btn-secondary" onClick={() => handleViewChange('all')}>Voir tous</button></div>
          )}
        </div>
      )}
      {!loading && individusToShow.length > 0 && (
        <div className="table-responsive" style={{ borderRadius: '8px', overflowX: 'auto', border: '1px solid var(--border-color-light)' }}>
          <table className="individus-table data-table" style={{ borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ width: columnWidths.actions, minWidth: columnWidths.actions, textAlign: 'center', padding: '12px 8px', backgroundColor: 'var(--color-neutral-50)', borderBottom: '2px solid var(--border-color-medium)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', position: 'sticky', top: '0', zIndex: '2', boxSizing: 'border-box'}}>Actions</th>
                <th onClick={() => handleSort('numero_unique')} style={{ width: columnWidths.numero_unique, minWidth: columnWidths.numero_unique, cursor: 'pointer', userSelect: 'none', padding: '12px 8px', backgroundColor: 'var(--color-neutral-50)', borderBottom: '2px solid var(--border-color-medium)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', position: 'sticky', top: '0', zIndex: '2', boxSizing: 'border-box'}}>N° Individu <SortIcon direction={sortConfig?.key === 'numero_unique' ? sortConfig.direction : undefined} /></th>
                <th onClick={() => handleSort('en_charge')} style={{ width: columnWidths.en_charge, minWidth: columnWidths.en_charge, cursor: 'pointer', userSelect: 'none', padding: '12px 8px', backgroundColor: 'var(--color-neutral-50)', borderBottom: '2px solid var(--border-color-medium)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', position: 'sticky', top: '0', zIndex: '2', boxSizing: 'border-box'}}>En charge <SortIcon direction={sortConfig?.key === 'en_charge' ? sortConfig.direction : undefined} /></th>
                {colonnesAffichees.map(key => {
                  const champ = champsDisponibles.find(c => c.key === key);
                  if (!champ) return null; // Ne pas rendre le header si le champ n'existe pas
                  const currentWidth = columnWidths[key] || '130px';
                  return (
                    <th key={key} onClick={() => handleSort(key)} style={{ width: currentWidth, minWidth: currentWidth, cursor: 'pointer', userSelect: 'none', padding: '12px 8px', backgroundColor: 'var(--color-neutral-50)', borderBottom: '2px solid var(--border-color-medium)', fontWeight: '600', fontSize: '0.75rem', textTransform: 'uppercase', position: 'sticky', top: '0', zIndex: '2', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={champ.label}>{champ.label} <SortIcon direction={sortConfig?.key === key ? sortConfig.direction : undefined} /></th>
                  );
                })}
              </tr>
              <tr className="filter-row" style={{ backgroundColor: 'var(--color-neutral-100)' }}>
                <td style={{ width: columnWidths.actions, minWidth: columnWidths.actions, padding: '8px', boxSizing: 'border-box' }}></td>
                <td style={{ width: columnWidths.numero_unique, minWidth: columnWidths.numero_unique, padding: '8px', boxSizing: 'border-box' }}><input type="text" placeholder="Filtrer N°..." value={columnFilters.numero_unique || ''} onChange={e => setColumnFilters({...columnFilters, numero_unique: e.target.value})} onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--border-color-medium)', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }}/></td>
                <td style={{ width: columnWidths.en_charge, minWidth: columnWidths.en_charge, padding: '8px', boxSizing: 'border-box' }}><input type="text" placeholder="Filtrer En charge..." value={columnFilters.en_charge || ''} onChange={e => setColumnFilters({...columnFilters, en_charge: e.target.value})} onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--border-color-medium)', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }}/></td>
                {colonnesAffichees.map(key => {
                  const champ = champsDisponibles.find(c => c.key === key);
                  if (!champ) return null; // Ne pas rendre la cellule de filtre si le champ n'existe pas
                  const currentWidth = columnWidths[key] || '130px';
                  return (<td key={`filter-${key}`} style={{ width: currentWidth, minWidth: currentWidth, padding: '8px', boxSizing: 'border-box' }}><input type="text" placeholder={`Filtrer ${champ.label}...`} value={columnFilters[key] || ''} onChange={e => setColumnFilters({...columnFilters, [key]: e.target.value})} onClick={e => e.stopPropagation()} style={{ width: '100%', padding: '4px 6px', border: '1px solid var(--border-color-medium)', borderRadius: '4px', fontSize: '0.8rem', boxSizing: 'border-box' }}/></td>);
                })}
              </tr>
            </thead>
            <tbody>
              {individusToShow.map(ind => (
                <tr key={ind.id || ind.numero_unique} style={{ borderBottom: '1px solid var(--border-color-light)' }}>
                  <td style={{ width: columnWidths.actions, minWidth: columnWidths.actions, textAlign: 'center', padding: '12px 8px', verticalAlign: 'middle', boxSizing: 'border-box' }}><button onClick={() => setSelectedIndividuId(ind.id)} className="btn-tertiary btn-icon" title="Éditer l'individu" style={{ padding: '4px 8px' }}><EditIcon /></button></td>
                  <td data-label="N° Individu" style={{ width: columnWidths.numero_unique, minWidth: columnWidths.numero_unique, padding: '12px 8px', verticalAlign: 'middle', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ind.numero_unique || ind.id}</td>
                  <td data-label="En charge" style={{ width: columnWidths.en_charge, minWidth: columnWidths.en_charge, padding: '12px 8px', verticalAlign: 'middle', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getUserNameForDisplay(ind.en_charge, ind)}</td>
                  {colonnesAffichees.map(key => {
                    const champConfig = champsDisponibles.find(c => c.key === key);
                    if (!champConfig) return null; // Correction: Ne pas rendre la cellule si le champConfig n'existe pas

                    const champsSupp = ind.champs_supplementaires || {};
                    const value = champsSupp[key];
                    let displayValue = '';
                    const currentWidth = columnWidths[key] || '130px';

                    if (champConfig.type === 'boolean') {
                      displayValue = value ? 'Oui' : 'Non';
                    } else if (champConfig.type === 'date' || value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
                      displayValue = formatDateToDDMMYYYY(value);
                    } else {
                      displayValue = value === null || value === undefined ? '' : String(value);
                    }
                    const champLabel = champConfig.label || key;
                    return (
                      <td key={key} data-label={champLabel} style={{ width: currentWidth, minWidth: currentWidth, padding: '12px 8px', verticalAlign: 'middle', boxSizing: 'border-box', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}} title={String(value)}>{displayValue}</td>
                    );
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
          <span style={{ color: 'var(--text-color-secondary)', fontSize: '0.875rem'}}>Page {currentPage} sur {totalPages} (Total: {filteredIndividus.length})</span>
          <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="btn-tertiary">Suivant</button>
        </div>
      )}
      {showAddForm && (<div className="modal-overlay"><NouvelIndividu user={user} onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} /></div>)}
      {selectedIndividuId && (
        <div className="modal-overlay">
          <IndividuFiche
            individuId={selectedIndividuId}
            onClose={() => setSelectedIndividuId(null)}
            onUpdate={handleEditSuccess}
            user={user}
          />
        </div>
      )}
    </div>
  );
}
