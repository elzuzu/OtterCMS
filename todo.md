# TODO: Migration Electron vers Tauri 2 + libSQL

## 📋 Vue d'ensemble
Migration progressive d'Indi-Suivi depuis Electron/better-sqlite3 vers Tauri 2/libSQL tout en maintenant la base de données sur un partage réseau.

### 🔍 Note importante sur libSQL vs rusqlite

**libSQL** est le choix principal car c'est ce que vous avez demandé. Cependant, libSQL peut présenter des défis de compilation avec w64devkit/MinGW car :
- Il a des dépendances C++ plus complexes
- Il est principalement testé avec MSVC sur Windows
- La compilation avec MinGW nécessite des flags spécifiques

**Solution proposée** : 
1. Tenter d'abord la compilation avec libSQL
2. Si échec, utiliser rusqlite comme alternative (API très similaire)
3. Les deux supportent parfaitement les chemins UNC Windows

Le plan inclut les deux options pour garantir le succès du projet.

### ⚠️ Contraintes critiques
- ✅ Client Windows 64-bit uniquement  
- ✅ Base de données SQLite sur partage réseau (\\server\share\db\indi-suivi.sqlite)
- ✅ Pas de droits administrateur requis (Rust portable et libSQL précompilé)
- ✅ Installation dans D:\tools
- ✅ Compatibilité ascendante avec l'existant
- ✅ Zéro interruption de service

---

## Phase 0: Préparation et environnement portable (1 semaine)

### 0.1 Script d'installation automatique des outils

