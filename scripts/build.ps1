# Script de build ultra-robuste pour Indi-Suivi - Version amelioree avec UPX optimise

param(
    [switch]$Clean,
    [switch]$InstallDeps,
    [switch]$Verbose,
    [switch]$UseForge,
    [switch]$UsePackager,
    [switch]$SkipNativeDeps,
    [switch]$SkipUPX,
    [int]$UPXLevel = 9,
    [switch]$DownloadElectronLocally,
    [switch]$DownloadTools,
    [switch]$ForcePrebuilt  # Enforce using prebuilt binaries
)

function Write-ColorText {
    param(
        [string]$Text,
        [string]$Color = "White"
    )
    Write-Host $Text -ForegroundColor $Color
}

function Test-Command {
    param(
        [string]$Command
    )
    (Get-Command $Command -CommandType Application -ErrorAction SilentlyContinue) -ne $null
}

# Configure w64devkit for native module builds
function Set-W64DevKitEnvironment {
    Write-ColorText "🔧 Configuration de w64devkit..." $Cyan
    $w64devkitPath = "D:\tools\w64devkit\bin"
    if (-not (Test-Path $w64devkitPath)) {
        Write-ColorText "❌ w64devkit non trouvé dans $w64devkitPath" $Red
        throw "w64devkit requis mais non trouvé"
    }

    $env:CC  = "$w64devkitPath\gcc.exe"
    $env:CXX = "$w64devkitPath\g++.exe"
    $env:AR  = "$w64devkitPath\ar.exe"
    $env:LINK = "$w64devkitPath\g++.exe"
    $env:MAKE = "$w64devkitPath\make.exe"

    $env:npm_config_msvs_version = ""
    $env:GYP_MSVS_VERSION = ""
    $env:npm_config_node_gyp_force_cxx = "$w64devkitPath\g++.exe"
    $env:npm_config_node_gyp_force_cc  = "$w64devkitPath\gcc.exe"

    $env:npm_config_target_platform = "win32"
    $env:npm_config_target_arch = "x64"
    $env:npm_config_runtime = "electron"
    $env:npm_config_target = $electronVersion
    $env:npm_config_disturl = "https://electronjs.org/headers"
    $env:npm_config_cache_min = "0"

    $env:PATH = "$w64devkitPath;$env:PATH"
    Write-ColorText "✅ w64devkit configuré comme compilateur par défaut" $Green
}

function Invoke-W64DevKitRebuild {
    Write-ColorText "🔨 Rebuild avec w64devkit..." $Yellow
    Set-W64DevKitEnvironment
    try {
        $rebuildCmd = "npx electron-rebuild --force --types=prod,dev,optional --module-dir . --which-module better-sqlite3"
        Invoke-Expression $rebuildCmd
        Write-ColorText "✅ Rebuild w64devkit réussi" $Green
    } catch {
        Write-ColorText "❌ Échec rebuild w64devkit: $_" $Red
        throw
    }
}

function Test-W64DevKitConfiguration {
    Write-ColorText "🔍 Vérification de la configuration w64devkit..." $Cyan
    $tools = @("gcc", "g++", "ar", "make")
    $w64devkitPath = "D:\tools\w64devkit\bin"
    foreach ($tool in $tools) {
        $toolPath = "$w64devkitPath\$tool.exe"
        if (Test-Path $toolPath) {
            $version = & $toolPath --version 2>$null | Select-Object -First 1
            Write-ColorText "✅ $tool : $version" $Green
        } else {
            Write-ColorText "❌ $tool non trouvé" $Red
            return $false
        }
    }
    return $true
}

function Clear-W64DevKitEnvironment {
    Remove-Item Env:CC -ErrorAction SilentlyContinue
    Remove-Item Env:CXX -ErrorAction SilentlyContinue
    Remove-Item Env:AR -ErrorAction SilentlyContinue
    Remove-Item Env:LINK -ErrorAction SilentlyContinue
    Remove-Item Env:MAKE -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_node_gyp_force_cxx -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_node_gyp_force_cc -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_msvs_version -ErrorAction SilentlyContinue
    Remove-Item Env:GYP_MSVS_VERSION -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_target_platform -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_target_arch -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_runtime -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_target -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_disturl -ErrorAction SilentlyContinue
    Remove-Item Env:npm_config_cache_min -ErrorAction SilentlyContinue
}

