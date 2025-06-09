use crate::database::models::{user::User, user::UserRole};
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;
use super::db_command_with_retry;
use libsql::Connection;
use rand::{distributions::Alphanumeric, Rng};
use bcrypt::verify;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AuthRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Serialize, Default)]
pub struct AuthResponse {
    pub success: bool,
    pub token: Option<String>,
    pub error: Option<String>,
}

impl Default for User {
    fn default() -> Self {
        User {
            id: None,
            username: String::new(),
            password_hash: String::new(),
            role: UserRole::User,
            windows_login: None,
            deleted: false,
        }
    }
}

#[tauri::command]
pub async fn login(
    state: State<'_, AppState>,
    request: AuthRequest,
) -> Result<AuthResponse, String> {
    let username = request.username.clone();
    let password = request.password.clone();
    db_command_with_retry(&state, move |conn: Connection| {
        let username = username.clone();
        let password = password.clone();
        Box::pin(async move {
            let mut stmt = conn.prepare("SELECT id, password_hash FROM users WHERE username = ?").await?;
            let mut rows = stmt.query([username.as_str()]).await?;
            if let Some(row) = rows.next().await? {
                let password_hash: String = row.get(1)?;
                if User::verify_password(&User { password_hash, ..Default::default() }, &password) {
                    let token = generate_token();
                    Ok::<AuthResponse, anyhow::Error>(AuthResponse {
                        success: true,
                        token: Some(token),
                        error: None,
                    })
                } else {
                    Ok::<AuthResponse, anyhow::Error>(AuthResponse {
                        success: false,
                        token: None,
                        error: Some("Invalid password".to_string()),
                    })
                }
            } else {
                Ok::<AuthResponse, anyhow::Error>(AuthResponse {
                    success: false,
                    token: None,
                    error: Some("User not found".to_string()),
                })
            }
        })
    }).await.map_err(|e| e.to_string())
}

fn _verify_password(password: &str, hash: &str) -> bool {
    verify(password, hash).unwrap_or(false)
}

fn generate_token() -> String {
    rand::thread_rng().sample_iter(&Alphanumeric).take(32).map(char::from).collect()
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
                let _username = OsString::from_wide(&buffer)
                    .to_string_lossy()
                    .to_string();

                return Ok(AuthResponse {
                    success: true,
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
    db_command_with_retry(&state, move |conn| {
        let username = username.clone();
        Box::pin(async move {
            match User::find_by_windows_login(&conn, &username).await {
                Ok(Some(_user)) => Ok(AuthResponse {
                    success: true,
                    token: None,
                    error: None,
                }),
                Ok(None) => Ok(AuthResponse {
                    success: false,
                    token: None,
                    error: Some("Utilisateur non trouvé".to_string()),
                }),
                Err(e) => Err(anyhow::anyhow!(format!("Erreur lors de la recherche: {}", e))),
            }
        })
    }).await.map_err(|e| format!("Erreur base de données: {}", e))
}