Créer `scripts/setup-tauri-tools.ps1` (version mise à jour utilisant libSQL précompilé) :
*(L'ancien script basé sur w64devkit est conservé ci-dessous pour référence.)*

```powershell
param(
    [string]$ToolsDir = "D:\tools",
    [switch]$ForceReinstall
)

$ErrorActionPreference = "Stop"

# Versions et URLs
$w64devkitVersion = "1.21.0"
$w64devkitUrl = "https://github.com/skeeto/w64devkit/releases/download/v$w64devkitVersion/w64devkit-$w64devkitVersion.zip"
$rustVersion = "1.75.0"  # Version stable actuelle
$rustupInitUrl = "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe"

# Fonction de téléchargement avec retry
function Download-WithRetry {
    param([string]$Url, [string]$Output, [int]$MaxRetries = 3)
    
    for ($i = 1; $i -le $MaxRetries; $i++) {
        try {
            Write-Host "Téléchargement de $Url (tentative $i/$MaxRetries)..." -ForegroundColor Cyan
            Invoke-WebRequest -Uri $Url -OutFile $Output -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"}
            return $true
        } catch {
            if ($i -eq $MaxRetries) {
                Write-Host "Échec après $MaxRetries tentatives: $_" -ForegroundColor Red
                return $false
            }
            Write-Host "Échec, nouvelle tentative dans 5 secondes..." -ForegroundColor Yellow
            Start-Sleep -Seconds 5
        }
    }
}

# 1. Installation de w64devkit
Write-Host "`n=== Installation de w64devkit v$w64devkitVersion ===" -ForegroundColor Green
$w64devkitPath = Join-Path $ToolsDir "w64devkit"

if ((Test-Path $w64devkitPath) -and -not $ForceReinstall) {
    Write-Host "w64devkit déjà installé dans $w64devkitPath" -ForegroundColor Yellow
} else {
    $tempZip = Join-Path $env:TEMP "w64devkit.zip"
    
    if (Download-WithRetry -Url $w64devkitUrl -Output $tempZip) {
        Write-Host "Extraction de w64devkit..." -ForegroundColor Cyan
        
        # Supprimer l'ancienne version si elle existe
        if (Test-Path $w64devkitPath) {
            Remove-Item -Path $w64devkitPath -Recurse -Force
        }
        
        # Extraire
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        [System.IO.Compression.ZipFile]::ExtractToDirectory($tempZip, $ToolsDir)
        
        # Vérifier l'extraction
        if (Test-Path (Join-Path $w64devkitPath "bin\gcc.exe")) {
            Write-Host "✅ w64devkit installé avec succès" -ForegroundColor Green
        } else {
            throw "Échec de l'extraction de w64devkit"
        }
        
        Remove-Item $tempZip -Force
    } else {
        throw "Impossible de télécharger w64devkit"
    }
}

# 2. Installation de Rust portable
Write-Host "`n=== Installation de Rust portable ===" -ForegroundColor Green
$rustPortableDir = Join-Path $ToolsDir "rust-portable"
$rustupHome = Join-Path $rustPortableDir ".rustup"
$cargoHome = Join-Path $rustPortableDir ".cargo"

if ((Test-Path (Join-Path $cargoHome "bin\cargo.exe")) -and -not $ForceReinstall) {
    Write-Host "Rust déjà installé dans $rustPortableDir" -ForegroundColor Yellow
} else {
    # Créer les dossiers
    New-Item -ItemType Directory -Force -Path $rustupHome | Out-Null
    New-Item -ItemType Directory -Force -Path $cargoHome | Out-Null
    
    $rustupInit = Join-Path $env:TEMP "rustup-init.exe"
    
    if (Download-WithRetry -Url $rustupInitUrl -Output $rustupInit) {
        Write-Host "Installation de Rust (cela peut prendre quelques minutes)..." -ForegroundColor Cyan
        
        # Variables d'environnement pour l'installation
        $env:RUSTUP_HOME = $rustupHome
        $env:CARGO_HOME = $cargoHome
        $env:RUSTUP_INIT_SKIP_PATH_CHECK = "yes"
        
        # Installer Rust avec la toolchain GNU (pour w64devkit)
        & $rustupInit -y `
            --no-modify-path `
            --default-host x86_64-pc-windows-gnu `
            --default-toolchain stable `
            --profile minimal
        
        if ($LASTEXITCODE -ne 0) {
            throw "Échec de l'installation de Rust"
        }
        
        Write-Host "✅ Rust installé avec succès" -ForegroundColor Green
        Remove-Item $rustupInit -Force
    } else {
        throw "Impossible de télécharger rustup-init"
    }
}

# 3. Configuration de Cargo pour utiliser w64devkit
Write-Host "`n=== Configuration de Cargo pour w64devkit ===" -ForegroundColor Green
$cargoConfig = Join-Path $cargoHome "config.toml"
$configContent = @"
[target.x86_64-pc-windows-gnu]
linker = "$($w64devkitPath -replace '\\', '\\')/bin/gcc.exe"
ar = "$($w64devkitPath -replace '\\', '\\')/bin/ar.exe"

[env]
CC = "$($w64devkitPath -replace '\\', '\\')/bin/gcc.exe"
CXX = "$($w64devkitPath -replace '\\', '\\')/bin/g++.exe"
AR = "$($w64devkitPath -replace '\\', '\\')/bin/ar.exe"
# Flags pour supporter libSQL si possible
CFLAGS = "-D_WIN32_WINNT=0x0601"
CXXFLAGS = "-D_WIN32_WINNT=0x0601"

[net]
retry = 5
git-fetch-with-cli = true

[build]
target = "x86_64-pc-windows-gnu"
"@

Set-Content -Path $cargoConfig -Value $configContent -Encoding UTF8
Write-Host "✅ Configuration Cargo créée" -ForegroundColor Green

# 4. Installation de tauri-cli
Write-Host "`n=== Installation de tauri-cli ===" -ForegroundColor Green
$env:PATH = "$cargoHome\bin;$w64devkitPath\bin;$env:PATH"
$env:RUSTUP_HOME = $rustupHome
$env:CARGO_HOME = $cargoHome

# Vérifier si cargo fonctionne
& "$cargoHome\bin\cargo.exe" --version
if ($LASTEXITCODE -ne 0) {
    throw "Cargo non fonctionnel"
}

# Test rapide de compilation libSQL
Write-Host "`nTest de compatibilité libSQL avec w64devkit..." -ForegroundColor Cyan
$testDir = Join-Path $env:TEMP "test-libsql-$(Get-Date -Format 'yyyyMMddHHmmss')"
New-Item -ItemType Directory -Path $testDir | Out-Null

$testCargo = @"
[package]
name = "test-libsql"
version = "0.1.0"
edition = "2021"

[dependencies]
libsql = { version = "0.6", default-features = false, features = ["local_backend"] }
"@

$testMain = @"
fn main() {
    println!("libSQL compile avec succès!");
}
"@

Set-Content -Path "$testDir\Cargo.toml" -Value $testCargo
New-Item -ItemType Directory -Path "$testDir\src" | Out-Null
Set-Content -Path "$testDir\src\main.rs" -Value $testMain

Push-Location $testDir
$env:LIBSQL_STATIC = "1"
$libsqlWorks = $false

try {
    & "$cargoHome\bin\cargo.exe" build --target x86_64-pc-windows-gnu 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ libSQL compile avec w64devkit!" -ForegroundColor Green
        $libsqlWorks = $true
    } else {
        Write-Host "⚠️ libSQL ne compile pas avec w64devkit - rusqlite sera utilisé comme fallback" -ForegroundColor Yellow
    }
} catch {
    Write-Host "⚠️ Test libSQL échoué - rusqlite sera utilisé comme fallback" -ForegroundColor Yellow
} finally {
    Pop-Location
    Remove-Item -Path $testDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Installer tauri-cli si pas déjà présent
if (-not (Test-Path "$cargoHome\bin\cargo-tauri.exe")) {
    Write-Host "Installation de tauri-cli..." -ForegroundColor Cyan
    & "$cargoHome\bin\cargo.exe" install tauri-cli --locked
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ tauri-cli installé" -ForegroundColor Green
    } else {
        Write-Host "⚠️ Échec de l'installation de tauri-cli (non critique)" -ForegroundColor Yellow
    }
}

