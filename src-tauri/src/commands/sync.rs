use crate::database::connection::DatabasePool;
use anyhow::{Result};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tokio::sync::Mutex;

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncStatus {
    pub last_sync: Option<String>,
    pub pending_changes: bool,
    pub error: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResult {
    pub success: bool,
    pub error: Option<String>,
    pub changes_count: Option<i64>,
}

pub struct SyncManager {
    db: Arc<DatabasePool>,
    last_sync: Arc<Mutex<Option<String>>>,
}

impl SyncManager {
    pub fn _new(db: Arc<DatabasePool>) -> Self {
        Self {
            db,
            last_sync: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn get_sync_status(&self) -> Result<SyncStatus> {
        let last_sync = self.last_sync.lock().await.clone();
        let conn = self.db.get_connection()?;
        let mut rows = conn
            .query(
                "SELECT COUNT(*) as count FROM individu_audit WHERE date_modif > COALESCE((SELECT MAX(date_modif) FROM individu_audit WHERE action = 'sync'), '1970-01-01')",
                (),
            )
            .await?;
        let mut pending_changes = false;
        if let Ok(Some(row)) = rows.next().await {
            let count: i64 = row.get(0)?;
            pending_changes = count > 0;
        }
        Ok(SyncStatus {
            last_sync,
            pending_changes,
            error: None,
        })
    }

    pub async fn perform_sync(&self) -> Result<SyncResult> {
        let conn = self.db.get_connection()?;
        conn.execute("BEGIN TRANSACTION", ()).await?;
        let mut rows = conn
            .query(
                "SELECT id, individu_id, champ, ancienne_valeur, nouvelle_valeur, utilisateur_id, action \
                 FROM individu_audit \
                 WHERE date_modif > COALESCE((SELECT MAX(date_modif) FROM individu_audit WHERE action = 'sync'), '1970-01-01') \
                 ORDER BY date_modif ASC",
                (),
            )
            .await?;
        let mut changes_count = 0;
        while let Ok(Some(_row)) = rows.next().await {
            changes_count += 1;
        }
        conn.execute(
            "INSERT INTO individu_audit (individu_id, champ, action, date_modif) VALUES (0, 'sync', 'sync', datetime('now', 'localtime'))",
            (),
        ).await?;
        conn.execute("COMMIT", ()).await?;
        let now = chrono::Local::now().to_rfc3339();
        *self.last_sync.lock().await = Some(now);
        Ok(SyncResult {
            success: true,
            error: None,
            changes_count: Some(changes_count),
        })
    }
}

#[tauri::command]
pub async fn get_sync_status(
    state: tauri::State<'_, Arc<SyncManager>>,
) -> Result<SyncStatus, String> {
    state
        .get_sync_status()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn perform_sync(
    state: tauri::State<'_, Arc<SyncManager>>,
) -> Result<SyncResult, String> {
    state
        .perform_sync()
        .await
        .map_err(|e| e.to_string())
} 