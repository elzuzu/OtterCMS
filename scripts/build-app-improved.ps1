# Script de build ultra-robuste pour Indi-Suivi - Version améliorée
param(
    [switch]$Clean = $true,
    [switch]$InstallDeps = $false,
    [switch]$Verbose = $false,
    [switch]$UseForge = $false,
    [switch]$UsePackager = $false,
    [switch]$SkipNativeDeps = $false
)

# Couleurs pour les messages
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

# Obtenir le répertoire racine du projet
$projectRoot = Split-Path -Parent $PSScriptRoot
Write-ColorText "🚀 Répertoire du projet: $projectRoot" $Cyan

# Se déplacer dans le répertoire racine
Push-Location $projectRoot

# Variables d'environnement pour optimisation
$env:NODE_ENV = "production"
$env:GENERATE_SOURCEMAP = "false"
$env:SKIP_PREFLIGHT_CHECK = "true"

try {
    # Étape 0: Vérifications préalables
    Write-ColorText "`n🔍 Vérifications préalables..." $Yellow
    
    # Vérifier Node.js
    try {
        $nodeVersion = node --version
        Write-ColorText "   ✓ Node.js: $nodeVersion" $Green
    } catch {
        throw "Node.js n'est pas installé ou n'est pas dans le PATH"
    }
    
    # Vérifier l'icône
    $iconPath = Join-Path $projectRoot "src\assets\app-icon.ico"
    if (Test-Path $iconPath) {
        Write-ColorText "   ✓ Icône trouvée: $iconPath" $Green
    } else {
        Write-ColorText "   ⚠️ Icône manquante: $iconPath" $Red
        Write-ColorText "   ⚠️ ATTENTION: Le script ne crée PAS d'icône par défaut. Vous DEVEZ fournir une icône .ico valide à l'emplacement spécifié." $Red
        Write-ColorText "   Poursuite du script, mais le build échouera probablement ou l'application n'aura pas d'icône." $Yellow
    }
    
    # Créer le module utils/logger s'il n'existe pas
    $utilsDir = Join-Path $projectRoot "src\utils"
    $loggerPath = Join-Path $utilsDir "logger.js"
    if (-not (Test-Path $loggerPath)) {
        Write-ColorText "   📝 Création du module logger manquant..." $Yellow
        if (-not (Test-Path $utilsDir)) {
            New-Item -ItemType Directory -Path $utilsDir -Force | Out-Null
        }
        
        $loggerContent = @"
// Module logger simple
class Logger {
    static info(message) {
        console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
    }
    
    static error(message) {
        console.error(`[ERROR] ${new Date().toISOString()}: ${message}`);
    }
    
    static warn(message) {
        console.warn(`[WARN] ${new Date().toISOString()}: ${message}`);
    }
    
    static debug(message) {
        console.log(`[DEBUG] ${new Date().toISOString()}: ${message}`);
    }
}

module.exports = { Logger };
"@
        Set-Content -Path $loggerPath -Value $loggerContent -Encoding UTF8
        Write-ColorText "   ✓ Module logger créé: $loggerPath" $Green
    }
    
    # Étape 1: Nettoyage
    if ($Clean) {
        Write-ColorText "`n🧹 Nettoyage complet..." $Yellow
        
        # Arrêter tous les processus Node/Electron
        Get-Process node*, electron* -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        
        # Supprimer tous les dossiers de build
        @("out", "dist", ".vite", "release-builds", "build", ".webpack") | ForEach-Object {
            if (Test-Path $_) {
                try {
                    Remove-Item -Path $_ -Recurse -Force -ErrorAction Stop
                    Write-ColorText "   ✓ Supprimé: $_" $Gray
                } catch {
                    Write-ColorText "   ⚠️ Impossible de supprimer: $_ (fichiers verrouillés?)" $Yellow
                }
            }
        }
        
        # Supprimer les fichiers générés
        Get-ChildItem -Path . -Include @("*.exe", "*.zip", "*.AppImage", "*.dmg", "*.deb", "*.rpm") -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue
        
        Write-ColorText "✅ Nettoyage terminé" $Green
    }
    
    # Étape 2: Installation des dépendances
    if ($InstallDeps -or -not (Test-Path "node_modules")) {
        Write-ColorText "`n📦 Installation des dépendances..." $Yellow
        
        if ($InstallDeps -and (Test-Path "node_modules")) {
            Write-ColorText "   🗑️ Suppression de node_modules..." $Yellow
            Remove-Item -Path "node_modules" -Recurse -Force -ErrorAction SilentlyContinue
        }
        
        # Installation des dépendances principales
        Write-ColorText "   📥 npm install (avec dev)..." $Gray
        npm install --include=dev --no-audit --prefer-offline
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ⚠️ npm install a échoué, tentative sans cache..." $Yellow
            npm cache clean --force
            npm install --include=dev --no-audit
            if ($LASTEXITCODE -ne 0) {
                throw "Échec de l'installation des dépendances (code: $LASTEXITCODE)"
            }
        }
        
        # Setup des dépendances natives séparément si pas ignoré
        if (-not $SkipNativeDeps) {
            Write-ColorText "   🔧 Configuration des dépendances natives..." $Yellow
            npm run setup-native-deps
            if ($LASTEXITCODE -ne 0) {
                Write-ColorText "   ⚠️ Setup des dépendances natives échoué, mais on continue..." $Yellow
            }
        }
        
        Write-ColorText "✅ Dépendances installées" $Green
    }
    
    # Choix du mode de build
    if ($UseForge) {
        Write-ColorText "`n🔧 Mode Electron Forge..." $Cyan
        if (-not (Test-Path "node_modules\@electron-forge")) {
            Write-ColorText "   📦 Installation d'Electron Forge..." $Yellow
            npm install --save-dev @electron-forge/cli @electron-forge/maker-squirrel @electron-forge/maker-deb @electron-forge/maker-rpm @electron-forge/maker-zip
            npx electron-forge import
        }
        npx electron-forge make
    } elseif ($UsePackager) {
        Write-ColorText "`n🔧 Mode Electron Packager..." $Cyan
        if (-not (Test-Path "node_modules\@electron\packager")) {
            npm install --save-dev @electron/packager
        }
        npx electron-packager . "Indi-Suivi" --platform=win32 --arch=x64 --out=release-builds --overwrite --icon="src/assets/app-icon.ico"
    } else {
        Write-ColorText "`n🛠️ Mode Electron Builder (défaut)..." $Cyan
        
        # Créer les dossiers de build nécessaires
        @(".vite", ".vite/build", "dist") | ForEach-Object {
            if (-not (Test-Path $_)) {
                New-Item -ItemType Directory -Path $_ -Force | Out-Null
                Write-ColorText "   ✓ Créé: $_" $Gray
            }
        }
        
        Write-ColorText "`n🏗️ Build des composants..." $Yellow
        
        # Build main.js
        Write-ColorText "   📝 Build main.js..." $Gray
        npx vite build --config vite.main.config.ts --mode production
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ❌ Échec du build main.js" $Red
            if (Test-Path "src\main.js") {
                Copy-Item "src\main.js" ".vite\build\main.js" -Force
                Write-ColorText "   ✓ Fallback: main.js copié directement" $Yellow
            } else {
                throw "Impossible de construire main.js"
            }
        }
        
        # Build preload.js
        Write-ColorText "   📝 Build preload.js..." $Gray
        npx vite build --config vite.preload.config.ts --mode production
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ❌ Échec du build preload.js" $Red
            if (Test-Path "src\preload.ts") {
                npx tsc src\preload.ts --outDir .vite\build --module commonjs --target es2020 --esModuleInterop --skipLibCheck
                if (-not (Test-Path ".vite\build\preload.js")) {
                    throw "Impossible de construire preload.js"
                } else {
                    Write-ColorText "   ✓ Fallback: preload.js compilé avec tsc" $Yellow
                }
            }
        }
        
        # Build renderer
        Write-ColorText "   📝 Build renderer..." $Gray
        npx vite build --config vite.config.js --mode production
        if ($LASTEXITCODE -ne 0) {
            throw "Échec du build renderer (React)"
        }
        
        # Vérifier les fichiers critiques
        $requiredFiles = @(
            ".vite/build/main.js",
            ".vite/build/preload.js",
            "dist/index.html"
        )
        foreach ($file in $requiredFiles) {
            if (-not (Test-Path $file)) {
                throw "Fichier critique manquant: $file"
            }
            Write-ColorText "   ✓ Vérifié: $file" $Green
        }

        # Copier les utilitaires nécessaires dans le dossier de build
        $utilsSrc = "src\utils"
        $utilsDest = ".vite\build\utils"
        if (Test-Path $utilsSrc) {
            Copy-Item $utilsSrc $utilsDest -Recurse -Force
            Write-ColorText "   ✓ Utils copiés dans le build" $Green
        }
        
        # Rebuild des modules natifs (si pas ignoré)
        if (-not $SkipNativeDeps) {
            Write-ColorText "`n🔧 Rebuild des modules natifs..." $Yellow
            npx electron-rebuild -f -w better-sqlite3
            if ($LASTEXITCODE -ne 0) {
                Write-ColorText "   ⚠️ Rebuild des modules natifs échoué (code: $LASTEXITCODE). Cela peut causer des problèmes d'exécution." $Yellow
            } else {
                Write-ColorText "   ✓ Modules natifs rebuilt" $Green
            }
        }
        
        # Construction de l'exécutable
        Write-ColorText "`n📦 Construction de l'exécutable..." $Yellow
        if ($Verbose) { $env:DEBUG = "electron-builder" }
        
        $builderArgs = @(
            "--win",
            "--publish", "never",
            "--config.compression=normal",
            "--config.nsis.oneClick=false",
            "--config.nsis.allowElevation=true"
        )
        
        npx electron-builder @builderArgs
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ⚠️ Electron-builder a échoué, tentative avec options simplifiées..." $Yellow
            npx electron-builder --win --dir
            if ($LASTEXITCODE -ne 0) { 
                throw "Tous les modes de build ont échoué" 
            }
        }
        
        # Optimisation de la taille
        Write-ColorText "`n🗜️ Optimisation de la taille..." $Yellow

        if (Test-Path ".vite") {
            Get-ChildItem -Path ".vite" -Recurse -Include "*.map" | Remove-Item -Force
            Write-ColorText "   ✓ Source maps supprimées" $Gray
        }

        if (Test-Path "dist") {
            Get-ChildItem -Path "dist" -Recurse -Include "*.md", "*.txt", "LICENSE*" | Remove-Item -Force
            Write-ColorText "   ✓ Documentation supprimée" $Gray
        }
    }
    
    Write-ColorText "`n✅ Build terminé avec succès!" $Green
    
    # Analyse des fichiers générés
    $outputPaths = @("release-builds", "out", "dist")
    $foundFiles = @()
    foreach ($outputPath in $outputPaths) {
        if (Test-Path $outputPath) {
            $files = Get-ChildItem -Path $outputPath -Recurse | Where-Object { $_.Extension -in @('.exe', '.zip', '.msi', '.nupkg', '.AppImage') }
            $foundFiles += $files
        }
    }
    
    if ($foundFiles.Count -gt 0) {
        Write-ColorText "`n📊 Fichiers générés:" $Yellow
        foreach ($file in $foundFiles) {
            $size = [math]::Round($file.Length / 1MB, 2)
            Write-ColorText "   ✓ $($file.Name) ($size MB)" $Green
            Write-ColorText "     $($file.FullName)" $Gray
        }

        Write-ColorText "`n📊 Analyse de taille finale:" $Cyan
        foreach ($file in $foundFiles) {
            $sizeMB = [math]::Round($file.Length / 1MB, 2)
            $color = if ($sizeMB -gt 100) { $Red } elseif ($sizeMB -gt 50) { $Yellow } else { $Green }
            Write-ColorText "   $($file.Name): $sizeMB MB" $color
            if ($sizeMB -gt 80) {
                Write-ColorText "   ⚠️ Taille encore élevée. Vérifiez l'inclusion des dépendances." $Yellow
            }
        }
        
        # Test de l'exécutable
        $mainExe = $foundFiles | Where-Object { $_.Extension -eq '.exe' -and $_.Name -like '*Indi-Suivi*' } | Select-Object -First 1
        if ($mainExe) {
            Write-ColorText "`n🧪 Test de l'exécutable..." $Yellow
            try {
                # Test avec timeout géré manuellement
                $job = Start-Job -ScriptBlock { 
                    param($exePath)
                    & $exePath --version
                } -ArgumentList $mainExe.FullName

                if (Wait-Job $job -Timeout 10) {
                    $result = Receive-Job $job
                    Remove-Job $job
                    Write-ColorText "   ✓ L'exécutable semble fonctionnel" $Green
                } else {
                    Stop-Job $job
                    Remove-Job $job
                    Write-ColorText "   ⚠️ Test de l'exécutable: timeout après 10 secondes" $Yellow
                }
            } catch {
                Write-ColorText "   ⚠️ Impossible de tester l'exécutable automatiquement (erreur: $($_.Exception.Message))" $Yellow
            }
        }
    } else {
        Write-ColorText "`n⚠️ Aucun fichier exécutable trouvé dans les dossiers de sortie!" $Yellow
    }
    
} catch {
    Write-ColorText "`n❌ Erreur: $_" $Red
    Write-ColorText "Stack trace:" $Red
    Write-ColorText $_.ScriptStackTrace $Gray
    Write-ColorText "`n🔧 Suggestions de dépannage:" $Yellow
    Write-ColorText "1. Essayez: .\build-app-improved.ps1 -UseForge" $Gray
    Write-ColorText "2. Ou bien: .\build-app-improved.ps1 -UsePackager" $Gray
    Write-ColorText "3. Ou encore: .\build-app-improved.ps1 -InstallDeps -Clean" $Gray
    Write-ColorText "4. Ou encore: .\build-app-improved.ps1 -SkipNativeDeps" $Gray
    Write-ColorText "5. Vérifiez que src/main.js n'a pas d'erreurs de syntaxe" $Gray
    exit 1
} finally {
    Pop-Location
    Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
}

Write-ColorText "`n✨ Script terminé!" $Green
Write-ColorText "💡 Utilisez -SkipNativeDeps si les modules natifs posent problème" $Cyan
