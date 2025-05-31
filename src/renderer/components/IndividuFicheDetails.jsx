import React, { useEffect, useState, useCallback } from 'react';
import DattaPageTitle from './common/DattaPageTitle';
import DattaCard from './common/DattaCard';
import DattaButton from './common/DattaButton';

export default function IndividuFicheDetails({ individuId, onClose }) {
  const [individu, setIndividu] = useState(null);
  const [categories, setCategories] = useState([]);
  const [users, setUsers] = useState([]);

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
          {categories.map(cat => {
            const visible = (cat.champs || []).filter(ch => ch.visible);
            if (visible.length === 0) return null;
            return (
              <div className="row" key={cat.id}>
                {renderSectionTitle(cat.nom)}
                {visible.map(ch =>
                  renderField(getFieldLabel(ch.key), extra[ch.key], false)
                )}
              </div>
            );
          })}
        </DattaCard>
      </div>
    </div>
  );
}
