import React, { useEffect, useState, useCallback } from 'react';
import { FileText, Edit3, Trash2, Save, XCircle, History, AlertCircle, UserCheck, Users, CalendarDays, Tag, Info, PlusCircle, Clock } from 'lucide-react';
import { formatDateToDDMMYYYY } from '../utils/date';
import { PERMISSIONS } from '../constants/permissions';
import { hasPermission } from '../utils/permissions';

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
    if (champ.type === 'checkbox') {
      return valeur ? 'Oui' : 'Non';
    }
    if (champ.type === 'date') {
      const formatted = formatDateToDDMMYYYY(valeur);
      if (!formatted) {
        return <span style={{color: 'var(--text-color-placeholder)', fontStyle: 'italic'}}>Non renseigné</span>;
      }
      return formatted;
    }
    if (valeur === null || valeur === undefined || valeur === '') {
      return <span style={{color: 'var(--text-color-placeholder)', fontStyle: 'italic'}}>Non renseigné</span>;
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
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} size={inputSize} placeholder={champ.label} className={isReadOnly ? "form-input-readonly" : ""} />;
      case 'number':
        return <input type="number" {...commonProps} placeholder={champ.label} className={isReadOnly ? "form-input-readonly" : ""} />;
      case 'date':
        return <input type="date" {...commonProps} className={isReadOnly ? "form-input-readonly" : ""} />;
      case 'list':
        return (
          <select className={`select-stylish ${isReadOnly ? "form-input-readonly" : ""}`} {...commonProps}>
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
      default:
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} size={inputSize} placeholder={champ.label} className={isReadOnly ? "form-input-readonly" : ""} />;
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
            <button onClick={onClose} className="close-button"><XCircle size={24} /></button>
          </div>
          <div className="modal-body">
            <p>{message || "Impossible de charger les informations de l'individu."}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fiche-individu-modal">
      <div className="modal-content modal-content-large">
        <div className="modal-header">
          <h2>
            <FileText size={28} style={{ marginRight: '10px', verticalAlign: 'bottom' }} />
            Fiche de l'individu : {individu.numero_unique || individu.id}
          </h2>
          <button onClick={onClose} className="close-button" aria-label="Fermer"><XCircle size={24} /></button>
        </div>

        {message && (
          <div className={`form-message message-${messageType}`}>
            {messageType === 'error' && <AlertCircle size={20} style={{ marginRight: '10px' }} />}
            {messageType === 'success' && <UserCheck size={20} style={{ marginRight: '10px' }} />}
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
            <button
              key={`tab-${cat.id}`}
              className={`tab-button ${onglet === `cat-${cat.id}` ? 'active' : ''}`}
              onClick={() => setOnglet(`cat-${cat.id}`)}
            >
              <Info size={18} style={{ marginRight: '5px' }} /> {cat.nom}
            </button>
          ))}
          <button
            className={`tab-button ${onglet === 'historique' ? 'active active-historique' : ''}`}
            onClick={() => setOnglet('historique')}
          >
            <History size={18} style={{ marginRight: '5px' }} /> Historique
          </button>
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
                        <div key={champ.key} className="form-group form-group-compact">
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
                <p style={{ textAlign: 'center', color: 'var(--text-color-placeholder)', fontStyle: 'italic' }}>
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
                          {a.action === 'create' ? <PlusCircle size={16} /> : <Edit3 size={16} />}
                        </div>
                        <div className="audit-details">
                          <div className="audit-header audit-header-compact">
                            <span className="audit-field-action">
                              <span className="audit-field-name">{champDisplayName}</span> {actionText}
                            </span>
                            <span className="audit-user-time audit-user-time-compact">
                              Par <span className="audit-user">{utilisateurAuteur}</span>
                              <span className="audit-date">
                                <Clock size={11} style={{marginRight: '3px', marginLeft: '6px'}} />
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
                                <FileText size={12} style={{ marginRight: '3px', verticalAlign: 'middle' }} />
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
                <button onClick={handleEnregistrement} className="button-primary" disabled={saving}>
                  <Save size={18} style={{ marginRight: '5px' }} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                </button>
                <button onClick={handleCancelEdit} className="button-secondary" disabled={saving}>
                  <XCircle size={18} style={{ marginRight: '5px' }} /> Annuler
                </button>
              </>
            ) : (
              userCanEdit() && (
                <button onClick={() => setEnEdition(true)} className="button-primary">
                  <Edit3 size={18} style={{ marginRight: '5px' }} /> Modifier
                </button>
              )
            )
          )}
          <button onClick={onClose} className="button-secondary" disabled={saving}>
            <XCircle size={18} style={{ marginRight: '5px' }} /> Fermer
          </button>
        </div>
      </div>

      <style jsx>{`
        .fiche-individu-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(0, 0, 0, 0.7);
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
          border-bottom: 2px solid #e0e0e0;
          margin: 15px 0 0 0 !important;
          display: flex;
          flex-wrap: wrap;
          gap: 2px;
        }

        .tab-button {
          padding: 8px 16px !important;
          font-size: 0.9em !important;
          border: none;
          background: #f5f5f5;
          cursor: pointer;
          border-radius: 4px 4px 0 0;
          transition: all 0.2s ease;
        }

        .tab-button:hover {
          background: #e8e8e8;
        }

        .tab-button.active {
          background: #007bff;
          color: white;
        }

        .audit-timeline-compact {
          max-height: 500px;
          overflow-y: auto;
        }

        .audit-entry-compact {
          margin-bottom: 12px !important;
          padding: 10px !important;
          border: 1px solid #e0e0e0;
          border-radius: 6px;
          background: #fafafa;
        }

        .audit-header-compact {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px !important;
        }

        .audit-user-time-compact {
          font-size: 0.8em !important;
          color: #666;
        }

        .audit-body-compact {
          margin-top: 6px !important;
          font-size: 0.9em !important;
        }

        .audit-import-info-compact {
          margin-top: 4px !important;
          font-size: 0.8em !important;
          color: #888;
        }

        .audit-field-name {
          font-weight: 600;
          color: #007bff;
        }

        .audit-new-value {
          color: #28a745;
          font-weight: 500;
        }

        .audit-old-value {
          color: #dc3545;
          font-weight: 500;
        }

        .audit-arrow {
          margin: 0 8px;
          color: #6c757d;
        }

        .highlight {
          font-weight: 600;
          color: #007bff;
        }

        .obligatoire {
          color: #dc3545;
          font-weight: bold;
        }

        input, select, textarea {
          font-size: 0.9em !important;
          padding: 6px 8px !important;
        }

        .form-input-readonly {
          background-color: #f8f9fa !important;
          cursor: not-allowed;
        }

        .select-stylish {
          width: 100%;
          border: 1px solid #ced4da;
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
          background: #007bff;
          color: white;
          border: 1px solid #007bff;
        }

        .button-primary:hover:not(:disabled) {
          background: #0056b3;
        }

        .button-secondary {
          background: #6c757d;
          color: white;
          border: 1px solid #6c757d;
        }

        .button-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        .close-button {
          background: none;
          border: none;
          cursor: pointer;
          color: #6c757d;
          transition: color 0.2s ease;
        }

        .close-button:hover {
          color: #dc3545;
        }

        .form-message {
          padding: 8px 12px;
          border-radius: 4px;
          margin: 10px 0;
          display: flex;
          align-items: center;
        }

        .message-success {
          background: #d4edda;
          color: #155724;
          border: 1px solid #c3e6cb;
        }

        .message-error {
          background: #f8d7da;
          color: #721c24;
          border: 1px solid #f5c6cb;
        }

        .loader {
          border: 3px solid #f3f3f3;
          border-top: 3px solid #007bff;
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
  );
}