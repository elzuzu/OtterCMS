# Script de build ultra-robuste pour Indi-Suivi - Version amélioré
param(
    [switch]$Clean = $true,
    [switch]$InstallDeps = $false,
    [switch]$Verbose = $false,
    [switch]$UseForge = $false,
    [switch]$UsePackager = $false,
    [switch]$SkipNativeDeps = $false,
    [switch]$SkipUPX = $false,
    [int]$UPXLevel = 9
)

# Couleurs pour les messages
$Red = [System.ConsoleColor]::Red
$Green = [System.ConsoleColor]::Green
$Yellow = [System.ConsoleColor]::Yellow
$Cyan = [System.ConsoleColor]::Cyan
$Gray = [System.ConsoleColor]::Gray

function Write-ColorText($Text, $Color) {
    $current = $Host.UI.RawUI.ForegroundColor
    $Host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Text
    $Host.UI.RawUI.ForegroundColor = $current
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
        Write-ColorText "ℹ️ UPX non trouvé à $upx - compression ignorée" $Gray
        return $false
    }
    try {
        $version = & $upx --version 2>&1 | Select-Object -First 1
        Write-ColorText "🗜️ Compression UPX ($version)..." $Yellow
    } catch {
        Write-ColorText "⚠️ UPX non fonctionnel - compression ignorée" $Yellow
        return $false
    }
    $compressed = 0
    $totalSavings = 0
    foreach ($exe in (Get-ChildItem -Path $BuildPath -Recurse -Filter '*.exe')) {
        $orig = $exe.Length
        $args = @("-$CompressionLevel", '--best', '--compress-icons=0', '--strip-relocs=0', $exe.FullName)
        if (-not $Verbose) { $args += '--quiet' }
        & $upx @args 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $newSize = (Get-Item $exe.FullName).Length
            $totalSavings += $orig - $newSize
            $compressed++
        }
    }
    if ($compressed -gt 0) {
        $mb = [math]::Round($totalSavings / 1MB, 2)
        Write-ColorText "📊 Compression UPX terminée : $compressed fichier(s), économie $mb MB" $Green
        return $true
    }
    Write-ColorText "ℹ️ Aucun fichier compressé" $Gray
    return $false
}

$projectRoot = Split-Path -Parent $PSScriptRoot
Write-ColorText "🚀 Répertoire du projet: $projectRoot" $Cyan
Push-Location $projectRoot

$env:NODE_ENV = 'production'
$env:GENERATE_SOURCEMAP = 'false'
$env:SKIP_PREFLIGHT_CHECK = 'true'

