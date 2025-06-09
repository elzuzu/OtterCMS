use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection, Result, Row};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub name: String,
    pub permissions: Vec<String>,
}

impl Role {
    fn from_row(row: &Row) -> Result<Self> {
        let perms: String = row.get(1)?;
        let permissions: Vec<String> = serde_json::from_str(&perms).unwrap_or_default();
        Ok(Self { name: row.get(0)?, permissions })
    }

    pub fn get_all(conn: &Connection) -> Result<Vec<Self>> {
        let mut stmt = conn.prepare("SELECT name, permissions FROM roles")?;
        let roles = stmt
            .query_map([], |row| Self::from_row(row))?
            .collect::<Result<Vec<_>, _>>()?;
        Ok(roles)
    }

    pub fn create(conn: &Connection, role: &Self) -> Result<()> {
        let perms = serde_json::to_string(&role.permissions)?;
        conn.execute(
            "INSERT INTO roles (name, permissions) VALUES (?, ?)",
            params![role.name, perms],
        )?;
        Ok(())
    }

    pub fn update(conn: &Connection, role: &Self) -> Result<()> {
        let perms = serde_json::to_string(&role.permissions)?;
        conn.execute(
            "UPDATE roles SET permissions = ? WHERE name = ?",
            params![perms, role.name],
        )?;
        Ok(())
    }

    pub fn delete(conn: &Connection, name: &str) -> Result<()> {
        conn.execute("DELETE FROM roles WHERE name = ?", params![name])?;
        Ok(())
    }
}
