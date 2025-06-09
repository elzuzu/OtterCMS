import React, { useState, useEffect } from 'react';

export default function DattaThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [currentColor, setCurrentColor] = useState('blue');

  useEffect(() => {
    const savedTheme = localStorage.getItem('datta-theme') || 'light';
    const savedColor = localStorage.getItem('datta-color') || 'blue';

    setCurrentTheme(savedTheme);
    setCurrentColor(savedColor);

    applyTheme(savedTheme, savedColor);
  }, []);

  const applyTheme = (theme, color) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color-scheme', color);
    localStorage.setItem('datta-theme', theme);
    localStorage.setItem('datta-color', color);
  };

  const handleThemeChange = (theme) => {
    setCurrentTheme(theme);
    applyTheme(theme, currentColor);
  };

  const handleColorChange = (color) => {
    setCurrentColor(color);
    applyTheme(currentTheme, color);
  };

  const themes = [
    { id: 'light', name: 'Clair', icon: 'icon-sun' },
    { id: 'dark', name: 'Sombre', icon: 'icon-moon' }
  ];

  const colors = [
    { id: 'blue', name: 'Bleu', color: '#007bff' },
    { id: 'green', name: 'Vert', color: '#28a745' },
    { id: 'purple', name: 'Violet', color: '#6f42c1' },
    { id: 'orange', name: 'Orange', color: '#fd7e14' }
  ];

  return (
    <div className="theme-selector">
      <div className="mb-3">
        <h6>Mode d'affichage</h6>
        <div className="btn-group w-100" role="group">
          {themes.map((theme) => (
            <button
              key={theme.id}
              type="button"
              className={`btn ${currentTheme === theme.id ? 'btn-primary' : 'btn-outline-primary'}`}
              onClick={() => handleThemeChange(theme.id)}
            >
              <i className={`feather ${theme.icon} me-2`}></i>
              {theme.name}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <h6>Couleur principale</h6>
        <div className="d-flex gap-2">
          {colors.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`btn p-2 ${currentColor === color.id ? 'border border-3' : ''}`}
              style={{
                backgroundColor: color.color,
                width: '40px',
                height: '40px',
                borderRadius: '8px'
              }}
              onClick={() => handleColorChange(color.id)}
              title={color.name}
            >
              {currentColor === color.id && <i className="feather icon-check text-white"></i>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
