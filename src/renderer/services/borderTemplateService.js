class BorderTemplateService {
  constructor() {
    this.currentTemplate = null;
    this.listeners = new Set();
    this.isInitialized = false;
    this.isDegradedMode = false;
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  static ENVIRONMENT_TEMPLATES = {
    development: {
      template: 'development',
      color: '#28a745',
      width: '4px',
      name: 'Développement',
      environment: 'development',
      description: 'Environnement de développement',
      glow: '0 0 8px rgba(40, 167, 69, 0.5)'
    },
    staging: {
      template: 'staging',
      color: '#ffc107',
      width: '3px',
      name: 'Recette',
      environment: 'staging',
      description: 'Environnement de test et validation',
      glow: '0 0 6px rgba(255, 193, 7, 0.4)'
    },
    production: {
      template: 'production',
      color: '#dc3545',
      width: '2px',
      name: 'Production',
      environment: 'production',
      description: 'Environnement de production',
      glow: '0 0 4px rgba(220, 53, 69, 0.3)'
    },
    default: {
      template: 'default',
      color: 'transparent',
      width: '0px',
      name: 'Standard',
      environment: 'production',
      description: 'Aucune bordure visible',
      glow: 'none'
    }
  };

  getDefaultTemplate() {
    return BorderTemplateService.ENVIRONMENT_TEMPLATES.default;
  }

  async initialize() {
    if (this.isInitialized) return;
    try {
      if (!window.api || !window.api.getBorderTemplate) {
        this.isDegradedMode = true;
        this.currentTemplate = this.getDefaultTemplate();
        this.applyTemplate(this.currentTemplate);
        this.isInitialized = true;
        return;
      }
      await this.loadCurrentTemplateWithRetry();
      this.setupRealTimeUpdates();
      this.isInitialized = true;
    } catch (e) {
      console.error('init border service', e);
      this.handleInitializationError();
    }
  }

  async loadCurrentTemplateWithRetry() {
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await window.api.getBorderTemplate();
        if (result.success && result.data) {
          this.currentTemplate = result.data;
          this.isDegradedMode = result.degradedMode || false;
          this.applyTemplate(result.data);
          return;
        } else {
          throw new Error(result.error || 'no data');
        }
      } catch (e) {
        if (attempt === this.maxRetries) throw e;
        await new Promise(res => setTimeout(res, 1000 * attempt));
      }
    }
  }

  handleInitializationError() {
    this.isDegradedMode = true;
    this.currentTemplate = this.getDefaultTemplate();
    this.applyTemplate(this.currentTemplate);
    this.isInitialized = true;
  }

  applyTemplate(template) {
    if (!template) template = this.getDefaultTemplate();
    if (document.body) document.body.classList.add('border-changing');
    const root = document.documentElement;
    root.style.setProperty('--app-border-width', template.width || '0px');
    root.style.setProperty('--app-border-color', template.color || 'transparent');
    root.style.setProperty('--app-border-style', 'solid');
    root.style.setProperty('--app-border-glow', template.glow || 'none');
    if (window.api && window.api.applyBorderTemplate) {
      try { window.api.applyBorderTemplate(template); } catch (e) { console.error('apply border template ipc', e); }
    }
    setTimeout(() => {
      if (document.body) document.body.classList.remove('border-changing');
    }, 1000);
    this.notifyListeners(template);
  }

  async saveTemplate(data) {
    if (!window.api || !window.api.setBorderTemplate) {
      return { success: false, error: 'Service non disponible en mode dégradé' };
    }
    const validation = BorderTemplateService.validateTemplate(data);
    if (!validation.isValid) {
      return { success: false, error: `Erreurs de validation: ${validation.errors.join(', ')}` };
    }
    const result = await window.api.setBorderTemplate(data);
    if (result.success) {
      this.currentTemplate = data;
      this.applyTemplate(data);
    }
    return result;
  }

  async getHistory(limit = 10) {
    if (!window.api || !window.api.getBorderTemplateHistory) {
      return { success: true, data: [], degradedMode: true };
    }
    return window.api.getBorderTemplateHistory(limit);
  }

  async repairConfiguration() {
    if (!window.api || !window.api.repairBorderConfig) {
      return { success: false, error: 'Fonction de réparation non disponible' };
    }
    const result = await window.api.repairBorderConfig();
    if (result.success) {
      await this.loadCurrentTemplateWithRetry();
      this.isDegradedMode = false;
    }
    return result;
  }

  setupRealTimeUpdates() {
    if (!window.api || !window.api.onBorderTemplateChanged) return;
    this.unsubscribe = window.api.onBorderTemplateChanged((t) => {
      if (t) {
        this.currentTemplate = t;
        this.applyTemplate(t);
      }
    });
  }

  subscribe(cb) {
    if (typeof cb !== 'function') return () => {};
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notifyListeners(t) {
    this.listeners.forEach((cb) => {
      try { cb(t); } catch (e) { console.error('listener error', e); }
    });
  }

  getCurrentTemplate() {
    return this.currentTemplate || this.getDefaultTemplate();
  }

  isDegraded() {
    return this.isDegradedMode;
  }

  static getEnvironmentTemplates() {
    return BorderTemplateService.ENVIRONMENT_TEMPLATES;
  }

  static validateTemplate(t) {
    const errors = [];
    if (!t || typeof t !== 'object') errors.push('Template invalide');
    if (!t.name || !t.name.trim()) errors.push('Le nom du template est obligatoire');
    if (!t.color) {
      errors.push('La couleur est obligatoire');
    } else if (t.color !== 'transparent' && !t.color.match(/^#[0-9A-Fa-f]{6}$/)) {
      errors.push('Format de couleur invalide (ex: #ff0000 ou transparent)');
    }
    if (!t.width) {
      errors.push('La largeur est obligatoire');
    } else if (!t.width.match(/^\d+px$/)) {
      errors.push('Format de largeur invalide (ex: 2px)');
    }
    return { isValid: errors.length === 0, errors };
  }

  destroy() {
    this.listeners.clear();
    this.isInitialized = false;
    if (this.unsubscribe) this.unsubscribe();
  }
}

const borderTemplateService = new BorderTemplateService();
export default borderTemplateService;
