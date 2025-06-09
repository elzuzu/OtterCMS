use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_sql::Database;
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
pub async fn get_roles(app: AppHandle) -> Result<Vec<Role>, String> {
    let db = Database::load(&app, "sqlite:ottercms.db")
        .await
        .map_err(|e| e.to_string())?;

    let rows = db
        .select(
            "SELECT id, name, description, permissions FROM roles",
            &[],
        )
        .await
        .map_err(|e| e.to_string())?;

    let mut roles = Vec::new();
    for row in rows {
        let id = row.get("id").and_then(|v| v.as_i64());
        let name = row
            .get("name")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let description = row
            .get("description")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();
        let permissions_json = row
            .get("permissions")
            .and_then(|v| v.as_str())
            .unwrap_or_default()
            .to_string();

        roles.push(Role {
            id,
            name,
            description,
            permissions: permissions_json,
        });
    }

    Ok(roles)
}

#[tauri::command]
pub async fn create_role(app: AppHandle, role: Role) -> Result<Role, String> {
    let db = Database::load(&app, "sqlite:ottercms.db")
        .await
        .map_err(|e| e.to_string())?;

    let permissions_json = serde_json::to_string(&role.permissions)
        .map_err(|e| format!("Erreur de sérialisation des permissions: {}", e))?;

    db.execute(
        "INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)",
        &[&role.name, &role.description, &permissions_json],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(Role {
        id: None,
        name: role.name,
        description: role.description,
        permissions: permissions_json,
    })
}

#[tauri::command]
pub async fn update_role(app: AppHandle, role: Role) -> Result<Role, String> {
    let db = Database::load(&app, "sqlite:ottercms.db")
        .await
        .map_err(|e| e.to_string())?;

    let id = role.id.ok_or_else(|| "ID manquant".to_string())?;
    let permissions_json = serde_json::to_string(&role.permissions)
        .map_err(|e| format!("Erreur de sérialisation des permissions: {}", e))?;

    db.execute(
        "UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?",
        &[&role.name, &role.description, &permissions_json, &id],
    )
    .await
    .map_err(|e| e.to_string())?;

    Ok(Role {
        id: Some(id),
        name: role.name,
        description: role.description,
        permissions: permissions_json,
    })
}

#[tauri::command]
pub async fn delete_role(app: AppHandle, id: Option<i64>) -> Result<(), String> {
    let id = id.ok_or_else(|| "Role ID requis pour la suppression".to_string())?;

    let db = Database::load(&app, "sqlite:ottercms.db")
        .await
        .map_err(|e| e.to_string())?;

    db.execute("DELETE FROM roles WHERE id = ?", &[&id])
        .await
        .map_err(|e| e.to_string())?;

    Ok(())
}