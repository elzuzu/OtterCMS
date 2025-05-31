import React, { useState, useEffect } from 'react';
import DattaButton from './common/DattaButton';
import DattaPageTitle from './common/DattaPageTitle';

const THEME_COLORS = [
  { id: 'blue', label: 'Bleu (Défaut)', value: '#04a9f5' },
  { id: 'green', label: 'Vert', value: '#1de9b6' },
  { id: 'purple', label: 'Violet', value: '#6610f2' },
  { id: 'orange', label: 'Orange', value: '#fd7e14' },
  { id: 'red', label: 'Rouge', value: '#f44236' }
];

export default function AdminTemplate() {
  const [selectedColorId, setSelectedColorId] = useState('blue');
  const [borderColor, setBorderColor] = useState('#000000');
  const [borderWidth, setBorderWidth] = useState('0');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCurrentTheme() {
      setIsLoading(true);
      setMessage('');
      const saved = localStorage.getItem('themePreset') || 'blue';
      setSelectedColorId(saved);
      window.dispatchEvent(new CustomEvent('themePresetChange', { detail: saved }));

      const savedBorderColor = localStorage.getItem('windowBorderColor') || '#000000';
      const savedBorderWidth = localStorage.getItem('windowBorderWidth') || '0';
      setBorderColor(savedBorderColor);
      setBorderWidth(savedBorderWidth);
      document.body.style.setProperty('--window-border-color', savedBorderColor);
      document.body.style.setProperty('--window-border-width', savedBorderWidth + 'px');
      setIsLoading(false);
    }
    fetchCurrentTheme();
  }, []);

  const applyThemePreset = (colorId) => {
    window.dispatchEvent(new CustomEvent('themePresetChange', { detail: colorId }));
  };

  const handleSelectColor = async (colorId) => {
    setSelectedColorId(colorId);
    applyThemePreset(colorId);
    localStorage.setItem('themePreset', colorId);
    setMessage('Thème appliqué !');
  };

  const handleApplyBorder = () => {
    document.body.style.setProperty('--window-border-color', borderColor);
    document.body.style.setProperty('--window-border-width', borderWidth + 'px');
    localStorage.setItem('windowBorderColor', borderColor);
    localStorage.setItem('windowBorderWidth', borderWidth);
    setMessage('Bordure mise à jour !');
  };

  if (isLoading) {
    return <div className="loading-message">Chargement de la configuration du thème...</div>;
  }

  return (
    <div className="pc-content">
      <DattaPageTitle title="Configuration du Thème" />
      <div className="card">
        <div className="card-body">
      <p>Choisissez la couleur principale de l'application. Ce changement affectera l'ensemble de l'interface utilisateur.</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        {THEME_COLORS.map(color => (
          <DattaButton
            key={color.id}
            onClick={() => handleSelectColor(color.id)}
            variant={selectedColorId === color.id ? 'primary' : 'secondary'}
            size="sm"
            className="btn-base"
            style={{ minWidth: '120px' }}
            aria-pressed={selectedColorId === color.id}
          >
            <span
              style={{
                display: 'inline-block',
                width: '1em',
                height: '1em',
                backgroundColor: color.value,
                borderRadius: '50%',
                marginRight: '0.5em',
                border: '1px solid var(--pc-border-muted)'
              }}
            ></span>
            {color.label}
          </DattaButton>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <label style={{ marginRight: '0.5rem' }}>Couleur de bordure :</label>
        <input type="color" value={borderColor} onChange={e => setBorderColor(e.target.value)} />
        <label style={{ marginLeft: '1rem', marginRight: '0.5rem' }}>Épaisseur :</label>
        <input
          type="number"
          min="0"
          max="20"
          value={borderWidth}
          onChange={e => setBorderWidth(e.target.value)}
          style={{ width: '4rem' }}
        />
        <DattaButton variant="secondary" size="sm" onClick={handleApplyBorder} style={{ marginLeft: '1rem' }}>
          Appliquer
        </DattaButton>
      </div>

      {message && (
        <div className={`message-base-style ${message.includes('Erreur') || message.includes('non disponible') ? 'error-message' : 'info-message'}`} style={{ marginTop: '1rem' }}>
          {message}
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
