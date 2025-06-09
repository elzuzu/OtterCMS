import React, { useEffect, useState } from 'react';
import DattaModal from './DattaModal';

export default function DattaKeyboardShortcuts() {
  const [showHelp, setShowHelp] = useState(false);

  const shortcuts = [
    { keys: 'Ctrl + N', description: 'Nouvel individu', action: 'new_individual' },
    { keys: 'Ctrl + S', description: 'Sauvegarder', action: 'save' },
    { keys: 'Ctrl + F', description: 'Rechercher', action: 'search' },
    { keys: 'Ctrl + R', description: 'Actualiser', action: 'refresh' },
    { keys: 'Ctrl + D', description: 'Diagnostic', action: 'diagnostic' },
    { keys: 'Ctrl + B', description: 'Sauvegarde', action: 'backup' },
    { keys: 'Ctrl + ?', description: 'Aide raccourcis', action: 'help' },
    { keys: 'Échap', description: 'Fermer modal/Annuler', action: 'cancel' }
  ];

  useEffect(() => {
    const handleKeyDown = (event) => {
      const active = document.activeElement;
      const isInputActive =
        active &&
        (active.tagName === 'INPUT' ||
          active.tagName === 'TEXTAREA' ||
          active.contentEditable === 'true');

      if ((event.ctrlKey && event.key === '?') || event.key === 'F1') {
        event.preventDefault();
        setShowHelp(true);
        return;
      }

      if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        if (modals.length > 0) {
          const lastModal = modals[modals.length - 1];
          const closeButton = lastModal.querySelector('.btn-close');
          if (closeButton) closeButton.click();
        }
        return;
      }

      if (isInputActive) return;

      if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            window.dispatchEvent(
              new CustomEvent('keyboard-shortcut', { detail: { action: 'new_individual' } })
            );
            break;
          case 's':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'save' } }));
            break;
          case 'f':
            event.preventDefault();
            const searchInput = document.querySelector('input[placeholder*="Recher"]');
            if (searchInput) searchInput.focus();
            break;
          case 'r':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'refresh' } }));
            break;
          case 'd':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'diagnostic' } }));
            break;
          case 'b':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { detail: { action: 'backup' } }));
            break;
          default:
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      <div className="position-fixed bottom-0 start-0 p-2" style={{ zIndex: 1000 }}>
        <button
          className="btn btn-sm btn-outline-secondary opacity-50"
          onClick={() => setShowHelp(true)}
          title="Aide raccourcis (Ctrl + ?)"
        >
          <i className="feather icon-help-circle"></i>
        </button>
      </div>

      <DattaModal open={showHelp} onClose={() => setShowHelp(false)} title="Raccourcis clavier" size="md">
        <div className="table-responsive">
          <table className="table table-sm">
            <thead>
              <tr>
                <th>Raccourci</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {shortcuts.map((shortcut, index) => (
                <tr key={index}>
                  <td>
                    <code className="bg-light px-2 py-1 rounded">{shortcut.keys}</code>
                  </td>
                  <td>{shortcut.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-muted small mt-3">
          <i className="feather icon-info me-1"></i>
          Les raccourcis sont désactivés lors de la saisie dans les champs de texte.
        </div>
      </DattaModal>
    </>
  );
}
