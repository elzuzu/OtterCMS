# Configuration des variables
$toolsDir = "D:\tools"
$buildToolsDir = Join-Path $toolsDir "PortableBuildTools"
$tmpDir = Join-Path $toolsDir "_tmp"
$buildToolsUrl = "https://github.com/Data-Oriented-House/PortableBuildTools/releases/latest/download/PortableBuildTools.exe"
$buildToolsExe = Join-Path $tmpDir "PortableBuildTools.exe"

# Création du dossier tools s'il n'existe pas
if (-not (Test-Path $toolsDir)) {
    Write-Host "Creation du dossier $toolsDir..."
    New-Item -ItemType Directory -Path $toolsDir | Out-Null
}

# Suppression du dossier PortableBuildTools s'il existe déjà
if (Test-Path $buildToolsDir) {
    Write-Host "Suppression du dossier $buildToolsDir..."
    Remove-Item -Recurse -Force $buildToolsDir
}

# Création du dossier PortableBuildTools
Write-Host "Creation du dossier $buildToolsDir..."
New-Item -ItemType Directory -Path $buildToolsDir | Out-Null

# Création du dossier temporaire
if (-not (Test-Path $tmpDir)) {
    New-Item -ItemType Directory -Path $tmpDir | Out-Null
}

# Téléchargement de PortableBuildTools dans le dossier temporaire
if (Test-Path $buildToolsExe) {
    Remove-Item -Force $buildToolsExe
}
Write-Host "Telechargement de PortableBuildTools..."
Invoke-WebRequest -Uri $buildToolsUrl -OutFile $buildToolsExe

# Installation de PortableBuildTools
Write-Host "Installation de PortableBuildTools..."
& $buildToolsExe accept_license msvc=14.44.17.14 sdk=26100 target=x64 host=x64 env=user path="$buildToolsDir"

# Configuration de l'environnement
$env:PATH = "$buildToolsDir\bin;$env:PATH"
$env:INCLUDE = "$buildToolsDir\include;$env:INCLUDE"
$env:LIB = "$buildToolsDir\lib;$env:LIB"

# Sourcing de l'environnement MSVC
$devCmd = Join-Path $buildToolsDir "devcmd.ps1"
Write-Host "Configuration de l'environnement MSVC..."
. $devCmd

# Vérification de l'installation
Write-Host "Verification de l'installation..."
$clPath = Get-Command cl.exe -ErrorAction SilentlyContinue
if ($clPath) {
    Write-Host "Installation reussie !"
} else {
    Write-Host "Erreur lors de l'installation."
    exit 1
}

# Compilation du projet
Write-Host "Compilation du projet..."
Push-Location src-tauri
cargo build --release
Pop-Location

# Compression avec UPX si disponible
$upxExe = "D:\tools\upx\upx.exe"
$exePath = "src-tauri\target\release\ottercms.exe"
if ((Test-Path $upxExe) -and (Test-Path $exePath)) {
    Write-Host "Compression de l'exécutable avec UPX..."
    & $upxExe --best --lzma $exePath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Compression reussie !"
    } else {
        Write-Host "Erreur lors de la compression."
    }
} else {
    Write-Host "UPX non trouve, compression ignoree."
} 