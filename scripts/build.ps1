param(
    [switch]$DownloadAllDeps,
    [switch]$DownloadElectronLocally,
    [switch]$InstallDeps,
    [switch]$UltraOptimize,
    [switch]$EnableStreaming,
    [int]$UPXLevel = 9,
    [switch]$SkipUPX,
    [switch]$SkipNativeDeps,
    [switch]$ForcePrebuilt,
    [switch]$UseForge,
    [switch]$UsePackager,
    [switch]$DownloadTools
)

# Couleurs pour la sortie
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"
$Blue = "Blue"
$Gray = "Gray"

function Write-ColorText {
    param([string]$Text, [string]$Color = "White")
    Write-Host $Text -ForegroundColor $Color
}

function Test-Command {
    param([string]$Command)
    try {
        Get-Command $Command -ErrorAction Stop
        return $true
    } catch {
        return $false
    }
}

function Test-W64DevKitConfiguration {
    $w64devkitPath = $env:W64DEVKIT_HOME
    if (-not $w64devkitPath) {
        $w64devkitPath = Join-Path $env:USERPROFILE "w64devkit"
    }
    
    if (-not (Test-Path $w64devkitPath)) {
        return $false
    }
    
    $gccPath = Join-Path $w64devkitPath "bin\gcc.exe"
    return (Test-Path $gccPath)
}

function Set-W64DevKitEnvironment {
    $w64devkitPath = $env:W64DEVKIT_HOME
    if (-not $w64devkitPath) {
        $w64devkitPath = Join-Path $env:USERPROFILE "w64devkit"
    }
    
    $binPath = Join-Path $w64devkitPath "bin"
    $env:PATH = "$binPath;" + $env:PATH
    $env:CC = "gcc"
    $env:CXX = "g++"
    $env:AR = "ar"
    $env:MAKE = "make"
    
    Write-ColorText "🔍 Vérification de la configuration w64devkit..." $Cyan
    
    if (Test-Command "gcc") {
        $gccVersion = & gcc --version 2>$null | Select-Object -First 1
        Write-ColorText "✅ gcc : $gccVersion" $Green
    } else {
        throw "gcc non trouvé dans le PATH"
    }
    
    if (Test-Command "g++") {
        $gppVersion = & g++ --version 2>$null | Select-Object -First 1
        Write-ColorText "✅ g++ : $gppVersion" $Green
    }
    
    if (Test-Command "ar") {
        $arVersion = & ar --version 2>$null | Select-Object -First 1
        Write-ColorText "✅ ar : $arVersion" $Green
    }
    
    if (Test-Command "make") {
        $makeVersion = & make --version 2>$null | Select-Object -First 1
        Write-ColorText "✅ make : $makeVersion" $Green
    }
    
    Write-ColorText "🔧 Configuration de w64devkit..." $Cyan
    Write-ColorText "✅ w64devkit configuré comme compilateur par défaut" $Green
}

function Clear-W64DevKitEnvironment {
    Remove-Item Env:CC -ErrorAction SilentlyContinue
    Remove-Item Env:CXX -ErrorAction SilentlyContinue
    Remove-Item Env:AR -ErrorAction SilentlyContinue
    Remove-Item Env:MAKE -ErrorAction SilentlyContinue
}

function Invoke-W64DevKitRebuild {
    Write-ColorText "🔨 Rebuild avec w64devkit..." $Cyan
    Set-W64DevKitEnvironment
    
    try {
        npx electron-rebuild --force
        if ($LASTEXITCODE -eq 0) {
            Write-ColorText "✅ Rebuild w64devkit réussi" $Green
        } else {
            throw "Échec du rebuild w64devkit"
        }
    } catch {
        Write-ColorText "❌ Erreur lors du rebuild w64devkit: $_" $Red
        throw
    }
}

Write-ColorText "`n🚀 Démarrage du script de build pour Indi-Suivi..." $Cyan

# Arrêt des processus résiduels
Write-ColorText "`n🧹 Arrêt des processus Electron/Node résiduels..." $Yellow
Get-Process -Name "electron", "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Write-ColorText "   Processus arrêtés." $Green

# Nettoyage cache npm
Write-ColorText "`n🧹 Nettoyage du cache npm..." $Yellow
npm cache clean --force
Write-ColorText "   Cache npm nettoyé." $Green

