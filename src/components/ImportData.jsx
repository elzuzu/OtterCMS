import React, { useRef, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

// Constantes pour les types de champs disponibles
const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'list', label: 'Liste déroulante' },
  { value: 'checkbox', label: 'Case à cocher' }
];

export default function ImportData({ user }) {
  // Références et états
  const fileRef = useRef();
  const [categories, setCategories] = useState([]); // Pour la sélection de catégorie LORS DE LA CRÉATION d'un champ
  const [existingFields, setExistingFields] = useState([]); // Champs existants pour le mapping

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  
  const [mapping, setMapping] = useState({}); // { csvHeader: 'targetDbField' } pour action 'map'
  const [columnActions, setColumnActions] = useState({}); // { csvHeader: 'map' | 'create' | 'ignore' }
  const [nouveauxChamps, setNouveauxChamps] = useState({}); // { csvHeader: { categorie_id, label, key, type, ... } } pour action 'create'
  
  // États pour l'interface
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [importStep, setImportStep] = useState(1); // 1: Fichier, 2: Indi, 3: Mapping Colonnes, 4: Résultats
  const [previewData, setPreviewData] = useState(null); // { headers: [], rows: [[]], rawHeaders: [] }
  const [fileContent, setFileContent] = useState(null); // Contenu binaire du fichier
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);

  // État pour le champ numéro d'individu
  const [numeroIndividuHeader, setNumeroIndividuHeader] = useState('');
  const [createIfMissing, setCreateIfMissing] = useState(false);

  // Chargement des catégories (pour la création de nouveaux champs)
  useEffect(() => {
    const loadCategories = async () => {
      setLoading(true);
      try {
        const result = window.api && window.api.getCategories
          ? await window.api.getCategories()
          : await new Promise(resolve => setTimeout(() => resolve({
              success: true,
              data: [
                { id: 1, nom: 'Informations de base', deleted: 0, champs: [] },
                { id: 2, nom: 'Coordonnées', deleted: 0, champs: [] },
                { id: 3, nom: 'Statut', deleted: 0, champs: [] },
                { id: 4, nom: 'Catégorie Archivée', deleted: 1, champs: [] }
              ]
            }), 500));

        if (result && result.success && Array.isArray(result.data)) {
          const activeCategories = result.data.filter(cat => cat.deleted !== 1);
          setCategories(activeCategories);
          const fields = [];
          activeCategories.forEach(cat => {
            (cat.champs || []).forEach(ch => {
              fields.push({ ...ch, categorieNom: cat.nom, categorieId: cat.id });
            });
          });
          setExistingFields(fields);
          if (activeCategories.length === 0) {
             setMessage({ text: 'Aucune catégorie active trouvée. La création de nouveaux champs nécessitera une catégorie.', type: 'warning' });
          }
        } else {
          setMessage({
            text: 'Impossible de charger les catégories. Veuillez réessayer.',
            type: 'error'
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement des catégories:", error);
        setMessage({
          text: `Erreur lors du chargement des catégories: ${error.message}`,
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    loadCategories();
    const stored = JSON.parse(localStorage.getItem('importMappingTemplates') || '[]');
    if (Array.isArray(stored)) setTemplates(stored);
  }, []);

  // Gestion de la sélection du fichier
  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setMessage({ text: 'Aucun fichier sélectionné.', type: 'error' });
      return;
    }
    
    setFileName(file.name);
    setMessage({ text: `Fichier "${file.name}" sélectionné.`, type: 'info' });

    const reader = new FileReader();
    reader.onload = (evt) => {
      const binaryString = evt.target.result;
      setFileContent(binaryString);

      try {
        const workbook = XLSX.read(binaryString, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const headerRange = XLSX.utils.decode_range(worksheet['!ref']);
        const rawHeaders = [];
        if (headerRange.s.r === 0) { // Assurer que la première ligne est bien 0
            for (let C = headerRange.s.c; C <= headerRange.e.c; ++C) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: C });
                const cell = worksheet[cellAddress];
                rawHeaders.push(cell ? XLSX.utils.format_cell(cell) : `Colonne ${C + 1}`);
            }
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
        const dataRows = jsonData.length > 1 ? jsonData.slice(1) : [];

        if (rawHeaders.length === 0 && jsonData.length > 0) {
             rawHeaders.push(...jsonData[0].map(String));
        }

        if (rawHeaders.length === 0) {
          setMessage({ text: 'Impossible de lire les en-têtes du fichier. Vérifiez le format.', type: 'error' });
          setPreviewData(null);
          return;
        }
        
        setPreviewData({
          headers: rawHeaders,
          rows: dataRows.slice(0, 5).map(row => rawHeaders.map((_, idx) => row[idx] || "")),
          rawHeaders: rawHeaders
        });

        // Initialiser les actions, mappings et configurations pour chaque colonne
        const initialColumnActions = {};
        const initialNouveauxChamps = {};
        const initialMapping = {};
        
        rawHeaders.forEach(header => {
          initialColumnActions[header] = 'map'; // Par défaut, on essaie de mapper
          initialMapping[header] = ''; // Champ de destination vide par défaut
          
          initialNouveauxChamps[header] = {
            categorie_id: categories.length > 0 ? categories[0].id.toString() : '', // Pré-sélectionner si possible
            newCategorieNom: '',
            label: header,
            key: header.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 50),
            type: 'text',
            obligatoire: false,
            visible: true,
            readonly: false,
            afficherEnTete: false,
            options: [],
            maxLength: null,
            ordre: 0 
          };
        });
        
        setColumnActions(initialColumnActions);
        setNouveauxChamps(initialNouveauxChamps);
        setMapping(initialMapping);
        setNumeroIndividuHeader(''); // Réinitialiser pour la sélection

        setImportStep(2); // Passer à l'étape d'identification du numéro d'individu
      } catch (error) {
        console.error("Erreur lors de la lecture du fichier:", error);
        setMessage({ text: `Erreur lors de la lecture du fichier: ${error.message}. Assurez-vous que c'est un format CSV ou Excel valide.`, type: 'error' });
        setPreviewData(null); setFileContent(null); setFileName('');
        if(fileRef.current) fileRef.current.value = '';
      }
    };
    reader.onerror = () => {
        setMessage({ text: 'Erreur lors de la lecture du fichier.', type: 'error' });
        setFileContent(null); setFileName('');
        if(fileRef.current) fileRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  // Gestion du mapping du numéro d'individu
  const handleNumeroIndividuMapping = () => {
    if (!numeroIndividuHeader) {
      setMessage({ text: 'La sélection du champ pour le numéro d\'individu est obligatoire.', type: 'error' });
      return;
    }

    setColumnActions(prev => ({ ...prev, [numeroIndividuHeader]: 'map' }));
    setMapping(prev => ({ ...prev, [numeroIndividuHeader]: 'numero_unique' }));
    // S'assurer que la création de champ est désactivée pour cette colonne spécifique
    setNouveauxChamps(prev => ({
        ...prev,
        [numeroIndividuHeader]: {
            ...prev[numeroIndividuHeader],
            // creer: false, // 'creer' n'est plus un état direct, géré par columnActions
        }
    }));

    setImportStep(3); // Passer à l'étape de configuration du mapping général
  };

  // Changer l'action pour une colonne (map, create, ignore)
  const handleColumnActionChange = (csvHeader, action) => {
    setColumnActions(prev => ({ ...prev, [csvHeader]: action }));
    
    // Ajuster le mapping en fonction de l'action
    if (action === 'ignore') {
      setMapping(prev => ({ ...prev, [csvHeader]: 'ignorer' }));
    } else if (mapping[csvHeader] === 'ignorer') { // Si on passe de 'ignore' à 'map' ou 'create'
      setMapping(prev => ({ ...prev, [csvHeader]: '' })); // Réinitialiser le mapping
    }
    if (action === 'create') { // Si on passe à 'create', s'assurer que le mapping est vide
        setMapping(prev => ({...prev, [csvHeader]: ''}));
    }
  };

  // Mettre à jour le champ de destination pour une colonne mappée
  const handleMappingTargetChange = (csvHeader, targetField) => {
    setMapping(prev => ({ ...prev, [csvHeader]: targetField }));
  };

  // Mettre à jour une propriété d'un nouveau champ
  const handleNewFieldConfigChange = (csvHeader, property, value) => {
    setNouveauxChamps(prev => ({
      ...prev,
      [csvHeader]: { ...prev[csvHeader], [property]: value }
    }));
  };

  // Gérer les options de liste pour un nouveau champ
  const handleNewFieldOptionsChange = (csvHeader, optionsString) => {
    const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    handleNewFieldConfigChange(csvHeader, 'options', options);
  };

  const loadTemplateByName = (name) => {
    const t = templates.find(tmp => tmp.name === name);
    if (!t) return;
    setColumnActions(t.columnActions || {});
    setMapping(t.mapping || {});
    setNouveauxChamps(t.nouveauxChamps || {});
  };

  const saveCurrentTemplate = () => {
    const trimmed = templateName.trim();
    if (!trimmed) return;
    const newTemplate = { name: trimmed, mapping, columnActions, nouveauxChamps };
    const updated = templates.filter(t => t.name !== trimmed).concat(newTemplate);
    setTemplates(updated);
    localStorage.setItem('importMappingTemplates', JSON.stringify(updated));
    setTemplateName('');
    setSelectedTemplate(trimmed);
    setMessage({ text: 'Template enregistré', type: 'success' });
  };

  // Validation et envoi des données
  const handleImport = async () => {
    if (!fileContent) {
      setMessage({ text: 'Veuillez sélectionner un fichier.', type: 'error' }); return;
    }
    if (!numeroIndividuHeader || mapping[numeroIndividuHeader] !== 'numero_unique') {
      setMessage({ text: 'Le numéro d\'individu doit être identifié et mappé à "numero_unique".', type: 'error' }); return;
    }

    let validationErrors = [];
    const finalColumnsConfig = {};
    const newFieldKeys = new Set();
    const mappedTargets = new Set();

    previewData.rawHeaders.forEach(csvHeader => {
      const action = columnActions[csvHeader];
      finalColumnsConfig[csvHeader] = { action };

      if (action === 'map') {
        const targetField = mapping[csvHeader];
        if (csvHeader === numeroIndividuHeader) {
            if (targetField !== 'numero_unique') {
                validationErrors.push(`La colonne "${csvHeader}" (numéro d'individu) doit être mappée à "numero_unique".`);
            }
        } else if (!targetField || targetField === 'ignorer') {
          validationErrors.push(`Colonne "${csvHeader}": Veuillez spécifier un champ de destination ou l'ignorer.`);
        } else {
          if (mappedTargets.has(targetField)) {
            validationErrors.push(`Champ de destination "${targetField}" est mappé plusieurs fois.`);
          }
          mappedTargets.add(targetField);
        }
        finalColumnsConfig[csvHeader].targetField = targetField;
      } else if (action === 'create') {
        const fieldConfig = nouveauxChamps[csvHeader];
        if (!fieldConfig.categorie_id) validationErrors.push(`Colonne "${csvHeader}": Sélectionnez une catégorie pour le nouveau champ.`);
        if (fieldConfig.categorie_id === '__new__' && !fieldConfig.newCategorieNom?.trim()) {
          validationErrors.push(`Colonne "${csvHeader}": Nom de la nouvelle catégorie manquant.`);
        }
        if (!fieldConfig.label?.trim()) validationErrors.push(`Colonne "${csvHeader}": Libellé manquant pour le nouveau champ.`);
        if (!fieldConfig.key?.trim() || !/^[a-zA-Z0-9_]+$/.test(fieldConfig.key.trim())) {
          validationErrors.push(`Colonne "${csvHeader}": Clé invalide pour le nouveau champ.`);
        } else {
          if (newFieldKeys.has(fieldConfig.key.trim())) {
            validationErrors.push(`Clé de nouveau champ "${fieldConfig.key.trim()}" dupliquée.`);
          }
          newFieldKeys.add(fieldConfig.key.trim());
        }
        if (fieldConfig.type === 'list' && fieldConfig.options.length === 0) {
            validationErrors.push(`Colonne "${csvHeader}": Options manquantes pour le type liste.`);
        }
        finalColumnsConfig[csvHeader].fieldConfig = fieldConfig;
      }
    });

    if (validationErrors.length > 0) {
      setMessage({ text: "Erreurs de validation:\n- " + validationErrors.join("\n- "), type: 'error' });
      return;
    }

    setLoading(true);
    setMessage({ text: 'Importation en cours...', type: 'info' });

    const params = {
      fileContent,
      fileName,
      numeroIndividuHeader,
      columns: finalColumnsConfig,
      userId: user.id || user.userId,
      createIfMissing,
    };

    try {
      // Remplacer par: const res = await window.api.importCSV(params);
      const res = await new Promise(resolve => setTimeout(() => {
          let newFieldsCount = 0;
          Object.values(params.columns).forEach(col => {
              if (col.action === 'create') newFieldsCount++;
          });
          resolve({
              success: true,
              insertedCount: Math.floor(Math.random() * 50) + 1,
              updatedCount: Math.floor(Math.random() * 20),
              newFieldsCount: newFieldsCount,
              errorCount: 0,
              errors: []
          });
      }, 2000));

      if (res.success) {
        let successMsg = `Importation réussie ! ${res.insertedCount || 0} enregistrement(s) inséré(s).`;
        if (res.updatedCount) successMsg += ` ${res.updatedCount} mis à jour.`;
        if (res.newFieldsCount) successMsg += ` ${res.newFieldsCount} nouveau(x) champ(s) créé(s).`;
        if (res.errorCount > 0) {
          successMsg += ` ${res.errorCount} erreur(s).`;
          console.warn("Erreurs d'importation:", res.errors);
          setMessage({ text: successMsg, type: 'warning' });
        } else {
          setMessage({ text: successMsg, type: 'success' });
        }
        setImportStep(4);
      } else {
        setMessage({ text: `Erreur lors de l'import: ${res.error || 'Problème inconnu'}`, type: 'error' });
      }
    } catch (error) {
      setMessage({ text: `Erreur critique lors de l'importation: ${error.message}`, type: 'error' });
      console.error("Erreur critique import:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const resetImport = () => {
    setImportStep(1); setFileContent(null); setFileName(''); setPreviewData(null);
    setMapping({}); setColumnActions({}); setNouveauxChamps({}); setNumeroIndividuHeader('');
    if (fileRef.current) fileRef.current.value = '';
    setMessage({ text: '', type: 'info' }); setLoading(false);
  };

  const renderContent = () => {
    switch(importStep) {
      case 1: // Sélection du fichier
        return (
          <div className="wizard-panel-content">
            <div className="form-group">
              <label htmlFor="file-upload-input">Sélectionner un fichier (CSV, XLS, XLSX):</label>
              <input 
                id="file-upload-input" type="file" accept=".csv,.xls,.xlsx" 
                ref={fileRef} onChange={handleFileSelect}
                className="file-input stylish-input" disabled={loading}
              />
              <p className="help-text">
                Le fichier doit contenir une ligne d'en-tête.
              </p>
            </div>
          </div>
        );
        
      case 2: // Identification du numéro d'individu
        if (!previewData) return <div className="loading">Chargement de l'aperçu...</div>;
        return (
          <div className="wizard-panel-content">
            <h3>Identification du numéro d'individu</h3>
            <p className="help-text important">
              Sélectionnez la colonne du fichier qui contient le numéro unique d'individu.
              Ce champ sera mappé à "numero_unique" dans la base de données.
            </p>
            <div className="preview-container" style={{maxHeight: '250px', overflowY: 'auto'}}>
              <h4>Aperçu des données</h4>
              <div className="preview-table-container">
                <table className="data-table preview-table">
                  <thead><tr>{previewData.headers.map((h, i) => <th key={`h-${i}`}>{h}</th>)}</tr></thead>
                  <tbody>{previewData.rows.map((r, i) => <tr key={`r-${i}`}>{r.map((c, ci) => <td key={`c-${i}-${ci}`}>{String(c)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="numero-individu-select">Colonne pour le numéro d'individu:</label>
              <select
                id="numero-individu-select" value={numeroIndividuHeader}
                onChange={(e) => setNumeroIndividuHeader(e.target.value)}
                className="stylish-input select-stylish" required
              >
                <option value="">-- Sélectionnez --</option>
                {previewData.rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>
                <input type="checkbox" checked={createIfMissing} onChange={e => setCreateIfMissing(e.target.checked)} />
                Créer un individu si le numéro est manquant
              </label>
              <p className="help-text">Les lignes sans numéro unique seront importées si cette option est cochée.</p>
            </div>
            <div className="form-actions">
              <button onClick={resetImport} className="btn-secondary">Retour</button>
              <button onClick={handleNumeroIndividuMapping} className="btn-primary" disabled={!numeroIndividuHeader}>Continuer</button>
            </div>
          </div>
        );
        
      case 3: // Configuration du mapping des colonnes
        if (!previewData) return <div className="loading">Chargement...</div>;
        return (
          <div className="wizard-panel-content">
            <h3>Configuration du mapping des colonnes</h3>
             <div className="preview-container" style={{maxHeight: '200px', overflowY: 'auto', marginBottom: 'var(--spacing-5)'}}>
              <h4>Aperçu des données (rappel)</h4>
              <div className="preview-table-container">
                <table className="data-table preview-table">
                  <thead><tr>{previewData.headers.map((h, i) => <th key={`prev-h-${i}`}>{h}</th>)}</tr></thead>
                  <tbody>{previewData.rows.map((r, i) => <tr key={`prev-r-${i}`}>{r.map((c,ci) => <td key={`prev-c-${i}-${ci}`}>{String(c)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="template-section" style={{marginBottom: 'var(--spacing-5)'}}>
              <div className="form-group">
                <label>Charger un template:</label>
                <div style={{display:'flex',gap:'var(--spacing-3)'}}>
                  <select className="stylish-input select-stylish" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                    <option value="">-- Sélectionner --</option>
                    {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                  <button type="button" onClick={() => loadTemplateByName(selectedTemplate)} disabled={!selectedTemplate}>Charger</button>
                </div>
              </div>
              <div className="form-group">
                <label>Enregistrer comme template:</label>
                <div style={{display:'flex',gap:'var(--spacing-3)'}}>
                  <input type="text" className="stylish-input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Nom du template" />
                  <button type="button" onClick={saveCurrentTemplate} disabled={!templateName.trim()}>Sauvegarder</button>
                </div>
              </div>
            </div>
            <div className="mapping-form-container">
              {previewData.rawHeaders.map((csvHeader, idx) => (
                <div key={csvHeader} className={`mapping-field-row ${csvHeader === numeroIndividuHeader ? 'special-field-row' : ''}`}>
                  <div className="form-group mapping-source">
                    <label>Colonne du fichier: <strong>{csvHeader}</strong></label>
                  </div>
                  {csvHeader === numeroIndividuHeader ? (
                    <div className="special-mapping">
                      <p>Mappée à : <strong>Numéro d'individu (numero_unique)</strong> (Obligatoire)</p>
                    </div>
                  ) : (
                    <div className="mapping-options">
                      <div className="radio-group">
                        <label>
                          <input type="radio" name={`action-${csvHeader}`} value="map" 
                                 checked={columnActions[csvHeader] === 'map'} 
                                 onChange={() => handleColumnActionChange(csvHeader, 'map')} />
                          Mapper à un champ existant
                        </label>
                        <label>
                          <input type="radio" name={`action-${csvHeader}`} value="create"
                                 checked={columnActions[csvHeader] === 'create'}
                                 onChange={() => handleColumnActionChange(csvHeader, 'create')} />
                          Créer un nouveau champ
                        </label>
                        <label>
                          <input type="radio" name={`action-${csvHeader}`} value="ignore"
                                 checked={columnActions[csvHeader] === 'ignore'}
                                 onChange={() => handleColumnActionChange(csvHeader, 'ignore')} />
                          Ignorer cette colonne
                        </label>
                      </div>

                      {columnActions[csvHeader] === 'map' && (
                        <div className="form-group">
                          <label htmlFor={`target-${csvHeader}`}>Champ de destination DB:</label>
                          <select id={`target-${csvHeader}`} className="stylish-input select-stylish"
                                  value={mapping[csvHeader] || ''}
                                  onChange={e => handleMappingTargetChange(csvHeader, e.target.value)}>
                            <option value="">-- Sélectionner --</option>
                            {existingFields.map(f => (
                              <option key={f.key} value={f.key}>{`${f.categorieNom} - ${f.label}`}</option>
                            ))}
                          </select>
                        </div>
                      )}

                      {columnActions[csvHeader] === 'create' && (
                        <div className="nouveau-champ-config">
                          <h5>Configuration du nouveau champ</h5>
                          <div className="form-group">
                            <label htmlFor={`cat-${csvHeader}`}>Catégorie:</label>
                            <select id={`cat-${csvHeader}`} className="stylish-input select-stylish"
                                    value={nouveauxChamps[csvHeader]?.categorie_id || ''}
                                    onChange={e => handleNewFieldConfigChange(csvHeader, 'categorie_id', e.target.value)} required>
                              <option value="">-- Sélectionner catégorie --</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                              <option value="__new__">-- Nouvelle catégorie --</option>
                            </select>
                            {nouveauxChamps[csvHeader]?.categorie_id === '__new__' && (
                              <input type="text" className="stylish-input" placeholder="Nom nouvelle catégorie"
                                     value={nouveauxChamps[csvHeader]?.newCategorieNom || ''}
                                     onChange={e => handleNewFieldConfigChange(csvHeader, 'newCategorieNom', e.target.value)} />
                            )}
                          </div>
                          <div className="form-group">
                            <label htmlFor={`label-${csvHeader}`}>Libellé:</label>
                            <input id={`label-${csvHeader}`} type="text" className="stylish-input"
                                   value={nouveauxChamps[csvHeader]?.label || ''}
                                   onChange={e => handleNewFieldConfigChange(csvHeader, 'label', e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor={`key-${csvHeader}`}>Clé technique:</label>
                            <input id={`key-${csvHeader}`} type="text" className="stylish-input"
                                   value={nouveauxChamps[csvHeader]?.key || ''}
                                   onChange={e => handleNewFieldConfigChange(csvHeader, 'key', e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase())} 
                                   pattern="[a-zA-Z0-9_]+" title="Lettres, chiffres, underscores" required />
                          </div>
                          <div className="form-group">
                            <label htmlFor={`type-${csvHeader}`}>Type:</label>
                            <select id={`type-${csvHeader}`} className="stylish-input select-stylish"
                                    value={nouveauxChamps[csvHeader]?.type || 'text'}
                                    onChange={e => handleNewFieldConfigChange(csvHeader, 'type', e.target.value)}>
                              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          {nouveauxChamps[csvHeader]?.type === 'text' && (
                            <div className="form-group">
                              <label htmlFor={`maxLength-${csvHeader}`}>Longueur Max:</label>
                              <input id={`maxLength-${csvHeader}`} type="number" className="stylish-input"
                                     value={nouveauxChamps[csvHeader]?.maxLength || ''}
                                     onChange={e => handleNewFieldConfigChange(csvHeader, 'maxLength', e.target.value ? parseInt(e.target.value) : null)} min="1" />
                            </div>
                          )}
                          {nouveauxChamps[csvHeader]?.type === 'list' && (
                            <div className="form-group">
                              <label htmlFor={`options-${csvHeader}`}>Options (séparées par virgule):</label>
                              <input id={`options-${csvHeader}`} type="text" className="stylish-input"
                                     value={(nouveauxChamps[csvHeader]?.options || []).join(',')}
                                     onChange={e => handleNewFieldOptionsChange(csvHeader, e.target.value)} />
                            </div>
                          )}
                          <div className="champ-options-checkboxes">
                            <label><input type="checkbox" checked={nouveauxChamps[csvHeader]?.obligatoire || false} onChange={e => handleNewFieldConfigChange(csvHeader, 'obligatoire', e.target.checked)} /> Obligatoire</label>
                            <label><input type="checkbox" checked={nouveauxChamps[csvHeader]?.visible === undefined ? true : nouveauxChamps[csvHeader]?.visible} onChange={e => handleNewFieldConfigChange(csvHeader, 'visible', e.target.checked)} /> Visible</label>
                            <label><input type="checkbox" checked={nouveauxChamps[csvHeader]?.afficherEnTete || false} onChange={e => handleNewFieldConfigChange(csvHeader, 'afficherEnTete', e.target.checked)} /> Afficher en en-tête</label>
                          </div>
                        </div>
                      )}
                       {columnActions[csvHeader] === 'ignore' && (
                         <p className="help-text">Cette colonne sera ignorée.</p>
                       )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="form-actions">
              <button onClick={() => setImportStep(2)} className="btn-secondary" disabled={loading}>Retour</button>
              <button onClick={handleImport} className="btn-primary" disabled={loading}>
                {loading ? 'Importation en cours...' : "Lancer l'importation"}
              </button>
            </div>
          </div>
        );

      case 4: // Résultats
        return (
          <div className="wizard-panel-content">
            <div className="import-results">
              <h3>Importation Terminée</h3>
              <button onClick={resetImport} className="btn-primary">Effectuer un nouvel import</button>
            </div>
          </div>
        );
      default: return <p>Étape inconnue.</p>;
    }
  };

  return (
    <div className="import-wizard admin-panel">
      <h2 className="panel-title">Importation de Données Individus</h2>
      {message.text && (
        <div className={`message-banner ${message.type === 'success' ? 'success-message' : message.type === 'warning' ? 'warning-message' : message.type === 'error' ? 'error-message' : 'info-message'}`}>
          {message.type === 'success' ? '✓ ' : message.type === 'warning' ? '⚠️ ' : message.type === 'error' ? '⚠ ' : 'ℹ️ '} 
          {message.text}
        </div>
      )}
      <div className="wizard-steps">
        <div className={`wizard-step ${importStep === 1 ? 'active' : importStep > 1 ? 'completed' : ''}`}>
          <span className="step-number">1. </span><span className="step-label">Fichier</span>
        </div>
        <div className={`wizard-step ${importStep === 2 ? 'active' : importStep > 2 ? 'completed' : ''} ${!fileContent ? 'disabled' : ''}`}>
          <span className="step-number">2. </span><span className="step-label">N° Individu</span>
        </div>
        <div className={`wizard-step ${importStep === 3 ? 'active' : importStep > 3 ? 'completed' : ''} ${!numeroIndividuHeader ? 'disabled' : ''}`}>
          <span className="step-number">3. </span><span className="step-label">Mapping</span>
        </div>
        <div className={`wizard-step ${importStep === 4 ? 'active' : ''} ${importStep < 4 ? 'disabled' : ''}`}>
          <span className="step-number">4. </span><span className="step-label">Résultats</span>
        </div>
      </div>
      <div className="wizard-content">
        {loading && importStep > 1 && importStep < 4 && <div className="loading">Traitement...</div>}
        {(!loading || importStep === 1 || importStep === 4) && renderContent()}
      </div>
    </div>
  );
}
