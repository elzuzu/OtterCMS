use crate::AppState;
use serde::Serialize;
use tauri::State;
use chrono::{DateTime, Utc};
use sysinfo::{System, SystemExt};
use std::fs;
use std::path::PathBuf;

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
    pub database_connected: bool,
    pub database_latency: Option<u32>,
    pub database_integrity: bool,
    pub active_locks: Option<u32>,
    pub network_share_accessible: bool,
    pub has_write_permissions: bool,
    pub network_latency: Option<u32>,
    pub dns_resolution: bool,
    pub memory_usage: Option<String>,
    pub disk_space: Option<String>,
    pub app_version: Option<String>,
    pub uptime: Option<String>,
    pub timestamp: Option<DateTime<Utc>>, 
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
            results.database_connected = true;
            results.database_latency = Some(ping.latency_ms);
            results.network_latency = Some(ping.latency_ms);
        }
        Err(_) => {
            results.database_connected = false;
        }
    }

    results.network_share_accessible = check_network_share();
    results.has_write_permissions = test_write_permissions(&state).await;
    results.database_integrity = check_database_integrity(&state).await;
    results.dns_resolution = check_dns_resolution();

    let mut sys = System::new_all();
    sys.refresh_memory();
    sys.refresh_disks_list();
    sys.refresh_disks();
    results.memory_usage = Some(format!("{} MB", sys.used_memory() / 1024));
    if let Some(disk) = sys.disks().first() {
        results.disk_space = Some(format!("{} MB free", disk.available_space() / 1024 / 1024));
    }
    results.app_version = Some(env!("CARGO_PKG_VERSION").to_string());
    results.uptime = Some(format!("{}s", sys.uptime()));
    results.timestamp = Some(Utc::now());

    Ok(results)
}

fn default_db_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|p| p.join("../db")))
        .unwrap_or_else(|| PathBuf::from("../db"))
}

fn check_network_share() -> bool {
    fs::metadata(default_db_dir()).is_ok()
}

async fn test_write_permissions(state: &State<'_, AppState>) -> bool {
    db_command_with_retry!(state, |conn| async move {
        #[cfg(feature = "use-libsql")]
        {
            conn.execute("CREATE TEMP TABLE __perm_test(id INTEGER)", []).await?;
            conn.execute("DROP TABLE __perm_test", []).await?;
        }
        #[cfg(not(feature = "use-libsql"))]
        {
            conn.execute("CREATE TEMP TABLE __perm_test(id INTEGER)", [])?;
            conn.execute("DROP TABLE __perm_test", [])?;
        }
        Ok(())
    })
    .await
    .is_ok()
}

async fn check_database_integrity(state: &State<'_, AppState>) -> bool {
    db_command_with_retry!(state, |conn| async move {
        #[cfg(feature = "use-libsql")]
        {
            conn.execute("PRAGMA quick_check", []).await?;
        }
        #[cfg(not(feature = "use-libsql"))]
        {
            conn.execute("PRAGMA quick_check", [])?;
        }
        Ok(())
    })
    .await
    .is_ok()
}

fn check_dns_resolution() -> bool {
    std::net::ToSocketAddrs::to_socket_addrs(&("example.com", 80)).is_ok()
}
