use serde::{Deserialize, Serialize};
use rusqlite::{params, Connection, Result, Row};
use bcrypt::{hash, verify, DEFAULT_COST};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    pub id: Option<i32>,
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
    pub fn new(username: String, password: &str, role: UserRole) -> Result<Self> {
        let password_hash = hash(password, DEFAULT_COST)
            .map_err(|e| rusqlite::Error::ToSqlConversionFailure(Box::new(e)))?;

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
        verify(password, &self.password_hash).unwrap_or(false)
    }

    pub fn from_row(row: &Row) -> Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            username: row.get(1)?,
            password_hash: row.get(2)?,
            role: match row.get::<_, String>(3)?.as_str() {
                "admin" => UserRole::Admin,
                "manager" => UserRole::Manager,
                _ => UserRole::User,
            },
            windows_login: row.get(4)?,
            deleted: row.get::<_, i32>(5)? != 0,
        })
    }

    pub fn find_by_username(conn: &Connection, username: &str) -> Result<Option<Self>> {
        let mut stmt = conn.prepare(
            "SELECT id, username, password_hash, role, windows_login, deleted \
             FROM users WHERE username = ? AND deleted = 0",
        )?;

        let user = stmt.query_row(params![username], |row| Self::from_row(row)).optional()?;

        Ok(user)
    }

    pub fn find_by_windows_login(conn: &Connection, login: &str) -> Result<Option<Self>> {
        let mut stmt = conn.prepare(
            "SELECT id, username, password_hash, role, windows_login, deleted \
             FROM users WHERE windows_login = ? AND deleted = 0",
        )?;

        let user = stmt
            .query_row(params![login], |row| Self::from_row(row))
            .optional()?;

        Ok(user)
    }
}
