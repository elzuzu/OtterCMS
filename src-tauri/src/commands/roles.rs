use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use super::db_command_with_retry;
use libsql::Connection;
use anyhow::Result;
use serde_json;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Role {
    pub id: Option<i64>,
    pub name: String,
    pub description: String,
    pub permissions: String,
}

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
    pub _name: String,
    pub _permissions: Vec<String>,
}

#[tauri::command]
pub async fn get_roles(state: State<'_, AppState>) -> Result<Vec<Role>, String> {
    db_command_with_retry(&state, |conn: Connection| Box::pin(async move {
        let mut stmt = conn.prepare("SELECT id, name, description, permissions FROM roles").await?;
        let mut rows = stmt.query(()).await?;
        let mut roles = Vec::new();
        
        while let Some(row) = rows.next().await? {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let description: String = row.get(2)?;
            let permissions_json: String = row.get(3)?;
            roles.push(Role {
                id: Some(id),
                name,
                description,
                permissions: permissions_json,
            });
        }
        
        Ok::<Vec<Role>, anyhow::Error>(roles)
    })).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn create_role(state: State<'_, AppState>, role: Role) -> Result<Role, String> {
    let name = role.name.clone();
    let description = role.description.clone();
    let permissions_json = serde_json::to_string(&role.permissions)
        .map_err(|e| format!("Erreur de sérialisation des permissions: {}", e))?;
    db_command_with_retry(&state, move |conn: Connection| {
        let name = name.clone();
        let description = description.clone();
        let permissions_json = permissions_json.clone();
        let role_name = role.name.clone();
        let role_description = role.description.clone();
        Box::pin(async move {
            conn.execute(
                "INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)",
                libsql::params![name, description, permissions_json.clone()],
            ).await?;
            let id = conn.last_insert_rowid();
            Ok::<Role, anyhow::Error>(Role {
                id: Some(id),
                name: role_name,
                description: role_description,
                permissions: permissions_json.clone(),
            })
        })
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn update_role(state: State<'_, AppState>, role: Role) -> Result<Role, String> {
    let id = role.id;
    let name = role.name.clone();
    let description = role.description.clone();
    let permissions_json = serde_json::to_string(&role.permissions)
        .map_err(|e| format!("Erreur de sérialisation des permissions: {}", e))?;
    db_command_with_retry(&state, move |conn: Connection| {
        let name = name.clone();
        let description = description.clone();
        let permissions_json = permissions_json.clone();
        let id = id.clone();
        let role_name = role.name.clone();
        let role_description = role.description.clone();
        let role_permissions = role.permissions.clone();
        Box::pin(async move {
            conn.execute(
                "UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?",
                libsql::params![name, description, permissions_json, id],
            ).await?;
            Ok::<Role, anyhow::Error>(Role {
                id,
                name: role_name,
                description: role_description,
                permissions: role_permissions,
            })
        })
    }).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_role(state: State<'_, AppState>, id: Option<i64>) -> Result<(), String> {
    let id = id.ok_or_else(|| "Role ID requis pour la suppression".to_string())?;
    db_command_with_retry(&state, move |conn: Connection| {
        let id = id.clone();
        Box::pin(async move {
            conn.execute("DELETE FROM roles WHERE id = ?", libsql::params![id]).await?;
            Ok::<(), anyhow::Error>(())
        })
    }).await.map_err(|e| e.to_string())
}