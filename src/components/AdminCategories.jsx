import React, { useEffect, useState, useCallback, useRef } from 'react';

// Icon components (simple SVGs for +/-)
const PlusIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
  </svg>
);

const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
    <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
  </svg>
);

const EditIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm-4.208 6.086-7.071 7.072.707.707 7.072-7.071-3.182-3.182z"/>
    <path fillRule="evenodd" d="M1 13.5A1.5 1.5 0 0 0 2.5 15h11a1.5 1.5 0 0 0 1.5-1.5v-6a.5.5 0 0 0-1 0v6a.5.5 0 0 1-.5.5h-11a.5.5 0 0 1-.5-.5v-11a.5.5 0 0 1 .5-.5H9a.5.5 0 0 0 0-1H2.5A1.5 1.5 0 0 0 1 2.5v11z"/>
  </svg>
);

const UnhideIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
    <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.618-2.277A13.133 13.133 0 0 1 8 3.5c1.971 0 3.81.75 5.209 1.223A13.133 13.133 0 0 1 14.828 8c-.995 1.251-2.643 2.277-5.209 2.277A13.133 13.133 0 0 1 2.79 9.223 13.133 13.133 0 0 1 1.172 8z"/>
    <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z"/>
  </svg>
);

const HideIcon = () => (
 <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.359 11.238C15.06 9.72 16 8 16 8s-3-5.5-8-5.5a7.028 7.028 0 0 0-2.79.588l.77.771A5.944 5.944 0 0 1 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.134 13.134 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755-.165.165-.337.328-.517.486l.708.707z"/>
    <path d="M11.297 9.176a3.5 3.5 0 0 0-4.474-4.474l.823.823a2.5 2.5 0 0 1 2.829 2.829l.822.822zm-2.943 1.288.822.822a3.5 3.5 0 0 1-4.474-4.474l.823.823a2.5 2.5 0 0 0 2.829 2.829z"/>
    <path d="M3.35 5.47c-.18.16-.353.322-.518.487A13.134 13.134 0 0 0 1.172 8l.195.288c.335.48.83 1.12 1.465 1.755C4.121 11.332 5.881 12.5 8 12.5c.716 0 1.39-.133 2.02-.36l.77.772A7.029 7.029 0 0 1 8 13.5C3 13.5 0 8 0 8s.939-1.721 2.641-3.238l.708.707zm10.296 6.854-12-12 .708-.708 12 12-.708.708z"/>
  </svg>
);

