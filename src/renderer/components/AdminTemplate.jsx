import React, { useState, useEffect } from 'react';

const THEME_COLORS = [
  { id: 'blue', label: 'Bleu (Défaut)', value: '#0078D4' },
  { id: 'green', label: 'Vert', value: '#107C10' },
  { id: 'purple', label: 'Violet', value: '#8B38FF' },
  { id: 'orange', label: 'Orange', value: '#FF8C00' },
  { id: 'red', label: 'Rouge', value: '#E81123' }
];

export default function AdminTemplate() {
  const [selectedColorId, setSelectedColorId] = useState('blue');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCurrentTheme() {
      setIsLoading(true);
      setMessage('');
      const saved = localStorage.getItem('themeColor') || 'blue';
      setSelectedColorId(saved);
      THEME_COLORS.forEach(c => document.body.classList.remove('theme-' + c.id));
      document.body.classList.add('theme-' + saved);
      setIsLoading(false);
    }
    fetchCurrentTheme();
  }, []);

  const applyThemeClassToBody = (colorId) => {
    THEME_COLORS.forEach(c => document.body.classList.remove('theme-' + c.id));
    document.body.classList.add('theme-' + colorId);
  };

  const handleSelectColor = async (colorId) => {
    setSelectedColorId(colorId);
    applyThemeClassToBody(colorId);
    localStorage.setItem('themeColor', colorId);
    setMessage('Thème appliqué !');
  };

  if (isLoading) {
    return <div className="loading-message">Chargement de la configuration du thème...</div>;
  }

  return (
    <div className="admin-panel"> {/* Using a generic panel class for styling */}
      <h2 className="panel-title">Configuration du Thème</h2>
      <p>Choisissez la couleur principale de l'application. Ce changement affectera l'ensemble de l'interface utilisateur.</p>
      
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
        {THEME_COLORS.map(color => (
          <button
            key={color.id}
            onClick={() => handleSelectColor(color.id)}
            className={`btn-base ${selectedColorId === color.id ? 'btn-primary' : 'btn-secondary'}`}
            style={{ 
              minWidth: '120px',
              // Visual cue for the button itself, though the body class handles the actual theme
              // backgroundColor: selectedColorId === color.id ? `var(--color-primary-500)` : `var(--surface-color)`,
              // color: selectedColorId === color.id ? `var(--text-color-on-primary)` : `var(--color-primary-600)`,
              // borderColor: selectedColorId === color.id ? `var(--color-primary-600)` : `var(--color-primary-500)`,
            }}
            aria-pressed={selectedColorId === color.id}
          >
            <span style={{
              display: 'inline-block',
              width: '1em',
              height: '1em',
              backgroundColor: color.value,
              borderRadius: '50%',
              marginRight: '0.5em',
              border: '1px solid rgba(0,0,0,0.2)'
            }}></span>
            {color.label}
          </button>
        ))}
      </div>

      {message && (
        <div className={`message-base-style ${message.includes('Erreur') || message.includes('non disponible') ? 'error-message' : 'info-message'}`} style={{ marginTop: '1rem' }}>
          {message}
        </div>
      )}
    </div>
  );
}
