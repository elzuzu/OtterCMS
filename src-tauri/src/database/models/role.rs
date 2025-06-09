use serde::{Deserialize, Serialize};
use libsql::{Connection, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Role {
    pub id: Option<i64>,
    pub name: String,
    pub description: String,
    pub permissions: Vec<String>,
}

impl Role {
    pub async fn _get_all(conn: &Connection) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare("SELECT id, name, description, permissions FROM roles").await?;
        let mut rows = stmt.query(()).await?;
        let mut roles = Vec::new();
        
        while let Some(row) = rows.next().await? {
            let id: i64 = row.get(0)?;
            let name: String = row.get(1)?;
            let description: String = row.get(2)?;
            let permissions_json: String = row.get(3)?;
            let permissions: Vec<String> = serde_json::from_str(&permissions_json).unwrap_or_default();
            
            roles.push(Self { id: Some(id), name, description, permissions });
        }
        
        Ok(roles)
    }

    pub async fn _create(conn: &Connection, role: &Self) -> Result<()> {
        let perms = serde_json::to_string(&role.permissions)
            .map_err(|e| libsql::Error::SqliteFailure(1, e.to_string()))?;
        
        conn.execute(
            "INSERT INTO roles (name, description, permissions) VALUES (?, ?, ?)",
            libsql::params![role.name.clone(), role.description.clone(), perms],
        ).await?;
        
        Ok(())
    }

    pub async fn _update(conn: &Connection, role: &Self) -> Result<()> {
        let perms = serde_json::to_string(&role.permissions)
            .map_err(|e| libsql::Error::SqliteFailure(1, e.to_string()))?;
        
        conn.execute(
            "UPDATE roles SET description = ?, permissions = ? WHERE name = ?",
            libsql::params![role.description.clone(), perms, role.name.clone()],
        ).await?;
        
        Ok(())
    }

    pub async fn _delete(conn: &Connection, name: &str) -> Result<()> {
        conn.execute(
            "DELETE FROM roles WHERE name = ?", 
            libsql::params![name.to_string()]
        ).await?;
        Ok(())
    }
}