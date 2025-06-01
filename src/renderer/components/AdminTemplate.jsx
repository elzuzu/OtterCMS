import React, { useState, useEffect } from 'react';
import DattaButton from './common/DattaButton';
import DattaPageTitle from './common/DattaPageTitle';
import BorderTemplateAdmin from './common/BorderTemplateAdmin';
import useTheme from '../hooks/useTheme';

const THEME_COLORS = [
  { id: 'blue', label: 'Bleu (Défaut)', value: '#04a9f5' },
  { id: 'green', label: 'Vert', value: '#1de9b6' },
  { id: 'purple', label: 'Violet', value: '#6610f2' },
  { id: 'orange', label: 'Orange', value: '#fd7e14' },
  { id: 'red', label: 'Rouge', value: '#f44236' }
];

export default function AdminTemplate({ user }) {
  const { color, changeColor } = useTheme();
  const [selectedColorId, setSelectedColorId] = useState(color);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setMessage('');
    setSelectedColorId(color);
  }, [color]);

  const handleSelectColor = async (colorId) => {
    setSelectedColorId(colorId);
    changeColor(colorId);
    setMessage('Thème appliqué !');
  };

  return (
    <div className="pc-content">
      <DattaPageTitle title="Configuration des Templates" />
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Thème de Couleur</h5>
        </div>
        <div className="card-body">
          <p>Choisissez la couleur principale de l'application. Ce changement affecte l'ensemble de l'interface utilisateur.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
            {THEME_COLORS.map(c => (
              <DattaButton key={c.id} onClick={() => handleSelectColor(c.id)} variant={selectedColorId === c.id ? 'primary' : 'secondary'} size="sm" className="btn-base" style={{ minWidth: '120px' }} aria-pressed={selectedColorId === c.id}>
                <span style={{ display: 'inline-block', width: '1em', height: '1em', backgroundColor: c.value, borderRadius: '50%', marginRight: '0.5em', border: '1px solid var(--pc-border-muted)' }}></span>
                {c.label}
              </DattaButton>
            ))}
          </div>
          {message && (
            <div className={`message-base-style ${message.includes('Erreur') ? 'error-message' : 'info-message'}`} style={{ marginTop: '1rem' }}>
              {message}
            </div>
          )}
        </div>
      </div>
      <BorderTemplateAdmin user={user} />
    </div>
  );
}
