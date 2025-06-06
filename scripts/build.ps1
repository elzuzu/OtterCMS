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
    return -not ([string]::IsNullOrEmpty((Get-Command $Command -ErrorAction SilentlyContinue)))
}

# --- FONCTION MODIFIÉE ---
# Fonction de vérification améliorée pour w64devkit qui cherche dans plusieurs endroits
function Test-W64DevKitConfiguration {
    $result = [PSCustomObject]@{
        IsValid     = $false
        CheckedPath = ""
        Reason      = ""
    }

    # Liste des chemins à vérifier, la variable d'environnement a la priorité
    $potentialPaths = @()
    if ($env:W64DEVKIT_HOME) {
        $potentialPaths += $env:W64DEVKIT_HOME
    }
    # Ajout des chemins standards et de votre chemin personnalisé
    $potentialPaths += @(
        (Join-Path $env:USERPROFILE "w64devkit"),
        "D:\tools\w64devkit"
    )

    # Dédoublonner la liste
    $uniquePaths = $potentialPaths | Select-Object -Unique

    foreach ($path in $uniquePaths) {
        if (Test-Path $path) {
            $gccPath = Join-Path $path "bin\gcc.exe"
            if (Test-Path $gccPath) {
                # Installation valide trouvée !
                # On définit la variable d'environnement pour cette session afin que les autres fonctions la trouvent
                $env:W64DEVKIT_HOME = $path
                $result.IsValid = $true
                $result.CheckedPath = $path
                $result.Reason = "w64devkit est configure correctement a l'emplacement : $path"
                return $result # On arrête la recherche
            }
        }
    }

    # Si on arrive ici, aucune installation valide n'a été trouvée
    $result.Reason = "Le repertoire w64devkit n'a pas ete trouve dans les emplacements verifies : $($uniquePaths -join ', '). Veuillez l'installer ou definir la variable d'environnement W64DEVKIT_HOME."
    return $result
}


function Set-W64DevKitEnvironment {
    # La fonction de test a déjà validé et défini W64DEVKIT_HOME
    $w64devkitPath = $env:W64DEVKIT_HOME
    if (-not $w64devkitPath) {
        # Sécurité au cas où cette fonction est appelée sans test préalable
        throw "La variable d'environnement W64DEVKIT_HOME n'est pas definie. Le test de configuration a-t-il ete ignore ?"
    }
    
    $binPath = Join-Path $w64devkitPath "bin"
    $env:PATH = "$binPath;" + $env:PATH
    $env:CC = "gcc"
    $env:CXX = "g++"
    $env:AR = "ar"
    $env:MAKE = "make"
    # Variables specifiques pour la compilation de better-sqlite3
    $env:npm_config_node_gyp_force_cc = $env:CC
    $env:npm_config_node_gyp_force_cxx = $env:CXX
    $env:GYP_DEFINES = "target_arch=x64"
    
    Write-ColorText "🔧 Configuration de w64devkit..." $Cyan
    
    if (Test-Command "gcc") {
        $gccVersion = & gcc --version 2>$null | Select-Object -First 1
        Write-ColorText "   gcc : $gccVersion" $Green
    } else {
        throw "gcc non trouve dans le PATH apres configuration"
    }
    
    # ... autres vérifications ...
    
    Write-ColorText "✅ w64devkit configuré comme compilateur par défaut" $Green
}
# --- FIN DES MODIFICATIONS DE FONCTION ---

function Clear-W64DevKitEnvironment {
    Remove-Item Env:CC -ErrorAction SilentlyContinue
    Remove-Item Env:CXX -ErrorAction SilentlyContinue
    Remove-Item Env:AR -ErrorAction SilentlyContinue
    Remove-Item Env:MAKE -ErrorAction SilentlyContinue
}

