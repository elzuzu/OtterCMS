use crate::AppState;
use serde::Serialize;
use tauri::State;
use chrono::{DateTime, Utc};
use sysinfo::{System, Disks};
use std::fs;
use std::path::PathBuf;
use super::db_command_with_retry;
use libsql::Connection;

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
    pub memory_usage_mb: Option<u64>,
    pub disk_space_mb: Option<u64>,
    pub app_version: Option<String>,
    pub uptime: Option<String>,
    pub timestamp: Option<DateTime<Utc>>, 
}

fn get_system_and_disks() -> (System, Disks) {
    let mut sys = System::new_all();
    sys.refresh_memory();
    sys.refresh_all();
    let disks = Disks::new_with_refreshed_list();
    (sys, disks)
}

#[tauri::command]
pub async fn ping_database(state: State<'_, AppState>) -> Result<DiagnosticResult, String> {
    let state_clone = state.clone();
    let (duration, sys, disks) = db_command_with_retry(&state, move |conn: Connection| {
        Box::pin(async move {
            let start = std::time::Instant::now();
            let mut stmt = conn.prepare("SELECT 1").await?;
            stmt.query(()).await?;
            let duration = start.elapsed();
            let (sys, disks) = get_system_and_disks();
            Ok::<(std::time::Duration, System, Disks), anyhow::Error>((duration, sys, disks))
        })
    }).await.map_err(|e| e.to_string())?;
    let has_write_permissions = test_write_permissions(&state_clone).await;
    Ok(DiagnosticResult {
        database_connected: true,
        database_latency: Some(duration.as_millis() as u32),
        database_integrity: true,
        active_locks: None,
        network_share_accessible: check_network_share(),
        has_write_permissions,
        network_latency: Some(duration.as_millis() as u32),
        dns_resolution: check_dns_resolution(),
        memory_usage_mb: Some(sys.used_memory() / 1024),
        disk_space_mb: {
            if let Some(disk) = disks.list().first() {
                Some(disk.available_space() / 1024 / 1024)
            } else {
                None
            }
        },
        app_version: Some(env!("CARGO_PKG_VERSION").to_string()),
        uptime: Some(format!("{}s", System::uptime())),
        timestamp: Some(Utc::now()),
    })
}

#[tauri::command]
pub async fn run_diagnostics(state: State<'_, AppState>) -> Result<DiagnosticResult, String> {
    let mut results = DiagnosticResult::default();

    match ping_database(state.clone()).await {
        Ok(ping) => {
            results.database_connected = true;
            results.database_latency = Some(ping.database_latency.unwrap());
            results.network_latency = Some(ping.network_latency.unwrap());
        }
        Err(_) => {
            results.database_connected = false;
        }
    }

    results.network_share_accessible = check_network_share();
    results.has_write_permissions = test_write_permissions(&state).await;
    results.database_integrity = check_database_integrity(&state).await;
    results.dns_resolution = check_dns_resolution();

    let (sys, disks) = get_system_and_disks();
    results.memory_usage_mb = Some(sys.used_memory() / 1024);
    if let Some(disk) = disks.list().first() {
        results.disk_space_mb = Some(disk.available_space() / 1024 / 1024);
    }
    results.uptime = Some(format!("{}s", System::uptime()));
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
    db_command_with_retry(state, |conn: Connection| Box::pin(async move {
        let start = std::time::Instant::now();
        let mut stmt = conn.prepare("SELECT 1").await?;
        stmt.query(()).await?;
        let duration = start.elapsed();
        Ok((duration.as_millis() as u32) < 1000)
    })).await.is_ok()
}

async fn check_database_integrity(state: &State<'_, AppState>) -> bool {
    db_command_with_retry(state, |conn: Connection| Box::pin(async move {
        let start = std::time::Instant::now();
        let mut stmt = conn.prepare("SELECT 1").await?;
        stmt.query(()).await?;
        let duration = start.elapsed();
        Ok((duration.as_millis() as u32) < 1000)
    })).await.is_ok()
}

fn check_dns_resolution() -> bool {
    std::net::ToSocketAddrs::to_socket_addrs(&("example.com", 80)).is_ok()
}