mod database;
mod commands;

use database::connection::DatabasePool;
use std::sync::Arc;
use tauri::Manager;
use futures::executor::block_on;

#[derive(Clone)]
struct AppState {
    db: Arc<DatabasePool>,
}

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = app
                .path()
                .app_data_dir()
                .expect("Failed to get app data directory")
                .join("db")
                .join("ottercms.sqlite");
            
            // Pour libsql 0.6.0, Database::open est synchrone
            let pool = block_on(DatabasePool::new_network_optimized(db_path.to_str().unwrap()))
                .expect("failed to open database");
            
            let state = AppState { db: Arc::new(pool) };
            app.manage(state);

            #[cfg(all(windows, debug_assertions))]
            {
                if let Ok(res) = block_on(commands::auth::get_windows_username()) {
                    if res.success {
                        // Je retire l'accès à res.username qui n'existe pas
                        // Je retire l'accès à ce champ et adapte la logique si besoin
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::login,
            commands::auth::get_windows_username,
            commands::auth::auto_login_with_windows,
            commands::roles::get_roles,
            commands::roles::create_role,
            commands::roles::update_role,
            commands::roles::delete_role,
            commands::diagnostics::ping_database,
            commands::diagnostics::run_diagnostics,
            commands::sync::get_sync_status,
            commands::sync::perform_sync,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}