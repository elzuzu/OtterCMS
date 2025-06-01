# Script simple de build avec @electron/packager
param(
    [switch]$Clean = $true
)

$projectRoot = Split-Path -Parent $PSScriptRoot
Write-Host "🚀 Build simple - Projet: $projectRoot" -ForegroundColor Cyan

Push-Location $projectRoot

try {
    if ($Clean) {
        Write-Host "`n🧹 Nettoyage rapide..." -ForegroundColor Yellow
        Get-Process node*, electron* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        @("release-builds") | ForEach-Object { if (Test-Path $_) { Remove-Item -Path $_ -Recurse -Force -ErrorAction SilentlyContinue } }
    }
    if (-not (Test-Path "node_modules/@electron/packager")) {
        npm install --save-dev @electron/packager
        if ($LASTEXITCODE -ne 0) { throw "Installation de @electron/packager echouée" }
    }
    npx electron-packager . "Indi-Suivi" --platform=win32 --arch=x64 --out=release-builds --overwrite --icon="src/assets/app-icon.ico"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Build simple terminé" -ForegroundColor Green
        $upxPath = 'D:\\tools\\upx\\upx.exe'
        if (Test-Path $upxPath) {
            Write-Host "🗜️ Compression UPX des exécutables..." -ForegroundColor Yellow
            Get-ChildItem -Path "release-builds" -Recurse -Filter *.exe | ForEach-Object {
                & $upxPath -9 $_.FullName | Out-Null
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "   ✓ $($_.Name) compressé" -ForegroundColor Green
                } else {
                    Write-Host "   ⚠️ Compression échouée pour $($_.Name)" -ForegroundColor Red
                }
            }
        } else {
            Write-Host "ℹ️ UPX non trouvé à $upxPath - compression ignorée" -ForegroundColor Gray
        }
    } else {
        throw "Le build simple a échoué"
    }
}
catch {
    Write-Host "`n❌ Erreur: $_" -ForegroundColor Red
    exit 1
}
finally {
    Pop-Location
}
