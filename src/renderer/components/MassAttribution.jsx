import React, { useState, useEffect } from 'react';
import DattaStepper, { Step, StepLabel } from './common/DattaStepper';
import DattaAlert from './common/DattaAlert';
import DattaButton from './common/DattaButton';

export default function MassAttribution({ user }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [step, setStep] = useState(1);

  const [allUsers, setAllUsers] = useState([]); // Renamed from 'users' to avoid conflict
  const [categories, setCategories] = useState([]);
  const [champsDisponibles, setChampsDisponibles] = useState([]);
  const [individus, setIndividus] = useState([]);
  const [filteredIndividus, setFilteredIndividus] = useState([]);


  const [fieldFilters, setFieldFilters] = useState([]);
  const [filterMode, setFilterMode] = useState('all');

  const [selectedIndividus, setSelectedIndividus] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // State for percentage-based distribution
  const [distributionList, setDistributionList] = useState([]); // [{ userId: '', username: '', percentage: '' }]
  const [currentUserToAdd, setCurrentUserToAdd] = useState('');
  const [currentPercentage, setCurrentPercentage] = useState('');


  const [stats, setStats] = useState({
    total: 0,
    nonAssignes: 0,
    assignes: 0,
    parUtilisateur: {},
    selected: 0
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    setMessage('');
    try {
      const usersResult = await window.api.getUsers();
      if (usersResult && usersResult.success) {
        const sortedUsers = [...usersResult.data].sort((a, b) =>
          a.username.localeCompare(b.username)
        );
        setAllUsers(sortedUsers);
      } else {
        throw new Error('Erreur lors du chargement des utilisateurs');
      }

      const categoriesResult = await window.api.getCategories();
      if (categoriesResult && categoriesResult.success) {
        const sortedCategories = [...categoriesResult.data].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
        setCategories(sortedCategories);
        const allFields = [];
        sortedCategories.forEach(cat => {
          if (cat.champs && Array.isArray(cat.champs)) {
            const sortedFields = [...cat.champs].sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
            sortedFields.forEach(champ => {
              if (champ.visible) {
                allFields.push({
                  ...champ,
                  categorieNom: cat.nom,
                  categorieId: cat.id
                });
              }
            });
          }
        });
        setChampsDisponibles(allFields);
        // champsDisponibles already contains category information for field filters
      } else {
        throw new Error('Erreur lors du chargement des catégories');
      }
      await loadIndividus();
    } catch (error) {
      setMessage(`Erreur d'initialisation: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };


  const loadIndividus = async () => {
    setLoading(true);
    setMessage('');
    try {
      const userIdParam = user.id || user.userId;
      const roleParam = user.role;
      const result = await window.api.getIndividus(userIdParam, roleParam);
      if (result && result.success) {
        const allIndividusData = Array.isArray(result.data) ? result.data : [];
        setIndividus(allIndividusData);
        const nonAssignesCount = allIndividusData.filter(ind => !ind.en_charge).length;
        const assignesCount = allIndividusData.length - nonAssignesCount;
        const statsParUtilisateur = {};
        allIndividusData.forEach(ind => {
          if (ind.en_charge) {
            statsParUtilisateur[ind.en_charge] = (statsParUtilisateur[ind.en_charge] || 0) + 1;
          }
        });
        setStats({
          total: allIndividusData.length,
          nonAssignes: nonAssignesCount,
          assignes: assignesCount,
          parUtilisateur: statsParUtilisateur,
          selected: 0
        });
        applyAllFilters(allIndividusData);
      } else {
        throw new Error('Erreur lors du chargement des individus');
      }
    } catch (error) {
      setMessage(`Erreur: ${error.message}`);
      setFilteredIndividus([]);
    } finally {
      setLoading(false);
    }
  };

  const applyAllFilters = (individusList) => {
    if (!Array.isArray(individusList) || individusList.length === 0) {
      setFilteredIndividus([]);
      return;
    }
    let filtered = [...individusList];
    if (fieldFilters.length > 0) {
      filtered = filtered.filter(ind => {
        if (filterMode === 'all') {
          return fieldFilters.every(filter => evaluateFieldFilter(ind, filter));
        }
        return fieldFilters.some(filter => evaluateFieldFilter(ind, filter));
      });
    }
    setFilteredIndividus(filtered);
    setStats(prev => ({ ...prev, selected: 0 }));
    setSelectedIndividus([]);
    setSelectAll(false);
  };

  const evaluateFieldFilter = (individu, filter) => {
    const fieldValue = individu.champs_supplementaires?.[filter.field.key];
    switch (filter.operator) {
      case 'equals': return String(fieldValue) === String(filter.value);
      case 'notEquals': return String(fieldValue) !== String(filter.value);
      case 'contains': return String(fieldValue || '').toLowerCase().includes(String(filter.value).toLowerCase());
      case 'startsWith': return String(fieldValue || '').toLowerCase().startsWith(String(filter.value).toLowerCase());
      case 'endsWith': return String(fieldValue || '').toLowerCase().endsWith(String(filter.value).toLowerCase());
      case 'greaterThan': return Number(fieldValue) > Number(filter.value);
      case 'lessThan': return Number(fieldValue) < Number(filter.value);
      case 'empty': return !fieldValue || fieldValue === '';
      case 'notEmpty': return !!fieldValue && fieldValue !== '';
      default: return true;
    }
  };


  const addFieldFilter = (filter) => {
    setFieldFilters(prev => [...prev, filter]);
    applyAllFilters(individus);
  };

  const removeFieldFilter = (index) => {
    setFieldFilters(prev => prev.filter((_, idx) => idx !== index));
    applyAllFilters(individus);
  };

  const FieldFilterCreator = () => {
    const [selectedFieldKey, setSelectedFieldKey] = useState('');
    const [selectedOperator, setSelectedOperator] = useState('equals');
    const [filterValue, setFilterValue] = useState('');
    const field = champsDisponibles.find(c => c.key === selectedFieldKey);

    const getOperators = () => {
      if (!field) return [];
      const baseOperators = [
        { value: 'equals', label: 'Est égal à' }, { value: 'notEquals', label: 'N\'est pas égal à' },
        { value: 'empty', label: 'Est vide' }, { value: 'notEmpty', label: 'N\'est pas vide' }
      ];
      switch (field.type) {
        case 'text': return [...baseOperators, { value: 'contains', label: 'Contient' }, { value: 'startsWith', label: 'Commence par' }, { value: 'endsWith', label: 'Se termine par' }];
        case 'number': return [...baseOperators, { value: 'greaterThan', label: 'Supérieur à' }, { value: 'lessThan', label: 'Inférieur à' }];
        case 'date': return [...baseOperators, { value: 'greaterThan', label: 'Après le' }, { value: 'lessThan', label: 'Avant le' }];
        case 'checkbox': return [{ value: 'equals', label: 'Est coché' }, { value: 'notEquals', label: 'N\'est pas coché' }];
        case 'list': return baseOperators;
        default: return baseOperators;
      }
    };
    const operators = getOperators();
    const needsValue = () => !['empty', 'notEmpty'].includes(selectedOperator);

    const handleAddCurrentFilter = () => {
      if (!selectedFieldKey || !field) return;
      if (needsValue() && !filterValue && field.type !== 'checkbox') { // Checkbox can have 'false' as value
          setMessage('Veuillez entrer une valeur pour le filtre.');
          return;
      }
       let valToStore = filterValue;
        if (field.type === 'checkbox') {
            valToStore = filterValue === 'true';
        }


      addFieldFilter({ field, operator: selectedOperator, value: valToStore });
      setSelectedFieldKey(''); setSelectedOperator('equals'); setFilterValue(''); setMessage('');
    };

    return (
      <div className="field-filter-creator">
        <h4>Ajouter un filtre de champ</h4>
        <div className="filter-form">
          <div className="filter-field-select">
            <label>Champ:</label>
            <select value={selectedFieldKey} onChange={e => { setSelectedFieldKey(e.target.value); setSelectedOperator('equals'); setFilterValue(''); }} className="select-stylish">
              <option value="">Sélectionner un champ</option>
              {categories.map(cat => (
                <optgroup key={cat.id} label={cat.nom}>
                  {cat.champs?.filter(champ => champ.visible).sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                    .map(champ => <option key={champ.key} value={champ.key}>{champ.label}</option>)}
                </optgroup>
              ))}
            </select>
          </div>
          {selectedFieldKey && (<>
            <div className="filter-operator-select">
              <label>Opérateur:</label>
              <select value={selectedOperator} onChange={e => { setSelectedOperator(e.target.value); if (!needsValue()) setFilterValue(''); }} className="select-stylish">
                {operators.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
              </select>
            </div>
            {needsValue() && (
              <div className="filter-value-input">
                <label>Valeur:</label>
                {field?.type === 'checkbox' ? (
                  <select value={String(filterValue)} onChange={e => setFilterValue(e.target.value)} className="select-stylish">
                    <option value="true">Oui (coché)</option> <option value="false">Non (décoché)</option>
                  </select>
                ) : field?.type === 'list' && field.options?.length > 0 ? (
                  <select value={filterValue} onChange={e => setFilterValue(e.target.value)} className="select-stylish">
                    <option value="">Sélectionner...</option>
                    {field.options.map((opt, idx) => <option key={idx} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'} value={filterValue} onChange={e => setFilterValue(e.target.value)} placeholder={`Valeur pour ${field?.label || 'le champ'}`} />
                )}
              </div>
            )}
          </>)}
          <DattaButton
            type="button"
            variant="primary"
            size="sm"
            onClick={handleAddCurrentFilter}
            className="btn-add-filter"
            disabled={!selectedFieldKey || (needsValue() && filterValue === '' && field?.type !== 'checkbox')}
          >
            Ajouter ce filtre
          </DattaButton>
        </div>
      </div>
    );
  };

  const toggleIndividuSelection = (individuId) => {
    let newSelected;
    if (selectedIndividus.includes(individuId)) {
      newSelected = selectedIndividus.filter(id => id !== individuId);
    } else {
      newSelected = [...selectedIndividus, individuId];
    }
    setSelectedIndividus(newSelected);
    setStats(prev => ({ ...prev, selected: newSelected.length }));
    setSelectAll(newSelected.length === filteredIndividus.length && filteredIndividus.length > 0);
  };

  const toggleSelectAll = () => {
    if (selectAll) {
      setSelectedIndividus([]);
      setStats(prev => ({ ...prev, selected: 0 }));
    } else {
      const allIds = filteredIndividus.map(ind => ind.id);
      setSelectedIndividus(allIds);
      setStats(prev => ({ ...prev, selected: allIds.length }));
    }
    setSelectAll(!selectAll);
  };

  const handleAddUserToDistribution = () => {
    if (!currentUserToAdd || !currentPercentage) {
      setMessage("Veuillez sélectionner un utilisateur et entrer un pourcentage.");
      return;
    }
    const percentageNum = parseFloat(currentPercentage);
    if (isNaN(percentageNum) || percentageNum <= 0 || percentageNum > 100) {
      setMessage("Le pourcentage doit être un nombre entre 1 et 100.");
      return;
    }
    if (distributionList.find(item => item.userId === currentUserToAdd)) {
      setMessage("Cet utilisateur est déjà dans la liste de distribution.");
      return;
    }
    const userObj = allUsers.find(u => u.id === Number(currentUserToAdd));
    setDistributionList([...distributionList, { userId: currentUserToAdd, username: userObj?.username || `Utilisateur ${currentUserToAdd}`, percentage: percentageNum }]);
    setCurrentUserToAdd('');
    setCurrentPercentage('');
    setMessage('');
  };

  const handleRemoveUserFromDistribution = (userIdToRemove) => {
    setDistributionList(distributionList.filter(item => item.userId !== userIdToRemove));
  };

  const handleDistributionPercentageChange = (userId, newPercentage) => {
    const percentageNum = parseFloat(newPercentage);
    if (isNaN(percentageNum) && newPercentage !== '') { // Allow empty string for typing
        setMessage("Le pourcentage doit être un nombre.");
        return;
    }
     if (newPercentage !== '' && (percentageNum < 0 || percentageNum > 100)) {
        setMessage("Le pourcentage doit être entre 0 et 100.");
        return;
    }
    setMessage('');
    setDistributionList(distributionList.map(item =>
      item.userId === userId ? { ...item, percentage: newPercentage === '' ? '' : percentageNum } : item
    ));
  };
  
  const getTotalPercentage = () => {
    return distributionList.reduce((sum, item) => sum + (parseFloat(item.percentage) || 0), 0);
  };


  const executeAttribution = async () => {
    if (selectedIndividus.length === 0) {
      setMessage('Veuillez sélectionner au moins un individu.');
      return;
    }
    if (distributionList.length === 0) {
        setMessage("Veuillez ajouter au moins un utilisateur à la liste de distribution avec un pourcentage.");
        return;
    }
    const totalPercentage = getTotalPercentage();
    if (totalPercentage === 0 && distributionList.some(d => parseFloat(d.percentage) > 0)) {
        setMessage("Au moins un utilisateur doit avoir un pourcentage supérieur à 0 si des utilisateurs sont dans la liste.");
        return;
    }
     if (totalPercentage > 100) {
        setMessage(`Le total des pourcentages (${totalPercentage}%) ne peut pas dépasser 100%.`);
        return;
    }
     if (distributionList.some(d => d.percentage === '' || isNaN(parseFloat(d.percentage)) || parseFloat(d.percentage) < 0)) {
        setMessage("Tous les utilisateurs dans la distribution doivent avoir un pourcentage valide (0-100).");
        return;
    }


    setLoading(true);
    setMessage('');
    try {
      const params = {
        individuIds: selectedIndividus,
        managerUserId: user.id || user.userId, // User performing the action
        distribution: distributionList.map(d => ({ userId: Number(d.userId), percentage: parseFloat(d.percentage) }))
      };
      const result = await window.api.attribuerIndividusEnMasse(params); // Ensure this API endpoint can handle the new params
      if (result && result.success) {
        setMessage(`Attribution réussie ! ${result.updatedCount || selectedIndividus.length} affectations mises à jour.`);
        setStep(3);
      } else {
        throw new Error(result?.error || 'Erreur lors de l\'attribution');
      }
    } catch (error) {
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getUserName = (userId) => {
    if (!userId) return 'Non assigné';
    const foundUser = allUsers.find(u => u.id === Number(userId));
    return foundUser ? foundUser.username : `Utilisateur #${userId}`;
  };

  const handleStartSelection = () => { setStep(1); loadIndividus(); };
  const handleProceedToAttribution = () => {
    if (selectedIndividus.length === 0) { setMessage('Veuillez sélectionner au moins un individu.'); return; }
    setDistributionList([]); // Reset distribution list when proceeding
    setCurrentUserToAdd('');
    setCurrentPercentage('');
    setStep(2);
  };
  const handleReset = () => {
    setStep(1); setSelectedIndividus([]); setSelectAll(false);
    setDistributionList([]); setCurrentUserToAdd(''); setCurrentPercentage('');
    loadIndividus(); // Reloads individuals and re-applies filters
  };
  const resetAllFilters = () => {
    setFieldFilters([]);
    applyAllFilters(individus);
  };

  return (
    <div className="pc-content">
      <div className="page-header">
        <h2 className="page-title">Attribution de masse</h2>
      </div>
      <div className="card mass-attribution-wizard">
        <div className="card-body">
      {message && (
        <DattaAlert type={message.includes('réussie') || message.includes('succès') ? 'success' : 'error'}>
          {message}
        </DattaAlert>
      )}
      <DattaStepper activeStep={step - 1}>
        {['Sélection des individus', "Définir l'attribution", 'Confirmation'].map((label, idx) => (
          <Step key={idx} disabled={(idx === 1 && step < 2) || (idx === 2 && step < 3)}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </DattaStepper>
      <div className="wizard-content">
        {step === 1 && (
          <div className="wizard-panel">
            <div className="filters-panel">
              <div className="filters-header">
                <h3>Filtres</h3>
                <DattaButton variant="secondary" size="sm" onClick={resetAllFilters} className="btn-reset-filters">Réinitialiser</DattaButton>
              </div>
              <div className="filter-mode-selector"><label>Opérateur de combinaison des filtres de champs:</label><div className="filter-mode-options">
                <label><input type="radio" name="filterMode" value="all" checked={filterMode === 'all'} onChange={() => { setFilterMode('all'); applyAllFilters(individus); }} />ET</label>
                <label><input type="radio" name="filterMode" value="any" checked={filterMode === 'any'} onChange={() => { setFilterMode('any'); applyAllFilters(individus); }} />OU</label>
              </div></div>
              <FieldFilterCreator />
              {fieldFilters.length > 0 && <div className="active-field-filters"><h4>Filtres de champs actifs</h4><ul>
                {fieldFilters.map((filter, index) => <li key={index} className="field-filter-item">
                  <span className="field-filter-info"><strong>{filter.field.label}</strong> {filter.operator === 'equals' ? 'est égal à' : filter.operator === 'notEquals' ? 'n\'est pas égal à' : filter.operator === 'contains' ? 'contient' : filter.operator === 'startsWith' ? 'commence par' : filter.operator === 'endsWith' ? 'se termine par' : filter.operator === 'greaterThan' ? 'est supérieur à' : filter.operator === 'lessThan' ? 'est inférieur à' : filter.operator === 'empty' ? 'est vide' : filter.operator === 'notEmpty' ? 'n\'est pas vide' : filter.operator} {!['empty', 'notEmpty'].includes(filter.operator) && <span className="filter-value">"{filter.value === true ? 'Oui' : filter.value === false ? 'Non' : filter.value}"</span>}</span>
                  <DattaButton
                    variant="danger"
                    size="sm"
                    onClick={() => removeFieldFilter(index)}
                    className="btn-remove-filter"
                    title="Supprimer"
                  >
                    ×
                  </DattaButton>
                </li>)}
              </ul></div>}
            </div>
            <div className="selection-panel">
              <div className="stats-panel">
                <div className="stats-item"><span className="stats-label">Total:</span><span className="stats-value">{stats.total}</span></div>
                <div className="stats-item"><span className="stats-label">Non assignés:</span><span className="stats-value">{stats.nonAssignes}</span></div>
                <div className="stats-item"><span className="stats-label">Assignés:</span><span className="stats-value">{stats.assignes}</span></div>
                <div className="stats-item highlight"><span className="stats-label">Filtrés:</span><span className="stats-value">{filteredIndividus.length}</span></div>
                <div className="stats-item highlight primary"><span className="stats-label">Sélectionnés:</span><span className="stats-value">{selectedIndividus.length}</span></div>
              </div>
              <div className="individus-selection">
                <div className="table-header"><label className="select-all"><input type="checkbox" checked={selectAll} onChange={toggleSelectAll} disabled={filteredIndividus.length === 0} />Tout sélectionner ({filteredIndividus.length})</label></div>
                {loading ? (
                  <div className="loading">Chargement des individus...</div>
                ) : filteredIndividus.length === 0 ? (
                  <div className="no-results">
                    <p>Aucun individu ne correspond.</p>
                    <DattaButton variant="secondary" size="sm" onClick={resetAllFilters} className="btn-reset-filters">Réinitialiser les filtres</DattaButton>
                  </div>
                ) : (
                  <div className="individus-table-container table-responsive"><table className="individus-table data-table">
                  <thead><tr><th style={{ width: '40px' }}></th><th>N° Individu</th><th>En charge</th>{fieldFilters.map((filter, idx) => <th key={idx}>{filter.field.label}</th>)}</tr></thead>
                  <tbody>{filteredIndividus.map(individu => <tr key={individu.id} className={selectedIndividus.includes(individu.id) ? 'selected-row' : ''}>
                    <td><input type="checkbox" checked={selectedIndividus.includes(individu.id)} onChange={() => toggleIndividuSelection(individu.id)} /></td>
                    <td>{individu.numero_unique || individu.id}</td><td className={!individu.en_charge ? 'unassigned' : ''}>{getUserName(individu.en_charge)}</td>
                    {fieldFilters.map((filter, idx) => { const value = individu.champs_supplementaires?.[filter.field.key]; let displayValue = ''; if (typeof value === 'boolean') { displayValue = value ? 'Oui' : 'Non'; } else { displayValue = value || ''; } return <td key={idx}>{displayValue}</td>; })}
                  </tr>)}</tbody>
                </table></div>)}
              </div>
              <div className="wizard-actions">
                <DattaButton variant="primary" onClick={handleProceedToAttribution} disabled={selectedIndividus.length === 0}>
                  Continuer ({selectedIndividus.length} sélectionnés)
                </DattaButton>
              </div>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="wizard-panel" style={{flexDirection: 'column'}}>
            <h3>Définir la distribution pour {selectedIndividus.length} individu(s)</h3>
            <div className="attribution-form-distribution">
                <div className="mb-3 add-user-to-distribution-form">
                    <label htmlFor="userToAddToDistribution">Utilisateur à ajouter :</label>
                    <select id="userToAddToDistribution" value={currentUserToAdd} onChange={e => setCurrentUserToAdd(e.target.value)} className="select-stylish">
                        <option value="">-- Sélectionner un utilisateur --</option>
                        {allUsers.filter(u => !distributionList.find(d => d.userId === String(u.id))).map(u => (
                            <option key={u.id} value={String(u.id)}>{u.username}</option>
                        ))}
                    </select>
                    <label htmlFor="percentageForUser" style={{marginTop: '10px'}}>Pourcentage d'activité/capacité :</label>
                    <input id="percentageForUser" type="number" value={currentPercentage} onChange={e => setCurrentPercentage(e.target.value)} placeholder="Ex: 50" min="0" max="100" style={{width: '100px', marginLeft:'10px', marginRight:'10px'}}/> %
                    <DattaButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAddUserToDistribution}
                      style={{ marginLeft: '10px' }}
                    >
                      Ajouter à la distribution
                    </DattaButton>
                </div>

                {distributionList.length > 0 && (
                    <div className="distribution-list-section">
                        <h4>Utilisateurs pour cette attribution :</h4>
                        <div className="table-responsive">
                        <table className="simple-table" style={{width: '100%', marginTop:'10px'}}>
                            <thead>
                                <tr>
                                    <th>Utilisateur</th>
                                    <th>Pourcentage (%)</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {distributionList.map(item => (
                                    <tr key={item.userId}>
                                        <td>{item.username}</td>
                                        <td>
                                            <input 
                                                type="number" 
                                                value={item.percentage} 
                                                onChange={e => handleDistributionPercentageChange(item.userId, e.target.value)}
                                                min="0" max="100"
                                                style={{width: '80px'}}
                                            />
                                        </td>
                                        <td>
                                            <DattaButton
                                              type="button"
                                              variant="danger"
                                              size="sm"
                                              onClick={() => handleRemoveUserFromDistribution(item.userId)}
                                            >
                                              Retirer
                                            </DattaButton>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        </div>
                        <p style={{marginTop: '10px', fontWeight:'bold'}}>Total pourcentage alloué : {getTotalPercentage()}%</p>
                         {getTotalPercentage() > 100 && <p className="error-message">Attention: Le total des pourcentages dépasse 100%!</p>}
                         {getTotalPercentage() < 100 && getTotalPercentage() > 0 && distributionList.length > 0 && <p className="warning-message">Note: Le total des pourcentages est inférieur à 100%. Certains cas pourraient ne pas être distribués si le nombre d'individus est supérieur à la capacité totale définie.</p>}
                    </div>
                )}
            </div>
            <div className="wizard-actions">
              <DattaButton variant="secondary" onClick={() => setStep(1)}>Retour à la sélection</DattaButton>
              <DattaButton
                variant="primary"
                onClick={executeAttribution}
                disabled={loading || distributionList.length === 0 || distributionList.some(d=> d.percentage === '' || parseFloat(d.percentage) === 0 ) && getTotalPercentage() === 0  }
              >
                {loading ? 'Attribution en cours...' : 'Attribuer les individus'}
              </DattaButton>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="wizard-panel">
            <div className="confirmation">
              <h3>Attribution terminée</h3>
              <DattaAlert type="success">{message}</DattaAlert>
              <div className="confirmation-actions">
                <DattaButton variant="primary" onClick={handleReset}>Nouvelle attribution de masse</DattaButton>
              </div>
            </div>
          </div>
        )}
      </div>
        </div>
      </div>
    </div>
  );
}