$Green = "Green"
$Yellow = "Yellow"
$Red = "Red"
$Cyan = "Cyan"
$Gray = "DarkGray"
$Magenta = "Magenta"
$Blue = "Blue"

Write-ColorText "`n🚀 Démarrage du script de build pour Indi-Suivi..." $Green

if ($DownloadTools) {
    Write-ColorText "`n🛠️ Téléchargement des outils nécessaires..." $Cyan

    # Définir un dossier d'outils dans l'espace utilisateur pour éviter les droits admin
    $toolsPath = Join-Path $env:USERPROFILE "AppData\Local\indi-suivi-tools"

    try {
        # Lancer le script de téléchargement
        $setupScript = Join-Path $PSScriptRoot 'setup-tools.ps1'
        if (Test-Path $setupScript) {
            Write-ColorText "   Lancement de setup-tools.ps1..." $Gray
            & powershell -ExecutionPolicy Bypass -File $setupScript -ToolsDir $toolsPath

            # Ajouter les outils au PATH de cette session
            $upxPath = Join-Path $toolsPath "upx"
            $sevenPath = Join-Path $toolsPath "7zip"

            if (Test-Path $upxPath) {
                $env:PATH = "$upxPath;$env:PATH"
                Write-ColorText "   ✅ UPX ajouté au PATH pour cette session" $Green
            }

            if (Test-Path $sevenPath) {
                $env:PATH = "$sevenPath;$env:PATH"
                Write-ColorText "   ✅ 7-Zip ajouté au PATH pour cette session" $Green
            }

        } else {
            Write-ColorText "   ❌ Script setup-tools.ps1 introuvable" $Red
            Write-ColorText "   Téléchargement manuel requis depuis: https://github.com/upx/upx/releases" $Yellow
        }
    } catch {
        Write-ColorText "   ❌ Erreur lors du téléchargement des outils: $($_.Exception.Message)" $Red
        Write-ColorText "   Vous pouvez continuer sans UPX (compression désactivée)" $Yellow
    }
}

trap {
    Write-ColorText "`n❌ Une erreur inattendue s'est produite: $_" $Red
    Write-ColorText "Stack trace:" $Red
    Write-ColorText $_.ScriptStackTrace $Gray
    Write-ColorText "`n🔧 Suggestions de dépannage:" $Yellow
    Write-ColorText "1. Essayez: .\\build.ps1 -UseForge" $Gray
    Write-ColorText "2. Ou bien: .\\build.ps1 -UsePackager" $Gray
    Write-ColorText "3. Ou encore: .\\build.ps1 -InstallDeps -Clean" $Gray
    Write-ColorText "4. Ou encore: .\\build.ps1 -SkipNativeDeps" $Gray
    Write-ColorText "5. Vérifiez que src/main.js n'a pas d'erreurs" $Gray
    exit 1
}

# Débloquer les scripts pour éviter les messages d'avertissement
Get-ChildItem "./scripts" -Recurse | Unblock-File

Write-ColorText "`n🧹 Arrêt des processus Electron/Node résiduels..." $Yellow
Get-Process -Name "electron*", "node*" -ErrorAction SilentlyContinue | Stop-Process -Force
Write-ColorText "   Processus arrêtés." $Green

Write-ColorText "`n🧹 Nettoyage du cache npm..." $Yellow
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
npm cache clean --force
Write-ColorText "   Cache npm nettoyé." $Green

Write-ColorText "`n🗑️ Nettoyage des dossiers de build et cache Node.js..." $Yellow
Remove-Item -Path "node_modules", "dist", "out", ".vite", "release-builds" -Recurse -Force -ErrorAction SilentlyContinue
$nodeCacheDirs = @(
    "$env:APPDATA\npm-cache",
    "$env:LOCALAPPDATA\npm-cache"
)
foreach ($cacheDir in $nodeCacheDirs) {
    if (Test-Path $cacheDir) {
        Remove-Item -Path $cacheDir -Recurse -Force -ErrorAction SilentlyContinue
    }
}
Write-ColorText "   Dossiers et caches nettoyés." $Green

