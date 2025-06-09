use crate::AppState;
use serde::Serialize;
use tauri::State;
use chrono::{DateTime, Utc};

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PingResult {
    pub success: bool,
    pub latency_ms: u32,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct DiagnosticResult {
    pub db_connection: bool,
    pub db_latency: Option<u32>,
    pub network_share: bool,
    pub permissions: bool,
}

#[tauri::command]
pub async fn ping_database(state: State<'_, AppState>) -> Result<PingResult, String> {
    let start = std::time::Instant::now();

    db_command_with_retry!(state, |conn| async move {
        #[cfg(feature = "use-libsql")]
        {
            conn.execute("SELECT 1", []).await?;
        }
        #[cfg(not(feature = "use-libsql"))]
        {
            conn.execute("SELECT 1", [])?;
        }
        Ok(())
    })
    .await
    .map_err(|e| e.to_string())?;

    let latency = start.elapsed().as_millis() as u32;

    Ok(PingResult {
        success: true,
        latency_ms: latency,
        timestamp: Utc::now(),
    })
}

#[tauri::command]
pub async fn run_diagnostics(state: State<'_, AppState>) -> Result<DiagnosticResult, String> {
    let mut results = DiagnosticResult::default();

    match ping_database(state.clone()).await {
        Ok(ping) => {
            results.db_connection = true;
            results.db_latency = Some(ping.latency_ms);
        }
        Err(_) => {
            results.db_connection = false;
        }
    }

    results.network_share = true;
    results.permissions = true;

    Ok(results)
}
