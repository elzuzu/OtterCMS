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

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = app
                .path_resolver()
                .resolve_resource("../db/ottercms.sqlite")
                .expect("Failed to resolve database path");
            #[cfg(feature = "use-libsql")]
            let pool = block_on(DatabasePool::new_network_optimized(db_path.to_str().unwrap()))
                .expect("failed to open database");
            #[cfg(not(feature = "use-libsql"))]
            let pool = DatabasePool::new_network_optimized(db_path.to_str().unwrap())
                .expect("failed to open database");
            let state = AppState { db: Arc::new(pool) };
            app.manage(state);

            #[cfg(all(windows, debug_assertions))]
            {
                if let Ok(res) = block_on(commands::auth::get_windows_username()) {
                    if res.success {
                        if let Some(username) = res.username {
                            println!("DEBUG: Windows login détecté: {}", username);
                        }
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::auth::auth_login,
            commands::auth::get_windows_username,
            commands::auth::auto_login_with_windows,
            commands::roles::get_roles,
            commands::roles::create_role,
            commands::roles::update_role,
            commands::roles::delete_role,
            commands::diagnostics::ping_database,
            commands::diagnostics::run_diagnostics
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
