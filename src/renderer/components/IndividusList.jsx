import React, { useEffect, useState, useMemo, useCallback } from 'react';
// Utilisation de la fiche d'individu standard
import IndividuFicheDetails from './IndividuFicheDetails';
import NouvelIndividu from './NouvelIndividu';
import { formatDateToDDMMYYYY } from '../utils/date';
import { EditIcon, TrashIcon } from './common/Icons';
import DattaNetworkDataTable from './common/DattaNetworkDataTable';
import DattaPageTitle from './common/DattaPageTitle';
import DattaButton from './common/DattaButton';
import DattaCard from './common/DattaCard';
import DattaModal from './common/DattaModal';
import { evaluateDynamicField } from '../utils/dynamic';
import { DattaTextField } from './common/DattaForm';
import DattaCheckbox from './common/DattaCheckbox';
import { useSync } from '../hooks/useSync';

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
  const [renderKey, setRenderKey] = useState(0);
  
  const { syncState, performSync } = useSync();
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
        render: ind => ind.en_charge ? (
          <span className="badge bg-success">
            <i className="feather icon-user me-1"></i>
            {getUserName(ind.en_charge, ind)}
          </span>
        ) : (
          <span className="badge bg-warning">
            <i className="feather icon-user-x me-1"></i>
            Non assigné
          </span>
        ),
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
  }, [individus, viewMode, currentUserId, filtre, sortConfig, loading, getUserName]);
  

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
    try {
      const [individusResult, usersResult] = await Promise.all([
        window.api.getIndividus(),
        window.api.getUsers()
      ]);

      if (individusResult.success) {
        setIndividus(individusResult.data || []);
      } else {
        throw new Error(individusResult.error || 'Erreur lors du chargement des individus');
      }

      if (usersResult.success) {
        setUsers(usersResult.data || []);
      } else {
        throw new Error(usersResult.error || 'Erreur lors du chargement des utilisateurs');
      }

      // Synchroniser les données après le chargement
      await performSync();
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      throw error;
    }
  }, [performSync]);

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
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="d-flex align-items-center p-3 bg-light-primary rounded">
              <div className="avtar avtar-s bg-primary me-3">
                <i className="feather icon-database"></i>
              </div>
              <div>
                <h6 className="mb-0">Total</h6>
                <p className="mb-0 text-primary fw-bold">{individus.length}</p>
              </div>
            </div>
          </div>
        </div>
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
            <DattaTextField
              placeholder="Rechercher..."
              value={filtre}
              onChange={e => setFiltre(e.target.value)}
            />
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
                <DattaCheckbox
                  id={`col-${champ.key}`}
                  label={<span>{champ.label} <small className="text-muted">({champ.categorieNom})</small></span>}
                  checked={colonnesAffichees.includes(champ.key)}
                  onChange={() => handleToggleColonne(champ.key)}
                />
              </div>
            ))}
            {champsDisponibles.length === 0 && <p className="text-muted fst-italic">Aucun champ supplémentaire configurable n'est défini.</p>}
          </div>
        </div>
      )}
      {loading && <div className="loading-message mt-2">Mise à jour des données...</div>}
      {!loading && filteredIndividus.length === 0 && (
        <div className="no-data-message mt-4 text-center">
          <p>{filtre || viewMode === 'mine' ? "Aucun individu ne correspond à vos critères." : "Aucun individu enregistré."}</p>
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
        <DattaNetworkDataTable
          data={filteredIndividus}
          columns={tableColumns}
          loading={loading}
          error={error}
          onLoadData={loadData}
          refreshInterval={30000}
          maxRetries={3}
          pagination={{
            currentPage,
            itemsPerPage: ITEMS_PER_PAGE,
            totalItems: filteredIndividus.length,
            onPageChange: setCurrentPage
          }}
          sorting={{
            sortConfig,
            onSort: handleSort
          }}
        />
      )}
      {showAddForm && (
        <DattaModal open onClose={() => setShowAddForm(false)} title="Nouvel individu" size="lg" scrollable>
          <NouvelIndividu user={user} onClose={() => setShowAddForm(false)} onSuccess={handleAddSuccess} />
        </DattaModal>
      )}
      {selectedIndividuId && (
        <DattaModal open onClose={() => setSelectedIndividuId(null)} title="Fiche individu" size="xl" scrollable>
          <IndividuFicheDetails
            individuId={selectedIndividuId}
            onClose={() => setSelectedIndividuId(null)}
          />
        </DattaModal>
      )}
      </DattaCard>
    </div>
  );
}
