import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText, Edit3, Save, XCircle, History, AlertCircle, UserCheck,
  Info
} from 'lucide-react';
import { formatDateToDDMMYYYY } from '../utils/date';

export default function IndividuFicheModernExtended({ individuId, onClose, onUpdate, user }) {
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

  // Resize window for large layout
  useEffect(() => {
    if (window.electronAPI?.resizeWindow) {
      window.electronAPI.resizeWindow(1600, 900);
    }
    return () => {
      if (window.electronAPI?.resizeWindow) {
        window.electronAPI.resizeWindow(1366, 768);
      }
    };
  }, []);

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
            promoted.push({ ...champ, categorieNom: cat.nom, categorieId: cat.id });
          }
        });
      });
      promoted.sort((a, b) => {
        const catA = allCategoriesFromApi.find(c => c.id === a.categorieId);
        const catB = allCategoriesFromApi.find(c => c.id === b.categorieId);
        const ordreCatA = catA ? (catA.ordre || 0) : 0;
        const ordreCatB = catB ? (catB.ordre || 0) : 0;
        if (ordreCatA !== ordreCatB) return ordreCatA - ordreCatB;
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
      console.error('Erreur critique lors du chargement initial:', error);
      setMessage(`Erreur critique: ${error.message}`);
      setMessageType('error');
    } finally {
      setLoadingData(false);
    }
  }, [individuId, onglet]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

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
      console.error('Erreur lors de l'enregistrement:', error);
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
    const isReadOnly = !userCanEdit() || isReadOnlyByConfig;

    const commonProps = {
      id: `champ-${champ.key}`,
      name: champ.key,
      value: valeurs[champ.key] === undefined ? '' : valeurs[champ.key],
      onChange: (e) => updateValeur(champ.key, champ.type === 'checkbox' ? e.target.checked : e.target.value),
      disabled: isReadOnly,
      required: champ.obligatoire && !isReadOnly,
    };

    switch (champ.type) {
      case 'text':
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} className={isReadOnly ? 'form-input-readonly' : ''} />;
      case 'number':
        return <input type="number" {...commonProps} className={isReadOnly ? 'form-input-readonly' : ''} />;
      case 'date':
        return <input type="date" {...commonProps} className={isReadOnly ? 'form-input-readonly' : ''} />;
      case 'list':
        return (
          <select className={`select-stylish ${isReadOnly ? 'form-input-readonly' : ''}`} {...commonProps}>
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
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} className={isReadOnly ? 'form-input-readonly' : ''} />;
    }
  };

  const getUserName = (userId) => {
    if (userId === null || userId === undefined || userId === '') return 'Non assigné';
    const userFound = users.find(u => u.id === Number(userId));
    return userFound ? userFound.username : `Utilisateur #${userId}`;
  };

  const userCanEdit = () => {
    if (!user || !individu) return false;
    const userId = user.id || user.userId;
    if (user.role === 'admin' || user.role === 'manager') return true;
    return individu.en_charge === userId;
  };

  if (loadingData) {
    return (
      <div className="fiche-individu-modal">
        <div className="modal-content-fullsize">
          <div className="loader"></div>
          <p>Chargement des données de l'individu...</p>
        </div>
      </div>
    );
  }

  if (!individu) {
    return (
      <div className="fiche-individu-modal">
        <div className="modal-content-fullsize">
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
      <div className="modal-content-fullsize">
        <div className="fiche-individu-modern-extended">
          <div className="fiche-header-extended">
            <h2 className="fiche-title"><FileText size={24} style={{marginRight:8}} />Fiche de l'individu : {individu.numero_unique || individu.id}</h2>
            <button onClick={onClose} className="close-button" aria-label="Fermer"><XCircle size={24} /></button>
          </div>

          <aside className="individu-sidebar-extended">
            <div className="individu-hero-card">
              <div className="avatar-circle-xl">{String(individu.numero_unique || '').slice(-2)}</div>
              <h2 className="individu-title-xl">{individu.numero_unique}</h2>
            </div>
            <div className="key-info-extended">
              <div className="info-item"><span>En charge</span><span>{getUserName(individu.en_charge)}</span></div>
              <div className="info-item"><span>Créé le</span><span>{formatDateToDDMMYYYY(individu.created_at)}</span></div>
            </div>
          </aside>

          <main className="main-content-extended">
            <div className="content-header">
              {categories.map(cat => (
                <button
                  key={`tab-${cat.id}`}
                  className={`tab-button ${onglet === `cat-${cat.id}` ? 'active' : ''}`}
                  onClick={() => setOnglet(`cat-${cat.id}`)}
                >
                  <Info size={18} style={{ marginRight: 5 }} /> {cat.nom}
                </button>
              ))}
              <button
                className={`tab-button ${onglet === 'historique' ? 'active' : ''}`}
                onClick={() => setOnglet('historique')}
              >
                <History size={18} style={{ marginRight: 5 }} /> Historique
              </button>
            </div>
            <div className="content-body">
              {categories.map(cat => {
                if (onglet !== `cat-${cat.id}`) return null;
                const champsDeCategorie = cat.champs ?
                  cat.champs.filter(champ => champ.visible || (enEdition && !champ.readonly)) : [];
                return (
                  <div className="category-content-extended" key={cat.id}>
                    <div className="form-grid-extended">
                      {champsDeCategorie.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map(champ => (
                        <div key={champ.key} className={`form-field-extended size-${champ.taille || 'half'}`}>
                          <label htmlFor={`champ-${champ.key}`}>{champ.label}</label>
                          {enEdition ? renderChampEdition(champ) : (
                            <p className="form-value-display form-value-readonly">{renderChampLecture(champ, valeurs)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              {onglet === 'historique' && (
                <div className="timeline-extended">
                  {audit.map(entry => (
                    <div key={entry.id} className="audit-entry">
                      <span>{entry.action}</span> - <span>{getChampLabel(entry.champ)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>

          <aside className="actions-panel-extended">
            {onglet !== 'historique' && (
              enEdition ? (
                <>
                  <button onClick={handleEnregistrement} className="button-primary" disabled={saving}>
                    <Save size={18} style={{ marginRight: 5 }} /> {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button onClick={handleCancelEdit} className="button-secondary" disabled={saving}>
                    <XCircle size={18} style={{ marginRight: 5 }} /> Annuler
                  </button>
                </>
              ) : (
                userCanEdit() && (
                  <button onClick={() => setEnEdition(true)} className="button-primary">
                    <Edit3 size={18} style={{ marginRight: 5 }} /> Modifier
                  </button>
                )
              )
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