const champTypes = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'history-number', label: 'Historique numérique' },
  { value: 'date', label: 'Date' },
  { value: 'list', label: 'Liste déroulante' }, // Libellé plus clair
  { value: 'checkbox', label: 'Case à cocher' }
];

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [categoriesMasquees, setCategoriesMasquees] = useState([]);
  const [nom, setNom] = useState('');
  const [ordreCategorie, setOrdreCategorie] = useState(0);
  const [champs, setChamps] = useState([]);
  const [editTemplate, setEditTemplate] = useState(null);
  
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true); // Mis à true initialement
  const [afficherMasquees, setAfficherMasquees] = useState(false);
  
  const messageTimeoutIdRef = useRef(null);
  const initialLoadRef = useRef(true);

  const setAndClearMessage = useCallback((newMessage) => {
    setMessage(newMessage);
    if (messageTimeoutIdRef.current) {
      clearTimeout(messageTimeoutIdRef.current);
    }
    messageTimeoutIdRef.current = setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, 7000);
  }, []);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.api.getCategories();
      if (result && result.success && Array.isArray(result.data)) {
        const actives = [];
        const masquees = [];
        const allCategories = result.data;
        const sortedData = allCategories
            .map(cat => ({ ...cat, isMasque: cat.deleted === 1 })) 
            .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));

        sortedData.forEach(cat => {
          if (cat.isMasque) {
            masquees.push(cat);
          } else {
            actives.push(cat);
          }
        });
        
        setCategories(actives);
        setCategoriesMasquees(masquees);
        
        // Afficher un message informatif seulement si aucune catégorie n'existe et que ce n'est pas le chargement initial
        if (allCategories.length === 0 && !initialLoadRef.current) { 
            setAndClearMessage({ text: 'Aucune catégorie trouvée. Commencez par en créer une.', type: 'info' });
        }
        initialLoadRef.current = false;
      } else {
        const errorMsg = result && result.error ? result.error : 'Format de réponse invalide ou échec du chargement.';
        setAndClearMessage({ text: `Erreur chargement catégories: ${errorMsg}`, type: 'error' });
        setCategories([]);
        setCategoriesMasquees([]);
      }
    } catch (error) {
      setAndClearMessage({ text: `Erreur critique lors du chargement: ${error.message}`, type: 'error' });
      setCategories([]);
      setCategoriesMasquees([]);
    } finally {
      setLoading(false);
    }
  }, [setAndClearMessage]); // Retrait de loading des dépendances pour éviter les boucles infinies

  useEffect(() => {
    loadCategories();
    return () => {
      if (messageTimeoutIdRef.current) {
        clearTimeout(messageTimeoutIdRef.current);
      }
    };
  }, [loadCategories]); // loadCategories est maintenant stable grâce au useCallback corrigé

  const resetForm = () => {
    setNom('');
    const allCurrentCategories = [...categories, ...categoriesMasquees];
    const maxOrder = allCurrentCategories.length > 0 ? Math.max(0, ...allCurrentCategories.map(c => c.ordre || 0)) : -10;
    setOrdreCategorie(maxOrder + 10);
    setChamps([]);
    setEditTemplate(null);
    setMessage({text: '', type: ''}); // Effacer les messages lors du reset
  };

  const ajouterChamp = () => {
    setChamps(prevChamps => [...prevChamps, {
      label: '',
      key: `champ_${Date.now()}_${prevChamps.length}`, // Clé unique temporaire
      type: 'text',
      obligatoire: false,
      visible: true,
      readonly: false,
      afficherEnTete: false, 
      options: [],
      maxLength: null, 
      ordre: prevChamps.length > 0 ? Math.max(0, ...prevChamps.map(c => c.ordre || 0)) + 10 : 0
    }]);
  };

  const updateChamp = (index, field, value) => {
    setChamps(prevChamps => 
      prevChamps.map((champ, i) => 
        i === index ? { ...champ, [field]: value } : champ
      )
    );
  };
  
  const updateChampOptions = (index, value) => {
    setChamps(prevChamps => 
      prevChamps.map((champ, i) => 
        i === index ? { ...champ, options: value.split(',').map(opt => opt.trim()).filter(opt => opt !== '') } : champ
      )
    );
  };

  const supprimerChamp = index => {
    setChamps(prevChamps => prevChamps.filter((_, i) => i !== index));
  };

  const handleSaveCategory = async (event) => {
    event.preventDefault();
    if (!nom.trim()) {
      setAndClearMessage({ text: 'Le nom de la catégorie est obligatoire.', type: 'error' });
      return;
    }
    const champKeys = new Set();
    for (const champ of champs) {
      if (!champ.label.trim() || !champ.key.trim()) {
        setAndClearMessage({ text: 'Chaque champ doit avoir un label et une clé non vides.', type: 'error' });
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(champ.key.trim())) {
        setAndClearMessage({ text: `La clé de champ "${champ.key}" est invalide. Utilisez uniquement des lettres, chiffres et underscores.`, type: 'error'});
        return;
      }
      if (champKeys.has(champ.key.trim())) {
        setAndClearMessage({ text: `La clé de champ "${champ.key}" est dupliquée. Les clés doivent être uniques au sein d'une catégorie.`, type: 'error' });
        return;
      }
      champKeys.add(champ.key.trim());

      if (champ.type === 'text' && champ.maxLength !== null && (isNaN(parseInt(champ.maxLength, 10)) || parseInt(champ.maxLength, 10) <= 0)) {
        setAndClearMessage({ text: `La longueur maximale pour le champ texte "${champ.label}" doit être un nombre entier positif.`, type: 'error' });
        return;
      }
    }

    setLoading(true);
    const categoryData = {
      id: editTemplate ? editTemplate.id : undefined,
      nom: nom.trim(),
      ordre: Number(ordreCategorie) || 0,
      champs: champs.map(c => ({
          ...c, 
          key: c.key.trim(), // S'assurer que la clé est trimée
          label: c.label.trim(), // S'assurer que le label est trimé
          ordre: Number(c.ordre) || 0,
          maxLength: c.type === 'text' && c.maxLength ? parseInt(c.maxLength, 10) : null,
          afficherEnTete: c.afficherEnTete || false 
        })).sort((a, b) => a.ordre - b.ordre),
      deleted: editTemplate ? editTemplate.deleted : 0, 
    };

    try {
      const result = editTemplate 
        ? await window.api.updateCategorie(categoryData)
        : await window.api.addCategorie(categoryData);
      if (result.success) {
        setAndClearMessage({ text: `Catégorie ${editTemplate ? 'mise à jour' : 'ajoutée'} avec succès!`, type: 'success' });
        resetForm();
        await loadCategories();
      } else {
        setAndClearMessage({ text: `Erreur sauvegarde: ${result.error || 'Problème inconnu'}`, type: 'error' });
      }
    } catch (error) {
      setAndClearMessage({ text: `Erreur lors de la sauvegarde: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category) => {
    setEditTemplate(category);
    setNom(category.nom);
    setOrdreCategorie(category.ordre || 0);
    // Assurer la propreté des données lors du chargement pour édition
    setChamps([...(category.champs || [])].map(c => ({
        ...c, 
        maxLength: (c.type === 'text' && c.maxLength !== undefined) ? c.maxLength : null, // Assurer null si non applicable ou non défini
        afficherEnTete: c.afficherEnTete || false,
        options: Array.isArray(c.options) ? c.options : [] // Assurer que options est un tableau
    })).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
    setMessage({ text: '', type: '' }); // Effacer les messages précédents
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHideCategory = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir masquer cette catégorie ? Elle ne sera plus proposée pour les nouveaux individus et ses champs ne seront plus modifiables sur les individus existants via son onglet dédié.")) return;
    setLoading(true);
    try {
      const result = await window.api.deleteCategorie(id); 
      if (result.success) {
        setAndClearMessage({ text: 'Catégorie masquée avec succès.', type: 'success' });
        await loadCategories();
        if (editTemplate && editTemplate.id === id) {
            resetForm();
        }
      } else {
        setAndClearMessage({ text: `Erreur masquage: ${result.error || 'Problème inconnu'}`, type: 'error' });
      }
    } catch (error) {
      setAndClearMessage({ text: `Erreur: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleRestoreCategory = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir démasquer cette catégorie ?")) return;
    setLoading(true);
    try {
      const categoryToRestore = categoriesMasquees.find(cat => cat.id === id);
      if (!categoryToRestore) {
          setAndClearMessage({ text: 'Catégorie à démasquer non trouvée.', type: 'error' });
          setLoading(false);
          return;
      }
      const updatedCategory = { ...categoryToRestore, deleted: 0 };
      delete updatedCategory.isMasque; 
      const result = await window.api.updateCategorie(updatedCategory); 
      if (result.success) {
        setAndClearMessage({ text: 'Catégorie démasquée avec succès!', type: 'success' });
        await loadCategories();
      } else {
        setAndClearMessage({ text: `Erreur démasquage: ${result.error || 'Vérifiez que l\'API supporte le démasquage.'}`, type: 'error' });
      }
    } catch (error) {
      setAndClearMessage({ text: `Erreur: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="admin-categories-container">
      <div className="category-form-panel">
        <h3>{editTemplate ? `Modifier la catégorie "${editTemplate.nom}"` : 'Ajouter une nouvelle catégorie'}</h3>
        {message.text && (
          <div className={`message-banner ${message.type === 'success' ? 'success-message' : message.type === 'info' ? 'info-message' : 'error-message'}`}>
            {message.type === 'success' ? '✓ ' : message.type === 'info' ? 'ℹ️ ' : '⚠ '} {message.text}
          </div>
        )}
        <form onSubmit={handleSaveCategory}>
          <div className="form-group">
            <label htmlFor="categoryName">Nom de la catégorie <span className="obligatoire">*</span></label>
            <input
              id="categoryName"
              type="text"
              placeholder="Nom de la catégorie (ex: Informations personnelles)"
              value={nom}
              onChange={e => setNom(e.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="categoryOrder">Ordre d'affichage de la catégorie</label>
            <input
              id="categoryOrder"
              type="number"
              placeholder="Ex: 10, 20, 30..."
              value={ordreCategorie}
              onChange={e => setOrdreCategorie(Number(e.target.value))}
              min="0"
            />
          </div>

          <h4>Champs de la catégorie</h4>
          {champs.length === 0 && <p className="no-fields-form-message">Aucun champ défini pour cette catégorie. Cliquez sur "Ajouter un champ" pour commencer.</p>}
          
          {champs.map((champ, i) => (
            <div key={champ.key || `new-champ-${i}`} className="champ-form-item">
              <div className="champ-form-item-header">
                <h5>Champ #{i + 1} {champ.label && `- "${champ.label}"`}</h5>
                <button 
                    type="button" 
                    onClick={() => supprimerChamp(i)} 
                    className="btn-danger btn-small btn-icon"
                    aria-label="Supprimer ce champ"
                >
                   <TrashIcon /> Supprimer
                </button>
              </div>
              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor={`champ-label-${i}`}>Label du champ <span className="obligatoire">*</span></label>
                  <input id={`champ-label-${i}`} placeholder="Ex: Nom de famille, Date de naissance" value={champ.label} onChange={e => updateChamp(i, 'label', e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor={`champ-key-${i}`}>Clé du champ (unique, sans espaces/accents) <span className="obligatoire">*</span></label>
                  <input id={`champ-key-${i}`} placeholder="Ex: nom_famille, date_naissance" value={champ.key} onChange={e => updateChamp(i, 'key', e.target.value.replace(/\s+/g, '_').toLowerCase())} required pattern="[a-zA-Z0-9_]+" title="Utilisez uniquement des lettres (non accentuées), chiffres et underscores (_)." />
                </div>
                <div className="form-group">
                  <label htmlFor={`champ-type-${i}`}>Type de champ</label>
                  <select id={`champ-type-${i}`} value={champ.type} onChange={e => updateChamp(i, 'type', e.target.value)} className="select-stylish">
                    {champTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor={`champ-ordre-${i}`}>Ordre du champ</label>
                  <input id={`champ-ordre-${i}`} type="number" placeholder="Ordre d'affichage du champ" value={champ.ordre || 0} onChange={e => updateChamp(i, 'ordre', Number(e.target.value))} min="0" />
                </div>
                 {champ.type === 'text' && (
                  <div className="form-group">
                    <label htmlFor={`champ-maxLength-${i}`}>Longueur maximale (pour Texte)</label>
                    <input 
                      id={`champ-maxLength-${i}`} 
                      type="number" 
                      placeholder="Ex: 255 (laisser vide si pas de limite)" 
                      value={champ.maxLength === null || champ.maxLength === undefined ? '' : champ.maxLength}
                      onChange={e => updateChamp(i, 'maxLength', e.target.value === '' ? null : parseInt(e.target.value, 10))} 
                      min="1"
                    />
                  </div>
                )}
              </div>
              {champ.type === 'list' && (
                <div className="form-group">
                  <label htmlFor={`champ-options-${i}`}>Options de la liste (séparées par virgule)</label>
                  <input id={`champ-options-${i}`} placeholder="Ex: Option A, Option B, Option C" value={champ.options ? champ.options.join(',') : ''} onChange={e => updateChampOptions(i, e.target.value)} />
                </div>
              )}
              <div className="champ-options-checkboxes">
                <label><input type="checkbox" checked={champ.obligatoire || false} onChange={e => updateChamp(i, 'obligatoire', e.target.checked)} /> Obligatoire</label>
                <label><input type="checkbox" checked={champ.visible === undefined ? true : champ.visible} onChange={e => updateChamp(i, 'visible', e.target.checked)} /> Visible dans les formulaires</label>
                <label><input type="checkbox" checked={champ.readonly || false} onChange={e => updateChamp(i, 'readonly', e.target.checked)} /> Lecture seule (non modifiable)</label>
                <label><input type="checkbox" checked={champ.afficherEnTete || false} onChange={e => updateChamp(i, 'afficherEnTete', e.target.checked)} /> Afficher dans l'en-tête de la fiche</label>
              </div>
            </div>
          ))}
          <button type="button" onClick={ajouterChamp} className="btn-secondary btn-icon-text" style={{marginTop: 'var(--spacing-3)'}}>
            <PlusIcon /> Ajouter un champ
          </button>

          <div className="form-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (editTemplate ? 'Mise à jour en cours...' : 'Ajout en cours...') : (editTemplate ? 'Mettre à jour la catégorie' : 'Ajouter la catégorie')}
            </button>
            {editTemplate && (
              <button type="button" onClick={resetForm} className="btn-tertiary" disabled={loading}>
                Annuler les modifications
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="category-list-panel">
        <div className="category-section">
          <div className="category-section-header">
            <h3>Catégories Actives ({categories.length})</h3>
          </div>
          {loading && categories.length === 0 && <div className="loading-message">Chargement des catégories...</div>}
          {!loading && categories.length === 0 && !(message.text && message.type === 'info') && <p>Aucune catégorie active pour le moment.</p>}
          <ul className="categories-list">
            {categories.map(cat => (
              <li key={cat.id} className="category-item">
                <div className="category-info">
                  <span className="category-name">{cat.nom}</span>
                  <span className="category-details">(ID: {cat.id}, Ordre: {cat.ordre || 0}, {cat.champs ? cat.champs.length : 0} champs)</span>
                </div>
                <div className="category-actions">
                  <button onClick={() => handleEditCategory(cat)} className="btn-secondary btn-small btn-icon" aria-label="Éditer la catégorie">
                    <EditIcon /> Éditer
                  </button>
                  <button onClick={() => handleHideCategory(cat.id)} className="btn-danger btn-small btn-icon" aria-label="Masquer la catégorie">
                    <HideIcon /> Masquer
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="category-section">
          <div className="category-section-header">
            <h3>Catégories Masquées ({categoriesMasquees.length})</h3>
            {(categoriesMasquees.length > 0 || afficherMasquees || (loading && categoriesMasquees.length === 0)) && ( 
                <button 
                    onClick={() => setAfficherMasquees(!afficherMasquees)} 
                    className="btn-tertiary btn-small"
                    aria-expanded={afficherMasquees}
                >
                    {afficherMasquees ? 'Cacher la liste' : 'Afficher la liste'}
                </button>
            )}
          </div>
          {afficherMasquees && (
            <>
              {loading && categoriesMasquees.length === 0 && <div className="loading-message">Chargement des catégories masquées...</div>}
              {!loading && categoriesMasquees.length === 0 && <p>Aucune catégorie masquée actuellement.</p>}
              {categoriesMasquees.length > 0 && (
                <ul className="categories-list categories-list-masquees">
                  {categoriesMasquees.map(cat => (
                    <li key={cat.id} className="category-item category-item-masked">
                      <div className="category-info">
                        <span className="category-name">{cat.nom}</span>
                        <span className="category-details">(ID: {cat.id}, Ordre: {cat.ordre || 0}, {cat.champs ? cat.champs.length : 0} champs)</span>
                      </div>
                      <div className="category-actions">
                        <button onClick={() => handleRestoreCategory(cat.id)} className="btn-success btn-small btn-icon" aria-label="Démasquer la catégorie">
                          <UnhideIcon /> Démasquer
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          {!afficherMasquees && categoriesMasquees.length === 0 && !loading && <p>Aucune catégorie n'est actuellement masquée.</p>}
          {!afficherMasquees && categoriesMasquees.length > 0 && !loading && <p>{categoriesMasquees.length} catégorie(s) masquée(s). Cliquez sur "Afficher la liste" pour les voir et les gérer.</p>}
        </div>
      </div>
    </div>
  );
}