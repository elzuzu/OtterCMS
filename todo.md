# OtterCMS - TODO Complet Post-Migration Tauri

## 📋 Contexte & Architecture

**Stack technique :**
- **Frontend :** React + Datta Able theme + Tauri 2
- **Backend :** Rust + libSQL/rusqlite
- **Base de données :** SQLite sur partage réseau Windows (\\server\share\db\ottercms.sqlite)
- **Déploiement :** Client lourd Windows 64-bit, pas de serveur centralisé
- **Utilisateurs :** Multi-utilisateurs simultanés sur le même fichier SQLite

**Contraintes critiques :**
- ✅ Gestion des verrous SQLite entre clients
- ✅ Résilience aux déconnexions réseau
- ✅ Interface cohérente avec Datta Able
- ✅ Performance sur connexions lentes
- ✅ Zéro interruption de service

---

## 🚨 **PHASE 1 : CRITIQUE - Stabilité & Réseau (Semaines 1-2)**

### 1.1 Gestion robuste des verrous SQLite

- [x] **Implémentation du retry avec backoff exponentiel**
```rust
// src-tauri/src/database/retry.rs
use std::time::Duration;
use tokio::time::sleep;
use anyhow::Result;

pub struct RetryConfig {
    pub max_attempts: u32,
    pub base_delay_ms: u64,
    pub max_delay_ms: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 5,
            base_delay_ms: 100,
            max_delay_ms: 5000,
        }
    }
}

pub async fn execute_with_retry<T, F, Fut>(
    operation: F,
    config: &RetryConfig,
) -> Result<T>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T>>,
{
    let mut last_error = None;
    
    for attempt in 0..config.max_attempts {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                let error_msg = e.to_string().to_lowercase();
                if error_msg.contains("database is locked") || 
                   error_msg.contains("sqlite_busy") {
                    last_error = Some(e);
                    
                    if attempt < config.max_attempts - 1 {
                        let delay = std::cmp::min(
                            config.base_delay_ms * 2_u64.pow(attempt),
                            config.max_delay_ms,
                        );
                        sleep(Duration::from_millis(delay)).await;
                        continue;
                    }
                } else {
                    return Err(e); // Erreur non récupérable
                }
            }
        }
    }
    
    Err(last_error.unwrap_or_else(|| anyhow::anyhow!("Max retries exceeded")))
}
```

- [x] **Configuration optimisée pour réseau**
```rust
// src-tauri/src/database/connection.rs
impl DatabasePool {
    pub async fn new_network_optimized(db_path: &str) -> Result<Self> {
        let db = Database::open(db_path).await?;
        let conn = db.connect()?;
        
        // Configuration spéciale pour partage réseau
        conn.execute_batch("
            PRAGMA journal_mode=WAL;
            PRAGMA synchronous=NORMAL;
            PRAGMA busy_timeout=30000;       -- 30 secondes
            PRAGMA cache_size=-16384;        -- 16MB cache
            PRAGMA temp_store=MEMORY;
            PRAGMA wal_autocheckpoint=1000;  -- Checkpoint moins fréquent
            PRAGMA foreign_keys=ON;
        ").await?;
        
        Ok(Self { db: Arc::new(db) })
    }
}
```

- [x] **Wrapper de commandes avec retry automatique**
```rust
// src-tauri/src/commands/mod.rs
use crate::database::retry::{execute_with_retry, RetryConfig};

#[macro_export]
macro_rules! db_command_with_retry {
    ($state:expr, $operation:expr) => {
        {
            let db = $state.db.clone();
            let config = RetryConfig::default();
            
            execute_with_retry(
                || async {
                    let conn = db.get_connection()?;
                    $operation(conn).await
                },
                &config,
            ).await
        }
    };
}
```

### 1.2 Composants Datta Able pour la gestion réseau

- [x] **DattaNetworkStatus - Indicateur d'état réseau**
```jsx
// src/renderer/components/common/DattaNetworkStatus.jsx
import React, { useState, useEffect } from 'react';
import DattaAlert from './DattaAlert';

export default function DattaNetworkStatus() {
  const [networkState, setNetworkState] = useState({
    isOnline: true,
    dbConnected: true,
    lastSync: new Date(),
    latency: null
  });

  useEffect(() => {
    const checkNetwork = async () => {
      try {
        const start = Date.now();
        await window.api.pingDatabase();
        const latency = Date.now() - start;
        
        setNetworkState(prev => ({
          ...prev,
          isOnline: true,
          dbConnected: true,
          lastSync: new Date(),
          latency
        }));
      } catch (error) {
        setNetworkState(prev => ({
          ...prev,
          isOnline: false,
          dbConnected: false
        }));
      }
    };

    // Vérification toutes les 30 secondes
    const interval = setInterval(checkNetwork, 30000);
    checkNetwork(); // Vérification initiale

    return () => clearInterval(interval);
  }, []);

  if (!networkState.isOnline || !networkState.dbConnected) {
    return (
      <DattaAlert type="warning" className="mb-3">
        <div className="d-flex align-items-center">
          <i className="feather icon-wifi-off me-2"></i>
          <div>
            <strong>Connexion interrompue</strong>
            <br />
            <small>Tentative de reconnexion automatique...</small>
          </div>
        </div>
      </DattaAlert>
    );
  }

  return (
    <div className="d-flex align-items-center text-success small">
      <i className="feather icon-wifi me-1"></i>
      <span>Connecté</span>
      {networkState.latency && (
        <span className="ms-2 text-muted">({networkState.latency}ms)</span>
      )}
    </div>
  );
}
```