try {
    Write-ColorText "`n🔍 Vérifications préalables..." $Yellow
    try {
        $nodeVersion = node --version
        Write-ColorText "   ✓ Node.js: $nodeVersion" $Green
    } catch {
        throw "Node.js n'est pas installé ou n'est pas dans le PATH"
    }

    $iconPath = Join-Path $projectRoot 'src\assets\app-icon.ico'
    if (Test-Path $iconPath) {
        Write-ColorText "   ✓ Icône trouvée: $iconPath" $Green
    } else {
        Write-ColorText "   ⚠️ Icône manquante: $iconPath" $Red
        Write-ColorText "   ⚠️ Le script ne crée pas d'icône par défaut" $Yellow
    }

    $utilsDir = Join-Path $projectRoot 'src\utils'
    $loggerPath = Join-Path $utilsDir 'logger.js'
    if (-not (Test-Path $loggerPath)) {
        Write-ColorText "   📝 Création du module logger manquant..." $Yellow
        if (-not (Test-Path $utilsDir)) { New-Item -ItemType Directory -Path $utilsDir -Force | Out-Null }
        $loggerContent = @"
// Module logger simple
class Logger {
    static info(message) { console.log(`[INFO] ${new Date().toISOString()}: ${message}`) }
    static error(message) { console.error(`[ERROR] ${new Date().toISOString()}: ${message}`) }
    static warn(message) { console.warn(`[WARN] ${new Date().toISOString()}: ${message}`) }
    static debug(message) { console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`) }
}
module.exports = { Logger }
"@
        Set-Content -Path $loggerPath -Value $loggerContent -Encoding UTF8
        Write-ColorText "   ✓ Module logger créé: $loggerPath" $Green
    }

    if ($Clean) {
        Write-ColorText "`n🧹 Nettoyage complet..." $Yellow
        Get-Process node*,electron* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        @('out','dist','.vite','release-builds','build','.webpack') | ForEach-Object { if (Test-Path $_) { Remove-Item -Path $_ -Recurse -Force -ErrorAction SilentlyContinue } }
        Get-ChildItem -Path . -Include '*.exe','*.zip','*.AppImage','*.dmg','*.deb','*.rpm' -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        Write-ColorText "✅ Nettoyage terminé" $Green
    }

    if ($InstallDeps -or -not (Test-Path 'node_modules')) {
        Write-ColorText "`n📦 Installation des dépendances..." $Yellow
        if ($InstallDeps -and (Test-Path 'node_modules')) { Remove-Item -Path 'node_modules' -Recurse -Force -ErrorAction SilentlyContinue }
        npm config set registry https://registry.npmjs.org/ | Out-Null
        npm install --include=dev --no-audit --prefer-offline
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ⚠️ npm install a échoué, tentative sans cache..." $Yellow
            npm cache clean --force
            npm config set registry https://registry.npmjs.org/ | Out-Null
            npm install --include=dev --no-audit
            if ($LASTEXITCODE -ne 0) { throw "Échec de l'installation des dépendances" }
        }
        if (-not $SkipNativeDeps) {
            Write-ColorText "   🔧 Configuration des dépendances natives..." $Yellow
            npm run setup-native-deps
        }
        Write-ColorText "✅ Dépendances installées" $Green
    }

    if ($UseForge) {
        Write-ColorText "`n🔧 Mode Electron Forge..." $Cyan
        if (-not (Test-Path 'node_modules/@electron-forge')) {
            npm install --save-dev @electron-forge/cli @electron-forge/maker-squirrel @electron-forge/maker-deb @electron-forge/maker-rpm @electron-forge/maker-zip
            npx electron-forge import
        }
        npx electron-forge make
    } elseif ($UsePackager) {
        Write-ColorText "`n🔧 Mode Electron Packager..." $Cyan
        if (-not (Test-Path 'node_modules/@electron/packager')) { npm install --save-dev @electron/packager }
        npx electron-packager . 'Indi-Suivi' --platform=win32 --arch=x64 --out=release-builds --overwrite --icon='src/assets/app-icon.ico'
    } else {
        Write-ColorText "`n🛠️ Mode Electron Builder (défaut)..." $Cyan
        @('.vite','.vite/build','dist') | ForEach-Object { if (-not (Test-Path $_)) { New-Item -ItemType Directory -Path $_ -Force | Out-Null } }
        Write-ColorText "`n🏗️ Build des composants..." $Yellow
        Write-ColorText "   📝 Build main.js..." $Gray
        npx vite build --config vite.main.config.ts --mode production
        if ($LASTEXITCODE -ne 0) {
            if (Test-Path 'src\main.js') { Copy-Item 'src\main.js' '.vite\build\main.js' -Force } else { throw 'Impossible de construire main.js' }
        }
        Write-ColorText "   📝 Build preload.js..." $Gray
        npx vite build --config vite.preload.config.ts --mode production
        if ($LASTEXITCODE -ne 0) {
            if (Test-Path 'src\preload.ts') { npx tsc src\preload.ts --outDir .vite\build --module commonjs --target es2020 --esModuleInterop --skipLibCheck }
            if (-not (Test-Path '.vite\build\preload.js')) { throw 'Impossible de construire preload.js' }
        }
        Write-ColorText "   📝 Build renderer..." $Gray
        npx vite build --config vite.config.js --mode production
        if ($LASTEXITCODE -ne 0) { throw 'Échec du build renderer' }
        foreach ($file in @('.vite/build/main.js','.vite/build/preload.js','dist/index.html')) { if (-not (Test-Path $file)) { throw "Fichier critique manquant: $file" } }
        $utilsSrc = 'src\utils'
        $utilsDest = '.vite\build\utils'
        if (Test-Path $utilsSrc) { Copy-Item $utilsSrc $utilsDest -Recurse -Force }
        if (-not $SkipNativeDeps) {
            Write-ColorText "`n🔧 Rebuild des modules natifs..." $Yellow
            npx electron-rebuild -f -w better-sqlite3
        }
        Write-ColorText "`n🧹 Nettoyage du cache electron-builder..." $Yellow
        $cache = "$env:LOCALAPPDATA\electron-builder\Cache"
        if (Test-Path $cache) { Remove-Item -Path $cache -Recurse -Force -ErrorAction SilentlyContinue }
        npx electron-builder install-app-deps --force-rebuild
        Write-ColorText "`n📦 Construction de l'exécutable..." $Yellow
        if ($Verbose) { $env:DEBUG = 'electron-builder' }
        $builderArgs = @("--win","--publish","never","--config.compression=normal","--config.nsis.oneClick=false","--config.nsis.allowElevation=true")
        npx electron-builder @builderArgs
        if ($LASTEXITCODE -ne 0) {
            npx electron-builder --win --dir
            if ($LASTEXITCODE -ne 0) { throw 'Tous les modes de build ont échoué' }
        }
        if (Test-Path '.vite') { Get-ChildItem -Path '.vite' -Recurse -Include '*.map' | Remove-Item -Force }
        if (Test-Path 'dist') { Get-ChildItem -Path 'dist' -Recurse -Include '*.md','*.txt','LICENSE*' | Remove-Item -Force }
    }

    Write-ColorText "`n🗜️ Compression UPX des exécutables..." $Yellow
    if (-not $SkipUPX) { Invoke-UPXCompression -BuildPath 'release-builds' -CompressionLevel $UPXLevel -Verbose:$Verbose }
    else { Write-ColorText "⏭️ Compression UPX ignorée" $Gray }

    Write-ColorText "`n✅ Build terminé avec succès!" $Green
    $outputPaths = @('release-builds','out','dist')
    $found = @()
    foreach ($p in $outputPaths) { if (Test-Path $p) { $found += Get-ChildItem -Path $p -Recurse | Where-Object { $_.Extension -in '.exe','.zip','.msi','.nupkg','.AppImage' } } }
    if ($found.Count -gt 0) {
        Write-ColorText "`n📊 Fichiers générés:" $Yellow
        foreach ($f in $found) {
            $size = [math]::Round($f.Length / 1MB, 2)
            Write-ColorText "   ✓ $($f.Name) ($size MB)" $Green
            Write-ColorText "     $($f.FullName)" $Gray
        }
    } else {
        Write-ColorText "`n⚠️ Aucun fichier exécutable trouvé" $Yellow
    }
}
catch {
    Write-ColorText "`n❌ Erreur: $_" $Red
    Write-ColorText "Stack trace:" $Red
    Write-ColorText $_.ScriptStackTrace $Gray
    Write-ColorText "`n🔧 Suggestions de dépannage:" $Yellow
    Write-ColorText "1. Essayez: .\build.ps1 -UseForge" $Gray
    Write-ColorText "2. Ou bien: .\build.ps1 -UsePackager" $Gray
    Write-ColorText "3. Ou encore: .\build.ps1 -InstallDeps -Clean" $Gray
    Write-ColorText "4. Ou encore: .\build.ps1 -SkipNativeDeps" $Gray
    Write-ColorText "5. Vérifiez que src/main.js n'a pas d'erreurs" $Gray
    exit 1
}
finally {
    Pop-Location
    Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
}

Write-ColorText "`n✨ Script terminé!" $Green
Write-ColorText "💡 Utilisez -SkipNativeDeps si les modules natifs posent problème" $Cyan
