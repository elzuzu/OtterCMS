pub mod auth;
pub mod roles;
pub mod diagnostics;

#[macro_export]
macro_rules! db_command_with_retry {
    ($state:expr, $operation:expr) => {{
        let db = $state.db.clone();
        let config = $crate::database::retry::RetryConfig::default();

        $crate::database::retry::execute_with_retry(
            || async {
                let conn = db.get_connection()?;
                $operation(conn)
            },
            &config,
        )
        .await
    }};
}
