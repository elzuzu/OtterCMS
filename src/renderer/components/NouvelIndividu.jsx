import React, { useState, useEffect, useCallback } from 'react';
import DattaAlert from './common/DattaAlert';
import DattaCard from './common/DattaCard';
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
        user.role === 'admin' || user.role === 'manager'
          ? window.api.getUsers()
          : Promise.resolve({ success: true, data: [user] })
      ]);

      if (catResult.success) {
        const sortedCategories = [...(catResult.data || [])]
          .filter((cat) => cat.deleted !== 1)
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
        setMessage(
          (prev) =>
            prev + (prev ? '; ' : '') + 'Erreur chargement utilisateurs: ' + (usersResult.error || 'Inconnue')
        );
      }

      setEnChargeId(String(user.id || user.userId || ''));
    } catch (error) {
      setMessage(`Erreur critique au chargement: ${error.message}`);
      console.error('Erreur chargement NouvelIndividu:', error);
    } finally {
      setLoadingInitialData(false);
    }
  }, [user]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  const handleValeurChange = (champKey, valeur) => {
    setValeursChamps((prev) => ({ ...prev, [champKey]: valeur }));
  };

  const handleSubmit = async (e, keepOpen = false) => {
    e.preventDefault();
    setMessage('');

    if (!numeroUnique.trim()) {
      setMessage("Le numéro d'individu est obligatoire.");
      return;
    }

    for (const cat of allCategories) {
      for (const champ of cat.champs || []) {
        if (champ.visible && champ.obligatoire && !champ.readonly) {
          const valeur = valeursChamps[champ.key];
          if (valeur === undefined || valeur === null || String(valeur).trim() === '') {
            if (champ.type === 'checkbox') {
              if (!valeur) {
                setMessage(
                  `Le champ "${champ.label}" dans la catégorie "${cat.nom}" est obligatoire et doit être coché.`
                );
                setOngletActif(`cat-${cat.id}`);
                return;
              }
            } else {
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
          setTimeout(() => {
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
    const inputProps = {
      id: `champ-new-${champ.key}`,
      label: `${champ.label}${champ.obligatoire ? ' *' : ''}`,
      value: valeursChamps[champ.key] ?? '',
      onChange: (e) => handleValeurChange(champ.key, champ.type === 'checkbox' ? e.target.checked : e.target.value),
      required: champ.obligatoire && !champ.readonly,
      disabled: champ.readonly
    };

    switch (champ.type) {
      case 'text':
        return <DattaTextField {...inputProps} maxLength={champ.maxLength} />;
      case 'number':
      case 'number-graph':
        return <DattaTextField {...inputProps} type="number" />;
      case 'date':
        return <DattaTextField {...inputProps} type="date" />;
      case 'list':
        return <DattaSelect {...inputProps} options={(champ.options || []).map((opt) => ({ value: opt, label: opt }))} />;
      case 'checkbox':
        return (
          <DattaCheckbox
            id={inputProps.id}
            label={champ.label}
            checked={!!valeursChamps[champ.key]}
            onChange={(e) => handleValeurChange(champ.key, e.target.checked)}
            disabled={champ.readonly}
          />
        );
      case 'dynamic': {
        const baseVals = { ...valeursChamps, numero_unique: numeroUnique, en_charge: enChargeId };
        const res = evaluateDynamicField(champ.formule, baseVals);
        return <span className="form-value-display">{res ?? ''}</span>;
      }
      default:
        return <DattaTextField {...inputProps} />;
    }
  };

  if (loadingInitialData) {
    return (
      <div className="pc-content">
        <DattaPageTitle title="Nouvel individu" />
        <DattaCard>
          <div className="text-center py-4">Chargement de la configuration...</div>
        </DattaCard>
      </div>
    );
  }

  return (
    <div className="pc-content">
      <DattaPageTitle title="Nouvel individu" />
      {message && (
        <DattaAlert
          type={message.includes('succès') ? 'success' : 'danger'}
          dismissible
          onClose={() => setMessage('')}
          className="mb-3"
        >
          {message}
        </DattaAlert>
      )}
      <form onSubmit={(e) => handleSubmit(e, false)}>
        <DattaCard
          title="Informations principales"
          actions={
            <div className="d-flex gap-2">
              <DattaButton type="submit" variant="success" size="sm" disabled={loading}>
                {loading ? 'Création...' : 'Enregistrer et Fermer'}
              </DattaButton>
              <DattaButton
                type="button"
                variant="primary"
                size="sm"
                onClick={handleSubmitAndNew}
                disabled={loading}
              >
                {loading ? 'Création...' : 'Enregistrer et Nouveau'}
              </DattaButton>
              {onClose && (
                <DattaButton type="button" variant="secondary" size="sm" onClick={onClose} disabled={loading}>
                  Annuler
                </DattaButton>
              )}
            </div>
          }
        >
          <div className="row mb-4">
            <div className="col-md-6">
              <DattaTextField
                id="numeroUnique"
                label="Numéro d'individu (unique) *"
                value={numeroUnique}
                onChange={(e) => setNumeroUnique(e.target.value)}
                required
              />
            </div>
            <div className="col-md-6">
              <DattaSelect
                id="enCharge"
                label="Personne en charge"
                value={enChargeId}
                onChange={(e) => setEnChargeId(e.target.value)}
                options={[{ value: '', label: 'Non assigné' }, ...users.map((u) => ({ value: String(u.id), label: u.username }))]}
              />
            </div>
          </div>

          <DattaTabs value={ongletActif} onChange={(e, v) => setOngletActif(v)}>
            {allCategories.map((cat) => (
              <Tab key={`tab-${cat.id}`} label={cat.nom} value={`cat-${cat.id}`} />
            ))}
          </DattaTabs>

          {allCategories.map((cat) => {
            if (ongletActif !== `cat-${cat.id}`) return null;
            const champsSaisissables = cat.champs ? cat.champs.filter((c) => c.visible && !c.readonly) : [];
            return (
              <DattaCard key={`content-${cat.id}`} title={cat.nom} className="mt-3">
                <div className="row">
                  {champsSaisissables.sort((a, b) => (a.ordre || 0) - (b.ordre || 0)).map((champ) => (
                    <div key={champ.key} className="col-md-6 mb-3">
                      {renderChampInput(champ)}
                    </div>
                  ))}
                </div>
              </DattaCard>
            );
          })}

          {allCategories.length === 0 && (
            <div className="text-muted">
              Aucune catégorie active disponible. Veuillez créer ou démasquer au moins une catégorie avant d'ajouter des individus.
            </div>
          )}
        </DattaCard>
      </form>
    </div>
  );
}
