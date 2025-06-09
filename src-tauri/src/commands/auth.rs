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

#[tauri::command]
pub async fn get_windows_username() -> Result<AuthResponse, String> {
    #[cfg(windows)]
    {
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        use winapi::um::winbase::GetUserNameW;

        unsafe {
            let mut size = 256u32;
            let mut buffer = vec![0u16; size as usize];

            if GetUserNameW(buffer.as_mut_ptr(), &mut size) != 0 {
                buffer.truncate(size as usize - 1);
                let username = OsString::from_wide(&buffer)
                    .to_string_lossy()
                    .to_string();

                let clean_username = username
                    .split('\\')
                    .last()
                    .unwrap_or(&username)
                    .to_string();

                return Ok(AuthResponse {
                    success: true,
                    username: Some(clean_username),
                    ..Default::default()
                });
            }
        }
    }

    Ok(AuthResponse {
        success: false,
        error: Some("Impossible de récupérer le nom d'utilisateur Windows".to_string()),
        ..Default::default()
    })
}

#[tauri::command]
pub async fn auto_login_with_windows(
    state: State<'_, AppState>,
    username: String,
) -> Result<AuthResponse, String> {
    let db = state.db.clone();

    let result = tauri::async_runtime::spawn_blocking(move || {
        let conn = db.get_connection().map_err(|e| format!("db: {}", e))?;
        match User::find_by_windows_login(&conn, &username) {
            Ok(Some(user)) => Ok(AuthResponse {
                success: true,
                user_id: user.id,
                username: Some(user.username),
                role: Some(user.role),
                windows_login: user.windows_login,
                permissions: None,
                error: None,
            }),
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