function Invoke-W64DevKitRebuild {
    Write-ColorText "Rebuild avec w64devkit..." $Cyan
    Set-W64DevKitEnvironment
    
    try {
        npx electron-rebuild --version=36.3.2 --force --only better-sqlite3 --arch x64
        if ($LASTEXITCODE -eq 0) {
        Write-ColorText "Rebuild w64devkit reussi" $Green
        } else {
            throw "Echec du rebuild w64devkit"
        }
    } catch {
        Write-ColorText "   Erreur lors du rebuild w64devkit: $_" $Red
        throw
    }
}

function Test-BetterSqlite3 {
    $sqliteNode = "node_modules\better-sqlite3\build\Release\better_sqlite3.node"

    if (Test-Path $sqliteNode) {
        Write-ColorText "   ✅ better-sqlite3 OK" $Green
        return $true
    }

    Write-ColorText "   ❌ better-sqlite3 manquant - Tentative de réparation..." $Yellow
    Remove-Item -Path "node_modules\better-sqlite3\build" -Recurse -Force -ErrorAction SilentlyContinue

    Set-W64DevKitEnvironment
    $env:npm_config_build_from_source = "true"
    npm rebuild better-sqlite3 --build-from-source

    return (Test-Path $sqliteNode)
}

# Fonction de copie d'Electron corrigée
function Copy-ElectronFiles-Fixed {
    param(
        $SourcePath,
        $TargetPath
    )

    Write-ColorText "Copie manuelle des fichiers Electron..." $Cyan

    $electronDistPath = Join-Path $TargetPath "dist"
    if (-not (Test-Path $electronDistPath)) {
        New-Item -ItemType Directory -Path $electronDistPath -Force | Out-Null
    }

    $sourceFiles = Get-ChildItem -Path $SourcePath -File
    foreach ($file in $sourceFiles) {
        Copy-Item -Path $file.FullName -Destination $electronDistPath -Force
        Write-ColorText "     Copié: $($file.Name)" $Gray
    }

    $sourceDirs = Get-ChildItem -Path $SourcePath -Directory
    foreach ($dir in $sourceDirs) {
        $targetDir = Join-Path $electronDistPath $dir.Name
        Copy-Item -Path $dir.FullName -Destination $targetDir -Recurse -Force
        Write-ColorText "     Copié: $($dir.Name)" $Gray
    }

    $pathFile = Join-Path $TargetPath "path.txt"
    "dist" | Out-File -FilePath $pathFile -Encoding UTF8 -NoNewline

    Write-ColorText "   ✅ Copie réussie avec path.txt" $Green
}

# Vérification des modules natifs dans le build
function Verify-NativeModules-Fixed {
    Write-ColorText "Verification des modules natifs embarques..." $Cyan
    $buildDir = Join-Path $projectRoot "release-builds\win-unpacked"
    $allOk = $true

    $sqlitePaths = @(
        "resources\app.asar.unpacked\node_modules\better-sqlite3\build\Release\better_sqlite3.node",
        "resources\app\node_modules\better-sqlite3\build\Release\better_sqlite3.node",
        "resources\app.asar.unpacked\node_modules\better-sqlite3\lib\binding\better_sqlite3.node"
    )

    $sqliteFound = $false
    foreach ($path in $sqlitePaths) {
        $fullPath = Join-Path $buildDir $path
        if (Test-Path $fullPath) {
            Write-ColorText "   ✅ better-sqlite3 embarqué: $path" $Green
            $sqliteFound = $true
            break
        }
    }

    if (-not $sqliteFound) {
        Write-ColorText "   ❌ better-sqlite3 manquant dans le build" $Red
        $asarUnpacked = Join-Path $buildDir "resources\app.asar.unpacked"
        if (Test-Path $asarUnpacked) {
            Write-ColorText "   📁 app.asar.unpacked existe" $Gray
            $sqliteDir = Join-Path $asarUnpacked "node_modules\better-sqlite3"
            if (Test-Path $sqliteDir) {
                Write-ColorText "   📁 better-sqlite3 dir existe" $Gray
                Get-ChildItem -Path $sqliteDir -Recurse -Name "*.node" | ForEach-Object {
                    Write-ColorText "   🔍 Trouvé: $_" $Gray
                }
            } else {
                Write-ColorText "   ❌ Dossier better-sqlite3 manquant" $Red
            }
        }
        $allOk = $false
    }

    $oracleFound = $false
    $oraclePaths = @(
        "resources\app.asar.unpacked\node_modules\oracledb\package.json",
        "resources\app\node_modules\oracledb\package.json"
    )
    foreach ($path in $oraclePaths) {
        $fullPath = Join-Path $buildDir $path
        if (Test-Path $fullPath) {
            Write-ColorText "   ✅ OracleDB embarqué (mode Thin)" $Green
            $oracleFound = $true
            break
        }
    }

    if (-not $oracleFound) {
        Write-ColorText "   ❌ OracleDB manquant dans le build" $Red
        $allOk = $false
    }

    return $allOk
}