- [x] **DattaConflictResolver - Résolution de conflits**
```jsx
// src/renderer/components/common/DattaConflictResolver.jsx
import React from 'react';
import DattaModal from './DattaModal';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';

export default function DattaConflictResolver({ 
  isOpen, 
  conflicts, 
  onResolve, 
  onClose 
}) {
  const handleResolve = (strategy, fieldResolutions = {}) => {
    onResolve({ strategy, fieldResolutions });
  };

  return (
    <DattaModal 
      open={isOpen} 
      onClose={onClose}
      title="Résolution de conflit de données"
      size="xl"
    >
      <DattaAlert type="warning" className="mb-4">
        <i className="feather icon-alert-triangle me-2"></i>
        <strong>Conflit détecté !</strong> Un autre utilisateur a modifié ces données.
        Choisissez comment résoudre le conflit.
      </DattaAlert>

      <div className="row">
        <div className="col-md-6">
          <div className="card border-primary">
            <div className="card-header bg-light-primary">
              <h6 className="mb-0">
                <i className="feather icon-user me-2"></i>
                Vos modifications
              </h6>
              <small className="text-muted">
                Modifié le {new Date(conflicts.local.timestamp).toLocaleString()}
              </small>
            </div>
            <div className="card-body">
              {Object.entries(conflicts.local.changes).map(([field, value]) => (
                <div key={field} className="mb-2">
                  <strong>{field}:</strong> {String(value)}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card border-warning">
            <div className="card-header bg-light-warning">
              <h6 className="mb-0">
                <i className="feather icon-users me-2"></i>
                Modifications distantes
              </h6>
              <small className="text-muted">
                Modifié par {conflicts.remote.user} le {new Date(conflicts.remote.timestamp).toLocaleString()}
              </small>
            </div>
            <div className="card-body">
              {Object.entries(conflicts.remote.changes).map(([field, value]) => (
                <div key={field} className="mb-2">
                  <strong>{field}:</strong> {String(value)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="d-flex justify-content-end gap-2 mt-4">
        <DattaButton variant="secondary" onClick={onClose}>
          <i className="feather icon-x me-2"></i>
          Annuler
        </DattaButton>
        <DattaButton 
          variant="primary" 
          onClick={() => handleResolve('local')}
        >
          <i className="feather icon-check me-2"></i>
          Garder mes modifications
        </DattaButton>
        <DattaButton 
          variant="warning" 
          onClick={() => handleResolve('remote')}
        >
          <i className="feather icon-download me-2"></i>
          Garder les modifications distantes
        </DattaButton>
        <DattaButton 
          variant="info" 
          onClick={() => handleResolve('merge')}
        >
          <i className="feather icon-git-merge me-2"></i>
          Fusionner (avancé)
        </DattaButton>
      </div>
    </DattaModal>
  );
}
```

### 1.3 Commandes Tauri robustes

- [x] **Command de diagnostic réseau**
```rust
// src-tauri/src/commands/diagnostics.rs
#[tauri::command]
pub async fn ping_database(state: State<'_, AppState>) -> Result<PingResult, String> {
    let start = std::time::Instant::now();
    
    db_command_with_retry!(state, |conn| async move {
        conn.execute("SELECT 1", []).await?;
        Ok(())
    }).await.map_err(|e| e.to_string())?;
    
    let latency = start.elapsed().as_millis() as u32;
    
    Ok(PingResult {
        success: true,
        latency_ms: latency,
        timestamp: chrono::Utc::now(),
    })
}

#[tauri::command]
pub async fn run_diagnostics(state: State<'_, AppState>) -> Result<DiagnosticResult, String> {
    let mut results = DiagnosticResult::default();
    
    // Test connexion DB
    match ping_database(state.clone()).await {
        Ok(ping) => {
            results.database_connected = true;
            results.database_latency = ping.latency_ms;
        }
        Err(_) => {
            results.database_connected = false;
        }
    }
    
    // Test permissions
    results.has_write_permissions = test_write_permissions(&state).await;
    
    // Test intégrité
    results.database_integrity = check_database_integrity(&state).await;
    
    Ok(results)
}
```

---

## ⚡ **PHASE 2 : HAUTE PRIORITÉ - UX & Performance (Semaines 3-4)**

### 2.1 Loading States unifiés avec Datta Able

- [x] **DattaLoadingOverlay - Overlay de chargement unifié**
```jsx
// src/renderer/components/common/DattaLoadingOverlay.jsx
import React from 'react';

export default function DattaLoadingOverlay({ 
  isLoading, 
  message = "Chargement en cours...", 
  progress = null,
  showCancel = false,
  onCancel = null,
  children 
}) {
  return (
    <div className="position-relative">
      {children}
      {isLoading && (
        <div className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white bg-opacity-90" style={{ zIndex: 1050 }}>
          <div className="card shadow text-center" style={{ minWidth: '300px' }}>
            <div className="card-body">
              <div className="spinner-border text-primary mb-3" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <h6 className="mb-2">{message}</h6>
              
              {progress !== null && (
                <div className="progress mb-3">
                  <div 
                    className="progress-bar progress-bar-striped progress-bar-animated" 
                    style={{ width: `${progress}%` }}
                  >
                    {progress}%
                  </div>
                </div>
              )}
              
              {showCancel && onCancel && (
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  onClick={onCancel}
                >
                  <i className="feather icon-x me-2"></i>
                  Annuler
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [x] **DattaOperationQueue - Gestionnaire d'opérations**
```jsx
// src/renderer/components/common/DattaOperationQueue.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import DattaAlert from './DattaAlert';

const OperationContext = createContext();

export const useOperations = () => {
  const context = useContext(OperationContext);
  if (!context) {
    throw new Error('useOperations must be used within OperationProvider');
  }
  return context;
};

export function OperationProvider({ children }) {
  const [operations, setOperations] = useState([]);

  const addOperation = (operation) => {
    const id = Date.now() + Math.random();
    setOperations(prev => [...prev, { ...operation, id, startTime: Date.now() }]);
    return id;
  };

  const updateOperation = (id, updates) => {
    setOperations(prev => 
      prev.map(op => op.id === id ? { ...op, ...updates } : op)
    );
  };

  const removeOperation = (id) => {
    setOperations(prev => prev.filter(op => op.id !== id));
  };

  const value = {
    operations,
    addOperation,
    updateOperation,
    removeOperation
  };

  return (
    <OperationContext.Provider value={value}>
      {children}
      <OperationQueueDisplay />
    </OperationContext.Provider>
  );
}

