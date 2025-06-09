export default function DattaBackupStatus({ lastBackup, nextBackup, isBackingUp }) {
  return (
    <div className="card">
      <div className="card-body">
        <div className="d-flex align-items-center">
          <div className="avtar avtar-s bg-light-success me-3">
            <i className={`feather ${isBackingUp ? 'icon-download' : 'icon-shield'}`}></i>
          </div>
          <div>
            <h6 className="mb-1">Sauvegarde automatique</h6>
            <p className="mb-0 text-muted">
              {isBackingUp ? 'Sauvegarde en cours...' : `Derniere: ${lastBackup}`}
            </p>
          </div>
        </div>
        {isBackingUp && (
          <div className="progress mt-2">
            <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: '100%' }}></div>
          </div>
        )}
      </div>
    </div>
  );
}
