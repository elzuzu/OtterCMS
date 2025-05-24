import React, { useState, useEffect, useCallback } from 'react';
import Banner from './common/Banner';

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
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} size={inputSize} placeholder={champ.label} />;
      case 'number':
        return <input type="number" {...commonProps} placeholder={champ.label} />;
      case 'date':
        return <input type="date" {...commonProps} />;
      case 'list':
        return (
          <select className="select-stylish" {...commonProps}>
            <option value="">Sélectionner...</option>
            {(champ.options || []).map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
          </select>
        );
      case 'checkbox':
        return (
          <div className="checkbox-container" style={{justifyContent: 'flex-start'}}>
            <input type="checkbox" {...commonProps} checked={!!valeur} />
            {/* Le label est déjà affiché, mais on peut ajouter un specific pour la checkbox si besoin */}
            {/* <label htmlFor={`champ-new-${champ.key}`}>{champ.label}</label> */}
          </div>
        );
      default:
        return <input type="text" {...commonProps} maxLength={champ.maxLength || undefined} size={inputSize} placeholder={champ.label} />;
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
          <h2>Nouvel individu</h2>
          <div className="fiche-actions">
            <button type="submit" className="btn-success btn-sauvegarder" disabled={loading}>
              {loading ? 'Création...' : 'Enregistrer et Fermer'}
            </button>
            <button type="button" onClick={handleSubmitAndNew} className="btn-primary" disabled={loading}>
              {loading ? 'Création...' : 'Enregistrer et Nouveau'}
            </button>
            {onClose && <button type="button" onClick={onClose} className="btn-fermer" disabled={loading}>Annuler</button>}
          </div>
        </div>
        
        {message && (
          <Banner type={message.includes('succès') ? 'success' : 'error'}>
            {message.includes('succès') ? '✓ ' : '⚠ '}{message}
          </Banner>
        )}
        
        <div className="fiche-main-info">
          <div className="info-grid">
            <div>
              <div className="info-cell-label">Numéro d'individu (unique) <span className="obligatoire">*</span></div>
              <div className="info-cell-value">
                <input id="numeroUnique" type="text" value={numeroUnique} onChange={(e) => setNumeroUnique(e.target.value)} placeholder="Saisissez un identifiant unique" required />
              </div>
            </div>
            <div>
              <div className="info-cell-label">Personne en charge</div>
              <div className="info-cell-value">
                <select id="enCharge" className="select-stylish" value={enChargeId} onChange={(e) => setEnChargeId(e.target.value)}>
                  <option value="">Non assigné</option> 
                  {users.map(u => <option key={u.id} value={u.id}>{u.username}</option>)}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="fiche-tabs">
          {allCategories.map(cat => (
            <button type="button" key={`tab-${cat.id}`} className={ongletActif === `cat-${cat.id}` ? 'active' : ''} onClick={() => setOngletActif(`cat-${cat.id}`)}>
              {cat.nom}
            </button>
          ))}
        </div>

        <div className="fiche-content-wrapper">
          {allCategories.map(cat => {
            if (ongletActif !== `cat-${cat.id}`) return null;
            // Pour la création, on ne montre que les champs visibles et non readonly
            const champsSaisissables = cat.champs ? cat.champs.filter(champ => champ.visible && !champ.readonly) : []; 
            return (
              <div key={`content-${cat.id}`} className="fiche-content">
                <h3>{cat.nom}</h3>
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