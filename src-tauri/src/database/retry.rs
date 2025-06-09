use std::time::Duration;
use tokio::time::sleep;
use anyhow::Result;

pub struct RetryConfig {
    pub max_attempts: u32,
    pub base_delay_ms: u64,
    pub max_delay_ms: u64,
}

impl Default for RetryConfig {
    fn default() -> Self {
        Self {
            max_attempts: 5,
            base_delay_ms: 100,
            max_delay_ms: 5000,
        }
    }
}

pub async fn execute_with_retry<T, F, Fut>(
    operation: F,
    config: &RetryConfig,
) -> Result<T>
where
    F: Fn() -> Fut,
    Fut: std::future::Future<Output = Result<T>>,
{
    let mut last_error = None;

    for attempt in 0..config.max_attempts {
        match operation().await {
            Ok(result) => return Ok(result),
            Err(e) => {
                let error_msg = e.to_string().to_lowercase();
                if error_msg.contains("database is locked") ||
                   error_msg.contains("sqlite_busy") {
                    last_error = Some(e);

                    if attempt < config.max_attempts - 1 {
                        let delay = std::cmp::min(
                            config.base_delay_ms * 2_u64.pow(attempt),
                            config.max_delay_ms,
                        );
                        sleep(Duration::from_millis(delay)).await;
                        continue;
                    }
                } else {
                    return Err(e);
                }
            }
        }
    }

    Err(last_error.unwrap_or_else(|| anyhow::anyhow!("Max retries exceeded")))
}
