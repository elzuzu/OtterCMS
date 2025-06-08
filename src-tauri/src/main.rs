use tauri::{App, AppHandle, Manager};
use libsql::Database;
use std::sync::Arc;

#[derive(Clone)]
struct AppState {
    db: Arc<Database>,
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let db_path = app
                .path_resolver()
                .resolve_resource("../db/indi-suivi.sqlite")
                .expect("Failed to resolve database path");
            let db = futures::executor::block_on(Database::open(db_path))
                .expect("failed to open database");
            let state = AppState { db: Arc::new(db) };
            app.manage(state);
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