# 5. Créer un script de lancement pour l'environnement
$launchScript = Join-Path $ToolsDir "start-tauri-env.ps1"
$launchContent = @"
# Script pour configurer l'environnement Tauri
`$env:RUSTUP_HOME = "$rustupHome"
`$env:CARGO_HOME = "$cargoHome"
`$env:PATH = "$cargoHome\bin;$w64devkitPath\bin;`$env:PATH"
`$env:CC = "$w64devkitPath\bin\gcc.exe"
`$env:CXX = "$w64devkitPath\bin\g++.exe"
`$env:AR = "$w64devkitPath\bin\ar.exe"

Write-Host "Environnement Tauri configuré!" -ForegroundColor Green
Write-Host "Versions:" -ForegroundColor Cyan
rustc --version
cargo --version
gcc --version | Select-Object -First 1
"@

Set-Content -Path $launchScript -Value $launchContent -Encoding UTF8
Write-Host "`n✅ Script de lancement créé: $launchScript" -ForegroundColor Green

# 6. Afficher le résumé
Write-Host "`n=== Installation terminée ===" -ForegroundColor Green
Write-Host "w64devkit: $w64devkitPath" -ForegroundColor Cyan
Write-Host "Rust: $rustPortableDir" -ForegroundColor Cyan
Write-Host "Script env: $launchScript" -ForegroundColor Cyan
Write-Host "`nPour utiliser l'environnement, exécutez:" -ForegroundColor Yellow
Write-Host "  . $launchScript" -ForegroundColor White

# Note sur libSQL
if ($libsqlWorks) {
    Write-Host "`n📌 Note: libSQL compile correctement avec votre configuration!" -ForegroundColor Green
    Write-Host "   Vous pourrez utiliser libSQL comme prévu dans le projet." -ForegroundColor White
} else {
    Write-Host "`n📌 Note: libSQL ne compile pas avec w64devkit sur ce système." -ForegroundColor Yellow
    Write-Host "   Utilisez rusqlite comme alternative (déjà inclus dans le plan)." -ForegroundColor White
    Write-Host "   Les deux bibliothèques supportent parfaitement les chemins réseau UNC." -ForegroundColor White
}
```

- [x] Créer le script `scripts/setup-tauri-tools.ps1`
- [ ] Tester le téléchargement et l'installation de w64devkit *(à faire sur une machine Windows)*
- [ ] Tester l'installation de Rust portable *(à faire sur une machine Windows)*
- [ ] Vérifier la configuration de Cargo *(à faire après installation)*
- [x] Documenter dans le README

### 0.2 Intégration dans build.ps1

Modifier `scripts/build.ps1` pour ajouter le support Tauri :

```powershell
# Ajouter ces paramètres
param(
    # ... paramètres existants ...
    [switch]$SetupTauriTools,
    [switch]$BuildTauri,
    [string]$TauriMode = "release"  # "release" ou "debug"
)

# Fonction pour setup Tauri
function Setup-Tauri-Environment {
    $tauriSetupScript = Join-Path $PSScriptRoot "setup-tauri-tools.ps1"
    
    if (-not (Test-Path $tauriSetupScript)) {
        Write-ColorText "Script setup-tauri-tools.ps1 manquant!" $Red
        return $false
    }
    
    # Exécuter le setup si demandé ou si les outils manquent
    $rustPortableDir = "D:\tools\rust-portable"
    $cargoPath = Join-Path $rustPortableDir ".cargo\bin\cargo.exe"
    
    if ($SetupTauriTools -or -not (Test-Path $cargoPath)) {
        Write-ColorText "Installation des outils Tauri..." $Cyan
        & $tauriSetupScript
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "Échec de l'installation des outils Tauri" $Red
            return $false
        }
    }
    
    # Configurer l'environnement
    $env:RUSTUP_HOME = Join-Path $rustPortableDir ".rustup"
    $env:CARGO_HOME = Join-Path $rustPortableDir ".cargo"
    $env:PATH = "$env:CARGO_HOME\bin;D:\tools\w64devkit\bin;$env:PATH"
    
    # Configurer w64devkit pour Rust
    Set-W64DevKitEnvironment
    
    return $true
}

