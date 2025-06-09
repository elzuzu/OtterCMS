use serde::Serialize;
use tauri::{AppHandle};
use tauri_plugin_sql::Database;
use chrono::{DateTime, Utc};
use sysinfo::{System, Disks, DiskExt};
use std::fs::{self, OpenOptions};
use std::net::ToSocketAddrs;

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
pub async fn ping_database(app: AppHandle) -> Result<DiagnosticResult, String> {
    let start = std::time::Instant::now();
    let db = Database::load(&app, "sqlite:ottercms.db")
        .await
        .map_err(|e| e.to_string())?;
    db.execute("SELECT 1", &[]).await.map_err(|e| e.to_string())?;
    let duration = start.elapsed();
    let (sys, disks) = get_system_and_disks();

    Ok(DiagnosticResult {
        database_connected: true,
        database_latency: Some(duration.as_millis() as u32),
        database_integrity: check_database_integrity(&db).await,
        active_locks: None,
        network_share_accessible: check_network_share(),
        has_write_permissions: test_write_permissions(),
        network_latency: Some(duration.as_millis() as u32),
        dns_resolution: check_dns_resolution(),
        memory_usage_mb: Some(sys.used_memory() / 1024),
        disk_space_mb: disks
            .list()
            .first()
            .map(|d| d.available_space() / 1024 / 1024),
        app_version: Some(env!("CARGO_PKG_VERSION").to_string()),
        uptime: Some(format!("{}s", System::uptime())),
        timestamp: Some(Utc::now()),
    })
}

#[tauri::command]
pub async fn run_diagnostics(app: AppHandle) -> Result<DiagnosticResult, String> {
    match ping_database(app.clone()).await {
        Ok(mut result) => {
            result.timestamp = Some(Utc::now());
            Ok(result)
        }
        Err(_) => Ok(DiagnosticResult {
            database_connected: false,
            dns_resolution: check_dns_resolution(),
            network_share_accessible: check_network_share(),
            has_write_permissions: test_write_permissions(),
            ..DiagnosticResult::default()
        }),
    }
}

fn check_network_share() -> bool {
    fs::metadata("../db").is_ok()
}

fn test_write_permissions() -> bool {
    let path = "../db/__write_test";
    match OpenOptions::new().create(true).write(true).open(path) {
        Ok(_) => {
            let _ = fs::remove_file(path);
            true
        }
        Err(_) => false,
    }
}

async fn check_database_integrity(db: &Database) -> bool {
    if let Ok(rows) = db.select("PRAGMA integrity_check", &[]).await {
        if let Some(row) = rows.get(0) {
            if let Some(value) = row.get::<_, &str>("integrity_check") {
                return value == "ok";
            }
        }
    }
    false
}

fn check_dns_resolution() -> bool {
    ToSocketAddrs::to_socket_addrs(&("example.com", 80)).is_ok()
}
