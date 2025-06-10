mod commands;

#[tokio::main]
async fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_sql::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            commands::diagnostics::ping_database,
            commands::diagnostics::run_diagnostics,
            commands::config::get_db_path,
            commands::oracle::test_oracle_connection,
            commands::oracle::execute_oracle_query,
            commands::oracle::get_oracle_configs,
            commands::oracle::save_oracle_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
