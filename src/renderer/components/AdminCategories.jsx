import React, { useEffect, useState, useCallback, useRef } from 'react';
import useTimedMessage from '../hooks/useTimedMessage';
import DattaAlert from "./common/DattaAlert";
import DattaButton from "./common/DattaButton";
import DattaPageTitle from "./common/DattaPageTitle";
import DattaEmptyState from "./common/DattaEmptyState";
import DattaCard from "./common/DattaCard";
import DattaNetworkDataTable from "./common/DattaNetworkDataTable";
import { useSync } from '../hooks/useSync';

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
  const [loading, setLoading] = useState(true);
  const [afficherMasquees, setAfficherMasquees] = useState(false);
  const [error, setError] = useState(null);

  const { syncState, performSync } = useSync();
  const initialLoadRef = useRef(true);

  const loadCategories = useCallback(async () => {
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
        setError(null);
        
        if (allCategories.length === 0 && !initialLoadRef.current) { 
            setTimedMessage({ text: 'Aucune catégorie trouvée. Commencez par en créer une.', type: 'info' });
        }
        initialLoadRef.current = false;

        // Synchroniser les données après le chargement
        await performSync();
      } else {
        const errorMsg = result && result.error ? result.error : 'Format de réponse invalide ou échec du chargement.';
        setError(errorMsg);
        setTimedMessage({ text: `Erreur chargement catégories: ${errorMsg}`, type: 'error' });
        setCategories([]);
        setCategoriesMasquees([]);
      }
    } catch (error) {
      setError(error.message);
      setTimedMessage({ text: `Erreur critique lors du chargement: ${error.message}`, type: 'error' });
      setCategories([]);
      setCategoriesMasquees([]);
    }
  }, [setTimedMessage, performSync]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

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
      <DattaCard>
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <DattaButton
              variant="primary"
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
            >
              <PlusIcon /> Nouvelle catégorie
            </DattaButton>
            <DattaButton
              variant="outline-secondary"
              onClick={() => setAfficherMasquees(!afficherMasquees)}
            >
              {afficherMasquees ? 'Masquer les catégories archivées' : 'Afficher les catégories archivées'}
            </DattaButton>
          </div>

          {message && (
            <DattaAlert type={message.type} className="mb-3">
              {message.text}
            </DattaAlert>
          )}

          <DattaNetworkDataTable
            data={afficherMasquees ? categoriesMasquees : categories}
            columns={[
              {
                title: 'Nom',
                dataIndex: 'nom',
                key: 'nom',
                sorter: true
              },
              {
                title: 'Ordre',
                dataIndex: 'ordre',
                key: 'ordre',
                sorter: true
              },
              {
                title: 'Champs',
                dataIndex: 'champs',
                key: 'champs',
                render: (champs) => champs?.length || 0
              },
              {
                title: 'Actions',
                key: 'actions',
                render: (_, record) => (
                  <div className="d-flex gap-2">
                    <DattaButton
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleEditCategory(record)}
                    >
                      <EditIcon />
                    </DattaButton>
                    {!record.isMasque ? (
                      <DattaButton
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleHideCategory(record.id)}
                      >
                        <TrashIcon />
                      </DattaButton>
                    ) : (
                      <DattaButton
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleRestoreCategory(record.id)}
                      >
                        Restaurer
                      </DattaButton>
                    )}
                  </div>
                )
              }
            ]}
            loading={loading}
            error={error}
            onLoadData={loadCategories}
            refreshInterval={30000}
            maxRetries={3}
            pagination={{
              currentPage: 1,
              itemsPerPage: 10,
              totalItems: (afficherMasquees ? categoriesMasquees : categories).length
            }}
          />
        </div>
      </DattaCard>
    </div>
  );
}