# Correction post-build de better-sqlite3
function Fix-BetterSqlite3-PostBuild {
    Write-ColorText "🔧 Correction post-build better-sqlite3..." $Cyan
    $buildDir = Join-Path $projectRoot "release-builds\win-unpacked"

    $possibleTargets = @(
        "resources\app.asar.unpacked\node_modules\better-sqlite3\build\Release",
        "resources\app\node_modules\better-sqlite3\build\Release"
    )

    $targetDir = $null
    foreach ($relPath in $possibleTargets) {
        $dir = Join-Path $buildDir $relPath
        if (Test-Path (Split-Path $dir -Parent)) {
            $targetDir = $dir
            break
        }
    }

    if (-not $targetDir) {
        $targetDir = Join-Path $buildDir $possibleTargets[0]
        New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
        Write-ColorText "   📁 Dossier créé: $targetDir" $Gray
    }

    $sourceSqlite = "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
    $targetSqlite = Join-Path $targetDir "better_sqlite3.node"

    if (Test-Path $sourceSqlite) {
        Copy-Item -Path $sourceSqlite -Destination $targetSqlite -Force
        Write-ColorText "   ✅ better_sqlite3.node copié manuellement" $Green
        return $true
    } else {
        Write-ColorText "   ❌ Source better_sqlite3.node introuvable" $Red
        return $false
    }
}

Remove-Item -Path "$env:LOCALAPPDATA\electron-builder\Cache" -Recurse -Force

Write-ColorText "Demarrage du script de build pour Indi-Suivi..." $Cyan

# Arrêt des processus résiduels
Write-ColorText "Arret des processus Electron/Node residuels..." $Yellow
Get-Process -Name "electron", "node" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Write-ColorText "   Processus arretes." $Green

# Nettoyage cache npm
Write-ColorText "Nettoyage du cache npm..." $Yellow
npm cache clean --force
    Write-ColorText "   Cache npm nettoye." $Green