# Fonction de build Tauri
function Build-Tauri-App {
    param([string]$Mode = "release")
    
    Write-ColorText "Build Tauri en mode $Mode..." $Cyan
    
    $srcTauriPath = Join-Path $projectRoot "src-tauri"
    if (-not (Test-Path $srcTauriPath)) {
        Write-ColorText "Dossier src-tauri manquant!" $Red
        return $false
    }
    
    Push-Location $srcTauriPath
    try {
        $buildCmd = "cargo tauri build"
        if ($Mode -eq "debug") {
            $buildCmd = "cargo tauri build --debug"
        }
        
        # Optimisations pour la release
        if ($Mode -eq "release") {
            $env:RUSTFLAGS = "-C target-cpu=native -C link-arg=-s"
        }
        
        Write-ColorText "Exécution: $buildCmd" $Gray
        Invoke-Expression $buildCmd
        
        if ($LASTEXITCODE -eq 0) {
            Write-ColorText "✅ Build Tauri réussi!" $Green
            
            # Appliquer UPX si disponible
            if ($Mode -eq "release" -and -not $SkipUPX) {
                $exePath = Join-Path $srcTauriPath "target\release\indi-suivi.exe"
                if (Test-Path $exePath) {
                    Apply-UPX-Compression $exePath
                }
            }
            
            return $true
        } else {
            Write-ColorText "❌ Build Tauri échoué" $Red
            return $false
        }
    } finally {
        Pop-Location
    }
}

# Ajouter dans le flux principal
if ($SetupTauriTools) {
    if (-not (Setup-Tauri-Environment)) {
        exit 1
    }
}

if ($BuildTauri) {
    if (-not (Setup-Tauri-Environment)) {
        exit 1
    }
    
    if (-not (Build-Tauri-App -Mode $TauriMode)) {
        exit 1
    }
    
    Write-ColorText "Build Tauri terminé avec succès!" $Green
    exit 0
}
```

- [x] Modifier `scripts/build.ps1` avec le support Tauri
- [ ] Tester `.\build.ps1 -SetupTauriTools`
- [ ] Tester `.\build.ps1 -BuildTauri`
- [x] Documenter les nouvelles options

### 0.3 Analyse des dépendances
- [ ] Lister toutes les dépendances Electron-spécifiques
  - [ ] `electron-updater` → `tauri-plugin-updater`
  - [ ] `electron-builder` → Tauri bundler intégré
  - [ ] `better-sqlite3` → `rusqlite` (bundled)
  - [ ] `bcryptjs` → `bcrypt` ou `argon2` (crates Rust)
- [ ] Identifier les modules natifs critiques
  - [ ] better-sqlite3 → rusqlite avec feature "bundled"
  - [ ] oracledb → oracle_rs ou API REST séparée
- [ ] Documenter toutes les API IPC utilisées

---

## Phase 1: Architecture backend Rust (2-3 semaines)

### 1.1 Structure du projet Tauri

```
indi-suivi/
├── src-tauri/
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── build.rs
│   └── src/
│       ├── main.rs
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── auth.rs
│       │   ├── users.rs
│       │   ├── categories.rs
│       │   └── individus.rs
│       ├── database/
│       │   ├── mod.rs
│       │   ├── connection.rs
│       │   ├── migrations.rs
│       │   └── models/
│       ├── services/
│       │   ├── mod.rs
│       │   ├── config_service.rs
│       │   ├── crypto_service.rs
│       │   └── import_service.rs
│       └── utils/
│           ├── mod.rs
│           ├── logger.rs
│           └── error.rs
├── src/               # Frontend React existant
└── scripts/
    ├── setup-tauri-tools.ps1
    └── setup-tools.ps1
```

- [x] Initialiser le projet Tauri : `cargo tauri init`
- [x] Configurer `Cargo.toml` avec les bonnes dépendances
- [x] Adapter `tauri.conf.json` pour le build avec w64devkit
- [x] Créer la structure de dossiers
- [x] Ajouter `src-tauri/build.rs`
- [x] Ajouter `src-tauri/src/main.rs`
- [x] Mettre à jour `package.json` pour utiliser `tauri-cli`

### 1.2 Configuration Cargo.toml

```toml
[package]
name = "indi-suivi"
version = "2.0.0"
edition = "2021"

[build-dependencies]
tauri-build = { version = "2.0.0", features = [] }

