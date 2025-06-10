use serde::{Serialize, Deserialize};
use serde_json::json;
use oracle::*;
use std::fs::{self, OpenOptions};
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OracleConfig {
    pub host: String,
    pub port: u16,
    pub service_name: String,
    pub username: String,
    pub password: String,
}

fn get_connect_string(cfg: &OracleConfig) -> String {
    format!("{}:{}/{}", cfg.host, cfg.port, cfg.service_name)
}

#[tauri::command]
pub async fn test_oracle_connection(cfg: OracleConfig) -> Result<serde_json::Value, String> {
    let conn_str = get_connect_string(&cfg);
    let res = tokio::task::spawn_blocking(move || Connection::connect(cfg.username, cfg.password, conn_str));
    match res.await {
        Ok(Ok(conn)) => {
            let _ = conn.close();
            Ok(json!({"success": true, "message": "Connexion réussie"}))
        }
        Ok(Err(e)) => Ok(json!({"success": false, "error": e.to_string()})),
        Err(e) => Ok(json!({"success": false, "error": e.to_string()})),
    }
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryData {
    pub meta_data: Vec<String>,
    pub rows: Vec<Vec<String>>,
}

#[tauri::command]
pub async fn execute_oracle_query(cfg: OracleConfig, query: String, max_rows: Option<usize>) -> Result<serde_json::Value, String> {
    let conn_str = get_connect_string(&cfg);
    let max_rows = max_rows.unwrap_or(1000);
    let res = tokio::task::spawn_blocking(move || {
        let conn = Connection::connect(cfg.username, cfg.password, conn_str)?;
        let mut stmt = conn.prepare(&query, &[])?;
        let rows = stmt.query(&[])?;
        let mut data = Vec::new();
        for row_result in rows.fetch_many()? {
            if data.len() >= max_rows { break; }
            let row = row_result?;
            let mut values = Vec::new();
            for col in row.columns() {
                let val: Option<String> = row.get(col.name())?;
                values.push(val.unwrap_or_default());
            }
            data.push(values);
        }
        let meta = stmt.column_info().iter().map(|c| c.name().to_string()).collect();
        Ok::<_, oracle::Error>(QueryData { meta_data: meta, rows: data })
    }).await;
    match res {
        Ok(Ok(d)) => Ok(json!({"success": true, "data": d})),
        Ok(Err(e)) => Ok(json!({"success": false, "error": e.to_string()})),
        Err(e) => Ok(json!({"success": false, "error": e.to_string()})),
    }
}

const CONFIG_FILE: &str = "../config/oracle_configs.json";

fn read_configs() -> Vec<serde_json::Value> {
    let path = PathBuf::from(CONFIG_FILE);
    if let Ok(data) = fs::read_to_string(&path) {
        if let Ok(v) = serde_json::from_str(&data) {
            return v;
        }
    }
    Vec::new()
}

fn write_configs(cfgs: &[serde_json::Value]) -> std::io::Result<()> {
    let path = PathBuf::from(CONFIG_FILE);
    if let Some(parent) = path.parent() { fs::create_dir_all(parent)?; }
    fs::write(path, serde_json::to_string_pretty(cfgs).unwrap())
}

#[tauri::command]
pub async fn get_oracle_configs() -> Result<serde_json::Value, String> {
    let data = read_configs();
    Ok(json!({"success": true, "data": data}))
}

#[tauri::command]
pub async fn save_oracle_config(cfg: serde_json::Value) -> Result<serde_json::Value, String> {
    let mut all = read_configs();
    all.push(cfg);
    write_configs(&all).map_err(|e| e.to_string())?;
    Ok(json!({"success": true}))
}

