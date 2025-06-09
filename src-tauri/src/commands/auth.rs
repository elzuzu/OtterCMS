use serde::{Deserialize, Serialize};
use tauri::AppHandle;
use tauri_plugin_sql::Database;
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

#[tauri::command]
pub async fn login(app: AppHandle, request: AuthRequest) -> Result<AuthResponse, String> {
    let db = Database::load(&app, "sqlite:ottercms.db")
        .await
        .map_err(|e| e.to_string())?;

    let rows = db
        .select(
            "SELECT id, password_hash FROM users WHERE username = ?",
            &[&request.username],
        )
        .await
        .map_err(|e| e.to_string())?;

    if let Some(row) = rows.get(0) {
        let password_hash: String = row.get("password_hash").unwrap_or_default();
        if verify(&request.password, &password_hash).unwrap_or(false) {
            return Ok(AuthResponse {
                success: true,
                token: Some(generate_token()),
                error: None,
            });
        } else {
            return Ok(AuthResponse {
                success: false,
                token: None,
                error: Some("Invalid password".to_string()),
            });
        }
    }

    Ok(AuthResponse {
        success: false,
        token: None,
        error: Some("User not found".to_string()),
    })
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
pub async fn auto_login_with_windows(app: AppHandle, username: String) -> Result<AuthResponse, String> {
    let db = Database::load(&app, "sqlite:ottercms.db")
        .await
        .map_err(|e| e.to_string())?;

    let rows = db
        .select(
            "SELECT id FROM users WHERE windows_login = ?",
            &[&username],
        )
        .await
        .map_err(|e| e.to_string())?;

    if rows.is_empty() {
        return Ok(AuthResponse {
            success: false,
            token: None,
            error: Some("Utilisateur non trouvé".to_string()),
        });
    }

    Ok(AuthResponse {
        success: true,
        token: None,
        error: None,
    })
}