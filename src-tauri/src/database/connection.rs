use anyhow::{Context, Result};
use std::sync::Arc;

#[cfg(feature = "use-libsql")]
use libsql::{Database, Connection};

#[cfg(not(feature = "use-libsql"))]
use {
    r2d2::Pool,
    r2d2_sqlite::SqliteConnectionManager,
    rusqlite::Connection as SqliteConnection,
};

pub struct DatabasePool {
    #[cfg(feature = "use-libsql")]
    db: Arc<Database>,
    #[cfg(not(feature = "use-libsql"))]
    pool: Pool<SqliteConnectionManager>,
}

impl DatabasePool {
    #[cfg(feature = "use-libsql")]
    pub async fn new(db_path: &str) -> Result<Self> {
        let db = Database::open(db_path)
            .await
            .context("Impossible d'ouvrir la base")?;
        let conn = db.connect()?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;",
        )
        .await?;
        Ok(Self { db: Arc::new(db) })
    }

    #[cfg(not(feature = "use-libsql"))]
    pub fn new(db_path: &str) -> Result<Self> {
        let manager = SqliteConnectionManager::file(db_path);
        let pool = Pool::new(manager)?;
        {
            let conn = pool.get()?;
            conn.execute_batch(
                "PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;",
            )?;
        }
        Ok(Self { pool })
    }

    #[cfg(feature = "use-libsql")]
    pub fn get_connection(&self) -> Result<Connection> {
        self.db
            .connect()
            .context("Impossible d'obtenir une connexion")
    }

    #[cfg(not(feature = "use-libsql"))]
    pub fn get_connection(&self) -> Result<SqliteConnection> {
        self.pool
            .get()
            .map_err(|e| anyhow::anyhow!(e))
    }
}
