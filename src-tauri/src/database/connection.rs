use anyhow::{Context, Result};
use std::sync::Arc;
use libsql::{Builder, Database, Connection};

pub struct DatabasePool {
    db: Arc<Database>,
}

impl DatabasePool {
    pub async fn new_network_optimized(db_path: &str) -> Result<Self> {
        // Use a local SQLite connection since the database is a local file
        // rather than a remote libSQL server
        let db = Builder::new_local(db_path.to_string())
            .build()
            .await
            .context("Impossible d'ouvrir la base")?;
        let conn = db.connect()?;
        conn.execute(
            "PRAGMA journal_mode=WAL",
            (),
        ).await?;
        conn.execute(
            "PRAGMA synchronous=NORMAL",
            (),
        ).await?;
        conn.execute(
            "PRAGMA busy_timeout=30000",
            (),
        ).await?;
        conn.execute(
            "PRAGMA cache_size=-16384",
            (),
        ).await?;
        conn.execute(
            "PRAGMA temp_store=MEMORY",
            (),
        ).await?;
        conn.execute(
            "PRAGMA wal_autocheckpoint=1000",
            (),
        ).await?;
        conn.execute(
            "PRAGMA foreign_keys=ON",
            (),
        ).await?;
        
        Ok(Self { db: Arc::new(db) })
    }

    pub fn get_connection(&self) -> Result<Connection> {
        self.db
            .connect()
            .context("Impossible d'obtenir une connexion")
    }
}