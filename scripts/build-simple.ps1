# Script simple de build avec @electron/packager
param(
    [switch]$Clean = $true,
    [switch]$SkipUPX = $false,
    [int]$UPXLevel = 9
)

$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Cyan = [System.ConsoleColor]::Cyan
$Gray = [System.ConsoleColor]::Gray

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
        Write-ColorText "`n✅ Build simple terminé" $Green
        # Compression UPX améliorée
        if (-not $SkipUPX) {
            Write-ColorText "🗜️ Compression UPX des exécutables..." $Yellow
            $upxSuccess = Invoke-UPXCompression -BuildPath "release-builds" -CompressionLevel $UPXLevel
            if ($upxSuccess) {
                Write-ColorText "✅ Compression UPX terminée avec succès" $Green
            } else {
                Write-ColorText "⚠️ Compression UPX ignorée ou échouée" $Yellow
            }
        } else {
            Write-ColorText "⏭️ Compression UPX ignorée (paramètre -SkipUPX)" $Gray
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
