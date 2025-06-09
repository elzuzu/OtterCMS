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
                .resolve_resource("../db/indi-suivi.sqlite")
                .expect("Failed to resolve database path");
            #[cfg(feature = "use-libsql")]
            let pool = block_on(DatabasePool::new(db_path.to_str().unwrap()))
                .expect("failed to open database");
            #[cfg(not(feature = "use-libsql"))]
            let pool = DatabasePool::new(db_path.to_str().unwrap())
                .expect("failed to open database");
            let state = AppState { db: Arc::new(pool) };
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![commands::auth::auth_login])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