if (-not $PSBoundParameters.ContainsKey('Clean')) { $Clean = $true }
if (-not $PSBoundParameters.ContainsKey('InstallDeps')) { $InstallDeps = $false }
if (-not $PSBoundParameters.ContainsKey('Verbose')) { $Verbose = $false }
if (-not $PSBoundParameters.ContainsKey('ForcePrebuilt')) { $ForcePrebuilt = $false }
if ($ForcePrebuilt -and -not $PSBoundParameters.ContainsKey('Clean')) { $Clean = $true }

$electronVersion = "36.3.2"
$electronArch = "x64"
$electronPlatform = "win32"
$sqliteVersion = "11.10.0"
$electronZipFileName = "electron-v$electronVersion-$electronPlatform-$electronArch.zip"
$electronDownloadUrl = "https://github.com/electron/electron/releases/download/v$electronVersion/$electronZipFileName"
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
        $env:npm_config_target_platform = $electronPlatform
        $env:npm_config_target_arch = $electronArch
        $env:npm_config_runtime = "electron"
        $env:npm_config_target = $electronVersion

        $env:NODE_TLS_REJECT_UNAUTHORIZED = "0"
        npm config set strict-ssl false

        npm config set proxy http://wyera:Tarace123!@proxy.ge-admin.ad.etat-ge.ch:3128
        npm config set https-proxy http://wyera:Tarace123!@proxy.ge-admin.ad.etat-ge.ch:3128
        # Correction du chemin du certificat proxy
        npm config set cafile "D:\projets\MyPowerEnv\Certificates\proxy-ca.pem"

        Write-ColorText "   📦 Installation npm avec binaires précompilés..." $Green
        npm install --no-optional --ignore-scripts --prefer-offline

        Write-ColorText "   🔧 Installation better-sqlite3 avec binaire précompilé..." $Yellow
        npm install better-sqlite3@11.10.0 --build-from-source=false --fallback-to-build=false

        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ⚠️ Tentative avec registry alternatif..." $Yellow
            npm install better-sqlite3@11.10.0 --registry=https://registry.npmmirror.com/ --build-from-source=false
        }

        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   🛠️ Téléchargement manuel des binaires..." $Magenta

            $sqliteNodeUrl = "https://npmmirror.com/mirrors/better-sqlite3/v$sqliteVersion/better-sqlite3-v$sqliteVersion-electron-v$($electronVersion.Split('.')[0])-$electronPlatform-$electronArch.tar.gz"
            $sqliteDestDir = "node_modules\better-sqlite3\build\Release"

            if (-not (Test-Path $sqliteDestDir)) {
                New-Item -Path $sqliteDestDir -ItemType Directory -Force | Out-Null
            }

            try {
                $tempFile = "$env:TEMP\better-sqlite3-binary.tar.gz"
                Invoke-WebRequest -Uri $sqliteNodeUrl -OutFile $tempFile -Headers @{"User-Agent"="npm/install"}

                if (Get-Command "7z" -ErrorAction SilentlyContinue) {
                    7z x $tempFile -o"$env:TEMP\sqlite3-extract\"
                    Copy-Item "$env:TEMP\sqlite3-extract\*\better_sqlite3.node" $sqliteDestDir -Force
                } else {
                    Write-ColorText "   ⚠️ 7zip non trouvé, extraction impossible" $Yellow
                }

                Remove-Item $tempFile -Force -ErrorAction SilentlyContinue
                Write-ColorText "   ✅ Binaires téléchargés manuellement" $Green
            } catch {
                Write-ColorText "   ❌ Échec téléchargement manuel: $_" $Red
            }
        }

        Write-ColorText "   🔍 Vérification des modules natifs..." $Cyan
        node scripts/check-native-modules.js

        Remove-Item Env:npm_config_build_from_source -ErrorAction SilentlyContinue
        Remove-Item Env:npm_config_node_gyp -ErrorAction SilentlyContinue
        Remove-Item Env:ELECTRON_SKIP_BINARY_DOWNLOAD -ErrorAction SilentlyContinue
        Remove-Item Env:npm_config_cache_min -ErrorAction SilentlyContinue
        Remove-Item Env:npm_config_shrinkwrap -ErrorAction SilentlyContinue
        Remove-Item Env:npm_config_better_sqlite3_binary_host_mirror -ErrorAction SilentlyContinue
        Remove-Item Env:better_sqlite3_binary_host_mirror -ErrorAction SilentlyContinue
        Remove-Item Env:npm_config_target_platform -ErrorAction SilentlyContinue
        Remove-Item Env:npm_config_target_arch -ErrorAction SilentlyContinue
        Remove-Item Env:npm_config_runtime -ErrorAction SilentlyContinue
        Remove-Item Env:npm_config_target -ErrorAction SilentlyContinue

        if ($LASTEXITCODE -eq 0 -and $DownloadElectronLocally) {
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

        $viteCmd = Join-Path $projectRoot "node_modules\.bin\vite.cmd"
        if (-not (Test-Path $viteCmd)) {
            Write-ColorText "   📦 Installation de Vite..." $Yellow
            npm install vite --save-dev
        }

        Write-ColorText "   Installation des dépendances terminée." $Green
    } else {
        Write-ColorText "`n📦 Installation des dépendances npm..." $Cyan

        if ($DownloadElectronLocally) {
            Write-ColorText "   Utilisation du cache Electron local pour éviter le téléchargement..." $Gray
        }

        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ❌ npm install a échoué - tentative avec ELECTRON_SKIP_BINARY_DOWNLOAD..." $Yellow
            $env:ELECTRON_SKIP_BINARY_DOWNLOAD = "1"
            npm install

            if ($LASTEXITCODE -eq 0 -and $DownloadElectronLocally) {
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

        $electronExePath = Join-Path $electronLocalDownloadDir "electron.exe"
        if (-not (Test-Path $electronExePath)) {
            Write-ColorText "   ❌ electron.exe non trouvé dans $electronLocalDownloadDir" $Red
            throw "electron.exe manquant dans $electronLocalDownloadDir"
        }

        npx electron-builder --win --config.electronDist="$electronLocalDownloadDir"
        # Option alternative :
        # $env:ELECTRON_SKIP_BINARY_DOWNLOAD = "1"
        # npx electron-builder --win
        # Remove-Item Env:ELECTRON_SKIP_BINARY_DOWNLOAD -ErrorAction SilentlyContinue
    } else {
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
        Write-ColorText "   Ou téléchargez depuis: https://github.com/upx/upx/releases" $Yellow
        Write-ColorText "   Saut de l'étape de compression UPX." $Yellow
    } else {
        $outputFolders = @("dist", "out", "release-builds")
        $foundExe = $false

        foreach ($folder in $outputFolders) {
            if (Test-Path $folder) {
                $exeFiles = Get-ChildItem -Path $folder -Recurse -Include "*.exe" -ErrorAction SilentlyContinue
                if ($exeFiles.Count -gt 0) {
                    $foundExe = $true
                    foreach ($exe in $exeFiles) {
                        Write-ColorText "      Compression de $($exe.FullName)..." $Gray
                        try {
                            # Utiliser la commande UPX appropriée
                            if ($upxCommand -eq "upx") {
                                upx --best -$UPXLevel --force "$($exe.FullName)"
                            } else {
                                & cmd /c "$upxCommand --best -$UPXLevel --force `"$($exe.FullName)`""
                            }
                            if ($LASTEXITCODE -eq 0) {
                                Write-ColorText "      ✅ Compressé avec succès" $Green
                            }
                        } catch {
                            Write-ColorText "      ⚠️ Erreur de compression: $($_.Exception.Message)" $Yellow
                        }
                    }
                }
            }
        }

        if ($foundExe) {
            Write-ColorText "   Compression UPX terminée." $Green
        } else {
            Write-ColorText "   ⚠️ Aucun exécutable trouvé à compresser." $Yellow
        }
    }
}

Write-ColorText "`n📊 Vérification des exécutables générés..." $Cyan
$outputFolders = @("dist", "out", "release-builds")
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