# Nettoyage des dossiers
Write-ColorText "Nettoyage des dossiers de build et cache Node.js..." $Yellow
$foldersToClean = @("release-builds", "out", "dist", ".vite", "build", ".webpack", "node_modules\.cache")
foreach ($folder in $foldersToClean) {
    if (Test-Path $folder) {
        Remove-Item -Path $folder -Recurse -Force -ErrorAction SilentlyContinue
    }
}
    Write-ColorText "   Dossiers et caches nettoyes." $Green

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
    Write-ColorText "Telechargement local d'Electron $electronVersion pour $electronPlatform-$electronArch..." $Cyan

    if (Test-Path $electronLocalDownloadDir) {
        Remove-Item -Path $electronLocalDownloadDir -Recurse -Force -ErrorAction SilentlyContinue
    }
    New-Item -Path $electronLocalDownloadDir -ItemType Directory | Out-Null

    $downloadedFilePath = Join-Path $electronLocalDownloadDir $electronZipFileName
    Write-ColorText "   Telechargement de $electronDownloadUrl vers $downloadedFilePath" $Gray
    try {
        Invoke-WebRequest -Uri $electronDownloadUrl -OutFile $downloadedFilePath -UseBasicParsing -Headers @{"User-Agent"="Mozilla/5.0"}
        Write-ColorText "   Telechargement termine." $Green
    } catch {
        Write-ColorText "   Echec du telechargement: $_" $Red
        throw "Impossible de telecharger Electron $electronVersion"
    }

    Write-ColorText "   Extraction de $downloadedFilePath vers $electronLocalDownloadDir" $Gray
    try {
        Expand-Archive -Path $downloadedFilePath -DestinationPath $electronLocalDownloadDir -Force

        $exePath = Get-ChildItem -Path $electronLocalDownloadDir -Recurse -Filter "electron.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
        if ($exePath) {
            if ($exePath.Directory.FullName -ne $electronLocalDownloadDir) {
                Move-Item -Path (Join-Path $exePath.Directory.FullName '*') -Destination $electronLocalDownloadDir -Force
                Remove-Item -Path $exePath.Directory.FullName -Recurse -Force -ErrorAction SilentlyContinue
            }
            Write-ColorText "   Extraction terminee - electron.exe trouve." $Green
        } else {
            throw "electron.exe non trouve apres extraction"
        }
    } catch {
        Write-ColorText "   Echec de l'extraction: $_" $Red
        throw "Impossible d'extraire Electron"
    }

    $electronZipPath = Join-Path $electronLocalDownloadDir $electronZipFileName
    if (-not (Test-Path $electronZipPath) -and (Test-Path $downloadedFilePath)) {
        Copy-Item -Path $downloadedFilePath -Destination $electronZipPath -Force
    }

    Write-ColorText "Preparation du cache Electron local..." $Cyan
    $cacheKey = "httpsgithub.comelectronelectronreleasesdownloadv$electronVersion$electronZipFileName"
    $targetCacheDir = Join-Path $electronCacheDir $cacheKey

    if (-not (Test-Path $electronCacheDir)) {
        New-Item -Path $electronCacheDir -ItemType Directory -Force | Out-Null
    }
    if (-not (Test-Path $targetCacheDir)) {
        New-Item -Path $targetCacheDir -ItemType Directory -Force | Out-Null
    }

    Copy-Item -Path $downloadedFilePath -Destination (Join-Path $targetCacheDir $electronZipFileName) -Force
    Write-ColorText "   Archive copiee dans le cache Electron." $Green

    $env:ELECTRON_CACHE = $electronCacheDir
    $env:electron_config_cache = $electronCacheDir
    Write-ColorText "   Variables de cache configurees." $Gray
}

