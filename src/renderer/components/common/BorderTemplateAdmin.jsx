import React, { useState, useEffect } from 'react';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';
import DattaModal from './DattaModal';
import borderTemplateService from '../../services/borderTemplateService';

export default function BorderTemplateAdmin({ user }) {
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [customTemplate, setCustomTemplate] = useState({
    name: '',
    color: '#6366f1',
    width: '2px',
    environment: 'custom',
    glow: ''
  });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCustomEditor, setShowCustomEditor] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [isDegradedMode, setIsDegradedMode] = useState(false);

  const environmentTemplates = borderTemplateService.constructor.getEnvironmentTemplates();

  useEffect(() => {
    initializeComponent();
    const unsubscribe = borderTemplateService.subscribe((template) => {
      setCurrentTemplate(template);
      if (template.template && environmentTemplates[template.template]) {
        setSelectedTemplate(template.template);
      }
    });
    return unsubscribe;
  }, []);

  const initializeComponent = async () => {
    await loadCurrentTemplate();
    await loadHistory();
    setIsDegradedMode(borderTemplateService.isDegraded());
  };

  const loadCurrentTemplate = async () => {
    const template = borderTemplateService.getCurrentTemplate();
    if (template) {
      setCurrentTemplate(template);
      if (template.template && environmentTemplates[template.template]) {
        setSelectedTemplate(template.template);
      }
    }
  };

  const loadHistory = async () => {
    const result = await borderTemplateService.getHistory(10);
    if (result.success) {
      setHistory(result.data || []);
      if (result.degradedMode) setIsDegradedMode(true);
    }
  };

  const handleEnvironmentTemplateSelect = (key) => {
    setSelectedTemplate(key);
    const t = environmentTemplates[key];
    if (t) {
      setCustomTemplate({
        name: t.name,
        color: t.color,
        width: t.width,
        environment: t.environment,
        glow: t.glow || ''
      });
    }
  };

  const handleApplyTemplate = async () => {
    if (!selectedTemplate) {
      setMessage('Veuillez sélectionner un template');
      return;
    }
    setLoading(true);
    setMessage('');
    const t = environmentTemplates[selectedTemplate];
    if (!t) {
      setMessage('Template non trouvé');
      setLoading(false);
      return;
    }
    const result = await borderTemplateService.saveTemplate({
      ...t,
      template: selectedTemplate
    });
    setMessage(result.success ? result.message : result.error);
    await loadHistory();
    setLoading(false);
  };

  const handleCustomTemplateSubmit = async () => {
    setLoading(true);
    setMessage('');
    const validation = borderTemplateService.constructor.validateTemplate(customTemplate);
    if (!validation.isValid) {
      setMessage(`Erreurs de validation: ${validation.errors.join(', ')}`);
      setLoading(false);
      return;
    }
    const data = { ...customTemplate, template: 'custom', name: customTemplate.name.trim() };
    const result = await borderTemplateService.saveTemplate(data);
    setMessage(result.success ? result.message : result.error);
    if (result.success) {
      setShowCustomEditor(false);
      setSelectedTemplate('custom');
      await loadHistory();
    }
    setLoading(false);
  };

  const resetToDefault = async () => {
    if (!window.confirm('Voulez-vous vraiment remettre la bordure par défaut (aucune bordure) ?')) return;
    setLoading(true);
    const def = environmentTemplates.default;
    const result = await borderTemplateService.saveTemplate({ ...def, template: 'default' });
    setMessage(result.success ? 'Configuration remise par défaut' : result.error);
    if (result.success) {
      setSelectedTemplate('default');
      await loadHistory();
    }
    setLoading(false);
  };

  const handleRepairConfiguration = async () => {
    if (!window.confirm('Voulez-vous essayer de réparer la configuration de bordure ?')) return;
    setLoading(true);
    const result = await borderTemplateService.repairConfiguration();
    if (result.success) {
      setMessage('Configuration réparée avec succès');
      setIsDegradedMode(false);
      await initializeComponent();
    } else {
      setMessage(`Erreur de réparation: ${result.error}`);
    }
    setLoading(false);
  };

  if (user.role !== 'admin') {
    return (
      <div className="card">
        <div className="card-body text-center">
          <i className="feather icon-lock mb-3" style={{ fontSize: '3rem', color: 'var(--pc-text-muted)' }}></i>
          <h5>Accès Restreint</h5>
          <p className="text-muted">La configuration des templates de bordure est réservée aux administrateurs.</p>
          {currentTemplate && (
            <div className="alert alert-info">
              <strong>Configuration actuelle :</strong> {currentTemplate.name}
              <br />
              <small>Environnement : {currentTemplate.environment}</small>
            </div>
          )}
          {isDegradedMode && (
            <div className="degraded-mode-alert">
              <i className="feather icon-alert-triangle me-2"></i>
              <strong>Mode dégradé :</strong> Configuration de base de données non disponible
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="border-template-admin">
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">🌍 Configuration Globale - Templates de Bordure</h5>
          <small className="text-muted">Cette configuration s'applique immédiatement à tous les utilisateurs connectés</small>
        </div>
        <div className="card-body">
          {isDegradedMode && (
            <div className="degraded-mode-alert d-flex align-items-center justify-content-between">
              <div>
                <i className="feather icon-alert-triangle me-2"></i>
                <strong>Mode dégradé :</strong> Base de données non disponible. Les modifications ne seront pas persistantes.
              </div>
              <DattaButton variant="outline-warning" size="sm" onClick={handleRepairConfiguration} disabled={loading}>
                Réparer
              </DattaButton>
            </div>
          )}

          {message && (
            <DattaAlert
              type={message.includes('succès') || message.includes('sauvegardée') || message.includes('réparée') ? 'success' : 'danger'}
              dismissible
              onClose={() => setMessage('')}
            >
              {message}
            </DattaAlert>
          )}

          {currentTemplate && (
            <div className="alert alert-info mb-4">
              <div className="d-flex align-items-center">
                <div className="flex-grow-1">
                  <strong>Configuration actuelle :</strong> {currentTemplate.name}
                  <br />
                  <small>
                    Environnement : {currentTemplate.environment} | Couleur : {currentTemplate.color} | Largeur : {currentTemplate.width}
                    {isDegradedMode && ' (Mode dégradé)'}
                  </small>
                </div>
                <div className="border-preview active" style={{ width: '80px', height: '50px', border: `${currentTemplate.width} solid ${currentTemplate.color}`, boxShadow: currentTemplate.glow || 'none' }}></div>
              </div>
            </div>
          )}

          <div className="mb-4">
            <h6>Templates d'Environnement</h6>
            <div className="template-grid">
              {Object.entries(environmentTemplates).map(([key, t]) => (
                <div key={key} className={`template-card ${selectedTemplate === key ? 'selected' : ''}`} onClick={() => handleEnvironmentTemplateSelect(key)}>
                  <div className="template-preview" style={{ border: `${t.width} solid ${t.color}`, boxShadow: t.glow || 'none' }}>Aperçu</div>
                  <div className="template-name">{t.name}</div>
                  <div className="template-description">{t.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="d-flex gap-2 flex-wrap">
            <DattaButton variant="primary" onClick={handleApplyTemplate} disabled={loading || !selectedTemplate}>
              {loading ? 'Application...' : 'Appliquer à tous les utilisateurs'}
            </DattaButton>

            <DattaButton variant="secondary" onClick={() => setShowCustomEditor(true)} disabled={loading}>
              Créer un template personnalisé
            </DattaButton>

            <DattaButton variant="outline-secondary" onClick={() => setShowHistory(true)} disabled={loading}>
              Voir l'historique
            </DattaButton>

            <DattaButton variant="outline-danger" onClick={resetToDefault} disabled={loading}>
              Remettre par défaut
            </DattaButton>

            {isDegradedMode && (
              <DattaButton variant="warning" onClick={handleRepairConfiguration} disabled={loading}>
                {loading ? 'Réparation...' : 'Réparer la configuration'}
              </DattaButton>
            )}
          </div>
        </div>
      </div>

      <DattaModal open={showCustomEditor} onClose={() => setShowCustomEditor(false)} title="Créer un Template Personnalisé" size="md">
        <div className="mb-3">
          <label className="form-label">Nom du template *</label>
          <input type="text" className="form-control" value={customTemplate.name} onChange={e => setCustomTemplate(prev => ({ ...prev, name: e.target.value }))} placeholder="Ex: Mon environnement" maxLength={50} />
        </div>
        <div className="row">
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Couleur *</label>
              <div className="input-group">
                <input type="color" className="form-control form-control-color" value={customTemplate.color} onChange={e => setCustomTemplate(prev => ({ ...prev, color: e.target.value }))} />
                <input type="text" className="form-control" value={customTemplate.color} onChange={e => setCustomTemplate(prev => ({ ...prev, color: e.target.value }))} placeholder="#ff0000" />
              </div>
              <small className="form-text text-muted">Couleur hexadécimale ou "transparent"</small>
            </div>
          </div>
          <div className="col-md-6">
            <div className="mb-3">
              <label className="form-label">Largeur *</label>
              <select className="form-select" value={customTemplate.width} onChange={e => setCustomTemplate(prev => ({ ...prev, width: e.target.value }))}>
                <option value="0px">Aucune (0px)</option>
                <option value="1px">Fine (1px)</option>
                <option value="2px">Moyenne (2px)</option>
                <option value="3px">Épaisse (3px)</option>
                <option value="4px">Très épaisse (4px)</option>
                <option value="5px">Extra épaisse (5px)</option>
              </select>
            </div>
          </div>
        </div>
        <div className="mb-3">
          <label className="form-label">Effet de lueur (optionnel)</label>
          <input type="text" className="form-control" value={customTemplate.glow} onChange={e => setCustomTemplate(prev => ({ ...prev, glow: e.target.value }))} placeholder="Ex: 0 0 10px #ff0000" />
          <small className="form-text text-muted">Format CSS box-shadow (ex: 0 0 10px #couleur)</small>
        </div>
        <div className="mb-3">
          <label className="form-label">Aperçu</label>
          <div className="border-preview" style={{ border: `${customTemplate.width} solid ${customTemplate.color}`, boxShadow: customTemplate.glow || 'none', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {customTemplate.name || 'Template personnalisé'}
          </div>
        </div>
        <div className="d-flex justify-content-end gap-2">
          <DattaButton variant="secondary" onClick={() => setShowCustomEditor(false)}>
            Annuler
          </DattaButton>
          <DattaButton variant="primary" onClick={handleCustomTemplateSubmit} disabled={loading || !customTemplate.name.trim()}>
            {loading ? 'Création...' : 'Créer et Appliquer'}
          </DattaButton>
        </div>
      </DattaModal>

      <DattaModal open={showHistory} onClose={() => setShowHistory(false)} title="Historique des Modifications" size="lg">
        {isDegradedMode && (
          <div className="degraded-mode-alert mb-3">
            <i className="feather icon-info me-2"></i>
            Historique non disponible en mode dégradé
          </div>
        )}
        {history.length === 0 ? (
          <p className="text-muted text-center py-4">{isDegradedMode ? 'Historique non disponible en mode dégradé' : 'Aucun historique disponible'}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Template</th>
                  <th>Modifié par</th>
                  <th>Aperçu</th>
                </tr>
              </thead>
              <tbody>
                {history.map((item, idx) => (
                  <tr key={idx}>
                    <td><small>{new Date(item.modifiedAt).toLocaleString('fr-FR')}</small></td>
                    <td><strong>{item.name}</strong><br /><small className="text-muted">{item.environment}</small></td>
                    <td><small>{item.modifiedBy || 'Système'}</small></td>
                    <td>
                      <div style={{ border: `${item.width} solid ${item.color}`, boxShadow: item.glow || 'none', width: '40px', height: '25px', borderRadius: '2px' }}></div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DattaModal>
    </div>
  );
}
