use serde::{Deserialize, Serialize};
use libsql::{Connection, Result};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Option<i64>,
    pub username: String,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: UserRole,
    pub windows_login: Option<String>,
    pub deleted: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UserRole {
    Admin,
    Manager,
    User,
}

impl User {
    pub fn _new(username: String, password: &str, role: UserRole) -> Result<Self> {
        let password_hash = bcrypt::hash(password, bcrypt::DEFAULT_COST)
            .map_err(|e| libsql::Error::SqliteFailure(1, e.to_string()))?;

        Ok(Self {
            id: None,
            username,
            password_hash,
            role,
            windows_login: None,
            deleted: false,
        })
    }

    pub fn verify_password(&self, password: &str) -> bool {
        bcrypt::verify(password, &self.password_hash).unwrap_or(false)
    }

    pub async fn _find_by_username(conn: &Connection, username: &str) -> Result<Option<Self>> {
        let mut stmt = conn.prepare(
            "SELECT id, username, password_hash, role, windows_login, deleted \
             FROM users WHERE username = ? AND deleted = 0",
        ).await?;

        let mut rows = stmt.query(libsql::params![username.to_string()]).await?;
        
        if let Some(row) = rows.next().await? {
            let id: Option<i64> = row.get(0)?;
            let username: String = row.get(1)?;
            let password_hash: String = row.get(2)?;
            let role_str: String = row.get(3)?;
            let windows_login: Option<String> = row.get(4)?;
            let deleted_int: i32 = row.get(5)?;

            let role = match role_str.as_str() {
                "admin" => UserRole::Admin,
                "manager" => UserRole::Manager,
                _ => UserRole::User,
            };

            Ok(Some(Self {
                id,
                username,
                password_hash,
                role,
                windows_login,
                deleted: deleted_int != 0,
            }))
        } else {
            Ok(None)
        }
    }

    pub async fn find_by_windows_login(conn: &Connection, login: &str) -> Result<Option<Self>> {
        let mut stmt = conn.prepare(
            "SELECT id, username, password_hash, role, windows_login, deleted \
             FROM users WHERE windows_login = ? AND deleted = 0",
        ).await?;

        let mut rows = stmt.query(libsql::params![login.to_string()]).await?;
        
        if let Some(row) = rows.next().await? {
            let id: Option<i64> = row.get(0)?;
            let username: String = row.get(1)?;
            let password_hash: String = row.get(2)?;
            let role_str: String = row.get(3)?;
            let windows_login: Option<String> = row.get(4)?;
            let deleted_int: i32 = row.get(5)?;

            let role = match role_str.as_str() {
                "admin" => UserRole::Admin,
                "manager" => UserRole::Manager,
                _ => UserRole::User,
            };

            Ok(Some(Self {
                id,
                username,
                password_hash,
                role,
                windows_login,
                deleted: deleted_int != 0,
            }))
        } else {
            Ok(None)
        }
    }
}