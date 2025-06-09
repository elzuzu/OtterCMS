use crate::database::models::{user::User, user::UserRole};
use crate::database::connection::DatabasePool;
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize, Default)]
pub struct AuthResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<UserRole>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub windows_login: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[tauri::command]
pub async fn auth_login(
    state: State<'_, AppState>,
    request: LoginRequest,
) -> Result<AuthResponse, String> {
    let db = state.db.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        let conn = db.get_connection().map_err(|e| format!("db: {}", e))?;
        match User::find_by_username(&conn, &request.username) {
            Ok(Some(user)) => {
                if user.verify_password(&request.password) {
                    Ok(AuthResponse {
                        success: true,
                        user_id: user.id,
                        username: Some(user.username),
                        role: Some(user.role),
                        windows_login: user.windows_login,
                        permissions: None,
                        error: None,
                    })
                } else {
                    Ok(AuthResponse {
                        success: false,
                        error: Some("Mot de passe incorrect".to_string()),
                        ..Default::default()
                    })
                }
            }
            Ok(None) => Ok(AuthResponse {
                success: false,
                error: Some("Utilisateur non trouvé".to_string()),
                ..Default::default()
            }),
            Err(e) => Err(format!("Erreur lors de la recherche: {}", e)),
        }
    })
    .await
    .map_err(|e| format!("Erreur tâche: {}", e))??;

    Ok(result)
}
