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
