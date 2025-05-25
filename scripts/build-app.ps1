# Script de build corrigé pour Indi-Suivi
param(
    [switch]$Clean = $true,
    [switch]$InstallDeps = $false,
    [switch]$Verbose = $false
)

# Obtenir le répertoire racine du projet
$projectRoot = Split-Path -Parent $PSScriptRoot
Write-Host "🚀 Répertoire du projet: $projectRoot" -ForegroundColor Cyan

# Se déplacer dans le répertoire racine
Push-Location $projectRoot

try {
    # Étape 1: Nettoyage
    if ($Clean) {
        Write-Host "`n🤞 Nettoyage complet..." -ForegroundColor Yellow
        
        # Arrêter tous les processus Node/Electron
        Get-Process node, electron* -ErrorAction SilentlyContinue | Stop-Process -Force
        Start-Sleep -Seconds 1
        
        # Supprimer tous les dossiers de build
        @("out", "dist", ".vite", "release-builds", "build") | ForEach-Object {
            if (Test-Path $_) {
                Remove-Item -Path $_ -Recurse -Force -ErrorAction SilentlyContinue
                Write-Host "   ✓ Supprimé: $_" -ForegroundColor Gray
            }
        }
        
        # Supprimer les fichiers générés
        @("*.exe", "*.zip", "*.AppImage", "*.dmg", "*.deb", "*.rpm") | ForEach-Object {
            Get-ChildItem -Path . -Filter $_ -Recurse -ErrorAction SilentlyContinue | Remove-Item -Force
        }
        
        Write-Host "✅ Nettoyage terminé" -ForegroundColor Green
    }
    
    # Étape 2: Installation des dépendances si demandé
    if ($InstallDeps -or -not (Test-Path "node_modules")) {
        Write-Host "`n📦 Installation des dépendances..." -ForegroundColor Yellow
        
        # Nettoyer node_modules si demandé
        if ($InstallDeps -and (Test-Path "node_modules")) {
            Write-Host "   🗑️ Suppression de node_modules..." -ForegroundColor Yellow
            Remove-Item -Path "node_modules" -Recurse -Force
        }
        
        # Nettoyer le cache npm
        npm cache clean --force
        
        # Installer les dépendances
        npm install
        if ($LASTEXITCODE -ne 0) {
            throw "Échec de l'installation des dépendances"
        }
        
        Write-Host "✅ Dépendances installées" -ForegroundColor Green
    }
    
    # Étape 3: Créer les répertoires nécessaires
    Write-Host "`n📁 Création des répertoires..." -ForegroundColor Yellow
    @(".vite", ".vite/build", "dist") | ForEach-Object {
        if (-not (Test-Path $_)) {
            New-Item -ItemType Directory -Path $_ -Force | Out-Null
            Write-Host "   ✓ Créé: $_" -ForegroundColor Gray
        }
    }
    
    # Étape 4: Build Vite
    Write-Host "`n🛠️ Build des fichiers..." -ForegroundColor Yellow
    
    # Build main.js
    Write-Host "   📝 Build main.js..." -ForegroundColor Gray
    npx vite build --config vite.main.config.ts
    if ($LASTEXITCODE -ne 0) {
        throw "Échec du build main.js"
    }
    
    # Build preload.js
    Write-Host "   📝 Build preload.js..." -ForegroundColor Gray
    npx vite build --config vite.preload.config.ts
    if ($LASTEXITCODE -ne 0) {
        throw "Échec du build preload.js"
    }
    
    # Build renderer (React)
    Write-Host "   📝 Build renderer..." -ForegroundColor Gray
    npx vite build --config vite.config.js
    if ($LASTEXITCODE -ne 0) {
        throw "Échec du build renderer"
    }
    
    # Vérifier que les fichiers sont bien générés
    $requiredFiles = @(
        ".vite/build/main.js",
        ".vite/build/preload.js",
        "dist/index.html"
    )
    
    foreach ($file in $requiredFiles) {
        if (-not (Test-Path $file)) {
            throw "Fichier manquant après build: $file"
        }
        Write-Host "   ✓ Vérifié: $file" -ForegroundColor Green
    }
    
    # Étape 5: Rebuild des modules natifs
    Write-Host "`n🔧 Rebuild des modules natifs..." -ForegroundColor Yellow
    npx electron-rebuild -f -w better-sqlite3
    if ($LASTEXITCODE -ne 0) {
        Write-Host "   ⚠️ Avertissement: rebuild des modules natifs échoué" -ForegroundColor Yellow
    }
    
    # Étape 6: Build Electron
    Write-Host "`n📦 Build de l'exécutable..." -ForegroundColor Yellow
    
    if ($Verbose) {
        $env:DEBUG = "electron-builder"
    }
    
    npx electron-builder --win --publish never
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✅ Build terminé avec succès!" -ForegroundColor Green
        
        # Afficher les fichiers générés
        if (Test-Path "release-builds") {
            Write-Host "`n📊 Fichiers générés:" -ForegroundColor Yellow
            Get-ChildItem -Path "release-builds" -Recurse | Where-Object { 
                $_.Extension -in @('.exe', '.zip', '.msi', '.nupkg') 
            } | ForEach-Object {
                $size = [math]::Round($_.Length / 1MB, 2)
                Write-Host "   ✓ $($_.Name) ($size MB)" -ForegroundColor Green
                Write-Host "     $($_.FullName)" -ForegroundColor Gray
            }
        }
    } else {
        throw "Le build a échoué avec le code de sortie: $LASTEXITCODE"
    }
    
} catch {
    Write-Host "`n❌ Erreur: $_" -ForegroundColor Red
    Write-Host "Stack trace:" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
} finally {
    # Retourner au répertoire d'origine
    Pop-Location
    
    # Nettoyer les variables d'environnement
    Remove-Item Env:DEBUG -ErrorAction SilentlyContinue
}

Write-Host "`n✨ Script terminé!" -ForegroundColor Green