[dependencies]
tauri = { version = "2.0.0", features = ["dialog-open", "dialog-save", "fs-all", "path-all", "protocol-all", "shell-open", "window-all", "updater"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
tokio = { version = "1", features = ["full"] }

# Base de données - Options disponibles :

# Option 1: libSQL (recommandé si compilation réussie)
libsql = { version = "0.6", default-features = false, features = ["local_backend"] }

# Option 2: rusqlite (fallback si problèmes avec libSQL + MinGW)
# rusqlite = { version = "0.32", features = ["bundled", "backup", "blob", "chrono", "serde_json"] }
# r2d2 = "0.8"  # Pool de connexions
# r2d2_sqlite = "0.24"

# Authentification et crypto
bcrypt = "0.15"
aes-gcm = "0.10"
rand = "0.8"
base64 = "0.22"

# Utilitaires
chrono = { version = "0.4", features = ["serde"] }
anyhow = "1"
thiserror = "1"
log = "0.4"
env_logger = "0.11"
dirs = "5"

# Import Excel/CSV
calamine = "0.25"  # Lecture Excel
csv = "1.3"

# Windows-specific
[target.'cfg(windows)'.dependencies]
windows = { version = "0.54", features = ["Win32_System_Com", "Win32_Security", "Win32_System_WindowsProgramming"] }
winapi = { version = "0.3", features = ["winuser", "winbase", "winnls"] }

[profile.release]
opt-level = "z"     # Optimiser pour la taille
lto = true          # Link Time Optimization
codegen-units = 1   # Meilleure optimisation
strip = true        # Retirer les symboles debug
panic = "abort"     # Plus petit binaire
```

- [x] Créer `src-tauri/Cargo.toml` avec les dépendances
- [ ] Tester d'abord avec libSQL : `cargo build --target x86_64-pc-windows-gnu`
- [ ] Si échec de compilation libSQL, essayer avec ces flags :
  ```powershell
  $env:LIBSQL_STATIC = "1"
  $env:CC = "D:\tools\w64devkit\bin\gcc.exe"
  $env:CXX = "D:\tools\w64devkit\bin\g++.exe"
  $env:CFLAGS = "-D_WIN32_WINNT=0x0601"
  cargo build --target x86_64-pc-windows-gnu
  ```
- [ ] Si libSQL ne compile toujours pas, basculer sur rusqlite (décommenter dans Cargo.toml)
- [ ] Optimiser les flags de compilation

### 1.3 Configuration base de données

Créer `src-tauri/src/database/connection.rs` avec support pour les deux options :

```rust
// Option 1: Avec libSQL
#[cfg(feature = "use-libsql")]
use libsql::{Connection, Database, OpenFlags};
use anyhow::{Context, Result};
use std::path::Path;
use std::sync::Arc;
use log::{info, error};

pub struct DatabasePool {
    db: Arc<Database>,
    db_path: String,
}

impl DatabasePool {
    pub async fn new(db_path: &str) -> Result<Self> {
        info!("Connexion à la base de données (libSQL): {}", db_path);
        
        // Vérifier l'accès au chemin réseau
        let path = Path::new(db_path);
        if !path.exists() {
            if let Some(parent) = path.parent() {
                if !parent.exists() {
                    return Err(anyhow::anyhow!(
                        "Le répertoire de la base de données n'existe pas: {:?}", 
                        parent
                    ));
                }
            }
        }
        
        // Configuration libSQL pour fichier local (mode embedded)
        let db = Database::open(db_path)
            .await
            .context("Impossible d'ouvrir la base de données")?;
        
        // Test de connexion et application des PRAGMA
        let conn = db.connect()?;
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA foreign_keys = ON;
             PRAGMA cache_size = -2000;
             PRAGMA busy_timeout = 10000;
             PRAGMA temp_store = MEMORY;"
        ).await?;
        
        info!("✅ Connexion à la base de données établie (libSQL)");
        
        Ok(Self {
            db: Arc::new(db),
            db_path: db_path.to_string(),
        })
    }
    
    pub fn get_connection(&self) -> Result<Connection> {
        self.db.connect()
            .context("Impossible d'obtenir une connexion")
    }
}

// Option 2: Avec rusqlite (fallback)
#[cfg(not(feature = "use-libsql"))]
use r2d2::Pool;
use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::{params, Connection};
// ... code rusqlite du plan original ...
```

 - [x] Implémenter le module de connexion
- [ ] Gérer les chemins UNC Windows
- [ ] Implémenter le pool de connexions
- [ ] Tester avec plusieurs connexions simultanées

### 1.4 Modèles de données

Créer `src-tauri/src/database/models/user.rs` :

```rust
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
            "SELECT id, username, password_hash, role, windows_login, deleted 
             FROM users WHERE username = ? AND deleted = 0"
        )?;
        
        let user = stmt.query_row(params![username], |row| Self::from_row(row))
            .optional()?;
        
        Ok(user)
    }
}
```

 - [ ] Créer tous les modèles (User, Category, Individu, Audit) *(User implémenté)*
- [ ] Implémenter les méthodes CRUD pour chaque modèle
- [ ] Gérer la sérialisation JSON des champs dynamiques
- [ ] Ajouter les tests unitaires

---

## Phase 2: Commands Tauri (API IPC) (3-4 semaines)

### 2.1 Commands d'authentification

Créer `src-tauri/src/commands/auth.rs` :

```rust
use crate::database::models::{User, UserRole};
use crate::AppState;
use serde::{Deserialize, Serialize};
use tauri::State;

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_id: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub username: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub role: Option<UserRole>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub windows_login: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub permissions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[tauri::command]
pub async fn auth_login(
    state: State<'_, AppState>,
    request: LoginRequest,
) -> Result<AuthResponse, String> {
    let db = state.db.clone();
    
    // Exécuter dans un thread séparé pour ne pas bloquer
    let result = tokio::task::spawn_blocking(move || {
        let conn = db.get_connection()
            .map_err(|e| format!("Erreur base de données: {}", e))?;
        
        match User::find_by_username(&conn, &request.username) {
            Ok(Some(user)) => {
                if user.verify_password(&request.password) {
                    let permissions = get_role_permissions(&conn, &user.role)?;
                    
                    Ok(AuthResponse {
                        success: true,
                        user_id: user.id,
                        username: Some(user.username),
                        role: Some(user.role),
                        windows_login: user.windows_login,
                        permissions: Some(permissions),
                        error: None,
                    })
                } else {
                    Ok(AuthResponse {
                        success: false,
                        error: Some("Mot de passe incorrect".to_string()),
                        ..Default::default()
                    })
                }
            }
            Ok(None) => Ok(AuthResponse {
                success: false,
                error: Some("Utilisateur non trouvé".to_string()),
                ..Default::default()
            }),
            Err(e) => Err(format!("Erreur lors de la recherche: {}", e)),
        }
    })
    .await
    .map_err(|e| format!("Erreur tâche: {}", e))??;
    
    Ok(result)
}

