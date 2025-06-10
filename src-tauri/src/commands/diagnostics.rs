use chrono::{DateTime, Utc};
use serde::Serialize;
use std::fs::{self, OpenOptions};
use std::net::ToSocketAddrs;
use sysinfo::{Disks, System};
use tauri::AppHandle;

use super::config::load_config;

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
pub async fn ping_database(_app: AppHandle) -> Result<DiagnosticResult, String> {
    let start = std::time::Instant::now();
    let db_path = load_config()?.db_path;
    let connected = fs::metadata(&db_path).is_ok();
    let duration = start.elapsed();
    let (sys, disks) = get_system_and_disks();

    Ok(DiagnosticResult {
        database_connected: connected,
        database_latency: Some(duration.as_millis() as u32),
        database_integrity: connected,
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
    if let Ok(cfg) = load_config() {
        if let Some(parent) = std::path::Path::new(&cfg.db_path).parent() {
            return fs::metadata(parent).is_ok();
        }
    }
    false
}

fn test_write_permissions() -> bool {
    let cfg = match load_config() {
        Ok(c) => c,
        Err(_) => return false,
    };
    let parent = match std::path::Path::new(&cfg.db_path).parent() {
        Some(p) => p.join("__write_test"),
        None => return false,
    };
    match OpenOptions::new().create(true).write(true).open(&parent) {
        Ok(_) => {
            let _ = fs::remove_file(&parent);
            true
        }
        Err(_) => false,
    }
}

fn check_dns_resolution() -> bool {
    ToSocketAddrs::to_socket_addrs(&("example.com", 80)).is_ok()
}
