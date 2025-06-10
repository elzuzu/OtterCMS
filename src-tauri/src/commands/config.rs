use serde::Deserialize;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Deserialize)]
pub struct AppConfig {
    #[serde(rename = "dbPath")]
    pub db_path: String,
}

fn find_config_path() -> Result<PathBuf, String> {
    if let Ok(env) = std::env::var("OTTERCMS_CONFIG") {
        let p = PathBuf::from(env);
        if p.exists() {
            return Ok(p);
        }
    }
    let candidates = [
        "config/config.json",
        "../config/config.json",
        "../../config/config.json",
    ];
    for cand in &candidates {
        let path = PathBuf::from(cand);
        if path.exists() {
            return Ok(path);
        }
    }
    Err("config file not found".into())
}

pub fn load_config() -> Result<AppConfig, String> {
    let path = find_config_path()?;
    let data = fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(&data).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_db_path() -> Result<String, String> {
    Ok(load_config()?.db_path)
}
