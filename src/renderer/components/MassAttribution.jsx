import React, { useState, useEffect } from 'react';
import DattaPageTitle from './common/DattaPageTitle';
import DattaCard from './common/DattaCard';
import DattaButton from './common/DattaButton';
import DattaStepper, { Step, StepLabel } from './common/DattaStepper';

// TODO: Replace with real API calls when available
const mockIndividus = [
  { id: 1, nom: 'Dupont', prenom: 'Jean' },
  { id: 2, nom: 'Martin', prenom: 'Alice' },
  { id: 3, nom: 'Durand', prenom: 'Paul' },
  { id: 4, nom: 'Petit', prenom: 'Sophie' },
];

const mockChamps = [
  { value: 'statut', label: 'Statut' },
  { value: 'categorie', label: 'Catégorie' },
  { value: 'observations', label: 'Observations' },
];

export default function MassAttribution() {
  const [activeStep, setActiveStep] = useState(0);
  const [individus, setIndividus] = useState([]);
  const [selectedIndividus, setSelectedIndividus] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [newValue, setNewValue] = useState('');

  useEffect(() => {
    // Simuler un chargement d'individus
    setIndividus(mockIndividus);
  }, []);

  const steps = [
    'Sélection des individus',
    'Sélection du champ',
    'Nouvelle valeur',
    'Confirmation',
  ];

  const handleNext = () => {
    if (activeStep < steps.length - 1) {
      setActiveStep(activeStep + 1);
    }
  };

  const handleBack = () => {
    if (activeStep > 0) {
      setActiveStep(activeStep - 1);
    }
  };

  const toggleIndividuSelection = (id) => {
    setSelectedIndividus((prev) => {
      const copy = new Set(prev);
      if (copy.has(id)) copy.delete(id); else copy.add(id);
      return copy;
    });
  };

  const filteredIndividus = individus.filter((i) =>
    `${i.prenom} ${i.nom}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectAll = () => {
    setSelectedIndividus(new Set(filteredIndividus.map((i) => i.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIndividus(new Set());
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <>
            <div className="row mb-3 align-items-center">
              <div className="col-md-6">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="col-md-6 text-md-end mt-2 mt-md-0">
                <DattaButton variant="link" size="sm" onClick={handleSelectAll} className="me-2">
                  Tout sélectionner
                </DattaButton>
                <DattaButton variant="link" size="sm" onClick={handleDeselectAll} className="text-danger">
                  Tout désélectionner
                </DattaButton>
              </div>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }} className="list-group">
              {filteredIndividus.length > 0 ? (
                filteredIndividus.map((individu) => (
                  <label key={individu.id} className="list-group-item">
                    <input
                      className="form-check-input me-2"
                      type="checkbox"
                      checked={selectedIndividus.has(individu.id)}
                      onChange={() => toggleIndividuSelection(individu.id)}
                    />
                    {individu.prenom} {individu.nom}
                  </label>
                ))
              ) : (
                <p className="text-muted p-2">Aucun individu trouvé.</p>
              )}
            </div>
            <p className="mt-2 text-muted">{selectedIndividus.size} individu(s) sélectionné(s)</p>
          </>
        );
      case 1:
        return (
          <div className="mb-3">
            <label htmlFor="selectField" className="form-label">
              Champ à modifier :
            </label>
            <select
              id="selectField"
              className="form-select"
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
            >
              <option value="">-- Choisir un champ --</option>
              {mockChamps.map((champ) => (
                <option key={champ.value} value={champ.value}>
                  {champ.label}
                </option>
              ))}
            </select>
          </div>
        );
      case 2:
        return (
          <div className="mb-3">
            <label htmlFor="newValue" className="form-label">
              Nouvelle valeur :
            </label>
            <input
              type="text"
              id="newValue"
              className="form-control"
              value={newValue}
              onChange={(e) => setNewValue(e.target.value)}
            />
          </div>
        );
      case 3:
        return (
          <>
            <p>
              Vous allez modifier le champ{' '}
              <strong>{selectedField}</strong> avec la valeur «{' '}
              <strong>{newValue}</strong> » pour les{' '}
              <strong>{selectedIndividus.size}</strong> individu(s) suivant(s) :
            </p>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="list-group list-group-flush mt-3">
              {Array.from(selectedIndividus).map((id) => {
                const individu = individus.find((i) => i.id === id);
                return (
                  <li key={id} className="list-group-item">
                    {individu ? `${individu.prenom} ${individu.nom}` : `ID: ${id}`}
                  </li>
                );
              })}
            </div>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pc-content">
      <DattaPageTitle title="Attribution de Masse" />
      <DattaCard className="mass-attribution-wizard">
        <DattaStepper activeStep={activeStep}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </DattaStepper>
        <div className="wizard-content" style={{ minHeight: '350px' }}>
          {renderStepContent()}
        </div>
        <div className="wizard-actions">
          {activeStep > 0 && (
            <DattaButton variant="light-secondary" onClick={handleBack} className="me-2">
              Précédent
            </DattaButton>
          )}
          {activeStep < steps.length - 1 && (
            <DattaButton
              variant="primary"
              onClick={handleNext}
              disabled={
                (activeStep === 0 && selectedIndividus.size === 0) ||
                (activeStep === 1 && !selectedField) ||
                (activeStep === 2 && !newValue.trim())
              }
            >
              Suivant
            </DattaButton>
          )}
          {activeStep === steps.length - 1 && (
            <DattaButton variant="success" onClick={() => alert('Attribution simulée')}>Terminer</DattaButton>
          )}
        </div>
      </DattaCard>
    </div>
  );
}

