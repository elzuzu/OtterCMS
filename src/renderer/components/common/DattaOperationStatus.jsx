export default function DattaOperationStatus({ operations }) {
  if (operations.length === 0) return null;
  return (
    <div className="fixed-bottom p-3">
      <div className="card shadow">
        <div className="card-body">
          <h6><i className="feather icon-activity me-2"></i>Operations en cours</h6>
          {operations.map(op => (
            <div key={op.id} className="d-flex align-items-center mb-2">
              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
              <span className="me-auto">{op.description}</span>
              <div className="progress" style={{ width: '100px' }}>
                <div className="progress-bar" style={{ width: `${op.progress}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
