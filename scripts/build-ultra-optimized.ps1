param(
    [switch]$Clean = $true,
    [switch]$Verbose = $false,
    [switch]$SkipUPX = $false,
    [int]$UPXLevel = 9
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

# Fonction UPX améliorée
function Invoke-UPXCompression {
    param(
        [string]$BuildPath = "release-builds",
        [int]$CompressionLevel = 9,
        [switch]$Verbose = $false
    )

    $upxPath = 'D:\tools\upx\upx.exe'

    if (-not (Test-Path $upxPath)) {
        Write-ColorText "ℹ️ UPX non trouvé à $upxPath - compression ignorée" $Gray
        return $false
    }

    try {
        $upxVersion = & $upxPath --version 2>&1 | Select-Object -First 1
        Write-ColorText "🗜️ Compression UPX ($upxVersion)..." $Yellow
    } catch {
        Write-ColorText "⚠️ UPX non fonctionnel - compression ignorée" $Yellow
        return $false
    }

    $compressed = 0
    $totalSavings = 0

    $searchPaths = @($BuildPath, "out", "dist")

    foreach ($searchPath in $searchPaths) {
        if (Test-Path $searchPath) {
            $executables = Get-ChildItem -Path $searchPath -Recurse -Filter "*.exe" |
                          Where-Object {
                              $_.Name -like "*Indi-Suivi*" -or
                              $_.Name -like "*indi-suivi*" -or
                              ($_.Directory.Name -eq "win-unpacked" -and $_.Name -eq "Indi-Suivi.exe")
                          }

            foreach ($exe in $executables) {
                $originalSize = $exe.Length
                $originalSizeMB = [math]::Round($originalSize / 1MB, 2)

                if ($originalSizeMB -lt 1 -or $originalSizeMB -gt 150) {
                    Write-ColorText "   ⏭️ $($exe.Name) ignoré (taille: $originalSizeMB MB)" $Gray
                    continue
                }

                Write-ColorText "   🗜️ Compression de $($exe.Name) ($originalSizeMB MB)..." $Cyan

                try {
                    $upxArgs = @(
                        "-$CompressionLevel",
                        "--best",
                        "--compress-icons=0",
                        "--strip-relocs=0",
                        $exe.FullName
                    )

                    if (-not $Verbose) { $upxArgs += "--quiet" }

                    & $upxPath @upxArgs 2>&1 | Out-Null

                    if ($LASTEXITCODE -eq 0) {
                        $newSize = (Get-Item $exe.FullName).Length
                        $newSizeMB = [math]::Round($newSize / 1MB, 2)
                        $reduction = [math]::Round((1 - $newSize / $originalSize) * 100, 1)
                        $totalSavings += $originalSize - $newSize
                        $compressed++

                        Write-ColorText "   ✅ $($exe.Name): $originalSizeMB MB → $newSizeMB MB (-$reduction%)" $Green
                    } else {
                        Write-ColorText "   ⚠️ Compression échouée pour $($exe.Name)" $Red
                    }
                } catch {
                    Write-ColorText "   ❌ Erreur compression $($exe.Name): $($_.Exception.Message)" $Red
                }
            }
        }
    }

    if ($compressed -gt 0) {
        $totalSavingsMB = [math]::Round($totalSavings / 1MB, 2)
        Write-ColorText "📊 Compression UPX terminée: $compressed fichier(s), économie: $totalSavingsMB MB" $Green
        return $true
    } else {
        Write-ColorText "ℹ️ Aucun fichier compressé" $Gray
        return $false
    }
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
    npx node-gyp rebuild
    npx electron-rebuild -f -w better-sqlite3 -w ffi-napi
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "   ⚠️ Rebuild natifs échoué mais on continue..." $Yellow
    }

    Write-ColorText "📦 Construction des exécutables (NSIS + Portable + ZIP)..." $Yellow
    if ($Verbose) { $env:DEBUG = "electron-builder" }

    npx electron-builder --win --publish never
    if ($LASTEXITCODE -ne 0) { throw "Échec electron-builder" }

    # Compression UPX améliorée
    if (-not $SkipUPX) {
        Write-ColorText "🗜️ Compression UPX des exécutables..." $Yellow
        $upxSuccess = Invoke-UPXCompression -BuildPath "release-builds" -CompressionLevel $UPXLevel -Verbose:$Verbose
        if ($upxSuccess) {
            Write-ColorText "✅ Compression UPX terminée avec succès" $Green
        } else {
            Write-ColorText "⚠️ Compression UPX ignorée ou échouée" $Yellow
        }
    } else {
        Write-ColorText "⏭️ Compression UPX ignorée (paramètre -SkipUPX)" $Gray
    }

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
