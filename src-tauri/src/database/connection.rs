use anyhow::{Context, Result};
use std::sync::Arc;
use libsql::{Database, Connection};

pub struct DatabasePool {
    db: Arc<Database>,
}

impl DatabasePool {
    pub async fn new_network_optimized(db_path: &str) -> Result<Self> {
        let db = Database::open_remote(db_path, "").context("Impossible d'ouvrir la base")?;
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