mod commands;

use tauri_plugin_sql::{Migration, MigrationKind};

#[tokio::main]
async fn main() {
    let migrations = vec![Migration {
        version: 1,
        description: "create_initial_tables",
        sql: include_str!("../migrations/001_initial.sql"),
        kind: MigrationKind::Up,
    }];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:ottercms.db", migrations)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![
            commands::diagnostics::ping_database,
            commands::diagnostics::run_diagnostics,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