# Nettoyage des dossiers
Write-ColorText "`n🗑️ Nettoyage des dossiers de build et cache Node.js..." $Yellow
$foldersToClean = @("release-builds", "out", "dist", ".vite", "build", ".webpack", "node_modules\.cache")
foreach ($folder in $foldersToClean) {
    if (Test-Path $folder) {
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-ColorText "   Dossiers et caches nettoyés." $Green

# Configuration des versions Electron
$electronVersion = "36.3.2"
$electronPlatform = "win32"
$electronArch = "x64"
$electronZipFileName = "electron-v$electronVersion-$electronPlatform-$electronArch.zip"
$electronDownloadUrl = "https://github.com/electron/electron/releases/download/v$electronVersion/$electronZipFileName"

# Chemins
$electronLocalDownloadDir = Join-Path $PSScriptRoot "electron-local-temp"
$projectRoot = Split-Path -Parent $PSScriptRoot
$electronCacheDir = Join-Path $env:LOCALAPPDATA "electron\Cache"
$electronTargetDistPath = Join-Path $projectRoot "node_modules\electron\dist"

if ($DownloadElectronLocally) {
    Write-ColorText "`n⬇️ Téléchargement local d'Electron $electronVersion pour $electronPlatform-$electronArch..." $Cyan

    if (Test-Path $electronLocalDownloadDir) {
        Remove-Item -Path $electronLocalDownloadDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -Path $electronLocalDownloadDir -ItemType Directory | Out-Null

    $downloadedFilePath = Join-Path $electronLocalDownloadDir $electronZipFileName
    Write-ColorText "   Téléchargement de $electronDownloadUrl vers $downloadedFilePath" $Gray
    try {
        Invoke-WebRequest -Uri $electronDownloadUrl -OutFile $downloadedFilePath -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"}
        Write-ColorText "   Téléchargement terminé." $Green
    } catch {
        Write-ColorText "   ❌ Échec du téléchargement: $_" $Red
        throw "Impossible de télécharger Electron $electronVersion"
    }

    Write-ColorText "   Extraction de $downloadedFilePath vers $electronLocalDownloadDir" $Gray
    try {
        Expand-Archive -Path $downloadedFilePath -DestinationPath $electronLocalDownloadDir -Force

        # Les archives Electron contiennent généralement un sous-dossier.
        # Rechercher electron.exe dans l'arborescence extraite et remonter
        $exePath = Get-ChildItem -Path $electronLocalDownloadDir -Recurse -Filter "electron.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($exePath) {
            if ($exePath.Directory.FullName -ne $electronLocalDownloadDir) {
                Move-Item -Path (Join-Path $exePath.Directory.FullName '*') -Destination $electronLocalDownloadDir -Force
                Remove-Item -Path $exePath.Directory.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
            Write-ColorText "   Extraction terminée - electron.exe trouvé." $Green
        } else {
            throw "electron.exe non trouvé après extraction"
        }
    } catch {
        Write-ColorText "   ❌ Échec de l'extraction: $_" $Red
        throw "Impossible d'extraire Electron"
    }

    # S'assurer que l'archive ZIP reste disponible pour electron-builder
    $electronZipPath = Join-Path $electronLocalDownloadDir $electronZipFileName
    if (-not (Test-Path $electronZipPath) -and (Test-Path $downloadedFilePath)) {
        Copy-Item -Path $downloadedFilePath -Destination $electronZipPath -Force
    }

    Write-ColorText "`n📋 Préparation du cache Electron local..." $Cyan
    $cacheKey = "httpsgithub.comelectronelectronreleasesdownloadv$electronVersion$electronZipFileName"
    $targetCacheDir = Join-Path $electronCacheDir $cacheKey

    if (-not (Test-Path $electronCacheDir)) {
        New-Item -Path $electronCacheDir -ItemType Directory -Force | Out-Null
    }
    if (-not (Test-Path $targetCacheDir)) {
        New-Item -Path $targetCacheDir -ItemType Directory -Force | Out-Null
    }

    Copy-Item -Path $downloadedFilePath -Destination (Join-Path $targetCacheDir $electronZipFileName) -Force
    Write-ColorText "   Archive copiée dans le cache Electron." $Green

    $env:ELECTRON_CACHE = $electronCacheDir
    $env:electron_config_cache = $electronCacheDir
    Write-ColorText "   Variables de cache configurées." $Gray
}

if ($InstallDeps -or $DownloadElectronLocally) {
    if (-not (Test-W64DevKitConfiguration)) {
        throw "w64devkit non configuré correctement"
    }
    Set-W64DevKitEnvironment
    
    if ($ForcePrebuilt) {
        Write-ColorText "`n🔧 Installation des dépendances avec binaires précompilés..." $Green

        if ($DownloadElectronLocally) {
            Write-ColorText "   Utilisation du cache Electron local pour éviter le téléchargement..." $Gray
        }

        Write-ColorText "   🔒 Mode binaires précompilés forcé" $Yellow
        Write-ColorText "   ⚙️ Configuration npm pour binaires précompilés..." $Cyan
        $env:npm_config_build_from_source = "false"
        $env:npm_config_node_gyp = ""
        $env:ELECTRON_SKIP_BINARY_DOWNLOAD = "1"
        $env:npm_config_cache_min = "999999999"
        $env:npm_config_shrinkwrap = "false"
        $env:npm_config_better_sqlite3_binary_host_mirror = "https://npmmirror.com/mirrors/better-sqlite3/"
        $env:better_sqlite3_binary_host_mirror = "https://npmmirror.com/mirrors/better-sqlite3/"
        $env:npm_config_sqlite3_binary_host_mirror = "https://registry.npmmirror.com/-/binary/sqlite3/"
        $env:sqlite3_binary_host_mirror = "https://registry.npmmirror.com/-/binary/sqlite3/"

        try {
            Write-ColorText "`n📦 Installation des dépendances npm..." $Cyan
            npm install --no-audit --prefer-offline
            if ($LASTEXITCODE -ne 0) {
                Write-ColorText "   ❌ npm install a échoué - tentative avec ELECTRON_SKIP_BINARY_DOWNLOAD..." $Yellow
                $env:ELECTRON_SKIP_BINARY_DOWNLOAD = "1"
                npm install --no-audit
                if ($LASTEXITCODE -ne 0) {
                    throw "Installation des dépendances npm échouée"
                }
            }

            if ($DownloadElectronLocally) {
                Write-ColorText "`n📋 Copie manuelle des fichiers Electron..." $Cyan
                
                if (-not (Test-Path $electronTargetDistPath)) {
                    New-Item -Path $electronTargetDistPath -ItemType Directory -Force | Out-Null
                } else {
                    Remove-Item -Path $electronTargetDistPath -Recurse -Force -ErrorAction SilentlyContinue
                    New-Item -Path $electronTargetDistPath -ItemType Directory -Force | Out-Null
                }

                $filesToCopy = Get-ChildItem -Path $electronLocalDownloadDir -Exclude "*.zip"
                foreach ($file in $filesToCopy) {
                    Copy-Item -Path $file.FullName -Destination $electronTargetDistPath -Recurse -Force
                }
                Write-ColorText "   Copie manuelle terminée." $Green
            }

            Remove-Item Env:ELECTRON_SKIP_BINARY_DOWNLOAD -ErrorAction SilentlyContinue
        } catch {
            Write-ColorText "   ❌ Erreur lors de l'installation: $_" $Red
            throw
        }

        $viteCmd = Join-Path $projectRoot "node_modules\.bin\vite.cmd"
        if (-not (Test-Path $viteCmd)) {
            Write-ColorText "   📦 Installation de Vite..." $Yellow
            npm install vite --save-dev
        }

        Write-ColorText "   Installation des dépendances terminée." $Green
    }
}

if ($InstallDeps -and -not $SkipNativeDeps -and -not $ForcePrebuilt) {
    Write-ColorText "`n🛠️ Reconstruction des modules natifs pour Electron..." $Cyan
    if (-not (Test-Path "node_modules\@electron\rebuild")) {
        npm install @electron/rebuild --save-dev --no-audit
    }
    Invoke-W64DevKitRebuild
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "   ❌ Reconstruction des dépendances natives échouée" $Red
        exit 1
    }
    Write-ColorText "   Reconstruction des modules natifs terminée." $Green
} elseif ($ForcePrebuilt) {
    Write-ColorText "⏭️ Reconstruction évitée (binaires précompilés)" $Yellow
}

Write-ColorText "`n🏗️ Lancement du processus de build principal..." $Cyan
if ($UseForge) {
    Write-ColorText "   Utilisation d'Electron Forge." $Blue
    npm run dist:forge
    Write-ColorText "   Build Electron Forge terminé." $Green
} elseif ($UsePackager) {
    Write-ColorText "   Utilisation d'Electron Packager." $Blue
    npm run dist:packager
    Write-ColorText "   Build Electron Packager terminé." $Green
} else {
    Write-ColorText "   Lancement du build complet (Vite + Electron)." $Blue
    npm run build
    Write-ColorText "   Build Vite terminé." $Green
    
    if ($DownloadElectronLocally) {
        Write-ColorText "   Build Electron avec binaire local." $Blue
        Write-ColorText "   Utilisation du répertoire Electron local..." $Gray
        
        # Vérifier que le répertoire et electron.exe existent
        $electronExePath = Join-Path $electronLocalDownloadDir "electron.exe"
        if (-not (Test-Path $electronExePath)) {
            Write-ColorText "   ❌ electron.exe non trouvé dans $electronLocalDownloadDir" $Red
            Write-ColorText "   Contenu du répertoire:" $Yellow
            if (Test-Path $electronLocalDownloadDir) {
                Get-ChildItem -Path $electronLocalDownloadDir -ErrorAction SilentlyContinue | ForEach-Object {
                    Write-ColorText "     - $($_.Name)" $Gray
                }
            }
            throw "electron.exe manquant dans le répertoire local"
        }
        
        # Appeler electron-builder directement avec le répertoire local
        npx electron-builder --win --config.electronDist="$electronLocalDownloadDir"
        
    } else {
        # Seulement si pas de téléchargement local
        npm run dist
    }
    Write-ColorText "   Build Electron terminé." $Green
}

if (-not $SkipUPX) {
    Write-ColorText "`n⚡ Compression des exécutables avec UPX (niveau $UPXLevel)..." $Cyan

    # Vérifier UPX dans PATH ou dans le dossier d'outils local
    $upxFound = $false
    $upxCommand = "upx"

    if (Test-Command "upx") {
        $upxFound = $true
        Write-ColorText "   ✅ UPX trouvé dans le PATH système" $Green
    } else {
        # Chercher dans le dossier d'outils local
        $localUpx = Join-Path $env:USERPROFILE "AppData\Local\indi-suivi-tools\upx\upx.exe"
        if (Test-Path $localUpx) {
            $upxFound = $true
            $upxCommand = "`"$localUpx`""
            Write-ColorText "   ✅ UPX trouvé localement: $localUpx" $Green
        }
    }

    if (-not $upxFound) {
        Write-ColorText "   ⚠️ UPX non trouvé. Utilisez -DownloadTools pour l'installer automatiquement." $Yellow
        Write-ColorText "   Ou téléchargez depuis: https://github.com/upx/upx/releases" $Gray
        Write-ColorText "   Saut de l'étape de compression UPX." $Yellow
    } else {
        $outputFolders = @("release-builds", "out", "dist")
        $compressedCount = 0
        
        foreach ($folder in $outputFolders) {
            if (Test-Path $folder) {
                $exeFiles = Get-ChildItem -Path $folder -Recurse -Include "*.exe" -ErrorAction SilentlyContinue
                foreach ($exe in $exeFiles) {
                    try {
                        Write-ColorText "   Compression de $($exe.Name)..." $Gray
                        & $upxCommand --ultra-brute --lzma -$UPXLevel $exe.FullName
                        if ($LASTEXITCODE -eq 0) {
                            $compressedCount++
                            Write-ColorText "   ✅ $($exe.Name) compressé avec succès" $Green
                        }
                    } catch {
                        Write-ColorText "   ⚠️ Échec de compression pour $($exe.Name): $_" $Yellow
                    }
                }
            }
        }
        
        if ($compressedCount -gt 0) {
            Write-ColorText "   ✅ $compressedCount fichier(s) compressé(s) avec UPX" $Green
        } else {
            Write-ColorText "   ⚠️ Aucun fichier exécutable trouvé à compresser" $Yellow
        }
    }
}

Write-ColorText "`n📊 Vérification des exécutables générés..." $Cyan

$outputFolders = @("release-builds", "out", "dist")
$foundFiles = @()
foreach ($folder in $outputFolders) {
    if (Test-Path $folder) {
        $foundFiles += Get-ChildItem -Path $folder -Recurse -Include "*.exe" -ErrorAction SilentlyContinue
    }
}

if ($foundFiles.Count -gt 0) {
    Write-ColorText "   Fichiers exécutables trouvés:" $Green
    foreach ($file in $foundFiles) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-ColorText "   - $($file.Name) ($sizeMB MB)" $Gray
        if ($sizeMB -gt 80) {
            Write-ColorText "   ⚠️ Taille encore élevée. Vérifiez l'inclusion des dépendances." $Yellow
        }
    }

    $mainExe = $foundFiles | Where-Object { $_.Extension -eq '.exe' -and $_.Name -like '*Indi-Suivi*' } | Select-Object -First 1
    if ($mainExe) {
        Write-ColorText "`nℹ️ Exécutable généré: $($mainExe.FullName)" $Green
        Write-ColorText "   Lancez-le manuellement pour le tester." $Cyan
    }
} else {
    Write-ColorText "`n⚠️ Aucun fichier exécutable trouvé dans les dossiers de sortie!" $Yellow
}

# Nettoyage final (uniquement si utilisation d'Electron local)
if ($DownloadElectronLocally) {
    Write-ColorText "`n🧹 Nettoyage final..." $Yellow
    Remove-Item Env:ELECTRON_CACHE -ErrorAction SilentlyContinue
    Remove-Item Env:electron_config_cache -ErrorAction SilentlyContinue
    Remove-Item Env:ELECTRON_SKIP_BINARY_DOWNLOAD -ErrorAction SilentlyContinue
    # Garder $electronLocalDownloadDir pour debug. Décommentez pour le supprimer.
    # if (Test-Path $electronLocalDownloadDir) {
    #     Remove-Item -Path $electronLocalDownloadDir -Recurse -Force -ErrorAction SilentlyContinue
    # }
    Write-ColorText "   Nettoyage final terminé." $Green
}

Clear-W64DevKitEnvironment

Write-ColorText "`n✅ Script de build terminé avec succès!" $Green