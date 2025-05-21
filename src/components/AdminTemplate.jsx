import React, { useState, useEffect } from 'react';

const THEME_COLORS = [
  { id: 'blue', label: 'Bleu (Défaut)', value: '#3b82f6' },
  { id: 'green', label: 'Vert', value: '#10b981' },
  { id: 'purple', label: 'Violet', value: '#8b5cf6' },
  { id: 'orange', label: 'Orange', value: '#f97316' },
  { id: 'red', label: 'Rouge', value: '#ef4444' }
];

export default function AdminTemplate() {
  const [selectedColorId, setSelectedColorId] = useState('blue');
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchCurrentTheme() {
      setIsLoading(true);
      setMessage('');
      if (window.api && window.api.getThemeColor) {
        try {
          const res = await window.api.getThemeColor();
          if (res && res.success && res.color) {
            setSelectedColorId(res.color);
            // The App.jsx already applies the class on load,
            // but we ensure our local state is in sync.
          } else {
            setSelectedColorId('blue'); // Fallback
            if(res && !res.success) setMessage(`Erreur chargement thème: ${res.error}`);
          }
        } catch (error) {
          setSelectedColorId('blue'); // Fallback
          setMessage(`Erreur API chargement thème: ${error.message}`);
          console.error("AdminTemplate fetchCurrentTheme error:", error);
        }
      } else {
        setMessage("API de thème non disponible.");
        setSelectedColorId('blue'); // Fallback
      }
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
    setMessage('Application du thème...');

    if (window.api && window.api.setThemeColor) {
      try {
        const res = await window.api.setThemeColor(colorId);
        if (res.success) {
          setMessage('Thème appliqué et sauvegardé avec succès !');
        } else {
          setMessage(`Erreur sauvegarde thème: ${res.error || 'Erreur inconnue.'}`);
          // Optionally revert to previously saved theme if save fails
          // const prevTheme = await window.api.getThemeColor(); // Simplified here
          // if (prevTheme.success) applyThemeClassToBody(prevTheme.color);
        }
      } catch (error) {
        setMessage(`Erreur API sauvegarde thème: ${error.message}`);
        console.error("AdminTemplate handleSelectColor error:", error);
      }
    } else {
      setMessage("API de thème non disponible pour la sauvegarde.");
    }
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