#[tauri::command]
pub async fn get_windows_username() -> Result<AuthResponse, String> {
    #[cfg(windows)]
    {
        use std::ffi::OsString;
        use std::os::windows::ffi::OsStringExt;
        use winapi::um::winbase::GetUserNameW;
        
        unsafe {
            let mut size = 256;
            let mut buffer = vec![0u16; size as usize];
            
            if GetUserNameW(buffer.as_mut_ptr(), &mut size) != 0 {
                buffer.truncate(size as usize - 1);
                let username = OsString::from_wide(&buffer)
                    .to_string_lossy()
                    .to_string();
                
                // Nettoyer le domaine si présent
                let clean_username = username
                    .split('\\')
                    .last()
                    .unwrap_or(&username)
                    .to_string();
                
                return Ok(AuthResponse {
                    success: true,
                    username: Some(clean_username),
                    ..Default::default()
                });
            }
        }
    }
    
    Ok(AuthResponse {
        success: false,
        error: Some("Impossible de récupérer le nom d'utilisateur Windows".to_string()),
        ..Default::default()
    })
}
```

- [ ] Implémenter toutes les commandes d'authentification
- [ ] Gérer l'auto-login Windows
- [ ] Implémenter la gestion des sessions
- [ ] Ajouter les tests d'intégration

### 2.2 Script de build Tauri intégré

Le script `build-tauri.ps1` a finalement été retiré. Utilisez à la place
`scripts/setup-tauri-tools.ps1` pour préparer l'environnement puis exécutez
`cargo tauri build --release` pour générer l'application.

- [x] Créer `scripts/build-tauri.ps1` (obsolète)
- [ ] Intégrer avec le système de build existant
- [ ] Tester les différents modes de build
- [ ] Documenter l'utilisation

---

## Phase 3: Migration frontend (2-3 semaines)

### 3.1 Wrapper de compatibilité API

Créer `src/services/api-wrapper.ts` pour faciliter la transition :

```typescript
// Wrapper pour maintenir la compatibilité pendant la migration
import { invoke } from '@tauri-apps/api/core';

// Détection de l'environnement
const isTauri = window.__TAURI__ !== undefined;
const isElectron = window.api !== undefined;

// API unifiée
export const api = {
  // Authentification
  login: async (username: string, password: string) => {
    if (isTauri) {
      return invoke('auth_login', { request: { username, password } });
    } else if (isElectron) {
      return window.api.login(username, password);
    }
    throw new Error('Aucun backend disponible');
  },
  
  getWindowsUsername: async () => {
    if (isTauri) {
      return invoke('get_windows_username');
    } else if (isElectron) {
      return window.api.getWindowsUsername();
    }
    throw new Error('Aucun backend disponible');
  },
  
  // Utilisateurs
  getUsers: async () => {
    if (isTauri) {
      return invoke('get_users');
    } else if (isElectron) {
      return window.api.getUsers();
    }
    throw new Error('Aucun backend disponible');
  },
  
  // ... mapper toutes les autres méthodes
};

// Export pour compatibilité
export default api;
```

- [ ] Créer le wrapper de compatibilité complet
- [ ] Remplacer progressivement `window.api` par le wrapper
- [ ] Tester avec les deux backends
- [ ] Documenter les différences d'API

### 3.2 Adaptation des imports et dialogues

```typescript
// Dialogues fichiers
import { open, save } from '@tauri-apps/plugin-dialog';
import { readBinaryFile, writeBinaryFile } from '@tauri-apps/plugin-fs';

// Remplacer les dialogues Electron
export async function selectFile(): Promise<string | null> {
  const selected = await open({
    multiple: false,
    filters: [{
      name: 'Fichiers Excel/CSV',
      extensions: ['xlsx', 'xls', 'csv']
    }]
  });
  
  return selected as string | null;
}