if ($InstallDeps -or $DownloadElectronLocally) {
    Write-ColorText "Verification de la configuration de w64devkit..." $Cyan
    $w64devkitStatus = Test-W64DevKitConfiguration
    if (-not $w64devkitStatus.IsValid) {
        Write-ColorText "ERREUR: Configuration de w64devkit invalide." $Red
        Write-ColorText "Raison: $($w64devkitStatus.Reason)" $Yellow
        Write-ColorText "Vous pouvez telecharger w64devkit depuis : https://github.com/skeeto/w64devkit/releases" $Gray
        throw "w64devkit non configure correctement. Arret du script."
    }
    Write-ColorText "   $($w64devkitStatus.Reason)" $Green
    Set-W64DevKitEnvironment

    # Configuration spécifique pour better-sqlite3
    Write-ColorText "Configuration spéciale pour better-sqlite3..." $Cyan
    $env:npm_config_better_sqlite3_binary_host_mirror = ""
    $env:npm_config_build_from_source = "true"
    
    if ($ForcePrebuilt) {
        Write-ColorText "Installation des dependances avec binaires precompiles..." $Green

        if ($DownloadElectronLocally) {
            Write-ColorText "   Utilisation du cache Electron local pour éviter le téléchargement..." $Gray
        }

        Write-ColorText "   Mode binaires precompiles force" $Yellow
        Write-ColorText "   Configuration npm pour binaires precompiles..." $Cyan
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
            Write-ColorText "Installation des dependances npm..." $Cyan
            npm install --no-audit --prefer-offline
            if ($LASTEXITCODE -ne 0) {
                Write-ColorText "   npm install a echoue - tentative avec ELECTRON_SKIP_BINARY_DOWNLOAD..." $Yellow
                $env:ELECTRON_SKIP_BINARY_DOWNLOAD = "1"
                npm install --no-audit
                if ($LASTEXITCODE -ne 0) {
                    throw "Installation des dependances npm echouee"
                }
            }

            if ($DownloadElectronLocally) {
                $electronExePath = Join-Path $electronLocalDownloadDir "electron.exe"
                if (-not (Test-Path $electronExePath)) {
                    Write-ColorText "   ERREUR: electron.exe non trouvé dans $electronLocalDownloadDir" $Red
                    throw "electron.exe manquant dans le répertoire local"
                }

                if (-not (Test-Path $electronTargetDistPath)) {
                    New-Item -Path $electronTargetDistPath -ItemType Directory -Force | Out-Null
                } else {
                    Remove-Item -Path "$electronTargetDistPath\*" -Recurse -Force -ErrorAction SilentlyContinue
                }

                Copy-ElectronFiles-Fixed -SourcePath $electronLocalDownloadDir -TargetPath (Split-Path $electronTargetDistPath -Parent)

                $electronPackageJsonPath = Join-Path (Split-Path $electronTargetDistPath -Parent) "package.json"
                if (Test-Path $electronPackageJsonPath) {
                    try {
                        $electronPkg = Get-Content $electronPackageJsonPath | ConvertFrom-Json
                        Write-ColorText "   📦 Version Electron détectée: $($electronPkg.version)" $Gray
                    } catch {
                        Write-ColorText "   ⚠️ Impossible de lire le package.json d'Electron" $Yellow
                    }
                }
            }

            Remove-Item Env:ELECTRON_SKIP_BINARY_DOWNLOAD -ErrorAction SilentlyContinue
        } catch {
            Write-ColorText "   Erreur lors de l'installation: $_" $Red
            throw
        }

        $viteCmd = Join-Path $projectRoot "node_modules\.bin\vite.cmd"
        if (-not (Test-Path $viteCmd)) {
            Write-ColorText "   Installation de Vite..." $Yellow
            npm install vite --save-dev
        }

        Write-ColorText "   Installation des dependances terminee." $Green
    }
}

if (-not (Test-BetterSqlite3)) {
    throw "better-sqlite3 non fonctionnel"
}

if ($DownloadElectronLocally) {
    Write-ColorText "Vérification finale d'Electron..." $Cyan

    $electronMainPath = Join-Path $electronTargetDistPath "electron.exe"
    if (-not (Test-Path $electronMainPath)) {
        Write-ColorText "   ❌ CRITIQUE: electron.exe manquant" $Red
        throw "Electron non installé correctement"
    }

    try {
        $electronVersion = & $electronMainPath --version 2>$null
        if ($electronVersion) {
            Write-ColorText "   ✅ Electron fonctionnel: $electronVersion" $Green
        } else {
            Write-ColorText "   ⚠️ Electron installé mais version non détectable" $Yellow
        }
    } catch {
        Write-ColorText "   ⚠️ Test d'Electron échoué: $_" $Yellow
    }
}

if ($InstallDeps -and -not $SkipNativeDeps -and -not $ForcePrebuilt) {
    Write-ColorText "Reconstruction des modules natifs pour Electron..." $Cyan
    if (-not (Test-Path "node_modules\@electron\rebuild")) {
        npm install @electron/rebuild --save-dev --no-audit
    }
    Invoke-W64DevKitRebuild
    if ($LASTEXITCODE -ne 0) {
        Write-ColorText "   Reconstruction des dependances natives echouee" $Red
        exit 1
    }
    Write-ColorText "   Reconstruction des modules natifs terminee." $Green
} elseif ($ForcePrebuilt) {
    Write-ColorText "Reconstruction evitee (binaires precompiles)" $Yellow
}

