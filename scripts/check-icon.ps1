# Script pour vérifier que l'icône est valide
# Placez dans le dossier scripts/

$iconPath = Join-Path (Split-Path -Parent $PSScriptRoot) "src\assets\app-icon.ico"

Write-Host "🔍 Vérification de l'icône..." -ForegroundColor Cyan
Write-Host "Chemin: $iconPath" -ForegroundColor Gray

if (Test-Path $iconPath) {
    Write-Host "✓ Le fichier existe" -ForegroundColor Green
    $file = Get-Item $iconPath
    $sizeKB = [math]::Round($file.Length / 1KB, 2)
    Write-Host "Taille: $sizeKB KB" -ForegroundColor Gray
    $bytes = [System.IO.File]::ReadAllBytes($iconPath)
    if ($bytes.Length -ge 4) {
        if ($bytes[0] -eq 0 -and $bytes[1] -eq 0 -and $bytes[2] -eq 1 -and $bytes[3] -eq 0) {
            Write-Host "✓ Format ICO valide détecté" -ForegroundColor Green
            if ($bytes.Length -ge 6) {
                $imageCount = $bytes[4] + ($bytes[5] * 256)
                Write-Host "Nombre d'images dans l'ICO: $imageCount" -ForegroundColor Gray
            }
        } else {
            Write-Host "❌ Ce n'est PAS un fichier ICO valide!" -ForegroundColor Red
            if ($bytes[1] -eq 80 -and $bytes[2] -eq 78 -and $bytes[3] -eq 71) {
                Write-Host "⚠️ C'est un fichier PNG renommé en .ico!" -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "❌ L'icône n'existe pas à cet emplacement!" -ForegroundColor Red
}
