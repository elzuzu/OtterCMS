# Créer le dossier tools s'il n'existe pas
New-Item -ItemType Directory -Force -Path "d:\tools"

# Télécharger PortableBuildTools
$url = "https://github.com/Data-Oriented-House/PortableBuildTools/releases/latest/download/PortableBuildTools.exe"
$output = "d:\tools\PortableBuildTools.exe"
Invoke-WebRequest -Uri $url -OutFile $output

# Installer les outils dans d:\tools\PortableBuildTools avec les paramètres spécifiques
Write-Host "Installation des outils de build..."
& $output --accept-license --msvc=latest --sdk=latest --target=x64 --host=x64 --path="d:\tools\PortableBuildTools"

# Chercher le bon chemin de cl.exe
$clSearch = Get-ChildItem -Path "d:\tools\PortableBuildTools\VC\Tools\MSVC" -Directory | Sort-Object Name -Descending | Select-Object -First 1
$clPath = Join-Path $clSearch.FullName "bin\Hostx64\x64\cl.exe"
$crtLibPath = Join-Path $clSearch.FullName "lib\x64"

if (-not (Test-Path $clPath)) {
    Write-Error "L'installation de MSVC a échoué. Le fichier cl.exe n'a pas été trouvé dans $clPath."
    exit 1
}

# Chercher le chemin des bibliothèques Windows SDK
$sdkPath = "d:\tools\PortableBuildTools\Windows Kits\10\Lib"
$sdkVersion = Get-ChildItem -Path $sdkPath -Directory | Sort-Object Name -Descending | Select-Object -First 1
$sdkLibPath = Join-Path $sdkVersion.FullName "um\x64"
$ucrtLibPath = Join-Path $sdkVersion.FullName "ucrt\x64"

# Chercher le chemin de RC.EXE
$rcBinPath = Get-ChildItem -Path "d:\tools\PortableBuildTools\Windows Kits\10\bin" -Directory | Sort-Object Name -Descending | Select-Object -First 1
$rcExePath = Join-Path $rcBinPath.FullName "x64"

# Chercher le chemin des includes Windows SDK
$sdkIncludePath = "d:\tools\PortableBuildTools\Windows Kits\10\Include"
$sdkIncludeVersion = Get-ChildItem -Path $sdkIncludePath -Directory | Sort-Object Name -Descending | Select-Object -First 1
$umIncludePath = Join-Path $sdkIncludeVersion.FullName "um"
$sharedIncludePath = Join-Path $sdkIncludeVersion.FullName "shared"
$ucrtIncludePath = Join-Path $sdkIncludeVersion.FullName "ucrt"

# Ajouter les chemins au PATH, LIB et INCLUDE
$env:PATH = (Split-Path $clPath) + ";" + $rcExePath + ";" + $env:PATH
$env:LIB = $crtLibPath + ";" + $sdkLibPath + ";" + $ucrtLibPath + ";" + $env:LIB
$env:INCLUDE = $umIncludePath + ";" + $sharedIncludePath + ";" + $ucrtIncludePath + ";" + $env:INCLUDE

# Vérifier l'installation
Write-Host "Vérification de l'installation..."
# Vérifier simplement que cl.exe existe et est exécutable
if (-not (Get-Command cl.exe -ErrorAction SilentlyContinue)) {
    Write-Error "cl.exe n'est pas accessible dans le PATH."
    exit 1
}
Write-Host "cl.exe trouvé et accessible."

# Vérifier que rc.exe est accessible
if (-not (Get-Command rc.exe -ErrorAction SilentlyContinue)) {
    Write-Error "rc.exe n'est pas accessible dans le PATH."
    exit 1
}
Write-Host "rc.exe trouvé et accessible."

# Installer les dépendances npm
Write-Host "Installation des dépendances npm..."
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Error "L'installation des dépendances npm a échoué."
    exit 1
}

# Lancer la compilation Tauri
Write-Host "Lancement de la compilation Tauri..."
npx tauri build --no-bundle 