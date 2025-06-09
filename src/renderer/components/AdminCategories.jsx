import React, { useEffect, useState, useCallback, useRef } from 'react';
import useTimedMessage from '../hooks/useTimedMessage';
import DattaAlert from "./common/DattaAlert";
import DattaButton from "./common/DattaButton";
import DattaPageTitle from "./common/DattaPageTitle";
import DattaEmptyState from "./common/DattaEmptyState";
import DattaCard from "./common/DattaCard";

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

const champTypes = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'number-graph', label: 'Nombre avec historique' },
  { value: 'date', label: 'Date' },
  { value: 'list', label: 'Liste déroulante' }, // Libellé plus clair
  { value: 'checkbox', label: 'Case à cocher' },
  { value: 'dynamic', label: 'Dynamique' }
];

export default function AdminCategories() {
  const [categories, setCategories] = useState([]);
  const [categoriesMasquees, setCategoriesMasquees] = useState([]);
  const [nom, setNom] = useState('');
  const [ordreCategorie, setOrdreCategorie] = useState(0);
  const [champs, setChamps] = useState([]);
  const [editTemplate, setEditTemplate] = useState(null);
  
  const { message, setTimedMessage, clearMessage } = useTimedMessage();
  const [loading, setLoading] = useState(true); // Mis à true initialement
  const [afficherMasquees, setAfficherMasquees] = useState(false);

  const initialLoadRef = useRef(true);

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
            setTimedMessage({ text: 'Aucune catégorie trouvée. Commencez par en créer une.', type: 'info' });
        }
        initialLoadRef.current = false;
      } else {
        const errorMsg = result && result.error ? result.error : 'Format de réponse invalide ou échec du chargement.';
        setTimedMessage({ text: `Erreur chargement catégories: ${errorMsg}`, type: 'error' });
        setCategories([]);
        setCategoriesMasquees([]);
      }
    } catch (error) {
      setTimedMessage({ text: `Erreur critique lors du chargement: ${error.message}`, type: 'error' });
      setCategories([]);
      setCategoriesMasquees([]);
    } finally {
      setLoading(false);
    }
  }, [setTimedMessage]); // Retrait de loading des dépendances pour éviter les boucles infinies

  useEffect(() => {
    loadCategories();
  }, [loadCategories]); // loadCategories est maintenant stable grâce au useCallback corrigé

  const resetForm = () => {
    setNom('');
    const allCurrentCategories = [...categories, ...categoriesMasquees];
    const maxOrder = allCurrentCategories.length > 0 ? Math.max(0, ...allCurrentCategories.map(c => c.ordre || 0)) : -10;
    setOrdreCategorie(maxOrder + 10);
    setChamps([]);
    setEditTemplate(null);
    clearMessage(); // Effacer les messages lors du reset
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
      formule: '',
      ordre: prevChamps.length > 0 ? Math.max(0, ...prevChamps.map(c => c.ordre || 0)) + 10 : 0
    }]);
  };

  const updateChamp = (index, field, value) => {
    setChamps(prevChamps =>
      prevChamps.map((champ, i) => {
        if (i !== index) return champ;
        const updated = { ...champ, [field]: value };
        if (field === 'type' && value === 'dynamic') {
          updated.readonly = true;
        }
        return updated;
      })
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
      setTimedMessage({ text: 'Le nom de la catégorie est obligatoire.', type: 'error' });
      return;
    }
    const champKeys = new Set();
    for (const champ of champs) {
      if (!champ.label.trim() || !champ.key.trim()) {
        setTimedMessage({ text: 'Chaque champ doit avoir un label et une clé non vides.', type: 'error' });
        return;
      }
      if (!/^[a-zA-Z0-9_]+$/.test(champ.key.trim())) {
        setTimedMessage({ text: `La clé de champ "${champ.key}" est invalide. Utilisez uniquement des lettres, chiffres et underscores.`, type: 'error'});
        return;
      }
      if (champKeys.has(champ.key.trim())) {
        setTimedMessage({ text: `La clé de champ "${champ.key}" est dupliquée. Les clés doivent être uniques au sein d'une catégorie.`, type: 'error' });
        return;
      }
      champKeys.add(champ.key.trim());

      if (champ.type === 'text' && champ.maxLength !== null && (isNaN(parseInt(champ.maxLength, 10)) || parseInt(champ.maxLength, 10) <= 0)) {
        setTimedMessage({ text: `La longueur maximale pour le champ texte "${champ.label}" doit être un nombre entier positif.`, type: 'error' });
        return;
      }
      if (champ.type === 'dynamic' && (!champ.formule || champ.formule.trim() === '')) {
        setTimedMessage({ text: `La formule du champ dynamique "${champ.label}" ne peut pas être vide.`, type: 'error' });
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
          afficherEnTete: c.afficherEnTete || false,
          formule: c.formule || ''
        })).sort((a, b) => a.ordre - b.ordre),
      deleted: editTemplate ? editTemplate.deleted : 0, 
    };

    try {
      const result = editTemplate 
        ? await window.api.updateCategorie(categoryData)
        : await window.api.addCategorie(categoryData);
      if (result.success) {
        setTimedMessage({ text: `Catégorie ${editTemplate ? 'mise à jour' : 'ajoutée'} avec succès!`, type: 'success' });
        resetForm();
        await loadCategories();
      } else {
        setTimedMessage({ text: `Erreur sauvegarde: ${result.error || 'Problème inconnu'}`, type: 'error' });
      }
    } catch (error) {
      setTimedMessage({ text: `Erreur lors de la sauvegarde: ${error.message}`, type: 'error' });
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
        options: Array.isArray(c.options) ? c.options : [], // Assurer que options est un tableau
        formule: c.formule || ''
    })).sort((a, b) => (a.ordre || 0) - (b.ordre || 0)));
    clearMessage(); // Effacer les messages précédents
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleHideCategory = async (id) => {
    if (!window.confirm("Êtes-vous sûr de vouloir masquer cette catégorie ? Elle ne sera plus proposée pour les nouveaux individus et ses champs ne seront plus modifiables sur les individus existants via son onglet dédié.")) return;
    setLoading(true);
    try {
      const result = await window.api.deleteCategorie(id); 
      if (result.success) {
        setTimedMessage({ text: 'Catégorie masquée avec succès.', type: 'success' });
        await loadCategories();
        if (editTemplate && editTemplate.id === id) {
            resetForm();
        }
      } else {
        setTimedMessage({ text: `Erreur masquage: ${result.error || 'Problème inconnu'}`, type: 'error' });
      }
    } catch (error) {
      setTimedMessage({ text: `Erreur: ${error.message}`, type: 'error' });
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
          setTimedMessage({ text: 'Catégorie à démasquer non trouvée.', type: 'error' });
          setLoading(false);
          return;
      }
      const updatedCategory = { ...categoryToRestore, deleted: 0 };
      delete updatedCategory.isMasque; 
      const result = await window.api.updateCategorie(updatedCategory); 
      if (result.success) {
        setTimedMessage({ text: 'Catégorie démasquée avec succès!', type: 'success' });
        await loadCategories();
      } else {
        setTimedMessage({ text: `Erreur démasquage: ${result.error || 'Vérifiez que l\'API supporte le démasquage.'}`, type: 'error' });
      }
    } catch (error) {
      setTimedMessage({ text: `Erreur: ${error.message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="pc-content">
      <DattaPageTitle title="Gestion des catégories" />
      {message.text && (
        <DattaAlert type={message.type || 'info'}>{message.text}</DattaAlert>
      )}
      <div className="row">
        <div className="col-lg-4 col-md-12">
          <DattaCard title={editTemplate ? `Modifier la catégorie "${editTemplate.nom}"` : 'Ajouter une nouvelle catégorie'}>
            <form onSubmit={handleSaveCategory}>
          <div className="mb-3">
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
          <div className="mb-3">
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
                <DattaButton
                    type="button"
                    onClick={() => supprimerChamp(i)}
                    variant="danger"
                    size="sm"
                    className="btn"
                    aria-label="Supprimer ce champ"
                >
                   <TrashIcon /> Supprimer
                </DattaButton>
              </div>
              <div className="form-grid">
                <div className="mb-3">
                  <label htmlFor={`champ-label-${i}`}>Label du champ <span className="obligatoire">*</span></label>
                  <input id={`champ-label-${i}`} placeholder="Ex: Nom de famille, Date de naissance" value={champ.label} onChange={e => updateChamp(i, 'label', e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label htmlFor={`champ-key-${i}`}>Clé du champ (unique, sans espaces/accents) <span className="obligatoire">*</span></label>
                  <input id={`champ-key-${i}`} placeholder="Ex: nom_famille, date_naissance" value={champ.key} onChange={e => updateChamp(i, 'key', e.target.value.replace(/\s+/g, '_').toLowerCase())} required pattern="[a-zA-Z0-9_]+" title="Utilisez uniquement des lettres (non accentuées), chiffres et underscores (_)." />
                </div>
                <div className="mb-3">
                  <label htmlFor={`champ-type-${i}`}>Type de champ</label>
                  <select id={`champ-type-${i}`} value={champ.type} onChange={e => updateChamp(i, 'type', e.target.value)} className="select-stylish">
                    {champTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label htmlFor={`champ-ordre-${i}`}>Ordre du champ</label>
                  <input id={`champ-ordre-${i}`} type="number" placeholder="Ordre d'affichage du champ" value={champ.ordre || 0} onChange={e => updateChamp(i, 'ordre', Number(e.target.value))} min="0" />
                </div>
                 {champ.type === 'text' && (
                  <div className="mb-3">
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
                {champ.type === 'dynamic' && (
                  <div className="mb-3" style={{ gridColumn: 'span 2' }}>
                    <label htmlFor={`champ-formule-${i}`}>Formule du champ dynamique</label>
                    <input
                      id={`champ-formule-${i}`}
                      type="text"
                      placeholder='Ex: if {champ1} > 0 then "Actif" else "Inactif"'
                      value={champ.formule || ''}
                      onChange={e => updateChamp(i, 'formule', e.target.value)}
                    />
                  </div>
                )}
              </div>
              {champ.type === 'list' && (
                <div className="mb-3">
                  <label htmlFor={`champ-options-${i}`}>Options de la liste (séparées par virgule)</label>
                  <input id={`champ-options-${i}`} placeholder="Ex: Option A, Option B, Option C" value={champ.options ? champ.options.join(',') : ''} onChange={e => updateChampOptions(i, e.target.value)} />
                </div>
              )}
              <div className="champ-options-checkboxes">
                <label><input type="checkbox" checked={champ.obligatoire || false} onChange={e => updateChamp(i, 'obligatoire', e.target.checked)} /> Obligatoire</label>
                <label><input type="checkbox" checked={champ.visible === undefined ? true : champ.visible} onChange={e => updateChamp(i, 'visible', e.target.checked)} /> Visible dans les formulaires</label>
                <label><input type="checkbox" checked={champ.readonly || false} onChange={e => updateChamp(i, 'readonly', e.target.checked)} disabled={champ.type === 'dynamic'} /> Lecture seule (non modifiable)</label>
                <label><input type="checkbox" checked={champ.afficherEnTete || false} onChange={e => updateChamp(i, 'afficherEnTete', e.target.checked)} /> Afficher dans l'en-tête de la fiche</label>
              </div>
            </div>
          ))}
          <div className="form-actions">
            <DattaButton type="button" onClick={ajouterChamp} variant="secondary" className="btn">
              <PlusIcon /> Ajouter un champ
            </DattaButton>
            <DattaButton type="submit" variant="primary" disabled={loading}>
              {loading ? (editTemplate ? 'Mise à jour en cours...' : 'Ajout en cours...') : (editTemplate ? 'Mettre à jour la catégorie' : 'Ajouter la catégorie')}
            </DattaButton>
            {editTemplate && (
              <DattaButton type="button" onClick={resetForm} variant="tertiary" disabled={loading}>
                Annuler les modifications
              </DattaButton>
            )}
          </div>
        </form>
          </DattaCard>
        </div>

        <div className="col-lg-8 col-md-12">
          <DattaCard title={`Catégories Actives (${categories.length})`}>
          {loading && categories.length === 0 && (
            <div className="loading-message">Chargement des catégories...</div>
          )}
          {!loading && categories.length === 0 && !(message.text && message.type === 'info') && (
            <DattaEmptyState message="Aucune catégorie active pour le moment." />
          )}
          <div className="list-group list-group-flush">
            {categories.map(cat => (
              <div key={cat.id} className="list-group-item d-flex justify-content-between align-items-start">
                <div>
                  <h6 className="mb-1">{cat.nom}</h6>
                  <div>
                    <span className="badge bg-success me-2">{cat.champs ? `${cat.champs.length} champs` : '0 champ'}</span>
                    <span className="badge bg-secondary">Ordre: {cat.ordre || 0}</span>
                  </div>
                </div>
                <div className="btn-group">
                  <DattaButton variant="light-primary" size="sm" icon="feather icon-edit" onClick={() => handleEditCategory(cat)}>
                    Éditer
                  </DattaButton>
                  <DattaButton variant="light-danger" size="sm" icon="feather icon-eye-off" onClick={() => handleHideCategory(cat.id)}>
                    Masquer
                  </DattaButton>
                </div>
              </div>
            ))}
          </div>
        </DattaCard>
        <DattaCard title={`Catégories Masquées (${categoriesMasquees.length})`} className="mt-4">
            {(categoriesMasquees.length > 0 || afficherMasquees || (loading && categoriesMasquees.length === 0)) && (
              <DattaButton
                onClick={() => setAfficherMasquees(!afficherMasquees)}
                variant="tertiary"
                size="sm"
                aria-expanded={afficherMasquees}
                className="mb-3"
              >
                {afficherMasquees ? 'Cacher la liste' : 'Afficher la liste'}
              </DattaButton>
            )}
            {afficherMasquees && (
              <>
                {loading && categoriesMasquees.length === 0 && (
                  <div className="loading-message">Chargement des catégories masquées...</div>
                )}
                {!loading && categoriesMasquees.length === 0 && (
                  <DattaEmptyState message="Aucune catégorie masquée actuellement." />
                )}
                {categoriesMasquees.length > 0 && (
                  <div className="list-group list-group-flush">
                    {categoriesMasquees.map(cat => (
                      <div key={cat.id} className="list-group-item d-flex justify-content-between align-items-start">
                        <div>
                          <h6 className="mb-1">{cat.nom}</h6>
                          <div>
                            <span className="badge bg-success me-2">{cat.champs ? `${cat.champs.length} champs` : '0 champ'}</span>
                            <span className="badge bg-secondary">Ordre: {cat.ordre || 0}</span>
                          </div>
                        </div>
                        <div className="btn-group">
                          <DattaButton variant="light-success" size="sm" icon="feather icon-eye" onClick={() => handleRestoreCategory(cat.id)}>
                            Démasquer
                          </DattaButton>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {!afficherMasquees && categoriesMasquees.length === 0 && !loading && (
              <DattaEmptyState message="Aucune catégorie n'est actuellement masquée." />
            )}
            {!afficherMasquees && categoriesMasquees.length > 0 && !loading && (
              <p>
                {categoriesMasquees.length} catégorie(s) masquée(s). Cliquez sur "Afficher la liste" pour les voir et les gérer.
              </p>
            )}
          </DattaCard>
        </div>
      </div>
    </div>
  );
}