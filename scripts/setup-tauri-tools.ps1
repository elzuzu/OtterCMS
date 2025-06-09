param(
    [string]$ToolsDir = "D:\tools",
    [switch]$ForceReinstall
)

$ErrorActionPreference = "Stop"

$rustVersion = "1.75.0"
$rustupInitUrl = "https://static.rust-lang.org/rustup/dist/x86_64-pc-windows-msvc/rustup-init.exe"

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

# 1. Installation de Rust portable
Write-Host "`n=== Installation de Rust portable ===" -ForegroundColor Green
$rustPortableDir = Join-Path $ToolsDir "rust-portable"
$rustupHome = Join-Path $rustPortableDir ".rustup"
$cargoHome = Join-Path $rustPortableDir ".cargo"

if ((Test-Path (Join-Path $cargoHome "bin\cargo.exe")) -and -not $ForceReinstall) {
    Write-Host "Rust déjà installé dans $rustPortableDir" -ForegroundColor Yellow
} else {
    New-Item -ItemType Directory -Force -Path $rustupHome | Out-Null
    New-Item -ItemType Directory -Force -Path $cargoHome | Out-Null

    $rustupInit = Join-Path $env:TEMP "rustup-init.exe"
    if (Download-WithRetry -Url $rustupInitUrl -Output $rustupInit) {
        Write-Host "Installation de Rust (cela peut prendre quelques minutes)..." -ForegroundColor Cyan
        $env:RUSTUP_HOME = $rustupHome
        $env:CARGO_HOME = $cargoHome
        $env:RUSTUP_INIT_SKIP_PATH_CHECK = "yes"
        & $rustupInit -y --no-modify-path --default-host x86_64-pc-windows-msvc --default-toolchain stable --profile minimal
        if ($LASTEXITCODE -ne 0) { throw "Échec de l'installation de Rust" }
        Write-Host "✅ Rust installé avec succès" -ForegroundColor Green
        Remove-Item $rustupInit -Force
    } else {
        throw "Impossible de télécharger rustup-init"
    }
}

# 2. Création du script d'environnement
$launchScript = Join-Path $ToolsDir "start-tauri-env.ps1"
$launchContent = @"
# Script pour configurer l'environnement Tauri
`$env:RUSTUP_HOME = "$rustupHome"
`$env:CARGO_HOME = "$cargoHome"
`$env:PATH = "$cargoHome\bin;`$env:PATH"
Write-Host "Environnement Tauri configuré!"
"@
Set-Content -Path $launchScript -Value $launchContent -Encoding UTF8

Write-Host "`n=== Installation terminée ===" -ForegroundColor Green
Write-Host "Rust: $rustPortableDir" -ForegroundColor Cyan
Write-Host "Script env: $launchScript" -ForegroundColor Cyan
Write-Host "`nPour utiliser l'environnement, exécutez:" -ForegroundColor Yellow
Write-Host "  . $launchScript" -ForegroundColor White
