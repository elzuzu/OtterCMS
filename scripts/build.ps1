# Build script unifié pour Indi-Suivi
param(
    [switch]$Verbose = $false
)

# Couleurs
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Cyan = [System.ConsoleColor]::Cyan
$Gray = [System.ConsoleColor]::Gray

function Write-ColorText($Text, $Color) {
    $c = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Text
    $Host.UI.RawUI.ForegroundColor = $c
}

function Resolve-UPXPath {
    $candidates = @(
        'D:\\tools\\upx\\upx.exe',
        'C:\\Program Files\\UPX\\upx.exe'
    )
    $env:PATH.Split(';') | ForEach-Object {
        $p = Join-Path $_ 'upx.exe'
        if (Test-Path $p) { $candidates += $p }
    }
    foreach ($p in $candidates) { if (Test-Path $p) { return $p } }
    return $null
}

function Invoke-UPXCompression {
    param(
        [string]$BuildPath = 'release-builds',
        [int]$CompressionLevel = 9,
        [switch]$Verbose = $false
    )
    $upx = Resolve-UPXPath
    if (-not $upx) {
        Write-ColorText 'ℹ️ UPX non trouvé - compression ignorée' $Gray
        return
    }
    Write-ColorText "🗜️ Compression UPX..." $Yellow
    Get-ChildItem -Path $BuildPath -Recurse -Filter '*.exe' | ForEach-Object {
        $args = @("-$CompressionLevel", '--best', '--compress-icons=0', '--strip-relocs=0', $_.FullName)
        if (-not $Verbose) { $args += '--quiet' }
        & $upx @args | Out-Null
    }
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Push-Location $projectRoot

try {
    Write-ColorText "🔍 Vérification de Node" $Cyan
    node --version | Out-Null

    Write-ColorText "🧹 Nettoyage" $Yellow
    @('release-builds','out','dist','.vite','build','.webpack') | ForEach-Object {
        if (Test-Path $_) { Remove-Item -Recurse -Force $_ }
    }

    if (-not (Test-Path 'node_modules')) {
        Write-ColorText "📦 Installation des dépendances" $Yellow
        npm install --include=dev
    }

    $env:NODE_ENV = 'production'
    Write-ColorText '🏗️ Build main' $Cyan
    npx vite build --config vite.main.config.ts --mode production
    Write-ColorText '🏗️ Build preload' $Cyan
    npx vite build --config vite.preload.config.ts --mode production
    Write-ColorText '🏗️ Build renderer' $Cyan
    npx vite build --config vite.config.js --mode production

    Write-ColorText '📦 Construction avec electron-builder' $Yellow
    npx electron-builder --win --publish never
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText '⚠️ electron-builder a échoué, tentative Forge' $Yellow
        if (-not (Test-Path 'node_modules/@electron-forge')) {
            npm install --save-dev @electron-forge/cli @electron-forge/maker-squirrel @electron-forge/maker-zip
        }
        npx electron-forge make
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText '⚠️ Forge a échoué, tentative Packager' $Yellow
            if (-not (Test-Path 'node_modules/@electron/packager')) { npm install --save-dev @electron/packager }
            npx electron-packager . 'Indi-Suivi' --platform=win32 --arch=x64 --out=release-builds --overwrite --icon='src/assets/app-icon.ico'
            if ($LASTEXITCODE -ne 0) { throw 'Tous les modes de build ont échoué' }
        }
    }

    Write-ColorText '🔧 Rebuild des modules natifs' $Cyan
    npx electron-rebuild -f -w better-sqlite3

    Invoke-UPXCompression -Verbose:$Verbose
    Write-ColorText '✅ Build terminé' $Green
}
catch {
    Write-ColorText "❌ Erreur: $_" $Red
    exit 1
}
finally {
    Pop-Location
}
