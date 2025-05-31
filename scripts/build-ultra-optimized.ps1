param(
    [switch]$Clean = $true,
    [switch]$Verbose = $false
)

$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Cyan = [System.ConsoleColor]::Cyan

function Write-ColorText($Text, $Color) {
    $currentColor = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Text
    $Host.UI.RawUI.ForegroundColor = $currentColor
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

$env:NODE_ENV = "production"
$env:GENERATE_SOURCEMAP = "false"

# Utiliser des executables npm/npx personnalisés s'ils existent pour un build
# plus petit et optimisé
$customNpx = "D:\tools\npx\npx.exe"
if (Test-Path $customNpx) {
    Write-ColorText "🔍 npx personnalisé détecté: $customNpx" $Yellow
    Set-Alias npx $customNpx
    $customNpm = Join-Path (Split-Path $customNpx) 'npm.exe'
    if (Test-Path $customNpm) {
        Write-ColorText "🔍 npm personnalisé détecté: $customNpm" $Yellow
        Set-Alias npm $customNpm
    }
}

try {
    Write-ColorText "🚀 Build ultra-optimisé - Objectif < 40MB" $Cyan

    if ($Clean) {
        Write-ColorText "🧹 Nettoyage agressif..." $Yellow
        Get-Process node*, electron* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2

        @("out", "dist", ".vite", "release-builds", "build", ".webpack", "node_modules/.cache") | ForEach-Object {
            if (Test-Path $_) {
                Remove-Item -Path $_ -Recurse -Force -ErrorAction SilentlyContinue
                Write-ColorText "   ✓ Supprimé: $_" $Green
            }
        }
    }

    Write-ColorText "🧹 Nettoyage node_modules des fichiers inutiles..." $Yellow
    if (Test-Path "node_modules") {
        Get-ChildItem "node_modules" -Recurse -Include @("*.md", "*.txt", "LICENSE*", "CHANGELOG*", "README*", "*.d.ts") -File | Remove-Item -Force -ErrorAction SilentlyContinue
        Get-ChildItem "node_modules" -Recurse -Directory -Include @("test", "tests", "docs", "examples", "demo", "samples", "benchmark", ".github", "coverage", ".nyc_output") | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        Write-ColorText "   ✓ node_modules nettoyé" $Green
    }

    Write-ColorText "🏗️ Build avec optimisations maximales..." $Yellow

    Write-ColorText "   📝 Build main.js optimisé..." $Cyan
    npx vite build --config vite.main.config.ts --mode production
    if ($LASTEXITCODE -ne 0) { throw "Échec build main.js" }

    Write-ColorText "   📝 Build preload.js optimisé..." $Cyan
    npx vite build --config vite.preload.config.ts --mode production
    if ($LASTEXITCODE -ne 0) { throw "Échec build preload.js" }

    Write-ColorText "   📝 Build renderer optimisé..." $Cyan
    npx vite build --config vite.config.js --mode production
    if ($LASTEXITCODE -ne 0) { throw "Échec build renderer" }

    Write-ColorText "🗜️ Optimisations post-build..." $Yellow

    Get-ChildItem -Path @(".vite", "dist") -Recurse -Include "*.map" -ErrorAction SilentlyContinue | Remove-Item -Force

    if (Test-Path "dist") {
        Get-ChildItem -Path "dist" -Recurse -Include @("*.md", "*.txt", "LICENSE*", "*.ts") -ErrorAction SilentlyContinue | Remove-Item -Force
    }

    Write-ColorText "🔧 Rebuild modules natifs..." $Yellow
    npx electron-rebuild -f -w better-sqlite3
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "   ⚠️ Rebuild natifs échoué mais on continue..." $Yellow
    }

    Write-ColorText "📦 Construction des exécutables (NSIS + Portable + ZIP)..." $Yellow
    if ($Verbose) { $env:DEBUG = "electron-builder" }

    npx electron-builder --win --publish never
    if ($LASTEXITCODE -ne 0) { throw "Échec electron-builder" }

    Write-ColorText "📊 Analyse de la taille finale..." $Green

    $buildDir = "release-builds"
    if (Test-Path $buildDir) {
        $files = Get-ChildItem -Path $buildDir -Recurse | Where-Object { $_.Extension -in @('.exe', '.zip') }

        foreach ($file in $files) {
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            $color = if ($sizeMB -gt 50) { $Red } elseif ($sizeMB -gt 30) { $Yellow } else { $Green }
            Write-ColorText "   📦 $($file.Name): $sizeMB MB" $color

            if ($sizeMB -le 40) {
                Write-ColorText "   ✅ Objectif < 40MB atteint!" $Green
            } elseif ($sizeMB -le 60) {
                Write-ColorText "   ⚠️ Acceptable mais peut être amélioré" $Yellow
            } else {
                Write-ColorText "   ❌ Trop volumineux - optimisations supplémentaires nécessaires" $Red
            }
        }
    }

    Write-ColorText "✅ Build ultra-optimisé terminé!" $Green
    Write-ColorText "📂 Fichiers générés dans: release-builds/" $Cyan

} catch {
    Write-ColorText "❌ Erreur: $_" $Red
    Write-ColorText "💡 Essayez de supprimer node_modules et relancer npm install" $Yellow
    exit 1
} finally {
    Pop-Location
    Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
}