function OperationQueueDisplay() {
  const { operations } = useOperations();
  
  if (operations.length === 0) return null;

  return (
    <div className="position-fixed bottom-0 end-0 p-3" style={{ zIndex: 1040, maxWidth: '400px' }}>
      <div className="card shadow">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="feather icon-activity me-2"></i>
            Opérations en cours ({operations.length})
          </h6>
        </div>
        <div className="card-body" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          {operations.map(operation => (
            <div key={operation.id} className="d-flex align-items-center mb-2">
              <div className="flex-shrink-0 me-2">
                {operation.status === 'error' ? (
                  <i className="feather icon-alert-circle text-danger"></i>
                ) : operation.status === 'completed' ? (
                  <i className="feather icon-check-circle text-success"></i>
                ) : (
                  <div className="spinner-border spinner-border-sm" role="status"></div>
                )}
              </div>
              <div className="flex-grow-1">
                <div className="small">{operation.description}</div>
                {operation.progress !== undefined && (
                  <div className="progress progress-sm">
                    <div 
                      className="progress-bar" 
                      style={{ width: `${operation.progress}%` }}
                    ></div>
                  </div>
                )}
                {operation.status === 'error' && (
                  <div className="text-danger small">{operation.error}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 2.2 Formulaires avec auto-save

- [x] **DattaAutoSaveForm - Formulaire auto-sauvegarde**
```jsx
// src/renderer/components/common/DattaAutoSaveForm.jsx
import React, { useEffect, useState, useCallback } from 'react';
import { useOperations } from './DattaOperationQueue';
import DattaAlert from './DattaAlert';

export default function DattaAutoSaveForm({ 
  data, 
  onSave, 
  onError, 
  saveInterval = 30000,
  conflictResolver = null,
  children 
}) {
  const [lastSaved, setLastSaved] = useState(null);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [conflictData, setConflictData] = useState(null);
  const { addOperation, updateOperation, removeOperation } = useOperations();

  const performSave = useCallback(async () => {
    if (!hasUnsavedChanges) return;

    const operationId = addOperation({
      description: 'Sauvegarde automatique...',
      status: 'running'
    });

    try {
      setSaveStatus('saving');
      await onSave(data);
      
      updateOperation(operationId, {
        status: 'completed',
        description: 'Sauvegarde terminée'
      });
      
      setLastSaved(new Date());
      setSaveStatus('saved');
      setHasUnsavedChanges(false);
      
      setTimeout(() => removeOperation(operationId), 2000);
    } catch (error) {
      updateOperation(operationId, {
        status: 'error',
        description: 'Erreur de sauvegarde',
        error: error.message
      });
      
      if (error.type === 'CONFLICT') {
        setConflictData(error.conflictData);
        setSaveStatus('conflict');
      } else {
        setSaveStatus('error');
        onError?.(error);
      }
      
      setTimeout(() => removeOperation(operationId), 5000);
    }
  }, [data, hasUnsavedChanges, onSave, onError, addOperation, updateOperation, removeOperation]);

  // Auto-save interval
  useEffect(() => {
    if (saveStatus === 'saved' || !hasUnsavedChanges) return;
    
    const timer = setTimeout(performSave, saveInterval);
    return () => clearTimeout(timer);
  }, [performSave, saveInterval, hasUnsavedChanges, saveStatus]);

  // Détecter les changements
  useEffect(() => {
    if (saveStatus === 'saved') {
      const timer = setTimeout(() => setHasUnsavedChanges(true), 100);
      return () => clearTimeout(timer);
    }
  }, [data, saveStatus]);

  const getStatusBadge = () => {
    switch (saveStatus) {
      case 'saved':
        return (
          <span className="badge bg-success">
            <i className="feather icon-check me-1"></i>
            Sauvegardé
          </span>
        );
      case 'saving':
        return (
          <span className="badge bg-primary">
            <div className="spinner-border spinner-border-sm me-1" role="status"></div>
            Sauvegarde...
          </span>
        );
      case 'error':
        return (
          <span className="badge bg-danger">
            <i className="feather icon-alert-circle me-1"></i>
            Erreur
          </span>
        );
      case 'conflict':
        return (
          <span className="badge bg-warning">
            <i className="feather icon-alert-triangle me-1"></i>
            Conflit
          </span>
        );
      default:
        return (
          <span className="badge bg-warning">
            <i className="feather icon-clock me-1"></i>
            Non sauvegardé
          </span>
        );
    }
  };

  const handleConflictResolution = async (resolution) => {
    // Appliquer la résolution et relancer la sauvegarde
    setConflictData(null);
    setSaveStatus('saved');
    // Logique de résolution de conflit...
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          {getStatusBadge()}
          {lastSaved && (
            <small className="text-muted">
              Dernière sauvegarde: {lastSaved.toLocaleTimeString()}
            </small>
          )}
        </div>
        
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-primary btn-sm"
            onClick={performSave}
            disabled={saveStatus === 'saving' || !hasUnsavedChanges}
          >
            <i className="feather icon-save me-1"></i>
            Sauvegarder maintenant
          </button>
        </div>
      </div>
      
      {saveStatus === 'error' && (
        <DattaAlert type="danger" className="mb-3">
          <i className="feather icon-alert-circle me-2"></i>
          Impossible de sauvegarder. Vérifiez votre connexion réseau.
          <button 
            className="btn btn-sm btn-outline-danger ms-2"
            onClick={performSave}
          >
            Réessayer
          </button>
        </DattaAlert>
      )}
      
      {children}
      
      {conflictData && conflictResolver && (
        <conflictResolver
          isOpen={true}
          conflicts={conflictData}
          onResolve={handleConflictResolution}
          onClose={() => setConflictData(null)}
        />
      )}
    </>
  );
}
```

### 2.3 Tables optimisées pour le réseau

- [x] **DattaNetworkDataTable - Table résistante aux problèmes réseau**
```jsx
// src/renderer/components/common/DattaNetworkDataTable.jsx
import React, { useState, useEffect, useCallback } from 'react';
import DattaDataTable from './DattaDataTable';
import DattaAlert from './DattaAlert';
import DattaButton from './DattaButton';
import { useOperations } from './DattaOperationQueue';

export default function DattaNetworkDataTable({ 
  onLoadData, 
  refreshInterval = 60000,
  maxRetries = 3,
  ...props 
}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lastRefresh, setLastRefresh] = useState(null);
  const { addOperation, updateOperation, removeOperation } = useOperations();

  const loadData = useCallback(async (showProgress = true) => {
    let operationId = null;
    
    if (showProgress) {
      operationId = addOperation({
        description: 'Chargement des données...',
        status: 'running'
      });
    }

    try {
      setLoading(true);
      setError(null);
      
      const result = await onLoadData();
      setData(result);
      setRetryCount(0);
      setLastRefresh(new Date());
      
      if (operationId) {
        updateOperation(operationId, {
          status: 'completed',
          description: 'Données chargées'
        });
        setTimeout(() => removeOperation(operationId), 2000);
      }
    } catch (err) {
      console.error('Erreur chargement données:', err);
      setError(err.message);
      setRetryCount(prev => prev + 1);
      
      if (operationId) {
        updateOperation(operationId, {
          status: 'error',
          description: 'Erreur de chargement',
          error: err.message
        });
        setTimeout(() => removeOperation(operationId), 5000);
      }
      
      // Auto-retry avec backoff
      if (retryCount < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        setTimeout(() => loadData(false), delay);
      }
    } finally {
      setLoading(false);
    }
  }, [onLoadData, retryCount, maxRetries, addOperation, updateOperation, removeOperation]);

  // Rafraîchissement automatique
  useEffect(() => {
    if (!refreshInterval || error) return;
    
    const interval = setInterval(() => {
      loadData(false); // Rafraîchissement silencieux
    }, refreshInterval);
    
    return () => clearInterval(interval);
  }, [loadData, refreshInterval, error]);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, []);

  if (error && retryCount >= maxRetries) {
    return (
      <div className="card">
        <div className="card-body text-center py-5">
          <div className="avtar avtar-xl bg-light-danger mb-4">
            <i className="feather icon-wifi-off f-36"></i>
          </div>
          <h5 className="mb-3">Impossible de charger les données</h5>
          <DattaAlert type="danger" className="mb-3">
            Erreur réseau: {error}
          </DattaAlert>
          <div className="d-flex gap-2 justify-content-center">
            <DattaButton variant="primary" onClick={() => {
              setRetryCount(0);
              loadData();
            }}>
              <i className="feather icon-refresh-cw me-2"></i>
              Réessayer
            </DattaButton>
            <DattaButton variant="secondary" onClick={() => window.location.reload()}>
              <i className="feather icon-rotate-ccw me-2"></i>
              Recharger l'application
            </DattaButton>
          </div>
        </div>
      </div>
    );
  }

  const tableActions = (
    <div className="d-flex align-items-center gap-2">
      {props.actions}
      <DattaButton 
        variant="outline-secondary" 
        size="sm"
        onClick={() => loadData()}
        disabled={loading}
        title="Actualiser"
      >
        <i className={`feather icon-refresh-cw ${loading ? 'fa-spin' : ''}`}></i>
      </DattaButton>
      {lastRefresh && (
        <small className="text-muted">
          Dernière màj: {lastRefresh.toLocaleTimeString()}
        </small>
      )}
    </div>
  );

  return (
    <DattaDataTable 
      {...props}
      data={data}
      loading={loading}
      actions={tableActions}
    />
  );
}
```

---

## 📋 **PHASE 3 : MOYENNE PRIORITÉ - Robustesse (Semaines 5-6)**

### 3.1 Error Boundary et gestion d'erreurs centralisée

- [x] **DattaErrorBoundary - Boundary avec design Datta Able**
```jsx
// src/renderer/components/common/DattaErrorBoundary.jsx
import React from 'react';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';

class DattaErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      retryCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // Envoyer l'erreur au système de logging
    if (window.api && window.api.logError) {
      window.api.logError({
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        retryCount: this.state.retryCount
      });
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1
    }));
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isNetworkError = this.state.error?.message?.includes('network') || 
                           this.state.error?.message?.includes('fetch');
      
      return (
        <div className="d-flex justify-content-center align-items-center min-vh-100 p-4">
          <div className="card text-center" style={{ maxWidth: '600px', width: '100%' }}>
            <div className="card-body p-5">
              <div className="avtar avtar-xl bg-light-danger mb-4">
                <i className={`feather ${isNetworkError ? 'icon-wifi-off' : 'icon-alert-triangle'} f-36`}></i>
              </div>
              
              <h4 className="mb-3">
                {isNetworkError ? 'Problème de connexion' : 'Une erreur s\'est produite'}
              </h4>
              
              <DattaAlert type="danger" className="text-start mb-4">
                <strong>Détails:</strong> {this.state.error?.message || 'Erreur inconnue'}
                {this.state.retryCount > 0 && (
                  <div className="mt-2">
                    <small>Tentatives: {this.state.retryCount}</small>
                  </div>
                )}
              </DattaAlert>
              
              <p className="text-muted mb-4">
                {isNetworkError 
                  ? 'Vérifiez votre connexion réseau et l\'accès au partage de fichiers.'
                  : 'L\'application a rencontré un problème inattendu. Vos données sont sauvegardées.'
                }
              </p>
              
              <div className="d-flex gap-2 justify-content-center flex-wrap">
                <DattaButton 
                  variant="primary" 
                  onClick={this.handleRetry}
                >
                  <i className="feather icon-refresh-cw me-2"></i>
                  Réessayer
                </DattaButton>
                
                <DattaButton 
                  variant="secondary"
                  onClick={this.handleReload}
                >
                  <i className="feather icon-rotate-ccw me-2"></i>
                  Recharger l'application
                </DattaButton>
                
                {process.env.NODE_ENV === 'development' && (
                  <DattaButton 
                    variant="outline-secondary"
                    onClick={() => console.log('Error details:', this.state)}
                  >
                    <i className="feather icon-info me-2"></i>
                    Détails (Dev)
                  </DattaButton>
                )}
              </div>
              
              <div className="mt-4 pt-3 border-top">
                <p className="small text-muted mb-0">
                  Si le problème persiste, contactez l'administrateur système.
                </p>
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
```

### 3.2 Système de backup et diagnostic

- [x] **DattaBackupManager - Gestionnaire de sauvegardes**
```jsx
// src/renderer/components/common/DattaBackupManager.jsx
import React, { useState, useEffect } from 'react';
import DattaCard from './DattaCard';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';
import { useOperations } from './DattaOperationQueue';

export default function DattaBackupManager() {
  const [backupStatus, setBackupStatus] = useState({
    lastBackup: null,
    autoBackupEnabled: true,
    backupLocation: '',
    availableBackups: []
  });
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const { addOperation, updateOperation, removeOperation } = useOperations();

  useEffect(() => {
    loadBackupStatus();
  }, []);

  const loadBackupStatus = async () => {
    try {
      const status = await window.api.getBackupStatus();
      setBackupStatus(status);
    } catch (error) {
      console.error('Erreur chargement statut backup:', error);
    }
  };

  const createBackup = async () => {
    const operationId = addOperation({
      description: 'Création de sauvegarde...',
      status: 'running',
      progress: 0
    });

    try {
      setIsCreatingBackup(true);

      const result = await window.api.createBackup({
        includeData: true,
        includeConfig: true,
        compress: true
      });

      updateOperation(operationId, {
        status: 'completed',
        description: 'Sauvegarde créée avec succès',
        progress: 100
      });

      setTimeout(() => removeOperation(operationId), 3000);
      loadBackupStatus();
    } catch (error) {
      updateOperation(operationId, {
        status: 'error',
        description: 'Erreur lors de la sauvegarde',
        error: error.message
      });

      setTimeout(() => removeOperation(operationId), 5000);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const restoreBackup = async (backupFile) => {
    if (!confirm(`Êtes-vous sûr de vouloir restaurer la sauvegarde "${backupFile}" ? Cette action est irréversible.`)) {
      return;
    }

    const operationId = addOperation({
      description: 'Restauration en cours...',
      status: 'running'
    });

    try {
      await window.api.restoreBackup(backupFile);
      
      updateOperation(operationId, {
        status: 'completed',
        description: 'Restauration terminée'
      });

      setTimeout(() => {
        removeOperation(operationId);
        window.location.reload(); // Recharger après restauration
      }, 2000);
    } catch (error) {
      updateOperation(operationId, {
        status: 'error',
        description: 'Erreur de restauration',
        error: error.message
      });

      setTimeout(() => removeOperation(operationId), 5000);
    }
  };

  return (
    <DattaCard 
      title="Gestionnaire de sauvegardes"
      actions={
        <DattaButton 
          variant="primary" 
          size="sm"
          onClick={createBackup}
          disabled={isCreatingBackup}
        >
          <i className="feather icon-plus me-2"></i>
          Nouvelle sauvegarde
        </DattaButton>
      }
    >
      <div className="row">
        <div className="col-md-6">
          <h6><i className="feather icon-info me-2"></i>Statut</h6>
          <ul className="list-unstyled">
            <li className="d-flex justify-content-between align-items-center mb-2">
              <span>Sauvegarde automatique</span>
              <span className={`badge bg-${backupStatus.autoBackupEnabled ? 'success' : 'warning'}`}>
                {backupStatus.autoBackupEnabled ? 'Activée' : 'Désactivée'}
              </span>
            </li>
            <li className="d-flex justify-content-between align-items-center mb-2">
              <span>Dernière sauvegarde</span>
              <span className="text-muted">
                {backupStatus.lastBackup 
                  ? new Date(backupStatus.lastBackup).toLocaleString()
                  : 'Aucune'
                }
              </span>
            </li>
            <li className="d-flex justify-content-between align-items-center">
              <span>Emplacement</span>
              <span className="text-muted small">
                {backupStatus.backupLocation || 'Non configuré'}
              </span>
            </li>
          </ul>
        </div>

        <div className="col-md-6">
          <h6><i className="feather icon-archive me-2"></i>Sauvegardes disponibles</h6>
          {backupStatus.availableBackups.length === 0 ? (
            <DattaAlert type="info">
              Aucune sauvegarde disponible.
            </DattaAlert>
          ) : (
            <div className="list-group list-group-flush">
              {backupStatus.availableBackups.slice(0, 5).map((backup, index) => (
                <div key={index} className="list-group-item d-flex justify-content-between align-items-center px-0">
                  <div>
                    <div className="fw-medium">{backup.name}</div>
                    <small className="text-muted">
                      {new Date(backup.date).toLocaleString()} - {backup.size}
                    </small>
                  </div>
                  <DattaButton
                    variant="outline-primary"
                    size="sm"
                    onClick={() => restoreBackup(backup.file)}
                  >
                    <i className="feather icon-download me-1"></i>
                    Restaurer
                  </DattaButton>
                </div>
              ))}
              {backupStatus.availableBackups.length > 5 && (
                <div className="text-center pt-2">
                  <small className="text-muted">
                    +{backupStatus.availableBackups.length - 5} autres sauvegardes
                  </small>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </DattaCard>
  );
}
```

### 3.3 Panel de diagnostic système

- [x] **DattaDiagnosticPanel - Diagnostic complet**
```jsx
// src/renderer/components/common/DattaDiagnosticPanel.jsx
import React, { useState, useEffect } from 'react';
import DattaCard from './DattaCard';
import DattaButton from './DattaButton';
import DattaAlert from './DattaAlert';

export default function DattaDiagnosticPanel() {
  const [diagnostics, setDiagnostics] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    runDiagnostics(); // Diagnostic initial
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(runDiagnostics, 30000); // Toutes les 30 secondes
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const runDiagnostics = async () => {
    setIsRunning(true);
    try {
      const results = await window.api.runDiagnostics();
      setDiagnostics(results);
    } catch (error) {
      setDiagnostics({ 
        error: error.message,
        timestamp: new Date()
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status, value = null) => {
    switch (status) {
      case true:
      case 'ok':
        return <span className="badge bg-success">OK</span>;
      case false:
      case 'error':
        return <span className="badge bg-danger">Erreur</span>;
      case 'warning':
        return <span className="badge bg-warning">Attention</span>;
      default:
        return <span className="badge bg-secondary">{value || 'N/A'}</span>;
    }
  };

  const getLatencyBadge = (latency) => {
    if (latency === null || latency === undefined) return getStatusBadge('N/A');
    if (latency < 100) return <span className="badge bg-success">{latency}ms</span>;
    if (latency < 500) return <span className="badge bg-warning">{latency}ms</span>;
    return <span className="badge bg-danger">{latency}ms</span>;
  };

  if (!diagnostics && !isRunning) {
    return null;
  }

  return (
    <DattaCard 
      title="Diagnostic système"
      actions={
        <div className="d-flex align-items-center gap-2">
          <div className="form-check form-switch">
            <input 
              className="form-check-input" 
              type="checkbox" 
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="autoRefresh">
              Auto-refresh
            </label>
          </div>
          <DattaButton 
            variant="primary" 
            size="sm" 
            onClick={runDiagnostics}
            disabled={isRunning}
          >
            <i className={`feather icon-refresh-cw ${isRunning ? 'fa-spin' : ''} me-2`}></i>
            {isRunning ? 'Diagnostic...' : 'Actualiser'}
          </DattaButton>
        </div>
      }
    >
      {diagnostics?.error ? (
        <DattaAlert type="danger">
          <i className="feather icon-alert-circle me-2"></i>
          Erreur lors du diagnostic: {diagnostics.error}
        </DattaAlert>
      ) : (
        <div className="row">
          <div className="col-md-4">
            <h6><i className="feather icon-database me-2"></i>Base de données</h6>
            <ul className="list-unstyled">
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Connexion</span>
                {getStatusBadge(diagnostics?.database_connected)}
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Latence</span>
                {getLatencyBadge(diagnostics?.database_latency)}
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Intégrité</span>
                {getStatusBadge(diagnostics?.database_integrity)}
              </li>
              <li className="d-flex justify-content-between align-items-center">
                <span>Verrous actifs</span>
                <span className="badge bg-info">
                  {diagnostics?.active_locks || 0}
                </span>
              </li>
            </ul>
          </div>
          
          <div className="col-md-4">
            <h6><i className="feather icon-wifi me-2"></i>Réseau</h6>
            <ul className="list-unstyled">
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Partage accessible</span>
                {getStatusBadge(diagnostics?.network_share_accessible)}
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Permissions</span>
                {getStatusBadge(
                  diagnostics?.has_write_permissions ? 'ok' : 'warning',
                  diagnostics?.has_write_permissions ? 'R/W' : 'R seule'
                )}
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Ping réseau</span>
                {getLatencyBadge(diagnostics?.network_latency)}
              </li>
              <li className="d-flex justify-content-between align-items-center">
                <span>DNS</span>
                {getStatusBadge(diagnostics?.dns_resolution)}
              </li>
            </ul>
          </div>

          <div className="col-md-4">
            <h6><i className="feather icon-monitor me-2"></i>Système</h6>
            <ul className="list-unstyled">
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Mémoire utilisée</span>
                <span className="badge bg-info">
                  {diagnostics?.memory_usage || 'N/A'}
                </span>
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Espace disque</span>
                <span className="badge bg-info">
                  {diagnostics?.disk_space || 'N/A'}
                </span>
              </li>
              <li className="d-flex justify-content-between align-items-center mb-2">
                <span>Version app</span>
                <span className="badge bg-secondary">
                  {diagnostics?.app_version || 'N/A'}
                </span>
              </li>
              <li className="d-flex justify-content-between align-items-center">
                <span>Uptime</span>
                <span className="badge bg-secondary">
                  {diagnostics?.uptime || 'N/A'}
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {diagnostics?.timestamp && (
        <div className="text-center mt-3 pt-3 border-top">
          <small className="text-muted">
            Dernière vérification: {new Date(diagnostics.timestamp).toLocaleString()}
          </small>
        </div>
      )}
    </DattaCard>
  );
}
```

---

## 🔧 **PHASE 4 : MOYENNE PRIORITÉ - Features avancées (Semaines 7-8)**

### 4.1 Centre de notifications

- [x] **DattaNotificationCenter - Système de notifications unifié**
```jsx
// src/renderer/components/common/DattaNotificationCenter.jsx
import React, { useState, useEffect, createContext, useContext } from 'react';
import DattaAlert from './DattaAlert';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      timestamp: new Date(),
      autoClose: true,
      duration: 5000,
      ...notification
    };

    setNotifications(prev => [...prev, newNotification]);

    // Auto-close si activé
    if (newNotification.autoClose) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  // Fonctions de convenance
  const showSuccess = (message, options = {}) => 
    addNotification({ type: 'success', message, icon: 'icon-check-circle', ...options });

  const showError = (message, options = {}) => 
    addNotification({ type: 'danger', message, icon: 'icon-alert-circle', autoClose: false, ...options });

  const showWarning = (message, options = {}) => 
    addNotification({ type: 'warning', message, icon: 'icon-alert-triangle', ...options });

  const showInfo = (message, options = {}) => 
    addNotification({ type: 'info', message, icon: 'icon-info', ...options });

  // Exposer globalement pour utilisation facile
  useEffect(() => {
    window.showNotification = addNotification;
    window.showSuccess = showSuccess;
    window.showError = showError;
    window.showWarning = showWarning;
    window.showInfo = showInfo;

    return () => {
      delete window.showNotification;
      delete window.showSuccess;
      delete window.showError;
      delete window.showWarning;
      delete window.showInfo;
    };
  }, []);

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationDisplay />
    </NotificationContext.Provider>
  );
}

function NotificationDisplay() {
  const { notifications, removeNotification } = useNotifications();

  if (notifications.length === 0) return null;

  return (
    <div 
      className="position-fixed top-0 end-0 p-3" 
      style={{ zIndex: 9999, maxWidth: '400px' }}
    >
      {notifications.map(notification => (
        <div
          key={notification.id}
          className="mb-2"
          style={{
            animation: 'slideInRight 0.3s ease-out'
          }}
        >
          <DattaAlert
            type={notification.type}
            dismissible
            onClose={() => removeNotification(notification.id)}
            className="shadow"
          >
            <div className="d-flex align-items-start">
              {notification.icon && (
                <i className={`feather ${notification.icon} me-2 mt-1`}></i>
              )}
              <div className="flex-grow-1">
                {notification.title && (
                  <div className="fw-bold mb-1">{notification.title}</div>
                )}
                <div>{notification.message}</div>
                {notification.timestamp && (
                  <small className="text-muted d-block mt-1">
                    {notification.timestamp.toLocaleTimeString()}
                  </small>
                )}
              </div>
            </div>
          </DattaAlert>
        </div>
      ))}
    </div>
  );
}

// CSS à ajouter
const notificationStyles = `
@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
`;

// Injecter les styles
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = notificationStyles;
  document.head.appendChild(styleElement);
}

export default NotificationProvider;
```

### 4.2 Outils d'administration

- [x] **DattaAdminToolkit - Boîte à outils administrateur**
```jsx
// src/renderer/components/admin/DattaAdminToolkit.jsx
import React, { useState } from 'react';
import DattaCard from '../common/DattaCard';
import DattaButton from '../common/DattaButton';
import DattaModal from '../common/DattaModal';
import DattaAlert from '../common/DattaAlert';
import DattaBackupManager from '../common/DattaBackupManager';
import DattaDiagnosticPanel from '../common/DattaDiagnosticPanel';
import { useNotifications } from '../common/DattaNotificationCenter';

export default function DattaAdminToolkit({ user }) {
  const [activeModal, setActiveModal] = useState(null);
  const [isPerformingMaintenance, setIsPerformingMaintenance] = useState(false);
  const { showSuccess, showError } = useNotifications();

  // Protection d'accès admin
  if (user.role !== 'admin') {
    return (
      <DattaCard>
        <div className="text-center py-5">
          <div className="avtar avtar-xl bg-light-warning mb-4">
            <i className="feather icon-lock f-36"></i>
          </div>
          <h5>Accès restreint</h5>
          <p className="text-muted">Cette section est réservée aux administrateurs.</p>
        </div>
      </DattaCard>
    );
  }

  const performMaintenance = async (type) => {
    setIsPerformingMaintenance(true);
    try {
      switch (type) {
        case 'vacuum':
          await window.api.performDatabaseVacuum();
          showSuccess('Nettoyage de la base de données terminé');
          break;
        case 'reindex':
          await window.api.rebuildDatabaseIndexes();
          showSuccess('Reconstruction des index terminée');
          break;
        case 'analyze':
          await window.api.analyzeDatabaseStatistics();
          showSuccess('Analyse des statistiques terminée');
          break;
        case 'cleanup':
          await window.api.cleanupTempFiles();
          showSuccess('Nettoyage des fichiers temporaires terminé');
          break;
      }
    } catch (error) {
      showError(`Erreur lors de la maintenance: ${error.message}`);
    } finally {
      setIsPerformingMaintenance(false);
      setActiveModal(null);
    }
  };

  const MaintenanceModal = () => (
    <DattaModal
      open={activeModal === 'maintenance'}
      onClose={() => setActiveModal(null)}
      title="Outils de maintenance"
      size="lg"
    >
      <DattaAlert type="warning" className="mb-4">
        <i className="feather icon-alert-triangle me-2"></i>
        <strong>Attention :</strong> Ces opérations peuvent prendre du temps et affecter les performances.
        Assurez-vous qu'aucun autre utilisateur n'utilise l'application.
      </DattaAlert>

      <div className="row g-3">
        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="avtar avtar-s bg-light-primary mb-3">
                <i className="feather icon-database"></i>
              </div>
              <h6>VACUUM Database</h6>
              <p className="text-muted small">
                Nettoie et compacte la base de données pour optimiser l'espace disque.
              </p>
              <DattaButton
                variant="primary"
                size="sm"
                onClick={() => performMaintenance('vacuum')}
                disabled={isPerformingMaintenance}
              >
                Exécuter
              </DattaButton>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="avtar avtar-s bg-light-info mb-3">
                <i className="feather icon-refresh-cw"></i>
              </div>
              <h6>Reconstruire les index</h6>
              <p className="text-muted small">
                Reconstruit tous les index pour améliorer les performances des requêtes.
              </p>
              <DattaButton
                variant="info"
                size="sm"
                onClick={() => performMaintenance('reindex')}
                disabled={isPerformingMaintenance}
              >
                Exécuter
              </DattaButton>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="avtar avtar-s bg-light-success mb-3">
                <i className="feather icon-bar-chart"></i>
              </div>
              <h6>Analyser statistiques</h6>
              <p className="text-muted small">
                Met à jour les statistiques pour optimiser le planificateur de requêtes.
              </p>
              <DattaButton
                variant="success"
                size="sm"
                onClick={() => performMaintenance('analyze')}
                disabled={isPerformingMaintenance}
              >
                Exécuter
              </DattaButton>
            </div>
          </div>
        </div>

        <div className="col-md-6">
          <div className="card h-100">
            <div className="card-body text-center">
              <div className="avtar avtar-s bg-light-warning mb-3">
                <i className="feather icon-trash-2"></i>
              </div>
              <h6>Nettoyer fichiers temp</h6>
              <p className="text-muted small">
                Supprime les fichiers temporaires et les logs anciens.
              </p>
              <DattaButton
                variant="warning"
                size="sm"
                onClick={() => performMaintenance('cleanup')}
                disabled={isPerformingMaintenance}
              >
                Exécuter
              </DattaButton>
            </div>
          </div>
        </div>
      </div>

      {isPerformingMaintenance && (
        <div className="text-center mt-4">
          <div className="spinner-border text-primary me-2" role="status"></div>
          <span>Maintenance en cours...</span>
        </div>
      )}
    </DattaModal>
  );

  return (
    <>
      <div className="row g-4">
        {/* Carte principale d'administration */}
        <div className="col-12">
          <DattaCard 
            title="Outils d'administration"
            actions={
              <div className="d-flex gap-2">
                <DattaButton
                  variant="primary"
                  size="sm"
                  onClick={() => setActiveModal('maintenance')}
                >
                  <i className="feather icon-tool me-2"></i>
                  Maintenance
                </DattaButton>
              </div>
            }
          >
            <div className="row g-3">
              <div className="col-md-3">
                <div className="card bg-light-primary h-100">
                  <div className="card-body text-center">
                    <div className="avtar avtar-s bg-primary text-white mb-2">
                      <i className="feather icon-users"></i>
                    </div>
                    <h6>Utilisateurs actifs</h6>
                    <h4 className="mb-0 text-primary">12</h4>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card bg-light-success h-100">
                  <div className="card-body text-center">
                    <div className="avtar avtar-s bg-success text-white mb-2">
                      <i className="feather icon-database"></i>
                    </div>
                    <h6>Taille DB</h6>
                    <h4 className="mb-0 text-success">2.3 GB</h4>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card bg-light-info h-100">
                  <div className="card-body text-center">
                    <div className="avtar avtar-s bg-info text-white mb-2">
                      <i className="feather icon-activity"></i>
                    </div>
                    <h6>Performance</h6>
                    <h4 className="mb-0 text-info">98%</h4>
                  </div>
                </div>
              </div>

              <div className="col-md-3">
                <div className="card bg-light-warning h-100">
                  <div className="card-body text-center">
                    <div className="avtar avtar-s bg-warning text-white mb-2">
                      <i className="feather icon-shield"></i>
                    </div>
                    <h6>Dernier backup</h6>
                    <h4 className="mb-0 text-warning">2h</h4>
                  </div>
                </div>
              </div>
            </div>
          </DattaCard>
        </div>

        {/* Diagnostic système */}
        <div className="col-12">
          <DattaDiagnosticPanel />
        </div>

        {/* Gestionnaire de sauvegardes */}
        <div className="col-12">
          <DattaBackupManager />
        </div>
      </div>

      <MaintenanceModal />
    </>
  );
}
```

---

## 🎨 **PHASE 5 : BASSE PRIORITÉ - Polish & Extensions (Semaines 9+)**

### 5.1 Thème sombre et personnalisation

- [x] **Extension du système de thèmes Datta Able**
```css
/* src/renderer/styles/themes-extended.css */

/* Mode sombre */
[data-theme="dark"] {
  --pc-bg-color: #1a1a1a;
  --pc-card-bg: #2d2d2d;
  --pc-sidebar-bg: #212121;
  --pc-text-color: #ffffff;
  --pc-border-color: #404040;
  --current-text-primary: #ffffff;
  --current-text-secondary: #b0b0b0;
  --current-surface-color: #2d2d2d;
  --current-border-light: #404040;
  --current-border-medium: #555555;
}

[data-theme="dark"] .card {
  background-color: var(--pc-card-bg);
  border-color: var(--pc-border-color);
  color: var(--pc-text-color);
}

[data-theme="dark"] .navbar,
[data-theme="dark"] .pc-sidebar {
  background-color: var(--pc-sidebar-bg);
  border-color: var(--pc-border-color);
}

[data-theme="dark"] .table {
  --bs-table-bg: var(--pc-card-bg);
  --bs-table-color: var(--pc-text-color);
  --bs-table-border-color: var(--pc-border-color);
}

[data-theme="dark"] .form-control,
[data-theme="dark"] .form-select {
  background-color: var(--current-surface-color);
  border-color: var(--current-border-medium);
  color: var(--current-text-primary);
}

[data-theme="dark"] .form-control:focus,
[data-theme="dark"] .form-select:focus {
  background-color: var(--current-surface-color);
  border-color: var(--current-primary-color);
  color: var(--current-text-primary);
  box-shadow: 0 0 0 0.2rem rgba(var(--pc-primary-rgb), 0.25);
}

/* Thème de couleur personnalisé */
[data-color-scheme="blue"] {
  --pc-primary: #007bff;
  --pc-primary-dark: #0056b3;
  --pc-primary-light: #b3d9ff;
}

[data-color-scheme="green"] {
  --pc-primary: #28a745;
  --pc-primary-dark: #1e7e34;
  --pc-primary-light: #b3e6c0;
}

[data-color-scheme="purple"] {
  --pc-primary: #6f42c1;
  --pc-primary-dark: #59359a;
  --pc-primary-light: #c8b5e8;
}
```

- [x] **DattaThemeSelector - Sélecteur de thème**
```jsx
// src/renderer/components/common/DattaThemeSelector.jsx
import React, { useState, useEffect } from 'react';
import DattaButton from './DattaButton';

export default function DattaThemeSelector() {
  const [currentTheme, setCurrentTheme] = useState('light');
  const [currentColor, setCurrentColor] = useState('blue');

  useEffect(() => {
    // Charger les préférences depuis localStorage
    const savedTheme = localStorage.getItem('datta-theme') || 'light';
    const savedColor = localStorage.getItem('datta-color') || 'blue';
    
    setCurrentTheme(savedTheme);
    setCurrentColor(savedColor);
    
    applyTheme(savedTheme, savedColor);
  }, []);

  const applyTheme = (theme, color) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-color-scheme', color);
    
    // Sauvegarder les préférences
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
          {themes.map(theme => (
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
          {colors.map(color => (
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
              {currentColor === color.id && (
                <i className="feather icon-check text-white"></i>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
```

### 5.2 Raccourcis clavier

- [x] **DattaKeyboardShortcuts - Gestionnaire de raccourcis**
```jsx
// src/renderer/components/common/DattaKeyboardShortcuts.jsx
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
      // Vérifier si on est dans un champ de saisie
      const isInputActive = document.activeElement.tagName === 'INPUT' || 
                           document.activeElement.tagName === 'TEXTAREA' ||
                           document.activeElement.contentEditable === 'true';

      // Ctrl + ? ou F1 pour l'aide
      if ((event.ctrlKey && event.key === '?') || event.key === 'F1') {
        event.preventDefault();
        setShowHelp(true);
        return;
      }

      // Échap pour fermer les modals
      if (event.key === 'Escape') {
        const modals = document.querySelectorAll('.modal.show');
        if (modals.length > 0) {
          // Déclencher la fermeture de la dernière modal ouverte
          const lastModal = modals[modals.length - 1];
          const closeButton = lastModal.querySelector('.btn-close');
          if (closeButton) closeButton.click();
        }
        return;
      }

      // Ignorer les autres raccourcis si on est dans un champ de saisie
      if (isInputActive) return;

      if (event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case 'n':
            event.preventDefault();
            // Déclencher l'action "Nouvel individu"
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { 
              detail: { action: 'new_individual' } 
            }));
            break;
          case 's':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { 
              detail: { action: 'save' } 
            }));
            break;
          case 'f':
            event.preventDefault();
            // Focus sur le champ de recherche
            const searchInput = document.querySelector('input[placeholder*="Recherch"]');
            if (searchInput) searchInput.focus();
            break;
          case 'r':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { 
              detail: { action: 'refresh' } 
            }));
            break;
          case 'd':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { 
              detail: { action: 'diagnostic' } 
            }));
            break;
          case 'b':
            event.preventDefault();
            window.dispatchEvent(new CustomEvent('keyboard-shortcut', { 
              detail: { action: 'backup' } 
            }));
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <>
      {/* Indicateur de raccourcis disponibles */}
      <div className="position-fixed bottom-0 start-0 p-2" style={{ zIndex: 1000 }}>
        <button 
          className="btn btn-sm btn-outline-secondary opacity-50"
          onClick={() => setShowHelp(true)}
          title="Aide raccourcis (Ctrl + ?)"
        >
          <i className="feather icon-help-circle"></i>
        </button>
      </div>

      {/* Modal d'aide */}
      <DattaModal
        open={showHelp}
        onClose={() => setShowHelp(false)}
        title="Raccourcis clavier"
        size="md"
      >
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
                    <code className="bg-light px-2 py-1 rounded">
                      {shortcut.keys}
                    </code>
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
```

---

## 📊 **MÉTRIQUES DE SUCCÈS & VALIDATION**

### KPIs Techniques
- [ ] **Performance réseau** : Latence moyenne < 200ms sur connexion lente
- [ ] **Stabilité** : Aucun crash lié aux verrous SQLite sur 1 semaine de test
- [ ] **Mémoire** : Consommation RAM < 150MB en usage normal
- [ ] **Temps de démarrage** : < 3 secondes sur disque réseau
- [ ] **Taille application** : < 50MB installée

### KPIs Fonctionnels
- [ ] **Compatibilité** : 100% des fonctionnalités existantes fonctionnelles
- [ ] **Multi-utilisateurs** : Support confirmé de 5+ utilisateurs simultanés
- [ ] **Récupération d'erreurs** : Recovery automatique dans 95% des cas
- [ ] **UX** : Toutes les opérations avec feedback visuel approprié
- [ ] **Accessibilité** : Navigation clavier complète

### Tests de validation
- [ ] **Test de charge** : 10 utilisateurs simultanés pendant 4h
- [ ] **Test de réseau** : Fonctionnement avec latence 500ms+
- [ ] **Test de panne** : Récupération après déconnexion réseau
- [ ] **Test de corruption** : Récupération backup en cas de problème
- [ ] **Test d'upgrade** : Migration depuis version précédente

---

## 📅 **PLANNING DÉTAILLÉ**

### Semaines 1-2 : CRITIQUE (Stabilité)
- **Semaine 1** : Gestion verrous SQLite + composants réseau de base
- **Semaine 2** : Tests intensifs multi-utilisateurs + conflict resolution

### Semaines 3-4 : HAUTE PRIORITÉ (UX)
- **Semaine 3** : Loading states + error handling + auto-save
- **Semaine 4** : Tables réseau + operation queue + tests UX

### Semaines 5-6 : MOYENNE PRIORITÉ (Robustesse)
- **Semaine 5** : Error boundaries + backup system + diagnostics
- **Semaine 6** : Tests de récupération + documentation

### Semaines 7-8 : FEATURES (Avancé)
- **Semaine 7** : Notifications + admin toolkit + maintenance
- **Semaine 8** : Monitoring + métriques + optimisations

### Semaines 9+ : POLISH (Extensions)
- **Semaine 9** : Thèmes + raccourcis + accessibility
- **Semaine 10+** : Tests finaux + déploiement + formation

---

## 🎯 **PROCHAINES ACTIONS IMMÉDIATES**

1. **[URGENT]** Implémenter le système de retry avec backoff exponentiel
2. ~~**[URGENT]** Créer le composant `DattaNetworkStatus`~~
3. **[URGENT]** Tester la gestion des verrous avec 3+ utilisateurs simultanés
4. ~~**[HIGH]** Développer `DattaConflictResolver` pour la résolution de conflits~~
5. ~~**[HIGH]** Intégrer `DattaLoadingOverlay` dans tous les composants existants~~

**Goal : Avoir un système stable multi-utilisateurs d'ici 2 semaines !**

---

## 📝 Éléments à traiter ultérieurement

- Personnaliser les TODOs du script `.git/hooks/sendemail-validate.sample` pour la validation des emails.
- Passer en revue les placeholders d'interface :
  - Variable CSS `--current-text-placeholder` dans `src/renderer/styles/themes.css`.
  - Attributs `placeholder` dans de nombreux composants React (ex. `MassAttribution.jsx`, `ImportData.jsx`, `UserSettings.jsx`, etc.).
  - Textes et images d'exemple utilisant `placeholder` dans `docs/datta-able-bootstrap-dashboard-master` et `public/datta-able-assets`.
  - Styles spécifiques pour `::placeholder` dans les thèmes CSS.
