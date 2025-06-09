import React from 'react';
import DattaButton from './DattaButton';

class DattaErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <div className="card text-center" style={{ maxWidth: '500px' }}>
            <div className="card-body">
              <div className="avtar avtar-xl bg-light-danger mb-4">
                <i className="feather icon-alert-triangle f-36"></i>
              </div>
              <h4 className="mb-3">Oups ! Une erreur s'est produite</h4>
              <p className="text-muted mb-4">L'application a rencontre un probleme. Vos donnees sont sauvegardees.</p>
              <div className="d-flex gap-2 justify-content-center">
                <DattaButton variant="primary" onClick={() => window.location.reload()}>Recharger l'application</DattaButton>
                <DattaButton variant="secondary" onClick={() => this.setState({ hasError: false })}>Reessayer</DattaButton>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default DattaErrorBoundary;
