use crate::database::models::role::Role;
use crate::database::connection::DatabasePool;
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct RoleInput {
    pub name: String,
    pub permissions: Vec<String>,
}

#[tauri::command]
pub async fn get_roles(state: State<'_, AppState>) -> Result<ApiResponse<Vec<Role>>, String> {
    let db = state.db.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let conn = db.get_connection().map_err(|e| format!("db: {}", e))?;
        Role::get_all(&conn)
            .map(|roles| ApiResponse { success: true, data: Some(roles), error: None })
            .map_err(|e| format!("{}", e))
    })
    .await
    .map_err(|e| format!("Erreur tâche: {}", e))??;
    Ok(result)
}

#[tauri::command]
pub async fn create_role(state: State<'_, AppState>, input: RoleInput) -> Result<ApiResponse<()>, String> {
    let db = state.db.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let conn = db.get_connection().map_err(|e| format!("db: {}", e))?;
        let role = Role { name: input.name, permissions: input.permissions };
        Role::create(&conn, &role)
            .map(|_| ApiResponse { success: true, data: None, error: None })
            .map_err(|e| format!("{}", e))
    })
    .await
    .map_err(|e| format!("Erreur tâche: {}", e))??;
    Ok(result)
}

#[tauri::command]
pub async fn update_role(state: State<'_, AppState>, input: RoleInput) -> Result<ApiResponse<()>, String> {
    let db = state.db.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let conn = db.get_connection().map_err(|e| format!("db: {}", e))?;
        let role = Role { name: input.name, permissions: input.permissions };
        Role::update(&conn, &role)
            .map(|_| ApiResponse { success: true, data: None, error: None })
            .map_err(|e| format!("{}", e))
    })
    .await
    .map_err(|e| format!("Erreur tâche: {}", e))??;
    Ok(result)
}

#[tauri::command]
pub async fn delete_role(state: State<'_, AppState>, name: String) -> Result<ApiResponse<()>, String> {
    let db = state.db.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        let conn = db.get_connection().map_err(|e| format!("db: {}", e))?;
        Role::delete(&conn, &name)
            .map(|_| ApiResponse { success: true, data: None, error: None })
            .map_err(|e| format!("{}", e))
    })
    .await
    .map_err(|e| format!("Erreur tâche: {}", e))??;
    Ok(result)
}
