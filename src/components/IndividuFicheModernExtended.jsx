import React, { useEffect, useState, useCallback } from 'react';
import {
  FileText, Edit3, Save, XCircle, History, Info, Calendar,
  Users, CheckCircle
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
  const [allRawCategories, setAllRawCategories] = useState([]);

  // Resize window when opening the fiche
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
        const field = cat.champs.find(c => c.key === champKey);
        if (field) return field.label;
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
      const allCats = catResult.success ? (catResult.data || []) : [];
      setAllRawCategories(allCats);
      const activeCats = allCats.filter(cat => cat.deleted !== 1)
        .sort((a,b) => (a.ordre || 0) - (b.ordre || 0));
      setCategories(activeCats);
      if (activeCats.length > 0 && !onglet) {
        setOnglet(`cat-${activeCats[0].id}`);
      } else if (activeCats.length === 0 || !onglet) {
        setOnglet('historique');
      }
      if (auditResult.success) {
        const sorted = auditResult.data.sort((a,b) => new Date(b.date_modif) - new Date(a.date_modif));
        setAudit(sorted);
      } else {
        setAudit([]);
      }
      if (usersResult.success) {
        setUsers(usersResult.data);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Erreur chargement fiche:', err);
      setMessage(`Erreur critique: ${err.message}`);
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

  const handleSave = async () => {
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
        setMessage('Modifications enregistrées');
        setMessageType('success');
        setEnEdition(false);
        await loadInitialData();
        if (onUpdate) onUpdate();
      } else {
        setMessage(result.error || "Erreur lors de l'enregistrement.");
        setMessageType('error');
      }
    } catch (err) {
      console.error('Erreur sauvegarde fiche:', err);
      setMessage(`Erreur: ${err.message}`);
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

  const getUserName = (userId) => {
    if (userId === null || userId === undefined || userId === '') return 'Non assigné';
    const u = users.find(p => p.id === Number(userId));
    return u ? u.username : `Utilisateur #${userId}`;
  };

  const userCanEdit = () => {
    if (!user || !individu) return false;
    const uid = user.id || user.userId;
    if (user.role === 'admin' || user.role === 'manager') return true;
    return individu.en_charge === uid;
  };

  const renderChampLecture = (champ, valeurSrc = valeurs) => {
    const v = valeurSrc[champ.key];
    if (champ.type === 'checkbox') {
      return v ? 'Oui' : 'Non';
    }
    if (champ.type === 'date') {
      const formatted = formatDateToDDMMYYYY(v);
      if (!formatted) return <span style={{ color: 'var(--text-color-placeholder)', fontStyle: 'italic' }}>Non renseigné</span>;
      return formatted;
    }
    if (v === null || v === undefined || v === '') {
      return <span style={{ color: 'var(--text-color-placeholder)', fontStyle: 'italic' }}>Non renseigné</span>;
    }
    return String(v);
  };

  const renderChampEdition = (champ) => {
    const readOnly = champ.readonly === true || !userCanEdit();
    const commonProps = {
      id: `champ-${champ.key}`,
      name: champ.key,
      value: valeurs[champ.key] === undefined ? '' : valeurs[champ.key],
      onChange: (e) => updateValeur(champ.key, champ.type === 'checkbox' ? e.target.checked : e.target.value),
      disabled: readOnly,
      required: champ.obligatoire && !readOnly,
      className: readOnly ? 'form-input-readonly' : ''
    };
    switch (champ.type) {
      case 'text':
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} />;
      case 'number':
        return <input type="number" {...commonProps} />;
      case 'date':
        return <input type="date" {...commonProps} />;
      case 'list':
        return (
          <select {...commonProps} className={`select-stylish ${readOnly ? 'form-input-readonly' : ''}`}> 
            <option value="">Sélectionner...</option>
            {champ.options && champ.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
          </select>
        );
      case 'checkbox':
        return (
          <div className="checkbox-container" style={{ justifyContent: 'flex-start' }}>
            <input type="checkbox" {...commonProps} checked={!!valeurs[champ.key]} className="form-checkbox" />
          </div>
        );
      default:
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} />;
    }
  };

  if (loadingData) {
    return (
      <div className="fiche-individu-modal">
        <div className="modal-content-fullsize">
          <div className="loader" />
          <p>Chargement...</p>
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
            <p>{message || "Impossible de charger les informations."}</p>
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
            <h2 className="fiche-title"><FileText size={24} style={{ marginRight: 8 }} />Fiche {individu.numero_unique || individu.id}</h2>
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
                const champsCat = cat.champs ? cat.champs.filter(c => c.visible || (enEdition && !c.readonly)) : [];
                return (
                  <div className="category-content-extended" key={cat.id}>
                    <div className="form-grid-extended">
                      {champsCat.sort((a,b) => (a.ordre || 0) - (b.ordre || 0)).map(champ => (
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
                  <button onClick={handleSave} className="button-primary" disabled={saving}>
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
