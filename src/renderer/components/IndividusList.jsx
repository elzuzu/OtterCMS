import React, { useEffect, useState, useMemo, useCallback } from 'react';
// Utilisation de la fiche d'individu standard
import IndividuFiche from './IndividuFiche';
import NouvelIndividu from './NouvelIndividu';
import { formatDateToDDMMYYYY } from '../utils/date';
import { EditIcon, TrashIcon } from './common/Icons';
import DattaDataTable from './common/DattaDataTable';
import DattaPageTitle from './common/DattaPageTitle';
import DattaButton from './common/DattaButton';
import DattaCard from './common/DattaCard';
import DattaModal from './common/DattaModal';
import { evaluateDynamicField } from '../utils/dynamic';

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
      return <span className="text-muted fst-italic">Non assigné</span>;
    }
    return getUserName(userId, ind);
  }, [getUserName]);

  const tableColumns = useMemo(() => {
    const cols = [
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        filterable: false,
        thStyle: { textAlign: 'center', width: columnWidths.actions },
        tdStyle: { textAlign: 'center', width: columnWidths.actions },
        render: ind => (
          <>
            <DattaButton
              variant="light-primary"
              size="sm"
              className="me-1"
              onClick={() => setSelectedIndividuId(ind.id)}
              title="Modifier"
              icon="feather icon-edit"
            />
            <DattaButton
              variant="light-danger"
              size="sm"
              onClick={() => handleDeleteIndividu(ind.id)}
              title="Supprimer"
              icon="feather icon-trash-2"
            />
          </>
        ),
      },
      {
        key: 'numero_unique',
        header: 'N° Individu',
        sortable: true,
        filterable: true,
        render: ind => ind.numero_unique || ind.id,
      },
      {
        key: 'en_charge',
        header: 'En charge',
        sortable: true,
        filterable: true,
        render: ind => getUserNameForDisplay(ind.en_charge, ind),
      },
    ];
    colonnesAffichees.forEach(key => {
      const champ = champsDisponibles.find(c => c.key === key);
      if (!champ) return;
      cols.push({
        key,
        header: champ.label,
        sortable: true,
        filterable: true,
        render: ind => {
          const value = (ind.champs_supplementaires || {})[key];
          if (champ.type === 'boolean') return value ? 'Oui' : 'Non';
          if (champ.type === 'date' || value instanceof Date || (typeof value === 'string' && !isNaN(Date.parse(value)))) {
            return formatDateToDDMMYYYY(value);
          }
          return value === null || value === undefined ? '' : String(value);
        },
      });
    });
    return cols;
  }, [colonnesAffichees, champsDisponibles, getUserNameForDisplay]);

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
        const liste = Array.isArray(indResponse.data) ? indResponse.data : [];
        const allCats = catResponse && catResponse.success ? catResponse.data : [];
        liste.forEach(ind => {
          const valeurs = { ...ind.champs_supplementaires, numero_unique: ind.numero_unique, en_charge: ind.en_charge };
          allCats.forEach(cat => {
            (cat.champs || []).forEach(ch => {
              if (ch.type === 'dynamic' && ch.formule) {
                valeurs[ch.key] = evaluateDynamicField(ch.formule, valeurs);
              }
            });
          });
          ind.champs_supplementaires = valeurs;
        });
        setIndividus(liste);
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
  }, [user, currentUserId, viewMode]); // colonnesAffichees.length removed

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

  const handleDeleteIndividu = useCallback(async (id) => {
    if (!window.confirm('Supprimer cet individu ?')) return;
    try {
      const result = await window.api.deleteIndividu({ id, userId: currentUserId });
      if (result.success) {
        loadData();
      } else {
        alert(result.error || 'Erreur lors de la suppression');
      }
    } catch (err) {
      alert(err.message);
    }
  }, [currentUserId, loadData]);
  
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
    return (
      <div className="pc-content">
        <DattaPageTitle title="Gestion des individus" />
        <div className="card">
          <div className="card-body">
            <div className="loading-message">Chargement des données initiales...</div>
          </div>
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="pc-content">
        <DattaPageTitle title="Gestion des individus" />
        <div className="card">
          <div className="card-body">
            <div className="error-message">
              {error}
              <DattaButton variant="secondary" onClick={loadData} className="mt-2">
                Réessayer de charger
              </DattaButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div key={`list-container-${renderKey}`} className="pc-content">
      <DattaPageTitle title="Gestion des individus" />
      <DattaCard
        title="Liste des individus"
        actions={
          <DattaButton variant="primary" size="sm" icon="feather icon-plus" onClick={handleAddIndividu}>
            Ajouter un individu
          </DattaButton>
        }
      >
        <div className="mb-3 text-muted small">
          <strong>Mode d'affichage:</strong> {viewMode === 'mine' ? 'Mes individus' : 'Tous les individus'} |
          <strong className="ms-1">Individus affichés:</strong> {filteredIndividus.length}
        </div>
        <div className="row g-2 align-items-end mb-3">
          <div className="col-auto">
            <DattaButton
              variant={viewMode === 'all' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleViewChange('all')}
              className="me-1"
            >
              Tous les individus
            </DattaButton>
            <DattaButton
              variant={viewMode === 'mine' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleViewChange('mine')}
            >
              Mes individus
            </DattaButton>
          </div>
          <div className="col-md-4 ms-auto">
            <div className="input-group">
              <span className="input-group-text">
                <i className="feather icon-search"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Rechercher..."
                value={filtre}
                onChange={e => setFiltre(e.target.value)}
              />
            </div>
          </div>
          <div className="col-auto">
            <DattaButton variant="secondary" size="sm" onClick={handleConfigColonnes}>
              {showColonnesPicker ? 'Masquer le sélecteur' : 'Configurer les colonnes'}
            </DattaButton>
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
                  {champ.label} <small className="text-muted">({champ.categorieNom})</small>
                </label>
              </div>
            ))}
            {champsDisponibles.length === 0 && <p className="text-muted fst-italic">Aucun champ supplémentaire configurable n'est défini.</p>}
          </div>
        </div>
      )}
      {loading && <div className="loading-message mt-2">Mise à jour des données...</div>}
      {!loading && filteredIndividus.length === 0 && (
        <div className="no-data-message mt-4 text-center">
          <p>{filtre || Object.keys(columnFilters).some(k => columnFilters[k]) || viewMode === 'mine' ? "Aucun individu ne correspond à vos critères." : "Aucun individu enregistré."}</p>
          {viewMode === 'mine' && individus.length > 0 && (
            <div className="mt-4">
              <p className="text-muted mb-2">
                Vous n'avez aucun individu assigné. {individus.length} au total.
              </p>
              <DattaButton variant="secondary" size="sm" onClick={() => handleViewChange('all')}>
                Voir tous
              </DattaButton>
            </div>
          )}
        </div>
      )}
      {!loading && filteredIndividus.length > 0 && (
        <DattaDataTable
          data={filteredIndividus}
          columns={tableColumns}
          getRowKey={ind => ind.id || ind.numero_unique}
          sortConfig={sortConfig}
          onSort={handleSort}
          columnFilters={columnFilters}
          onColumnFilterChange={setColumnFilters}
          page={currentPage - 1}
          rowsPerPage={ITEMS_PER_PAGE}
          onPageChange={(e, p) => setCurrentPage(p + 1)}
        />
      )}
      {showAddForm && (
        <DattaModal open onClose={() => setShowAddForm(false)} title="Nouvel individu" size="lg" scrollable>
          <NouvelIndividu user={user} onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} />
        </DattaModal>
      )}
      {selectedIndividuId && (
        <DattaModal open onClose={() => setSelectedIndividuId(null)} title="Fiche individu" size="lg" scrollable>
          <IndividuFiche
            individuId={selectedIndividuId}
            onClose={() => setSelectedIndividuId(null)}
            onUpdate={handleEditSuccess}
            user={user}
          />
        </DattaModal>
      )}
      </DattaCard>
    </div>
  );
}