// Lecture de fichiers
export async function readExcelFile(path: string): Promise<ArrayBuffer> {
  const contents = await readBinaryFile(path);
  return contents.buffer;
}
```

- [ ] Migrer tous les dialogues système
- [ ] Adapter la lecture/écriture de fichiers
- [ ] Gérer les permissions Tauri
- [ ] Tester l'accès aux partages réseau

---

## Phase 4: Tests et optimisations (2 semaines)

### 4.1 Tests automatisés

Créer `src-tauri/tests/integration_test.rs` :

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;
    
    #[tokio::test]
    async fn test_network_database_access() {
        // Test avec un vrai partage réseau si disponible
        let network_path = r"\\server\share\test\test.db";
        
        if std::path::Path::new(network_path).parent().map(|p| p.exists()).unwrap_or(false) {
            let db = Database::new(network_path);
            assert!(db.is_ok(), "Devrait pouvoir se connecter au partage réseau");
        } else {
            println!("Partage réseau non disponible, test ignoré");
        }
    }
    
    #[test]
    fn test_concurrent_access() {
        use std::thread;
        use std::sync::Arc;
        
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let db = Arc::new(Database::new(db_path.to_str().unwrap()).unwrap());
        
        // Simuler 10 accès concurrents
        let handles: Vec<_> = (0..10)
            .map(|i| {
                let db_clone = db.clone();
                thread::spawn(move || {
                    let conn = db_clone.get_connection().unwrap();
                    conn.execute(
                        "INSERT INTO test_table (data) VALUES (?)",
                        params![format!("Thread {}", i)]
                    ).unwrap();
                })
            })
            .collect();
        
        for handle in handles {
            handle.join().unwrap();
        }
        
        // Vérifier que tous les inserts ont réussi
        let conn = db.get_connection().unwrap();
        let count: i32 = conn.query_row(
            "SELECT COUNT(*) FROM test_table",
            [],
            |row| row.get(0)
        ).unwrap();
        
        assert_eq!(count, 10, "Tous les threads devraient avoir inséré");
    }
}
```

- [ ] Créer une suite de tests complète
- [ ] Tests de performance réseau
- [ ] Tests de charge multi-utilisateurs
- [ ] Tests de migration de données

### 4.2 Benchmarks et optimisations

```powershell
# Script de benchmark
# scripts/benchmark-tauri.ps1

param(
    [int]$Iterations = 100,
    [string]$DbPath = "\\server\share\db\bench.db"
)

Write-Host "Benchmark Tauri vs Electron" -ForegroundColor Cyan

# Benchmark Tauri
$tauriTimes = @()
for ($i = 1; $i -le $Iterations; $i++) {
    $start = Get-Date
    # Appeler une commande Tauri
    & .\src-tauri\target\release\indi-suivi.exe benchmark --silent
    $end = Get-Date
    $tauriTimes += ($end - $start).TotalMilliseconds
}

# Statistiques
$avgTauri = ($tauriTimes | Measure-Object -Average).Average
$minTauri = ($tauriTimes | Measure-Object -Minimum).Minimum
$maxTauri = ($tauriTimes | Measure-Object -Maximum).Maximum

Write-Host "`nRésultats Tauri:" -ForegroundColor Green
Write-Host "  Moyenne: $([math]::Round($avgTauri, 2)) ms"
Write-Host "  Min: $([math]::Round($minTauri, 2)) ms"
Write-Host "  Max: $([math]::Round($maxTauri, 2)) ms"
```

- [ ] Créer les scripts de benchmark
- [ ] Mesurer les performances vs Electron
- [ ] Optimiser les requêtes critiques
- [ ] Documenter les résultats

---

## Phase 5: Migration et déploiement (1-2 semaines)

### 5.1 Script de migration automatique

```powershell
# scripts/migrate-to-tauri.ps1
param(
    [switch]$DryRun,
    [switch]$BackupOnly
)

Write-Host "Migration Indi-Suivi vers Tauri" -ForegroundColor Cyan

# 1. Backup de la base de données
$dbPath = "\\server\share\db\indi-suivi.sqlite"
$backupPath = "$dbPath.backup-$(Get-Date -Format 'yyyyMMdd-HHmmss')"

Write-Host "Backup de la base de données..." -ForegroundColor Yellow
Copy-Item $dbPath $backupPath -Force
Write-Host "✅ Backup créé: $backupPath" -ForegroundColor Green

if ($BackupOnly) {
    exit 0
}

# 2. Vérification de compatibilité
Write-Host "`nVérification de compatibilité..." -ForegroundColor Yellow

# Tester la connexion Tauri à la base
$testExe = ".\src-tauri\target\release\indi-suivi.exe"
if (-not (Test-Path $testExe)) {
    Write-Host "❌ Exécutable Tauri non trouvé. Lancez d'abord: cargo tauri build --release" -ForegroundColor Red
    exit 1
}

