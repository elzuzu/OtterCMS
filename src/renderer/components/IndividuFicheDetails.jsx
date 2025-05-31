import React, { useEffect, useState, useCallback } from 'react';
import DattaPageTitle from './common/DattaPageTitle';
import DattaCard from './common/DattaCard';
import DattaButton from './common/DattaButton';

export default function IndividuFicheDetails({ individuId, onClose }) {
  const [individu, setIndividu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);
  const [activeCat, setActiveCat] = useState(null);

  const loadData = useCallback(async () => {
    const [indRes, catRes, usersRes] = await Promise.all([
      window.api.getIndividu(individuId),
      window.api.getCategories(),
      window.api.getUsers(),
    ]);
    if (indRes.success) setIndividu(indRes.data);
    if (catRes.success) {
      setCategories(
        (catRes.data || [])
          .filter(c => c.deleted !== 1)
          .sort((a, b) => (a.ordre || 0) - (b.ordre || 0))
      );
    }
    if (usersRes.success) setUsers(usersRes.data);
  }, [individuId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (categories.length > 0 && activeCat === null) {
      const firstVisible = categories.find(c => (c.champs || []).some(ch => ch.visible));
      if (firstVisible) setActiveCat(firstVisible.id);
    }
  }, [categories, activeCat]);

  const getUserName = (id) => {
    const u = users.find(u => u.id === Number(id));
    return u ? u.username : 'Non assigné';
  };

  const getFieldLabel = (key) => {
    for (const cat of categories) {
      const field = (cat.champs || []).find(ch => ch.key === key);
      if (field) return field.label;
    }
    return key;
  };

  const renderField = (label, value, full = false) => (
    <div className={`col-md-${full ? '12' : '6'} mb-3`}>
      <strong className="form-label">{label} :</strong>
      <p className="text-muted ms-1 mb-0">
        {value !== undefined && value !== null && value !== '' ? (
          String(value)
        ) : (
          <span className="fst-italic">Non renseigné</span>
        )}
      </p>
    </div>
  );

  const renderSectionTitle = (title) => (
    <div className="col-12 mt-4 mb-2">
      <h5 className="border-bottom pb-2 mb-0">{title}</h5>
    </div>
  );

  if (!individu) {
    return (
      <div className="d-flex justify-content-center p-4">
        <span>Chargement...</span>
      </div>
    );
  }

  const extra = individu.champs_supplementaires || {};

  return (
    <>
    <div className="modal-content modal-content-large">
      <div className="modal-header">
        <h2 className="mb-0">Fiche Individu : {individu.numero_unique || individu.id}</h2>
        <DattaButton variant="link" size="sm" onClick={onClose} className="close-button" aria-label="Fermer">
          <i className="ti ti-x"></i>
        </DattaButton>
      </div>
      <div className="modal-body" style={{ overflowY: 'auto' }}>
        <DattaCard
          className="mb-0"
          actions={
            <DattaButton variant="light-secondary" onClick={onClose} icon="ti ti-arrow-left">
              Retour
            </DattaButton>
          }
        >
        <div className="row">
          {renderSectionTitle('Informations principales')}
          {renderField('Numéro Unique', individu.numero_unique || individu.id)}
          {renderField('Personne en charge', getUserName(individu.en_charge))}
        </div>
        {categories.some(c => (c.champs || []).some(ch => ch.visible)) && (
          <>
            <ul className="nav nav-tabs mt-4">
              {categories.map(cat => {
                const visible = (cat.champs || []).filter(ch => ch.visible);
                if (visible.length === 0) return null;
                return (
                  <li className="nav-item" key={`tab-${cat.id}`}>
                    <button
                      type="button"
                      className={`nav-link ${activeCat === cat.id ? 'active' : ''}`}
                      onClick={() => setActiveCat(cat.id)}
                    >
                      {cat.nom}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="tab-content pt-3">
              {categories.map(cat => {
                const visible = (cat.champs || []).filter(ch => ch.visible);
                if (visible.length === 0) return null;
                return (
                  <div
                    key={`content-${cat.id}`}
                    className={`tab-pane fade ${activeCat === cat.id ? 'show active' : ''}`}
                  >
                    <div className="row">
                      {visible.map(ch =>
                        renderField(getFieldLabel(ch.key), extra[ch.key], false)
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
        </DattaCard>
      </div>
    </div>
    <style jsx>{`
      .modal-content-large {
        width: 95% !important;
        max-width: 1400px !important;
        height: 90vh !important;
        max-height: 90vh !important;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
    `}</style>
    </>
  );
}
