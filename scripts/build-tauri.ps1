param(
    [ValidateSet("debug", "release")]
    [string]$Mode = "release",
    [switch]$SkipSetup,
    [switch]$SkipUPX,
    [switch]$Clean,
    [switch]$Bundle  # Créer l'installateur NSIS
)

$ErrorActionPreference = "Stop"

# Importer les fonctions de build.ps1
. "$PSScriptRoot\build.ps1" -SkipBuild

# Setup de l'environnement si nécessaire
if (-not $SkipSetup) {
    $setupScript = Join-Path $PSScriptRoot "setup-tauri-tools.ps1"
    if (Test-Path $setupScript) {
        Write-Host "Configuration de l'environnement Tauri..." -ForegroundColor Cyan
        & $setupScript
    }
}

# Variables d'environnement
$rustPortableDir = "D:\tools\rust-portable"
$env:RUSTUP_HOME = Join-Path $rustPortableDir ".rustup"
$env:CARGO_HOME = Join-Path $rustPortableDir ".cargo"
$env:PATH = "$env:CARGO_HOME\bin;D:\tools\w64devkit\bin;$env:PATH"

# Configurer w64devkit
Set-W64DevKitEnvironment

# Clean si demandé
if ($Clean) {
    Write-Host "Nettoyage des builds précédents..." -ForegroundColor Yellow
    $targetDir = Join-Path $PSScriptRoot "..\src-tauri\target"
    if (Test-Path $targetDir) {
        Remove-Item -Path $targetDir -Recurse -Force
    }
}

# Build
Write-Host "Build Tauri en mode $Mode..." -ForegroundColor Cyan
Push-Location (Join-Path $PSScriptRoot "..\src-tauri")

try {
    # Variables d'optimisation
    if ($Mode -eq "release") {
        $env:RUSTFLAGS = "-C target-cpu=native -C link-arg=-s -C opt-level=z"
    }
    
    # Commande de build
    $buildArgs = @()
    if ($Mode -eq "debug") {
        $buildArgs += "--debug"
    }
    if ($Bundle) {
        $buildArgs += "--bundles nsis"
    }
    
    # Exécuter le build
    Write-Host "cargo tauri build $($buildArgs -join ' ')" -ForegroundColor Gray
    & cargo tauri build @buildArgs
    
    if ($LASTEXITCODE -ne 0) {
        throw "Build Tauri échoué"
    }
    
    # Post-traitement
    if ($Mode -eq "release" -and -not $SkipUPX) {
        $exePath = ".\target\release\indi-suivi.exe"
        if (Test-Path $exePath) {
            Write-Host "Compression UPX..." -ForegroundColor Cyan
            
            # Chercher UPX
            $upxPath = $null
            $upxLocations = @(
                "D:\tools\upx\upx.exe",
                "$env:LOCALAPPDATA\indi-suivi-tools\upx\upx.exe"
            )
            
            foreach ($loc in $upxLocations) {
                if (Test-Path $loc) {
                    $upxPath = $loc
                    break
                }
            }
            
            if ($upxPath) {
                $sizeBefore = (Get-Item $exePath).Length / 1MB
                & $upxPath --ultra-brute --lzma -9 $exePath
                $sizeAfter = (Get-Item $exePath).Length / 1MB
                
                Write-Host ("Taille réduite: {0:N2} MB -> {1:N2} MB ({2:N1}% de réduction)" -f 
                    $sizeBefore, $sizeAfter, ((1 - $sizeAfter/$sizeBefore) * 100)) -ForegroundColor Green
            } else {
                Write-Host "UPX non trouvé, compression ignorée" -ForegroundColor Yellow
            }
        }
    }
    
    # Afficher les résultats
    Write-Host "`n✅ Build terminé avec succès!" -ForegroundColor Green
    
    if ($Bundle) {
        $bundlePath = ".\target\release\bundle\nsis"
        if (Test-Path $bundlePath) {
            Write-Host "`nInstallateurs créés:" -ForegroundColor Cyan
            Get-ChildItem $bundlePath -Filter "*.exe" | ForEach-Object {
                $sizeMB = [math]::Round($_.Length / 1MB, 2)
                Write-Host "  - $($_.Name) ($sizeMB MB)" -ForegroundColor White
            }
        }
    }
    
} finally {
    Pop-Location
}
