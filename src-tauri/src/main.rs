mod commands;

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::diagnostics::ping_database,
            commands::diagnostics::run_diagnostics,
            commands::config::get_db_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