Write-ColorText "Lancement du processus de build principal..." $Cyan
if ($UseForge) {
    Write-ColorText "   Utilisation d'Electron Forge." $Blue
    npm run dist:forge
    Write-ColorText "   Build Electron Forge termine." $Green
} elseif ($UsePackager) {
    Write-ColorText "   Utilisation d'Electron Packager." $Blue
    npm run dist:packager
    Write-ColorText "   Build Electron Packager termine." $Green
} else {
    Write-ColorText "   Lancement du build complet (Vite + Electron)." $Blue

    $sqliteNode = "node_modules\better-sqlite3\build\Release\better_sqlite3.node"
    $oracleModule = "node_modules\oracledb\package.json"

    Write-ColorText "Installation d'OracleDB en mode Thin (sans compilation)..." $Cyan
    if (-not (Test-Path $oracleModule)) {
        Write-ColorText "   Installation OracleDB 6.8.0 en mode Thin..." $Gray
        npm uninstall oracledb 2>$null
        Remove-Item -Path "node_modules\oracledb" -Recurse -Force -ErrorAction SilentlyContinue
        npm install oracledb@6.8.0 --no-optional
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ❌ Échec installation OracleDB" $Red
            throw "Impossible d'installer OracleDB"
        }
        Remove-Item -Path "node_modules\oracledb\build" -Recurse -Force -ErrorAction SilentlyContinue
        Remove-Item -Path "node_modules\oracledb\src" -Recurse -Force -ErrorAction SilentlyContinue
        Write-ColorText "   ✅ OracleDB installé en mode Thin (pure JavaScript)" $Green
    } else {
        $packageJson = Get-Content "node_modules\oracledb\package.json" | ConvertFrom-Json
        if ($packageJson.version -lt "6.0.0") {
            Write-ColorText "   🔄 Mise à jour vers OracleDB 6.x (mode Thin)..." $Yellow
            npm install oracledb@6.8.0 --no-optional
            Remove-Item -Path "node_modules\oracledb\build" -Recurse -Force -ErrorAction SilentlyContinue
        }
        Write-ColorText "   ✅ OracleDB en mode Thin déjà installé" $Green
    }

    if (-not (Test-Path $sqliteNode)) {
        Write-ColorText "   Reconstruction better-sqlite3..." $Gray
        npx electron-rebuild --version=36.3.2 --force --only better-sqlite3 --arch x64
        if ($LASTEXITCODE -ne 0) {
            Write-ColorText "   ❌ Reconstruction better-sqlite3 échouée" $Red
            throw "Échec de la reconstruction de better-sqlite3"
        }
    }

    if (Test-Path $sqliteNode) {
        Write-ColorText "   ✅ better-sqlite3.node trouvé" $Green
    } else {
        Write-ColorText "   ❌ better-sqlite3.node MANQUANT" $Red
        throw "Module natif better-sqlite3 manquant après reconstruction"
    }

    if (Test-Path $oracleModule) {
        Write-ColorText "   ✅ oracledb.module installé (mode Thin - pur JavaScript)" $Green
    } else {
        Write-ColorText "   ❌ oracledb.module MANQUANT" $Red
        throw "Module OracleDB manquant"
    }

    npm run build
    Write-ColorText "   Build Vite termine." $Green
    
    if ($DownloadElectronLocally) {
        Write-ColorText "   Build Electron avec binaire local." $Blue
        Write-ColorText "   Utilisation du répertoire Electron local..." $Gray
        
        $electronExePath = Join-Path $electronLocalDownloadDir "electron.exe"
        if (-not (Test-Path $electronExePath)) {
            Write-ColorText "   electron.exe non trouve dans $electronLocalDownloadDir" $Red
            Write-ColorText "   Contenu du répertoire:" $Yellow
            if (Test-Path $electronLocalDownloadDir) {
                Get-ChildItem -Path $electronLocalDownloadDir -ErrorAction SilentlyContinue | ForEach-Object {
                    Write-ColorText "       - $($_.Name)" $Gray
                }
            }
            throw "electron.exe manquant dans le repertoire local"
        }
        
        npx electron-builder --win --config.electronDist="$electronLocalDownloadDir"
        
    } else {
        npm run dist
    }
    Write-ColorText "   Build Electron termine." $Green
    Start-Sleep -Seconds 2
    Fix-BetterSqlite3-PostBuild | Out-Null
}

