# Copies Datta Able images from the included theme repository
# into the public assets directory used by the application.

$ErrorActionPreference = 'Stop'

# Détermine le répertoire du script et la racine du projet
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path "$scriptDir\.."

# Définit les chemins source et destination basés sur la racine du projet
$destDir = Join-Path $projectRoot 'public/datta-able-assets/images'
$srcDir = Join-Path $projectRoot 'docs/datta-able-bootstrap-dashboard-master/src/assets/images'

# Vérifie un chemin source alternatif si le premier n'est pas trouvé
if (-not (Test-Path $srcDir)) {
    $srcDir = Join-Path $projectRoot 'docs/datta-able-bootstrap-dashboard-master/dist/assets/images'
}

# Arrête le script si aucun répertoire source n'est trouvé
if (-not (Test-Path $srcDir)) {
    Write-Error "Datta Able image source not found in docs directory."
    exit 1
}

# Crée le répertoire de destination s'il n'existe pas
if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

# Copie les fichiers et dossiers de manière récursive
Copy-Item -Path $srcDir\* -Destination $destDir -Recurse -Force

Write-Host "Copied Datta Able images from '$srcDir' to '$destDir'."