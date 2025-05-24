import React, { useRef, useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { formatDateToDDMMYYYY } from '../utils/date';

// Constantes pour les types de champs disponibles
const FIELD_TYPES = [
  { value: 'text', label: 'Texte' },
  { value: 'number', label: 'Nombre' },
  { value: 'date', label: 'Date' },
  { value: 'list', label: 'Liste déroulante' },
  { value: 'checkbox', label: 'Case à cocher' }
];

// --- DÉBUT DES FONCTIONS D'AIDE POUR LE NETTOYAGE DES DONNÉES ---

// Fonction pour nettoyer les nombres au format suisse (ex: "1'234.50" -> 1234.50)
function cleanSwissNumberString(value) {
  if (typeof value === 'string') {
    const cleaned = value.replace(/'/g, ''); // Supprimer les apostrophes
    // Vérifier si c'est une chaîne de nombre valide (potentiellement avec un point décimal)
    if (/^-?\d*\.?\d+$/.test(cleaned)) {
      const num = parseFloat(cleaned);
      if (!isNaN(num) && isFinite(num)) {
        return num; // Retourner le nombre
      }
    }
  } else if (typeof value === 'number') {
    return value; // Déjà un nombre
  }
  return value; // Retourner l'original si ce n'est pas une chaîne convertible ou déjà un nombre
}


// Fonction d'aide pour déterminer le type d'un champ
function getFieldType(csvHeader, columnConfig, existingFields) {
    if (!columnConfig) return null;

    if (columnConfig.action === 'create' || 
        columnConfig.action === 'create_in_existing_category' || 
        columnConfig.action === 'create_in_new_category') {
        // Pour les nouveaux champs, le type est dans fieldConfig
        return columnConfig.fieldConfig?.type || null;
    } else if (columnConfig.action === 'map') {
        // Pour les champs mappés, trouver le type à partir des champs existants
        if (columnConfig.targetField === 'numero_unique') return 'text'; // Ou 'number' si c'est toujours numérique
        const existingField = existingFields.find(f => f.key === columnConfig.targetField);
        return existingField?.type || null;
    }
    return null; // Pas d'action ou action inconnue
}

// Fonction de nettoyage pour une ligne de données
function cleanRowData(rawRow, rawHeaders, finalColumnsConfig, existingFields) {
  if (!rawRow || !Array.isArray(rawRow) || !rawHeaders || !Array.isArray(rawHeaders) || !finalColumnsConfig) {
    // console.warn("cleanRowData: Entrée invalide", {rawRow, rawHeaders, finalColumnsConfig});
    return rawRow; // Ou lever une erreur
  }

  return rawRow.map((rawValue, index) => {
    const csvHeader = rawHeaders[index];
    // S'il n'y a pas d'en-tête pour cet index (ne devrait pas arriver si les longueurs correspondent)
    if (typeof csvHeader === 'undefined') return rawValue; 

    const columnConfig = finalColumnsConfig[csvHeader];
    // Si pas de configuration pour cet en-tête ou si la colonne est ignorée
    if (!columnConfig || columnConfig.action === 'ignore') {
      return rawValue;
    }

    // Déterminer le type de données attendu pour ce champ
    const fieldType = getFieldType(csvHeader, columnConfig, existingFields);
    let cleanedValue = rawValue;

    if (fieldType === 'number') {
      cleanedValue = cleanSwissNumberString(rawValue);
    } else if (fieldType === 'date') {
      cleanedValue = formatDateToDDMMYYYY(rawValue);
    }
    // Ajouter d'autres types si nécessaire, par exemple, booléen pour 'checkbox'
    // Pour 'text', 'list', 'checkbox' (si la valeur est une chaîne comme 'true'/'false'),
    // généralement pas de nettoyage spécial nécessaire à part trim().
    // if (typeof cleanedValue === 'string') {
    //   cleanedValue = cleanedValue.trim();
    // }
    return cleanedValue;
  });
}

// --- FIN DES FONCTIONS D'AIDE POUR LE NETTOYAGE DES DONNÉES ---

export default function ImportData({ user }) {
  // Références et états
  const fileRef = useRef();
  const [categories, setCategories] = useState([]);
  const [existingFields, setExistingFields] = useState([]);

  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [templateName, setTemplateName] = useState('');
  
  const [mapping, setMapping] = useState({});
  const [columnActions, setColumnActions] = useState({});
  const [nouveauxChamps, setNouveauxChamps] = useState({});
  
  const [message, setMessage] = useState({ text: '', type: 'info' });
  const [importStep, setImportStep] = useState(1);
  const [previewData, setPreviewData] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [fileName, setFileName] = useState('');
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState(0);

  const [numeroIndividuHeader, setNumeroIndividuHeader] = useState('');
  const [createIfMissing, setCreateIfMissing] = useState(false);
  const messageTimeoutIdRef = useRef(null);

  const setAndClearMessage = useCallback((newMessage, duration = 7000) => {
    setMessage(newMessage);
    if (messageTimeoutIdRef.current) {
      clearTimeout(messageTimeoutIdRef.current);
    }
    messageTimeoutIdRef.current = setTimeout(() => {
      setMessage({ text: '', type: '' });
    }, duration);
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        const catResult = window.api && window.api.getCategories
          ? await window.api.getCategories()
          : { success: true, data: [] }; 

        if (catResult && catResult.success && Array.isArray(catResult.data)) {
          const activeCategories = catResult.data.filter(cat => cat.deleted !== 1);
          setCategories(activeCategories);
          
          const fields = [];
          const systemFields = [
            { key: 'en_charge', label: 'Utilisateur en charge', categorieNom: 'Système', categorieId: 'system', type: 'user_select' }
          ];
          fields.push(...systemFields);
          
          activeCategories.forEach(cat => {
            (cat.champs || []).forEach(ch => {
              fields.push({ ...ch, categorieNom: cat.nom, categorieId: cat.id });
            });
          });
          setExistingFields(fields); // existingFields est maintenant disponible pour cleanRowData
          
          if (activeCategories.length === 0) {
             setAndClearMessage({ text: 'Aucune catégorie active trouvée. La création de nouveaux champs nécessitera une catégorie.', type: 'warning' });
          }
        } else {
          setAndClearMessage({
            text: `Impossible de charger les catégories: ${catResult.error || 'Réponse invalide du serveur'}.`,
            type: 'error'
          });
        }
      } catch (error) {
        console.error("Erreur lors du chargement des catégories:", error);
        setAndClearMessage({
          text: `Erreur critique lors du chargement des catégories: ${error.message}`,
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
      try {
        const storedTemplates = JSON.parse(localStorage.getItem('importMappingTemplates') || '[]');
        if (Array.isArray(storedTemplates)) setTemplates(storedTemplates);
      } catch (e) {
        console.error("Erreur chargement templates depuis localStorage:", e);
        setTemplates([]);
      }
    };
    loadInitialData();
    
    return () => {
        if (messageTimeoutIdRef.current) {
            clearTimeout(messageTimeoutIdRef.current);
        }
    };
  }, [setAndClearMessage]);

  useEffect(() => {
    const listener = (_event, data) => {
      if (data && typeof data.percent === 'number') {
        setImportProgress(data.percent);
      }
    };
    if (window.api && window.api.onImportProgress) {
      window.api.onImportProgress(listener);
    }
    return () => {
      if (window.api && window.api.removeImportProgressListener) {
        window.api.removeImportProgressListener(listener);
      }
    };
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) {
      setAndClearMessage({ text: 'Aucun fichier sélectionné.', type: 'error' });
      return;
    }
    
    setFileName(file.name);
    setAndClearMessage({ text: `Fichier "${file.name}" sélectionné.`, type: 'info' });

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
        if (headerRange.s.r === 0) { 
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
          setAndClearMessage({ text: 'Impossible de lire les en-têtes du fichier. Vérifiez le format.', type: 'error' });
          setPreviewData(null);
          return;
        }
        
        setPreviewData({
          headers: rawHeaders,
          rows: dataRows.slice(0, 5).map(row => rawHeaders.map((_, idx) => row[idx] || "")),
          rawHeaders: rawHeaders
        });

        const initialColumnActions = {};
        const initialNouveauxChamps = {};
        const initialMapping = {};
        
        rawHeaders.forEach(header => {
          initialColumnActions[header] = 'map'; 
          initialMapping[header] = ''; 
          
          initialNouveauxChamps[header] = {
            categorie_id: categories.length > 0 ? categories[0].id.toString() : '',
            newCategorieNom: '',
            label: header,
            key: header.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 50) || `champ_${Date.now()}`,
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
        setNumeroIndividuHeader(''); 

        setImportStep(2); 
      } catch (error) {
        console.error("Erreur lors de la lecture du fichier:", error);
        setAndClearMessage({ text: `Erreur lors de la lecture du fichier: ${error.message}. Assurez-vous que c'est un format CSV ou Excel valide.`, type: 'error' });
        setPreviewData(null); setFileContent(null); setFileName('');
        if(fileRef.current) fileRef.current.value = '';
      }
    };
    reader.onerror = () => {
        setAndClearMessage({ text: 'Erreur lors de la lecture du fichier.', type: 'error' });
        setFileContent(null); setFileName('');
        if(fileRef.current) fileRef.current.value = '';
    };
    reader.readAsBinaryString(file);
  };

  const handleNumeroIndividuMapping = () => {
    if (!numeroIndividuHeader) {
      setAndClearMessage({ text: 'La sélection du champ pour le numéro d\'individu est obligatoire.', type: 'error' });
      return;
    }

    setColumnActions(prev => ({ ...prev, [numeroIndividuHeader]: 'map' }));
    setMapping(prev => ({ ...prev, [numeroIndividuHeader]: 'numero_unique' }));
    setNouveauxChamps(prev => ({
        ...prev,
        [numeroIndividuHeader]: { ...prev[numeroIndividuHeader] }
    }));

    setImportStep(3); 
  };

  const handleColumnActionChange = (csvHeader, action) => {
    setColumnActions(prev => ({ ...prev, [csvHeader]: action }));
    if (action === 'ignore') {
      setMapping(prev => ({ ...prev, [csvHeader]: 'ignorer' }));
    } else if (mapping[csvHeader] === 'ignorer') { 
      setMapping(prev => ({ ...prev, [csvHeader]: '' })); 
    }
    if (action === 'create') { 
        setMapping(prev => ({...prev, [csvHeader]: ''}));
    }
  };

  const handleMappingTargetChange = (csvHeader, targetField) => {
    setMapping(prev => ({ ...prev, [csvHeader]: targetField }));
  };

  const handleNewFieldConfigChange = (csvHeader, property, value) => {
    setNouveauxChamps(prev => ({
      ...prev,
      [csvHeader]: { ...prev[csvHeader], [property]: value }
    }));
  };

  const handleNewFieldOptionsChange = (csvHeader, optionsString) => {
    const options = optionsString.split(',').map(opt => opt.trim()).filter(opt => opt !== '');
    handleNewFieldConfigChange(csvHeader, 'options', options);
  };

  const loadTemplateByName = (name) => {
    const t = templates.find(tmp => tmp.name === name);
    if (!t) {
        setAndClearMessage({text: `Template "${name}" non trouvé.`, type: 'error'});
        return;
    }
    setColumnActions(t.columnActions || {});
    setMapping(t.mapping || {});
    setNouveauxChamps(t.nouveauxChamps || {});
    setSelectedTemplate(name);
    setAndClearMessage({text: `Template "${name}" chargé.`, type: 'success'});
  };

  const saveCurrentTemplate = () => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
        setAndClearMessage({text: "Veuillez donner un nom au template.", type: 'error'});
        return;
    }
    const newTemplate = { name: trimmedName, mapping, columnActions, nouveauxChamps };
    const updatedTemplates = templates.filter(t => t.name !== trimmedName).concat(newTemplate);
    setTemplates(updatedTemplates);
    localStorage.setItem('importMappingTemplates', JSON.stringify(updatedTemplates));
    setTemplateName('');
    setSelectedTemplate(trimmedName);
    setAndClearMessage({ text: `Template "${trimmedName}" enregistré.`, type: 'success' });
  };

  const deleteTemplate = (nameToDelete) => {
    // Remplacer window.confirm par une modale personnalisée si possible dans votre application
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le template "${nameToDelete}" ?`)) return;
    const updatedTemplates = templates.filter(t => t.name !== nameToDelete);
    setTemplates(updatedTemplates);
    localStorage.setItem('importMappingTemplates', JSON.stringify(updatedTemplates));
    if (selectedTemplate === nameToDelete) {
        setSelectedTemplate('');
    }
    setAndClearMessage({ text: `Template "${nameToDelete}" supprimé.`, type: 'success' });
  };

  // --- DÉBUT DE LA FONCTION handleImport MODIFIÉE ---
  const handleImport = async () => {
    // Validations initiales (existantes)
    if (!fileContent) {
      setAndClearMessage({ text: 'Veuillez sélectionner un fichier.', type: 'error' }); return;
    }
    if (!numeroIndividuHeader || mapping[numeroIndividuHeader] !== 'numero_unique') {
      setAndClearMessage({ text: 'Le numéro d\'individu doit être identifié et mappé à "numero_unique".', type: 'error' }); return;
    }
    if (!previewData || !previewData.rawHeaders || !Array.isArray(previewData.rawHeaders)) {
      setAndClearMessage({ text: 'Données d\'aperçu invalides. Veuillez recharger le fichier.', type: 'error' }); return;
    }
    if (!columnActions || typeof columnActions !== 'object') {
      setAndClearMessage({ text: 'Actions des colonnes non définies. Veuillez reconfigurer le mapping.', type: 'error' }); return;
    }
    if (!mapping || typeof mapping !== 'object') {
      setAndClearMessage({ text: 'Mapping des colonnes non défini. Veuillez reconfigurer le mapping.', type: 'error' }); return;
    }

    // Construction de finalColumnsConfig et newCategoriesArray (existant)
    let validationErrors = [];
    const finalColumnsConfig = {};
    const newFieldKeys = new Set(); 
    const mappedTargets = new Set(); 
    const newCategoriesMap = new Map();

    if (previewData.rawHeaders.length === 0) {
      setAndClearMessage({ text: 'Aucune colonne trouvée dans le fichier.', type: 'error' }); return;
    }

    previewData.rawHeaders.forEach(csvHeader => {
      const action = columnActions[csvHeader];
      if (action === 'map') {
        const targetField = mapping[csvHeader];
        if (csvHeader === numeroIndividuHeader) {
            if (targetField !== 'numero_unique') {
                validationErrors.push(`La colonne "${csvHeader}" (numéro d'individu) doit être mappée à "numero_unique".`);
            }
        } else if (!targetField || targetField === 'ignorer') {
          validationErrors.push(`Colonne "${csvHeader}": Veuillez spécifier un champ de destination ou l'ignorer.`);
        } else {
          if (mappedTargets.has(targetField) && targetField !== 'numero_unique') { 
            validationErrors.push(`Champ de destination "${targetField}" est mappé plusieurs fois.`);
          }
          mappedTargets.add(targetField);
        }
        finalColumnsConfig[csvHeader] = { action, targetField };
      } else if (action === 'create') {
        const fieldConfig = nouveauxChamps[csvHeader];
        if (!fieldConfig.categorie_id) {
            validationErrors.push(`Colonne "${csvHeader}": Sélectionnez une catégorie pour le nouveau champ.`);
        }
        if (fieldConfig.categorie_id === '__new__' && !fieldConfig.newCategorieNom?.trim()) {
          validationErrors.push(`Colonne "${csvHeader}": Nom de la nouvelle catégorie manquant.`);
        }
        if (!fieldConfig.label?.trim()) {
            validationErrors.push(`Colonne "${csvHeader}": Libellé manquant pour le nouveau champ.`);
        }
        if (!fieldConfig.key?.trim() || !/^[a-zA-Z0-9_]+$/.test(fieldConfig.key.trim())) {
          validationErrors.push(`Colonne "${csvHeader}": Clé invalide ("${fieldConfig.key?.trim()}"). Utilisez uniquement lettres, chiffres, underscores.`);
        } else {
          if (newFieldKeys.has(fieldConfig.key.trim())) {
            validationErrors.push(`Clé de nouveau champ "${fieldConfig.key.trim()}" (colonne "${csvHeader}") dupliquée dans cet import.`);
          }
          newFieldKeys.add(fieldConfig.key.trim());
        }
        if (fieldConfig.type === 'list' && (!fieldConfig.options || fieldConfig.options.length === 0)) {
            validationErrors.push(`Colonne "${csvHeader}": Options manquantes pour le type liste.`);
        }
  
        if (fieldConfig.categorie_id === '__new__' && fieldConfig.newCategorieNom?.trim()) {
          const categoryName = fieldConfig.newCategorieNom.trim();
          const categoryNameLower = categoryName.toLowerCase();
          const existingCategoryInDB = categories.find(cat => cat.nom.toLowerCase() === categoryNameLower);
          if (existingCategoryInDB) {
            finalColumnsConfig[csvHeader] = {
              action: 'create_in_existing_category', targetCategoryId: existingCategoryInDB.id,
              fieldConfig: { ...fieldConfig, key: fieldConfig.key.trim(), label: fieldConfig.label.trim(), categorie_id: existingCategoryInDB.id, newCategorieNom: undefined, ordre: Number(fieldConfig.ordre) || 0, maxLength: fieldConfig.type === 'text' && fieldConfig.maxLength ? parseInt(fieldConfig.maxLength, 10) : null, afficherEnTete: fieldConfig.afficherEnTete || false }
            };
          } else {
            if (!newCategoriesMap.has(categoryNameLower)) {
              newCategoriesMap.set(categoryNameLower, { nom: categoryName, champs: [], colonnes: [] });
            }
            const categoryGroup = newCategoriesMap.get(categoryNameLower);
            categoryGroup.champs.push({ ...fieldConfig, key: fieldConfig.key.trim(), label: fieldConfig.label.trim(), newCategorieNom: categoryName, ordre: Number(fieldConfig.ordre) || 0, maxLength: fieldConfig.type === 'text' && fieldConfig.maxLength ? parseInt(fieldConfig.maxLength, 10) : null, afficherEnTete: fieldConfig.afficherEnTete || false });
            categoryGroup.colonnes.push(csvHeader);
            finalColumnsConfig[csvHeader] = {
              action: 'create_in_new_category', newCategoryName: categoryName, 
              fieldConfig: { ...fieldConfig, key: fieldConfig.key.trim(), label: fieldConfig.label.trim(), ordre: Number(fieldConfig.ordre) || 0, maxLength: fieldConfig.type === 'text' && fieldConfig.maxLength ? parseInt(fieldConfig.maxLength, 10) : null, afficherEnTete: fieldConfig.afficherEnTete || false }
            };
          }
        } else if (fieldConfig.categorie_id && fieldConfig.categorie_id !== '__new__') {
          finalColumnsConfig[csvHeader] = { 
            action: 'create', 
            fieldConfig: { ...fieldConfig, key: fieldConfig.key.trim(), label: fieldConfig.label.trim(), categorie_id: fieldConfig.categorie_id, newCategorieNom: undefined, ordre: Number(fieldConfig.ordre) || 0, maxLength: fieldConfig.type === 'text' && fieldConfig.maxLength ? parseInt(fieldConfig.maxLength, 10) : null, afficherEnTete: fieldConfig.afficherEnTete || false }
          };
        }
      } else if (action === 'ignore') {
        finalColumnsConfig[csvHeader] = { action: 'ignore' };
      }
    });
  
    if (validationErrors.length > 0) {
      setAndClearMessage({ text: "Erreurs de validation:\n- " + validationErrors.join("\n- "), type: 'error' }, 15000);
      return;
    }
    const newCategoriesArray = Array.from(newCategoriesMap.values());

    // Message récapitulatif (existant)
    let summaryMsg = "";
    if (newCategoriesMap.size > 0) {
      summaryMsg += "Nouvelles catégories qui seront créées (si elles n'existent pas déjà sous un nom similaire) :\n";
      for (const [_, categoryGroup] of newCategoriesMap) {
        summaryMsg += `• "${categoryGroup.nom}" avec ${categoryGroup.champs.length} champ(s) : ${categoryGroup.champs.map(c => `"${c.label}" (clé: ${c.key})`).join(', ')}\n`;
      }
    }
    // ... (reste du code de summaryMsg existant)
    if (summaryMsg) {
      console.log("Résumé de l'importation (avant envoi au backend):\n", summaryMsg);
      setAndClearMessage({ text: "Préparation de l'import...\n" + summaryMsg.substring(0, 300) + (summaryMsg.length > 300 ? "..." : ""), type: 'info' }, 10000);
    }

    setLoading(true);
    setImportProgress(0);
    setAndClearMessage({ text: 'Importation en cours...', type: 'info' });

    // NOUVEAU : Envelopper le nettoyage et l'appel API dans un try-catch global
    try {
      // --- DÉBUT DE LA SECTION DE NETTOYAGE DES DONNÉES ---
      const workbook = XLSX.read(fileContent, { 
        type: 'binary', 
        cellDates: true, // Important pour que SheetJS essaie de convertir les dates Excel en objets Date JS
        cellStyles: true,
        cellFormulas: false 
      });
      
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      const allJsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, // Récupère les données sous forme de tableau de tableaux
        defval: "", // Valeur par défaut pour les cellules vides
        raw: false // IMPORTANT : Convertit les valeurs en chaînes formatées ou nombres (pas d'objets Date bruts)
                     // C'est pourquoi formatDateToDDMMYYYY doit gérer les chaînes et les nombres.
      });
      
      // Exclure la ligne d'en-tête des données à traiter si elle est présente
      const dataRows = allJsonData.length > 1 ? allJsonData.slice(1) : [];
      
      // Nettoyer chaque ligne de données
      const cleanedRows = dataRows.map((row, rowIndex) => {
        try {
          // Passer existingFields pour aider à déterminer les types de champs cibles
          return cleanRowData(row, previewData.rawHeaders, finalColumnsConfig, existingFields);
        } catch (error) {
          // En cas d'erreur de nettoyage pour une ligne spécifique
          console.warn(`Erreur lors du nettoyage de la ligne ${rowIndex + 2} (index ${rowIndex}):`, error.message, "Ligne originale:", row);
          // Retourner la ligne originale pour que le backend puisse la gérer ou la signaler
          return row; 
        }
      });
      
      console.log("Données nettoyées (échantillon de 3 lignes):", cleanedRows.slice(0, 3));
      // --- FIN DE LA SECTION DE NETTOYAGE DES DONNÉES ---
      
      // Préparer les paramètres pour l'appel API, incluant les données nettoyées
      const params = {
        fileContent, // Garder le contenu original pour le backend (comme dans votre snippet)
        fileName,
        numeroIndividuHeader, 
        columns: finalColumnsConfig, 
        newCategories: newCategoriesArray, 
        userId: user.id || user.userId,
        createIfMissing,
        cleanedData: cleanedRows, // NOUVEAU : Ajouter les données nettoyées
        headers: previewData.rawHeaders // NOUVEAU : Ajouter les en-têtes bruts
      };
      
      // Logs de vérification (existants, adaptés)
      console.log("=== VÉRIFICATION FINALE AVANT ENVOI (AVEC DONNÉES NETTOYÉES) ===");
      console.log("Paramètres complets à envoyer:", JSON.stringify(params, (key, value) => {
        if (key === 'fileContent' && value && typeof value === 'string' && value.length > 200) return `[FILE CONTENT base64, length ${value.length}]`; // Tronquer pour le log
        if (key === 'cleanedData' && Array.isArray(value) && value.length > 5) return `[CLEANED DATA, ${value.length} rows]`; // Résumer pour le log
        return value;
      }, 2));

      // Appel API avec les données (potentiellement nettoyées)
      const res = await window.api.importCSV(params);
      
      // Gestion de la réponse de l'API (existante)
      if (res.success) {
        let successMsg = `Importation réussie !`;
        if (res.insertedCount) successMsg += ` ${res.insertedCount} individu(s) inséré(s).`;
        if (res.updatedCount) successMsg += ` ${res.updatedCount} individu(s) mis à jour.`;
        if (res.newCategoriesCreatedCount) successMsg += ` ${res.newCategoriesCreatedCount} nouvelle(s) catégorie(s) créée(s).`;
        if (res.newFieldsAddedCount) successMsg += ` ${res.newFieldsAddedCount} nouveau(x) champ(s) ajouté(s) aux catégories.`;
        
        if (res.errorCount > 0 || (res.errors && res.errors.length > 0)) {
          const errorDetails = (res.errors || []).join("\n- ");
          successMsg += `\n${res.errorCount || (res.errors || []).length} erreur(s) lors du traitement des lignes/champs:\n- ${errorDetails}`;
          console.warn("Erreurs d'importation (backend):", res.errors);
          setAndClearMessage({ text: successMsg, type: 'warning' }, 20000);
        } else {
          setAndClearMessage({ text: successMsg, type: 'success' }, 10000);
        }
        setImportStep(4);
      } else { // res.success est false
        const errorDetails = (res.errors && res.errors.length > 0) ? "\nDétails:\n- " + res.errors.join("\n- ") : "";
        setAndClearMessage({ text: `Erreur lors de l'import (réponse API): ${res.error || 'Problème inconnu'}${errorDetails}`, type: 'error' }, 20000);
      }
      setLoading(false); // S'assurer que setLoading est false après le traitement réussi
      
    } catch (error) { // Gérer les erreurs du bloc try (nettoyage, préparation des params, ou appel API lui-même)
      console.error("Erreur globale lors de l'importation, du nettoyage ou de l'appel API:", error);
      // Le message d'erreur de votre snippet était spécifique au nettoyage. Le rendre plus générique.
      let displayErrorMessage = `Erreur lors de l'importation: ${error.message}`;
      // Vous pouvez ajouter une logique pour rendre le message plus spécifique si nécessaire
      // par exemple, en vérifiant si l'erreur provient d'une étape particulière.
      setAndClearMessage({ 
        text: displayErrorMessage, 
        type: 'error' 
      }, 15000);
      setLoading(false); // Important de remettre setLoading à false en cas d'erreur
      // return; // Le return ici est implicite si c'est la fin de la fonction et qu'une erreur est gérée.
    }
  };
  // --- FIN DE LA FONCTION handleImport MODIFIÉE ---
  
  const resetImport = () => {
    setImportStep(1); setFileContent(null); setFileName(''); setPreviewData(null);
    setMapping({}); setColumnActions({}); 
    const defaultNouveauxChamps = {};
    if (previewData && previewData.rawHeaders) { // S'assurer que previewData existe
        previewData.rawHeaders.forEach(header => {
            defaultNouveauxChamps[header] = {
                categorie_id: categories.length > 0 ? categories[0].id.toString() : '',
                newCategorieNom: '',
                label: header,
                key: header.toLowerCase().replace(/[^a-z0-9_]/g, '_').substring(0, 50) || `champ_${Date.now()}`,
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
    }
    setNouveauxChamps(defaultNouveauxChamps);

    setNumeroIndividuHeader('');
    setCreateIfMissing(false);
    if (fileRef.current) fileRef.current.value = '';
    setAndClearMessage({ text: '', type: 'info' }); setLoading(false); setImportProgress(0);
    setSelectedTemplate('');
  };

  const renderContent = () => {
    switch(importStep) {
      case 1: 
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
        
      case 2: 
        if (!previewData) return <div className="loading">Chargement de l'aperçu...</div>;
        return (
          <div className="wizard-panel-content">
            <h3>Identification du numéro d'individu</h3>
            <p className="help-text important">
              Sélectionnez la colonne du fichier qui contient le numéro unique d'individu.
              Ce champ sera mappé à "numero_unique" dans la base de données.
            </p>
            <div className="preview-container">
              <h4>Aperçu des données</h4>
              <div
                className="preview-table-container"
                style={{
                  overflowX: 'auto',      
                  overflowY: 'hidden',    
                  width: '100%',          
                  maxHeight: 'none',      
                  display: 'block',       
                  border: '1px solid var(--border-color-light)'
                }}
              >
                <table
                  className="data-table preview-table"
                  style={{
                    width: 'max-content',  
                    minWidth: '100%',      
                    whiteSpace: 'nowrap'   
                  }}
                >
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
                Créer un individu si le numéro est manquant dans la base de données
              </label>
              <p className="help-text">Si coché, les lignes avec un numéro unique non trouvé en base seront créées. Sinon, elles pourraient être ignorées ou mises à jour si le numéro existe.</p>
            </div>
            <div className="form-actions">
              <button onClick={resetImport} className="btn-secondary">Retour</button>
              <button onClick={handleNumeroIndividuMapping} className="btn-primary" disabled={!numeroIndividuHeader}>Continuer</button>
            </div>
          </div>
        );
        
      case 3: 
        if (!previewData) return <div className="loading">Chargement...</div>;
        return (
          <div className="wizard-panel-content">
            <h3>Configuration du mapping des colonnes</h3>
            <div className="preview-container" style={{marginBottom: 'var(--spacing-5)'}}>
              <h4>Aperçu des données (rappel)</h4>
              <div className="preview-table-container" style={{ overflowX: 'auto', overflowY: 'hidden', width: '100%', maxHeight: 'none', display: 'block', border: '1px solid var(--border-color-light)' }}>
                <table className="data-table preview-table" style={{ width: 'max-content', minWidth: '100%', whiteSpace: 'nowrap' }}>
                  <thead><tr>{previewData.headers.map((h, i) => <th key={`prev-h-${i}`}>{h}</th>)}</tr></thead>
                  <tbody>{previewData.rows.map((r, i) => <tr key={`prev-r-${i}`}>{r.map((c,ci) => <td key={`prev-c-${i}-${ci}`}>{String(c)}</td>)}</tr>)}</tbody>
                </table>
              </div>
            </div>
            <div className="template-section" style={{marginBottom: 'var(--spacing-5)', border: '1px solid var(--border-color-light)', padding: 'var(--spacing-4)', borderRadius: 'var(--border-radius-medium)'}}>
              <h4>Gestion des templates de mapping</h4>
              <div className="form-group">
                <label htmlFor="load-template-select">Charger un template:</label>
                <div style={{display:'flex',gap:'var(--spacing-3)', alignItems: 'center'}}>
                  <select id="load-template-select" className="stylish-input select-stylish" value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}>
                    <option value="">-- Sélectionner un template --</option>
                    {templates.map(t => <option key={t.name} value={t.name}>{t.name}</option>)}
                  </select>
                  <button type="button" onClick={() => loadTemplateByName(selectedTemplate)} disabled={!selectedTemplate} className="btn-secondary btn-small">Charger</button>
                  {selectedTemplate && (
                     <button type="button" onClick={() => deleteTemplate(selectedTemplate)} className="btn-danger btn-small" title="Supprimer ce template">Supprimer</button>
                  )}
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="save-template-input">Enregistrer le mapping actuel comme template:</label>
                <div style={{display:'flex',gap:'var(--spacing-3)'}}>
                  <input id="save-template-input" type="text" className="stylish-input" value={templateName} onChange={e => setTemplateName(e.target.value)} placeholder="Nom du nouveau template" />
                  <button type="button" onClick={saveCurrentTemplate} disabled={!templateName.trim()} className="btn-primary btn-small">Sauvegarder</button>
                </div>
              </div>
            </div>
            <div className="mapping-form-container">
              {previewData.rawHeaders.map((csvHeader) => (
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
                            <optgroup label="Champs système">
                              {existingFields.filter(f => f.categorieNom === 'Système').map(f => (
                                  <option key={f.key} value={f.key}>{f.label}</option>
                              ))}
                            </optgroup>
                            {categories.map(cat => {
                              const fieldsInCategory = existingFields.filter(f => f.categorieId === cat.id);
                              if (fieldsInCategory.length === 0) return null;
                              return (
                                <optgroup key={cat.id} label={cat.nom}>
                                  {fieldsInCategory.map(f => (
                                    <option key={f.key} value={f.key}>{f.label}</option>
                                  ))}
                                </optgroup>
                              );
                            })}
                          </select>
                        </div>
                      )}

                      {columnActions[csvHeader] === 'create' && nouveauxChamps[csvHeader] && (
                        <div className="nouveau-champ-config">
                          <h5>Configuration du nouveau champ</h5>
                          <div className="form-group">
                            <label htmlFor={`cat-${csvHeader}`}>Catégorie:</label>
                            <select id={`cat-${csvHeader}`} className="stylish-input select-stylish"
                                    value={nouveauxChamps[csvHeader].categorie_id || ''}
                                    onChange={e => handleNewFieldConfigChange(csvHeader, 'categorie_id', e.target.value)} required>
                              <option value="">-- Sélectionner catégorie --</option>
                              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.nom}</option>)}
                              <option value="__new__">-- Nouvelle catégorie --</option>
                            </select>
                            {nouveauxChamps[csvHeader].categorie_id === '__new__' && (
                              <input type="text" className="stylish-input" placeholder="Nom nouvelle catégorie"
                                     value={nouveauxChamps[csvHeader].newCategorieNom || ''}
                                     onChange={e => handleNewFieldConfigChange(csvHeader, 'newCategorieNom', e.target.value)} 
                                     style={{marginTop: 'var(--spacing-2)'}}/>
                            )}
                          </div>
                          <div className="form-group">
                            <label htmlFor={`label-${csvHeader}`}>Libellé:</label>
                            <input id={`label-${csvHeader}`} type="text" className="stylish-input"
                                   value={nouveauxChamps[csvHeader].label || ''}
                                   onChange={e => handleNewFieldConfigChange(csvHeader, 'label', e.target.value)} required />
                          </div>
                          <div className="form-group">
                            <label htmlFor={`key-${csvHeader}`}>Clé technique (auto-générée, modifiable):</label>
                            <input id={`key-${csvHeader}`} type="text" className="stylish-input"
                                   value={nouveauxChamps[csvHeader].key || ''}
                                   onChange={e => handleNewFieldConfigChange(csvHeader, 'key', e.target.value.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase())} 
                                   pattern="[a-zA-Z0-9_]+" title="Lettres, chiffres, underscores" required />
                          </div>
                          <div className="form-group">
                            <label htmlFor={`type-${csvHeader}`}>Type:</label>
                            <select id={`type-${csvHeader}`} className="stylish-input select-stylish"
                                    value={nouveauxChamps[csvHeader].type || 'text'}
                                    onChange={e => handleNewFieldConfigChange(csvHeader, 'type', e.target.value)}>
                              {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                          {nouveauxChamps[csvHeader].type === 'text' && (
                            <div className="form-group">
                              <label htmlFor={`maxLength-${csvHeader}`}>Longueur Max:</label>
                              <input id={`maxLength-${csvHeader}`} type="number" className="stylish-input"
                                     value={nouveauxChamps[csvHeader].maxLength || ''}
                                     onChange={e => handleNewFieldConfigChange(csvHeader, 'maxLength', e.target.value ? parseInt(e.target.value) : null)} min="1" />
                            </div>
                          )}
                          {nouveauxChamps[csvHeader].type === 'list' && (
                            <div className="form-group">
                              <label htmlFor={`options-${csvHeader}`}>Options (séparées par virgule):</label>
                              <input id={`options-${csvHeader}`} type="text" className="stylish-input"
                                     value={(nouveauxChamps[csvHeader].options || []).join(',')}
                                     onChange={e => handleNewFieldOptionsChange(csvHeader, e.target.value)} />
                            </div>
                          )}
                           <div className="form-group">
                                <label htmlFor={`ordre-champ-${csvHeader}`}>Ordre du champ dans sa catégorie:</label>
                                <input id={`ordre-champ-${csvHeader}`} type="number" className="stylish-input"
                                    value={nouveauxChamps[csvHeader].ordre || 0}
                                    onChange={e => handleNewFieldConfigChange(csvHeader, 'ordre', parseInt(e.target.value, 10) || 0)} min="0" />
                            </div>
                          <div className="champ-options-checkboxes">
                            <label><input type="checkbox" checked={nouveauxChamps[csvHeader].obligatoire || false} onChange={e => handleNewFieldConfigChange(csvHeader, 'obligatoire', e.target.checked)} /> Obligatoire</label>
                            <label><input type="checkbox" checked={nouveauxChamps[csvHeader].visible === undefined ? true : nouveauxChamps[csvHeader].visible} onChange={e => handleNewFieldConfigChange(csvHeader, 'visible', e.target.checked)} /> Visible</label>
                            <label><input type="checkbox" checked={nouveauxChamps[csvHeader].afficherEnTete || false} onChange={e => handleNewFieldConfigChange(csvHeader, 'afficherEnTete', e.target.checked)} /> Afficher en en-tête</label>
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

      case 4: 
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
          <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit' }}>{message.text}</pre>
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
        {loading && importStep > 1 && importStep < 4 && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <div className="progress-bar">
              <div className="progress" style={{ width: `${importProgress}%` }}></div>
            </div>
            <div>{`Traitement... ${importProgress}%`}</div>
          </div>
        )}
        {(!loading || importStep === 1 || importStep === 4) && renderContent()}
      </div>
    </div>
  );
}