if (-not $SkipUPX) {
    Write-ColorText "Compression des executables avec UPX (niveau $UPXLevel)..." $Cyan

    $upxFound = $false
    $upxCommand = "upx"

    if (Test-Command "upx") {
        $upxFound = $true
        Write-ColorText "   UPX trouve dans le PATH systeme" $Green
    } else {
        $localUpx = Join-Path $env:USERPROFILE "AppData\Local\indi-suivi-tools\upx\upx.exe"
        if (Test-Path $localUpx) {
            $upxFound = $true
            $upxCommand = "`"$localUpx`""
            Write-ColorText "   UPX trouve localement: $localUpx" $Green
        }
    }

    if (-not $upxFound) {
        Write-ColorText "   UPX non trouve. Utilisez -DownloadTools pour l'installer automatiquement." $Yellow
        Write-ColorText "   Ou telechargez depuis: https://github.com/upx/upx/releases" $Gray
        Write-ColorText "   Saut de l'etape de compression UPX." $Yellow
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
                            Write-ColorText "   $($exe.Name) compresse avec succes" $Green
                        }
                    } catch {
                        Write-ColorText "   Echec de compression pour $($exe.Name): $_" $Yellow
                    }
                }
            }
        }
        
        if ($compressedCount -gt 0) {
            Write-ColorText "   $compressedCount fichier(s) compresse(s) avec UPX" $Green
        } else {
            Write-ColorText "   Aucun fichier executable trouve a compresser" $Yellow
        }
    }
}

Write-ColorText "Verification des executables generes..." $Cyan

$outputFolders = @("release-builds", "out", "dist")
$foundFiles = @()
foreach ($folder in $outputFolders) {
    if (Test-Path $folder) {
        $foundFiles += Get-ChildItem -Path $folder -Recurse -Include "*.exe" -ErrorAction SilentlyContinue
    }
}

Verify-NativeModules-Fixed | Out-Null

if ($foundFiles.Count -gt 0) {
    Write-ColorText "   Fichiers executables trouves:" $Green
    foreach ($file in $foundFiles) {
        $sizeMB = [math]::Round($file.Length / 1MB, 2)
        Write-ColorText "   - $($file.Name) ($sizeMB MB)" $Gray
        if ($sizeMB -gt 80) {
            Write-ColorText "   Taille encore elevee. Verifiez l'inclusion des dependances." $Yellow
        }
    }

    $mainExe = $foundFiles | Where-Object { $_.Extension -eq '.exe' -and $_.Name -like '*Indi-Suivi*' } | Select-Object -First 1
    if ($mainExe) {
        Write-ColorText "Executable genere: $($mainExe.FullName)" $Green
        Write-ColorText "   Lancez-le manuellement pour le tester." $Cyan
    }
} else {
    Write-ColorText "Aucun fichier executable trouve dans les dossiers de sortie!" $Yellow
}

# Nettoyage final (uniquement si utilisation d'Electron local)
if ($DownloadElectronLocally) {
    Write-ColorText "Nettoyage final..." $Yellow
    Remove-Item Env:ELECTRON_CACHE -ErrorAction SilentlyContinue
    Remove-Item Env:electron_config_cache -ErrorAction SilentlyContinue
    Remove-Item Env:ELECTRON_SKIP_BINARY_DOWNLOAD -ErrorAction SilentlyContinue
    Write-ColorText "   Nettoyage final termine." $Green
}

Clear-W64DevKitEnvironment

Write-ColorText "Script de build termine avec succes!" $Green
