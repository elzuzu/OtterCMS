import React, { useState, useEffect, useCallback } from 'react';
import DattaAlert from './common/DattaAlert';
import { evaluateDynamicField } from '../utils/dynamic';
import { DattaTextField, DattaSelect } from './common/DattaForm';
import DattaPageTitle from './common/DattaPageTitle';
import DattaButton from './common/DattaButton';
import DattaCheckbox from './common/DattaCheckbox';
import DattaTabs, { Tab } from './common/DattaTabs';

export default function NouvelIndividu({ user, onClose, onSuccess }) {
  const [allCategories, setAllCategories] = useState([]);
  const [users, setUsers] = useState([]);
  
  const [numeroUnique, setNumeroUnique] = useState('');
  const [enChargeId, setEnChargeId] = useState('');
  const [valeursChamps, setValeursChamps] = useState({});
  
  const [ongletActif, setOngletActif] = useState(null);
  
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingInitialData, setLoadingInitialData] = useState(true);

  const loadInitialData = useCallback(async () => {
    setLoadingInitialData(true);
    try {
        const [catResult, usersResult] = await Promise.all([
            window.api.getCategories(),
            (user.role === 'admin' || user.role === 'manager') ? window.api.getUsers() : Promise.resolve({ success: true, data: [user] })
        ]);

        if (catResult.success) {
            const sortedCategories = [...(catResult.data || [])]
                .filter(cat => cat.deleted !== 1) 
                .sort((a, b) => (a.ordre || 0) - (b.ordre || 0));
            setAllCategories(sortedCategories);
            if (sortedCategories.length > 0) {
                setOngletActif(`cat-${sortedCategories[0].id}`);
            }
        } else {
            setAllCategories([]);
            setMessage('Erreur chargement catégories: ' + (catResult.error || 'Inconnue'));
        }

        if (usersResult.success) {
            setUsers(usersResult.data || []);
        } else {
            setUsers(user.role === 'admin' || user.role === 'manager' ? [] : [user]);
            setMessage(prev => prev + (prev ? '; ' : '') + 'Erreur chargement utilisateurs: ' + (usersResult.error || 'Inconnue'));
        }
        
        setEnChargeId(String(user.id || user.userId || ''));

    } catch (error) {
        setMessage(`Erreur critique au chargement: ${error.message}`);
        console.error("Erreur chargement NouvelIndividu:", error);
    } finally {
        setLoadingInitialData(false);
    }
  }, [user]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleValeurChange = (champKey, valeur) => {
    setValeursChamps(prev => ({ ...prev, [champKey]: valeur }));
  };

  const handleSubmit = async (e, keepOpen = false) => {
    e.preventDefault();
    setMessage('');

    if (!numeroUnique.trim()) {
      setMessage('Le numéro d\'individu est obligatoire.');
      return;
    }
    
    for (const cat of allCategories) {
        for (const champ of cat.champs || []) {
            if (champ.visible && champ.obligatoire && !champ.readonly) { 
                const valeur = valeursChamps[champ.key];
                if (valeur === undefined || valeur === null || String(valeur).trim() === '') {
                     if (champ.type === 'checkbox' && valeur === false) {
                         if (!valeur) { // Si la checkbox obligatoire n'est pas cochée
                            setMessage(`Le champ "${champ.label}" dans la catégorie "${cat.nom}" est obligatoire et doit être coché.`);
                            setOngletActif(`cat-${cat.id}`);
                            return;
                         }
                    } else if (champ.type !== 'checkbox') {
                        setMessage(`Le champ "${champ.label}" dans la catégorie "${cat.nom}" est obligatoire.`);
                        setOngletActif(`cat-${cat.id}`); 
                        return;
                    }
                }
            }
        }
    }

    setLoading(true);

    try {
      const individuData = {
        numero_unique: numeroUnique.trim(),
        en_charge: enChargeId ? Number(enChargeId) : null,
        champs_supplementaires: valeursChamps 
      };

      const result = await window.api.addOrUpdateIndividu({
        individu: individuData,
        userId: user.id || user.userId, 
        isImport: false
      });

      if (result.success) {
        setMessage('Individu ajouté avec succès!');
        if (onSuccess) onSuccess();
        
        setNumeroUnique('');
        setEnChargeId(keepOpen && enChargeId ? enChargeId : String(user.id || user.userId || ''));
        setValeursChamps({});
        if (allCategories.length > 0) {
          setOngletActif(`cat-${allCategories[0].id}`);
        }
        
        if (!keepOpen) {
            setTimeout(() => {
                setMessage('');
                if (onClose) onClose();
            }, 1500);
        } else {
             setTimeout(() => { // Laisser le message de succès un peu plus longtemps pour "Enregistrer et Nouveau"
                setMessage('');
            }, 2500);
        }
      } else {
        setMessage('Erreur: ' + (result.error || 'Problème inconnu'));
      }
    } catch (error) {
      setMessage(`Erreur: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSubmitAndNew = (e) => {
    handleSubmit(e, true); 
  };


  const renderChampInput = (champ) => {
    const valeur = valeursChamps[champ.key] === undefined ? '' : valeursChamps[champ.key];
    const commonProps = {
        id: `champ-new-${champ.key}`,
        value: valeur,
        onChange: (e) => handleValeurChange(champ.key, champ.type === 'checkbox' ? e.target.checked : e.target.value),
        required: champ.obligatoire && !champ.readonly, 
        disabled: champ.readonly, 
    };
    const inputSize = champ.type === 'text' && champ.maxLength ? Math.min(parseInt(champ.maxLength, 10), 60) : champ.type === 'text' ? 30 : undefined;


    switch (champ.type) {
      case 'text':
        return <DattaTextField {...commonProps} label={champ.label} maxLength={champ.maxLength || undefined} size="small" />;
      case 'number':
      case 'number-graph':
        return <DattaTextField {...commonProps} label={champ.label} type="number" size="small" />;
      case 'date':
        return <DattaTextField {...commonProps} type="date" label={champ.label} size="small" InputLabelProps={{ shrink: true }} />;
      case 'list':
        return (
          <DattaSelect {...commonProps} label={champ.label} options={(champ.options || []).map(opt => ({ value: opt, label: opt }))} />
        );
      case 'checkbox':
        return (
          <DattaCheckbox
            id={champ.key}
            label={champ.label}
            checked={!!valeur}
            onChange={(e) => handleValeurChange(champ.key, e.target.checked)}
          />
        );
      case 'dynamic':
        const baseVals = { ...valeursChamps, numero_unique: numeroUnique, en_charge: enChargeId };
        const res = evaluateDynamicField(champ.formule, baseVals);
        return <span className="form-value-display form-value-readonly">{res === undefined || res === null ? '' : String(res)}</span>;
      default:
        return <DattaTextField {...commonProps} label={champ.label} size="small" />;
    }
  };
  
  if (loadingInitialData) {
    return (
      <div className="modal-content moderne">
        <div className="loader-container">
          <div className="loader"></div>
          <p>Chargement de la configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-content moderne">
      <form onSubmit={(e) => handleSubmit(e, false)} className="fiche-individu"> 
        <div className="fiche-header">
          <DattaPageTitle title="Nouvel individu" />
          <div className="fiche-actions">
            <DattaButton type="submit" variant="success" size="sm" className="btn-sauvegarder" disabled={loading}>
              {loading ? 'Création...' : 'Enregistrer et Fermer'}
            </DattaButton>
            <DattaButton type="button" variant="primary" size="sm" onClick={handleSubmitAndNew} disabled={loading}>
              {loading ? 'Création...' : 'Enregistrer et Nouveau'}
            </DattaButton>
            {onClose && (
              <DattaButton type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
                Annuler
              </DattaButton>
            )}
          </div>
        </div>
        
        {message && (
          <DattaAlert type={message.includes('succès') ? 'success' : 'error'}>
            {message.includes('succès') ? '✓ ' : '⚠ '}{message}
          </DattaAlert>
        )}
        
        <div className="fiche-main-info">
          <div className="info-grid">
            <div>
              <div className="info-cell-label">Numéro d'individu (unique) <span className="obligatoire">*</span></div>
              <div className="info-cell-value">
                <DattaTextField
                  id="numeroUnique"
                  label="Numéro d'individu"
                  value={numeroUnique}
                  onChange={(e) => setNumeroUnique(e.target.value)}
                  required
                  size="small"
                />
              </div>
            </div>
            <div>
              <div className="info-cell-label">Personne en charge</div>
              <div className="info-cell-value">
                <DattaSelect
                  id="enCharge"
                  label="Personne en charge"
                  value={enChargeId}
                  onChange={(e) => setEnChargeId(e.target.value)}
                  options={[{ value: '', label: 'Non assigné' }, ...users.map(u => ({ value: String(u.id), label: u.username }))]}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="fiche-tabs">
          <DattaTabs value={ongletActif} onChange={(e, v) => setOngletActif(v)}>
            {allCategories.map(cat => (
              <Tab key={`tab-${cat.id}`} label={cat.nom} value={`cat-${cat.id}`} />
            ))}
          </DattaTabs>
        </div>

        <div className="fiche-content-wrapper">
          {allCategories.map(cat => {
            if (ongletActif !== `cat-${cat.id}`) return null;
            // Pour la création, on ne montre que les champs visibles et non readonly
            const champsSaisissables = cat.champs ? cat.champs.filter(champ => champ.visible && !champ.readonly) : []; 
            return (
              <div key={`content-${cat.id}`} className="fiche-content">
                <h6 className="section-title">{cat.nom}</h6>
                {champsSaisissables.length > 0 ? (
                    <div className="info-grid">
                      {champsSaisissables
                        .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
                        .map(champ => (
                            <React.Fragment key={champ.key}>
                              <div className="info-cell-label">
                                {champ.label} {champ.obligatoire && <span className="obligatoire">*</span>}
                              </div>
                              <div className="info-cell-value">
                                {renderChampInput(champ)}
                              </div>
                            </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    <div className="no-fields-message">Aucun champ saisissable défini pour cette catégorie.</div>
                  )}
              </div>
            );
          })}
          
          {allCategories.length === 0 && (
            <div className="no-categories-message">
              Aucune catégorie active disponible. Veuillez créer ou démasquer au moins une catégorie avant d'ajouter des individus.
            </div>
          )}
        </div>
      </form>
    </div>
  );
}