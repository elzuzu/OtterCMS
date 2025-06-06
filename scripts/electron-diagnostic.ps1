Write-Host "=== DIAGNOSTIC ELECTRON ===" -ForegroundColor Cyan

# 1. Vérifier l'existence des fichiers Electron
$electronPaths = @(
    "node_modules\electron\dist\electron.exe",
    "node_modules\electron\package.json",
    "node_modules\electron\index.js"
)

foreach ($path in $electronPaths) {
    if (Test-Path $path) {
        $size = (Get-Item $path).Length
        Write-Host "✅ $path ($size bytes)" -ForegroundColor Green
    } else {
        Write-Host "❌ $path MANQUANT" -ForegroundColor Red
    }
}

# 2. Vérifier le contenu du package.json d'Electron
if (Test-Path "node_modules\electron\package.json") {
    try {
        $electronPkg = Get-Content "node_modules\electron\package.json" | ConvertFrom-Json
        Write-Host "📦 Version Electron: $($electronPkg.version)" -ForegroundColor Blue
    } catch {
        Write-Host "❌ package.json d'Electron corrompu" -ForegroundColor Red
    }
}

# 3. Tester l'exécutable directement
if (Test-Path "node_modules\electron\dist\electron.exe") {
    try {
        $version = & "node_modules\electron\dist\electron.exe" --version 2>$null
        Write-Host "✅ Electron exécutable: $version" -ForegroundColor Green
    } catch {
        Write-Host "❌ Electron non exécutable: $_" -ForegroundColor Red
    }
}
