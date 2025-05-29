import React, { useEffect, useState, useCallback } from 'react';
import {
  IconFileText,
  IconEdit,
  IconDeviceFloppy,
  IconCircleX,
  IconHistory,
  IconAlertCircle,
  IconUserCheck,
  IconInfoCircle,
  IconCirclePlus,
  IconClock,
  IconChartBar,
} from '@tabler/icons-react';
import { formatDateToDDMMYYYY } from '../utils/date';
import { PERMISSIONS } from '../constants/permissions';
import DattaButton from './common/DattaButton';
import { hasPermission } from '../utils/permissions';
import { evaluateDynamicField } from '../utils/dynamic';
import HistoryChartModal from './common/HistoryChartModal';

export default function IndividuFiche({ individuId, onClose, onUpdate, user }) {
  const [individu, setIndividu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [audit, setAudit] = useState([]);
  const [enEdition, setEnEdition] = useState(false);
  const [valeurs, setValeurs] = useState({});
  const [users, setUsers] = useState([]);
  const [enCharge, setEnCharge] = useState(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [onglet, setOnglet] = useState(null);
  const [loadingData, setLoadingData] = useState(true);
  const [saving, setSaving] = useState(false);
  const [champsPromus, setChampsPromus] = useState([]);
  const [allRawCategories, setAllRawCategories] = useState([]);
  const [chartField, setChartField] = useState(null);

  // Fonction utilitaire pour obtenir le libellé du champ à partir de sa clé
  const getChampLabel = useCallback((champKey) => {
    if (champKey === 'en_charge') return 'Personne en charge';
    if (champKey === 'numero_unique') return 'Numéro Unique';

    for (const cat of allRawCategories) {
        if (cat.champs) {
            const field = cat.champs.find(champ => champ.key === champKey);
            if (field) {
                return field.label;
            }
        }
    }
    return champKey;
  }, [allRawCategories]);

  const loadInitialData = useCallback(async () => {
    setLoadingData(true);
    setMessage('');
    try {
      const [indResult, catResult, auditResult, usersResult] = await Promise.all([
        window.api.getIndividu(individuId),
        window.api.getCategories(),
        window.api.getAuditIndividu(individuId),
        window.api.getUsers()
      ]);

      if (indResult.success && indResult.data) {
        setIndividu(indResult.data);
        setValeurs(indResult.data.champs_supplementaires || {});
        setEnCharge(indResult.data.en_charge);
      } else {
        setMessage(indResult.error || "Erreur lors du chargement de l'individu.");
        setMessageType('error');
      }

      const allCategoriesFromApi = catResult.success ? (catResult.data || []) : [];
      setAllRawCategories(allCategoriesFromApi);

      const activeCategoriesForTabs = allCategoriesFromApi
        .filter(cat => cat.deleted !== 1)
        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
      setCategories(activeCategoriesForTabs);

      const promoted = [];
      allCategoriesFromApi.forEach(cat => {
        (cat.champs || []).forEach(champ => {
          if (champ.afficherEnTete && champ.visible) {
            promoted.push({...champ, categorieNom: cat.nom, categorieId: cat.id});
          }
        });
      });
      promoted.sort((a, b) => {
        const catA = allCategoriesFromApi.find(c => c.id === a.categorieId);
        const catB = allCategoriesFromApi.find(c => c.id === b.categorieId);
        const ordreCatA = catA ? (catA.ordre || 0) : 0;
        const ordreCatB = catB ? (catB.ordre || 0) : 0;
        if(ordreCatA !== ordreCatB) return ordreCatA - ordreCatB;
        return (a.ordre || 0) - (b.ordre || 0);
      });
      setChampsPromus(promoted);

      if (activeCategoriesForTabs.length > 0 && !onglet) {
        setOnglet(`cat-${activeCategoriesForTabs[0].id}`);
      } else if (activeCategoriesForTabs.length === 0 || !onglet) {
        setOnglet('historique');
      }

      if (auditResult.success) {
        const sortedAudit = auditResult.data.sort((a, b) => 
          new Date(b.date_modif) - new Date(a.date_modif)
        );
        setAudit(sortedAudit);
      } else {
        setAudit([]);
      }

      if (usersResult.success) {
        setUsers(usersResult.data);
      } else {
        setUsers([]);
      }

    } catch (error) {
      console.error("Erreur critique lors du chargement initial:", error);
      setMessage(`Erreur critique: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoadingData(false);
    }
  }, [individuId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setValeurs(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const updateValeur = (key, value) => {
    setValeurs(prev => ({ ...prev, [key]: value }));
  };

  const handleEnregistrement = async () => {
    setSaving(true);
    setMessage('');
    try {
      const updatedIndividu = {
        ...individu,
        en_charge: enCharge ? Number(enCharge) : null,
        champs_supplementaires: valeurs
      };
      
      const result = await window.api.addOrUpdateIndividu({
        individu: updatedIndividu,
        userId: user.id || user.userId,
        isImport: false
      });
      
      if (result.success) {
        setMessage('Modifications enregistrées avec succès');
        setMessageType('success');
        setEnEdition(false);
        await loadInitialData();
        if (onUpdate) onUpdate();
      } else {
        setMessage(result.error || "Erreur lors de l'enregistrement.");
        setMessageType('error');
      }
    } catch (error) {
      console.error("Erreur lors de l'enregistrement:", error);
      setMessage(`Erreur: ${error.message}`);
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };
  
  const handleCancelEdit = () => {
    setEnEdition(false);
    setValeurs(individu.champs_supplementaires || {});
    setEnCharge(individu.en_charge);
    setMessage('');
  };

  const renderChampLecture = (champ, valeurSource = individu.champs_supplementaires) => {
    const valeur = valeurSource[champ.key];
    if (champ.type === 'dynamic') {
      const baseValues = { ...valeurSource, numero_unique: individu.numero_unique, en_charge: individu.en_charge };
      const resultat = evaluateDynamicField(champ.formule, baseValues);
      if (resultat === null || resultat === undefined || resultat === '') {
        return <span style={{color: 'var(--current-text-placeholder)', fontStyle: 'italic'}}>Non renseigné</span>;
      }
      return String(resultat);
    }
    if (champ.type === 'checkbox') {
      return valeur ? 'Oui' : 'Non';
    }
    if (champ.type === 'date') {
      const formatted = formatDateToDDMMYYYY(valeur);
      if (!formatted) {
        return <span style={{color: 'var(--current-text-placeholder)', fontStyle: 'italic'}}>Non renseigné</span>;
      }
      return formatted;
    }
    if (champ.type === 'number-graph') {
      const display = valeur === null || valeur === undefined || valeur === '' ? (
        <span style={{color: 'var(--current-text-placeholder)', fontStyle: 'italic'}}>Non renseigné</span>
      ) : String(valeur);
      return (
        <span className="graph-value" onClick={() => openChart(champ)} style={{cursor: 'pointer', textDecoration: 'underline'}}>
          {display}
        </span>
      );
    }
    if (valeur === null || valeur === undefined || valeur === '') {
      return <span style={{color: 'var(--current-text-placeholder)', fontStyle: 'italic'}}>Non renseigné</span>;
    }
    return String(valeur);
  };

  const renderChampEdition = (champ) => {
    const isReadOnlyByConfig = champ.readonly === true;
    const canEditReadonly = hasPermission(user, PERMISSIONS.EDIT_READONLY_FIELDS);
    const isReadOnly = !userCanEdit() || (isReadOnlyByConfig && !canEditReadonly);

    const commonProps = {
      id: `champ-${champ.key}`,
      name: champ.key,
      value: valeurs[champ.key] === undefined ? '' : valeurs[champ.key],
      onChange: (e) => updateValeur(champ.key, champ.type === 'checkbox' ? e.target.checked : e.target.value),
      disabled: isReadOnly,
      required: champ.obligatoire && !isReadOnly,
    };
    
    const inputSize = champ.type === 'text' && champ.maxLength ? Math.min(parseInt(champ.maxLength, 10), 60) : champ.type === 'text' ? 30 : undefined;

    switch (champ.type) {
      case 'text':
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} size={inputSize} placeholder={champ.label} className={isReadOnly ? "form-control" : ""} readOnly={isReadOnly} />;
      case 'number':
        return <input type="number" {...commonProps} placeholder={champ.label} className={isReadOnly ? "form-control" : ""} readOnly={isReadOnly} />;
      case 'number-graph':
        return (
          <div className="number-graph-field">
            <input type="number" {...commonProps} placeholder={champ.label} className={isReadOnly ? 'form-control' : ''} readOnly={isReadOnly} />
            <DattaButton
              type="button"
              variant="link"
              size="sm"
              className="graph-button"
              onClick={() => openChart(champ)}
              aria-label="Voir graphique"
            >
              <IconChartBar size={18} />
            </DattaButton>
          </div>
        );
      case 'date':
        return <input type="date" {...commonProps} className={isReadOnly ? "form-control" : ""} readOnly={isReadOnly} />;
      case 'list':
        return (
          <select className={`select-stylish ${isReadOnly ? "form-control" : ""}`} {...commonProps} readOnly={isReadOnly}>
            <option value="">Sélectionner...</option>
            {champ.options && champ.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
          </select>
        );
      case 'checkbox':
        return (
          <div className="checkbox-container" style={{justifyContent: 'flex-start'}}>
            <input type="checkbox" {...commonProps} checked={!!valeurs[champ.key]} className="form-checkbox" />
          </div>
        );
      case 'dynamic':
        return (
          <p className="form-value-display form-value-readonly form-value-compact">
            {renderChampLecture(champ, valeurs)}
          </p>
        );
      default:
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} size={inputSize} placeholder={champ.label} className={isReadOnly ? "form-control" : ""} readOnly={isReadOnly} />;
    }
  };

  const getUserName = (userId) => {
    if (userId === null || userId === undefined || userId === '') return 'Non assigné';
    const userFound = users.find(u => u.id === Number(userId));
    return userFound ? userFound.username : `Utilisateur #${userId}`;
  };

  const userCanEdit = () => {
    if (!user || !individu) return false;
    const canEditAll = hasPermission(user, PERMISSIONS.EDIT_ALL);
    const canEditAssigned = hasPermission(user, PERMISSIONS.EDIT_ASSIGNED);
    if (canEditAll) return true;
    if (canEditAssigned) {
      const userId = user.id || user.userId;
      return individu.en_charge === userId;
    }
    return false;
  };

  const computeHistory = (fieldKey) => {
    const entries = audit
      .filter(a => a.champ === fieldKey)
      .map(e => ({ date: new Date(e.date_modif), value: parseFloat(e.nouvelle_valeur) }))
      .sort((a, b) => a.date - b.date);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const dataByYear = {};
    entries.forEach(e => {
      const y = e.date.getFullYear();
      const m = e.date.getMonth();
      if (!dataByYear[y]) dataByYear[y] = Array(12).fill(null);
      dataByYear[y][m] = e.value;
    });
    if (!dataByYear[currentYear]) dataByYear[currentYear] = Array(12).fill(null);
    const currentVal = valeurs[fieldKey] ?? individu.champs_supplementaires?.[fieldKey] ?? 0;
    dataByYear[currentYear][currentMonth] = parseFloat(currentVal) || 0;
    let last = null;
    Object.keys(dataByYear).sort().forEach(y => {
      for (let i = 0; i < 12; i++) {
        if (dataByYear[y][i] !== null) last = dataByYear[y][i];
        else if (last !== null) dataByYear[y][i] = last;
      }
    });
    return dataByYear;
  };

  const openChart = (champ) => {
    const data = computeHistory(champ.key);
    setChartField({ champ, data });
  };

  const closeChart = () => setChartField(null);

  if (loadingData) {
    return (
      <div className="fiche-individu-modal">
        <div className="modal-content modal-content-centered">
          <div className="loader"></div>
          <p>Chargement des données de l'individu...</p>
        </div>
      </div>
    );
  }

  if (!individu) {
    return (
      <div className="fiche-individu-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Erreur</h2>
            <DattaButton onClick={onClose} variant="link" size="sm" className="close-button">
              <IconCircleX size={24} />
            </DattaButton>
          </div>
          <div className="modal-body">
            <p>{message || "Impossible de charger les informations de l'individu."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className="fiche-individu-modal">
      <div className="modal-content modal-content-large">
        <div className="modal-header">
          <h2>
            <IconFileText size={28} style={{ marginRight: '10px', verticalAlign: 'bottom' }} />
            Fiche de l'individu : {individu.numero_unique || individu.id}
          </h2>
          <DattaButton onClick={onClose} variant="link" size="sm" className="close-button" aria-label="Fermer">
            <IconCircleX size={24} />
          </DattaButton>
        </div>

        {message && (
          <div className={`form-message message-${messageType}`}>
            {messageType === 'error' && <IconAlertCircle size={20} style={{ marginRight: '10px' }} />}
            {messageType === 'success' && <IconUserCheck size={20} style={{ marginRight: '10px' }} />}
            {message}
          </div>
        )}

        <div className="fiche-main-info">
          <div className="info-grid info-grid-compact">
            <div>
              <div className="info-cell-label">Numéro Unique</div>
              <div className="info-cell-value highlight">{individu.numero_unique || individu.id}</div>
            </div>
            <div>
              <div className="info-cell-label">Personne en charge</div>
              <div className="info-cell-value">
                {enEdition && userCanEdit() ? (
                  <select 
                    className="select-stylish" 
                    value={enCharge === null ? '' : enCharge} 
                    onChange={(e) => setEnCharge(e.target.value === '' ? null : Number(e.target.value))}
                  >
                    <option value="">Non assigné</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                  </select>
                ) : (
                  <span className="highlight">{getUserName(individu.en_charge)}</span>
                )}
              </div>
            </div>
            {champsPromus.map(champ => (
              <div key={`promu-${champ.key}`}>
                <div className="info-cell-label">{champ.label}</div>
                <div className="info-cell-value">
                  {enEdition ? renderChampEdition(champ) : renderChampLecture(champ, valeurs)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="tabs">
          {categories.map(cat => (
            <DattaButton
              key={`tab-${cat.id}`}
              variant="secondary"
              size="sm"
              className={`tab-button ${onglet === `cat-${cat.id}` ? 'active' : ''}`}
              onClick={() => setOnglet(`cat-${cat.id}`)}
            >
              <IconInfoCircle size={18} style={{ marginRight: '5px' }} /> {cat.nom}
            </DattaButton>
          ))}
          <DattaButton
            variant="secondary"
            size="sm"
            className={`tab-button ${onglet === 'historique' ? 'active active-historique' : ''}`}
            onClick={() => setOnglet('historique')}
          >
            <IconHistory size={18} style={{ marginRight: '5px' }} /> Historique
          </DattaButton>
        </div>

        <div className="modal-body modal-body-compact">
          {categories.map(cat => {
            if (onglet !== `cat-${cat.id}`) return null;
            
            const champsDeCategorie = cat.champs ? 
                cat.champs.filter(champ => champ.visible || (enEdition && !champ.readonly)) : [];

            return (
              <div className="form-section" key={cat.id}>
                {champsDeCategorie.length > 0 ? (
                  <div className="dynamic-fields-grid dynamic-fields-grid-compact">
                    {champsDeCategorie
                      .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                      .map(champ => (
                        <div key={champ.key} className="mb-3 form-group-compact">
                          <label htmlFor={`champ-${champ.key}`} className="form-label-compact">
                            {champ.label} {enEdition && champ.obligatoire && !champ.readonly && <span className="obligatoire">*</span>}
                          </label>
                          {enEdition ? renderChampEdition(champ) : (
                            <p className="form-value-display form-value-readonly form-value-compact">
                              {renderChampLecture(champ, valeurs)}
                            </p>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <p>Aucun champ {enEdition ? 'saisissable' : 'visible'} défini pour cette catégorie.</p>
                )}
              </div>
            );
          })}

          {onglet === 'historique' && (
            <div className="historique-content">
              <h3 style={{ marginBottom: '15px', fontSize: '1.2em' }}>Historique des modifications</h3>
              {audit.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--current-text-placeholder)', fontStyle: 'italic' }}>
                  Aucun historique de modification pour cet individu.
                </p>
              ) : (
                <div className="audit-timeline audit-timeline-compact">
                  {audit.map(a => {
                    let ancienneValeurDisplay = a.ancienne_valeur;
                    let nouvelleValeurDisplay = a.nouvelle_valeur;
                    const champDisplayName = getChampLabel(a.champ); 

                    if (a.champ === 'en_charge') {
                      ancienneValeurDisplay = (a.action === 'create' || a.ancienne_valeur === null || a.ancienne_valeur === '' || a.ancienne_valeur === 0) ? 'Aucun' : getUserName(a.ancienne_valeur);
                      nouvelleValeurDisplay = (a.nouvelle_valeur === null || a.nouvelle_valeur === '' || a.nouvelle_valeur === 0) ? "Aucun" : getUserName(a.nouvelle_valeur);
                    }
                    
                    const dateObj = new Date(a.date_modif);
                    const datePart = formatDateToDDMMYYYY(dateObj);
                    const timePart = dateObj.toLocaleTimeString('fr-FR', {
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    });
                    const dateModif = `${datePart} ${timePart}`;
                    
                    const utilisateurAuteur = a.utilisateur_username || getUserName(a.utilisateur_id) || 'Système';

                    let actionText = "modifié";
                    if (a.action === 'create') actionText = "créé";
                    if (a.action === 'delete') actionText = "supprimé";
                    if (a.action === 'import_create') actionText = "créé via import";
                    if (a.action === 'import_update') actionText = "modifié via import";

                    return (
                      <div key={a.id} className="audit-entry audit-entry-compact">
                        <div className="audit-icon-type">
                          {a.action === 'create' ? <IconCirclePlus size={16} /> : <IconEdit size={16} />}
                        </div>
                        <div className="audit-details">
                          <div className="audit-header audit-header-compact">
                            <span className="audit-field-action">
                              <span className="audit-field-name">{champDisplayName}</span> {actionText}
                            </span>
                            <span className="audit-user-time audit-user-time-compact">
                              Par <span className="audit-user">{utilisateurAuteur}</span>
                              <span className="audit-date">
                                <IconClock size={11} style={{marginRight: '3px', marginLeft: '6px'}} />
                                {dateModif}
                              </span>
                            </span>
                          </div>
                          <div className="audit-body audit-body-compact">
                            {a.action === 'create' && (
                              <div className="audit-value-change">
                                <span className="audit-value-label">Valeur :</span>
                                <span className="audit-new-value">{nouvelleValeurDisplay !== null && nouvelleValeurDisplay !== undefined ? String(nouvelleValeurDisplay) : 'N/A'}</span>
                              </div>
                            )}
                            {a.action === 'update' && (
                              <div className="audit-value-change">
                                <span className="audit-value-label">Anciennement :</span>
                                <span className="audit-old-value">{ancienneValeurDisplay !== null && ancienneValeurDisplay !== undefined ? String(ancienneValeurDisplay) : 'N/A'}</span>
                                <span className="audit-arrow">➔</span>
                                <span className="audit-value-label">Maintenant :</span>
                                <span className="audit-new-value">{nouvelleValeurDisplay !== null && nouvelleValeurDisplay !== undefined ? String(nouvelleValeurDisplay) : 'N/A'}</span>
                              </div>
                            )}
                            {a.action === 'delete' && (
                              <div className="audit-value-change">
                                <span className="audit-value-label">Valeur supprimée :</span>
                                <span className="audit-old-value">{ancienneValeurDisplay !== null && ancienneValeurDisplay !== undefined ? String(ancienneValeurDisplay) : 'N/A'}</span>
                              </div>
                            )}
                            {a.fichier_import && (
                              <div className="audit-import-info audit-import-info-compact">
                                <IconFileText size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
                                Via import : {a.fichier_import}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          {onglet !== 'historique' && (
            enEdition ? (
              <>
                <DattaButton onClick={handleEnregistrement} variant="primary" size="sm" disabled={saving}>
                  <IconDeviceFloppy size={18} style={{ marginRight: '5px' }} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                </DattaButton>
                <DattaButton onClick={handleCancelEdit} variant="secondary" size="sm" disabled={saving}>
                  <IconCircleX size={18} style={{ marginRight: '5px' }} /> Annuler
                </DattaButton>
              </>
            ) : (
              userCanEdit() && (
                <DattaButton onClick={() => setEnEdition(true)} variant="primary" size="sm">
                  <IconEdit size={18} style={{ marginRight: '5px' }} /> Modifier
                </DattaButton>
              )
            )
          )}
          <DattaButton onClick={onClose} variant="secondary" size="sm" disabled={saving}>
            <IconCircleX size={18} style={{ marginRight: '5px' }} /> Fermer
          </DattaButton>
        </div>
      </div>

      <style jsx>{`
        .fiche-individu-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: var(--pc-overlay-bg);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          padding: 10px;
        }

        .modal-content-large {
          width: 95% !important;
          max-width: 1400px !important;
          height: 90vh !important;
          max-height: 90vh !important;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .info-grid-compact {
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)) !important;
          gap: 10px !important;
          margin-bottom: 15px !important;
        }

        .info-cell-label {
          font-size: 0.85em !important;
          margin-bottom: 3px !important;
        }

        .info-cell-value {
          padding: 6px 8px !important;
          min-height: 32px !important;
        }

        .modal-body-compact {
          flex: 1;
          overflow-y: auto;
          padding: 15px 20px !important;
        }

        .dynamic-fields-grid-compact {
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)) !important;
          gap: 12px !important;
        }

        .form-group-compact {
          margin-bottom: 0 !important;
        }

        .form-label-compact {
          font-size: 0.9em !important;
          margin-bottom: 4px !important;
          display: block;
          font-weight: 600;
        }

        .form-value-compact {
          min-height: 32px !important;
          padding: 6px 8px !important;
          font-size: 0.9em !important;
        }

        .tabs {
          border-bottom: 2px solid var(--current-border-medium);
          margin: 15px 0 0 0 !important;
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
        }

        .tab-button {
          padding: 8px 16px !important;
          font-size: 0.9em !important;
          border: none;
          background: var(--current-surface-color);
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          transition: all 0.2s ease;
        }

        .tab-button:hover {
          background: var(--current-border-light);
        }

        .tab-button.active {
          background: var(--current-primary-color);
          color: var(--current-text-on-primary-color);
        }

        .audit-timeline-compact {
          max-height: 500px;
          overflow-y: auto;
        }

        .audit-entry-compact {
          margin-bottom: 12px !important;
          padding: 10px !important;
          border: 1px solid var(--current-border-medium);
          border-radius: 6px;
          background: var(--pc-card-bg);
        }

        .audit-header-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px !important;
        }

        .audit-user-time-compact {
          font-size: 0.8em !important;
          color: var(--current-text-secondary);
        }

        .audit-body-compact {
          margin-top: 6px !important;
          font-size: 0.9em !important;
        }

        .audit-import-info-compact {
          margin-top: 4px !important;
          font-size: 0.8em !important;
          color: var(--current-text-secondary);
        }

        .audit-field-name {
          font-weight: 600;
          color: var(--current-primary-color);
        }

        .audit-new-value {
          color: var(--current-success-color);
          font-weight: 500;
        }

        .audit-old-value {
          color: var(--current-danger-color);
          font-weight: 500;
        }

        .audit-arrow {
          margin: 0 8px;
          color: var(--current-text-secondary);
        }

        .highlight {
          font-weight: 600;
          color: var(--current-primary-color);
        }

        .obligatoire {
          color: var(--current-danger-color);
          font-weight: bold;
        }

        input, select, textarea {
          font-size: 0.9em !important;
          padding: 6px 8px !important;
        }

        .form-input-readonly {
          background-color: var(--current-surface-color) !important;
          cursor: not-allowed;
        }

        .number-graph-field {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .graph-button {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--current-primary-color);
        }

        .select-stylish {
          width: 100%;
          border: 1px solid var(--current-border-medium);
          border-radius: 4px;
        }

        .button-primary, .button-secondary {
          padding: 8px 16px !important;
          font-size: 0.9em !important;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .button-primary {
          background: var(--current-primary-color);
          color: var(--current-text-on-primary-color);
          border: 1px solid var(--current-primary-color);
        }

        .button-primary:hover:not(:disabled) {
          background: var(--current-primary-color-hover);
        }

        .button-secondary {
          background: var(--current-secondary-color);
          color: var(--current-text-on-primary-color);
          border: 1px solid var(--current-secondary-color);
        }

        .button-secondary:hover:not(:disabled) {
          background: var(--current-secondary-color-hover);
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          color: var(--current-text-secondary);
          transition: color 0.2s ease;
        }

        .close-button:hover {
          color: var(--current-danger-color);
        }

        .form-message {
          padding: 8px 12px;
          border-radius: 4px;
          margin: 10px 0;
          display: flex;
          align-items: center;
        }

        .message-success {
          background: var(--color-primary-50);
          color: var(--current-primary-color-active);
          border: 1px solid var(--current-primary-color);
        }

        .message-error {
          background: var(--color-danger-50);
          color: var(--current-danger-color);
          border: 1px solid var(--current-danger-color);
        }

        .loader {
          border: 3px solid var(--current-border-light);
          border-top: 3px solid var(--current-primary-color);
          border-radius: 50%;
          width: 30px;
          height: 30px;
          animation: spin 1s linear infinite;
          margin: 0 auto 10px;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .modal-content-large {
            width: 98% !important;
            height: 95vh !important;
          }
          
          .info-grid-compact {
            grid-template-columns: 1fr !important;
          }
          
          .dynamic-fields-grid-compact {
            grid-template-columns: 1fr !important;
          }
          
          .tabs {
            flex-direction: column;
          }
          
          .tab-button {
            width: 100%;
          }
        }
      `}</style>
    </div>
    {chartField && (
      <HistoryChartModal label={chartField.champ.label} dataByYear={chartField.data} onClose={closeChart} />
    )}
    </>
  );
}