# 3. Test de migration
if (-not $DryRun) {
    Write-Host "`nMigration en cours..." -ForegroundColor Yellow
    
    # Copier les fichiers de configuration
    $configFiles = @(
        "config\app-config.json",
        "config\encryption.key"
    )
    
    foreach ($file in $configFiles) {
        if (Test-Path $file) {
            $dest = Join-Path "." $file
            Copy-Item $file $dest -Force
            Write-Host "  ✅ $file copié" -ForegroundColor Green
        }
    }
}

Write-Host "`n✅ Migration terminée!" -ForegroundColor Green
Write-Host "Lancez l'application avec: $testExe" -ForegroundColor Cyan
```

- [ ] Créer le script de migration
- [ ] Documenter le processus complet
- [ ] Créer un guide utilisateur
- [ ] Préparer le déploiement

### 5.2 Configuration CI/CD

`.github/workflows/build-tauri.yml` :

```yaml
name: Build Tauri

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: windows-latest
    
    steps:
    - uses: actions/checkout@v4
    
    - name: Cache Rust
      uses: actions/cache@v4
      with:
        path: |
          ~/.cargo/bin/
          ~/.cargo/registry/index/
          ~/.cargo/registry/cache/
          ~/.cargo/git/db/
          target/
        key: ${{ runner.os }}-cargo-${{ hashFiles('**/Cargo.lock') }}
    
    - name: Setup Rust
      uses: dtolnay/rust-toolchain@stable
      with:
        targets: x86_64-pc-windows-gnu
    
    - name: Install w64devkit
      run: |
        Invoke-WebRequest -Uri "https://github.com/skeeto/w64devkit/releases/download/v1.21.0/w64devkit-1.21.0.zip" -OutFile w64devkit.zip
        Expand-Archive w64devkit.zip -DestinationPath .
        echo "${{ github.workspace }}\w64devkit\bin" | Out-File -FilePath $env:GITHUB_PATH -Encoding utf8 -Append
    
    - name: Build Tauri
      run: |
        cd src-tauri
        cargo tauri build --bundles nsis
    
    - name: Upload artifacts
      uses: actions/upload-artifact@v4
      with:
        name: windows-installer
        path: src-tauri/target/release/bundle/nsis/*.exe
```

- [ ] Configurer GitHub Actions
- [ ] Automatiser les tests
- [ ] Configurer la signature du code
- [ ] Mettre en place l'auto-update

---

## 📊 Métriques de succès

- [ ] **Taille finale** : < 25MB (exe seul), < 40MB (installateur)
- [ ] **Temps de démarrage** : < 1.5s
- [ ] **RAM au repos** : < 80MB
- [ ] **Performances DB réseau** : ≥ Electron actuel
- [ ] **Compatibilité** : 100% des fonctionnalités
- [ ] **Stabilité** : 0 régression critique

---

## 🚨 Points de vigilance

1. **Chemins UNC** : Tester extensivement avec différents serveurs
2. **Permissions réseau** : Gérer les timeouts et reconnexions
3. **WAL mode** : S'assurer que le serveur supporte les fichiers -wal/-shm
4. **Oracle** : Évaluer si migration nécessaire ou garder un service Node.js
5. **Signatures Windows** : Prévoir un certificat pour éviter SmartScreen

---

## 📅 Planning

- **Semaines 1-2** : Setup environnement + prototype
- **Semaines 3-5** : Backend Rust core
- **Semaines 6-9** : Commands et services
- **Semaines 10-12** : Frontend et tests
- **Semaines 13-14** : Migration et déploiement

**Go-live** : Semaine 15 avec déploiement progressif

---

## ❓ FAQ : libSQL vs rusqlite

### Pourquoi envisager rusqlite comme alternative ?

1. **Compatibilité MinGW garantie** : rusqlite avec `bundled` compile sans problème
2. **API très similaire** : Migration facile si besoin
3. **Maturité** : Plus testé sur Windows avec chemins UNC

### Avantages de libSQL si la compilation réussit :

1. **Features avancées** : Support natif des réplications (futur)
2. **Compatible SQLite** : Même format de fichier
3. **Performance** : Optimisations modernes

### Comment décider ?

1. Essayer d'abord libSQL (Phase 0.4)
2. Si compilation OK → utiliser libSQL
3. Si échec après tentatives → rusqlite
4. Les deux supportent vos besoins actuels

### Impact sur le code ?

Minimal ! Exemple de compatibilité :

```rust
// Avec libSQL
let conn = db.connect()?;
conn.execute("INSERT INTO users (name) VALUES (?)", params![name]).await?;

// Avec rusqlite
let conn = db.get_connection()?;
conn.execute("INSERT INTO users (name) VALUES (?1)", params![name])?;
```

Principal changement : libSQL est async, rusqlite est sync (mais on peut wrapper).
