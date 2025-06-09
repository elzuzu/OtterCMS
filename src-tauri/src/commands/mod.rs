use crate::AppState;
use tauri::State;
use anyhow::Result;
use libsql::Connection;

pub async fn db_command_with_retry<F, T>(
    state: &State<'_, AppState>,
    f: F,
) -> Result<T>
where
    F: Fn(Connection) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T>> + Send>>,
{
    let mut retries = 0;
    let max_retries = 3;
    
    loop {
        match state.db.get_connection() {
            Ok(conn) => {
                match f(conn).await {
                    Ok(result) => return Ok(result),
                    Err(e) => {
                        if retries >= max_retries {
                            return Err(e);
                        }
                        retries += 1;
                        tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
                    }
                }
            }
            Err(e) => {
                if retries >= max_retries {
                    return Err(e.into());
                }
                retries += 1;
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            }
        }
    }
}

pub mod auth;
pub mod roles;
pub mod diagnostics;
pub mod sync;
