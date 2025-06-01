param(
    [string]$BuildPath = "release-builds",
    [int]$CompressionLevel = 9,
    [switch]$Verbose = $false,
    [switch]$Backup = $false
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

    $searchPaths = @($BuildPath)

    foreach ($searchPath in $searchPaths) {
        if (Test-Path $searchPath) {
            $executables = Get-ChildItem -Path $searchPath -Recurse -Filter "*.exe" |
                          Where-Object {
                              $_.Name -like "*Indi-Suivi*" -or
                              $_.Name -like "*indi-suivi*" -or
                              ($_.Directory.Name -eq "win-unpacked" -and $_.Name -eq "Indi-Suivi.exe")
                          }

            foreach ($exe in $executables) {
                if ($Backup) {
                    $backupPath = $exe.FullName + '.pre-upx-backup'
                    Copy-Item $exe.FullName $backupPath -Force
                }

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

Push-Location (Split-Path -Parent $PSScriptRoot)
Invoke-UPXCompression -BuildPath $BuildPath -CompressionLevel $CompressionLevel -Verbose:$Verbose
Pop-Location
