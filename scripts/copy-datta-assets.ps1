# Copies Datta Able images from the included theme repository
# into the public assets directory used by the application.

$ErrorActionPreference = 'Stop'

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
$projectRoot = Resolve-Path "$scriptDir\.."

$destDir = Join-Path $projectRoot 'public/datta-able-assets/images'
$srcDir = Join-Path $projectRoot 'docs/datta-able-bootstrap-dashboard-master/src/assets/images'

if (-not (Test-Path $srcDir)) {
    $srcDir = Join-Path $projectRoot 'docs/datta-able-bootstrap-dashboard-master/dist/assets/images'
}

if (-not (Test-Path $srcDir)) {
    Write-Error "Datta Able image source not found in docs directory."
    exit 1
}

if (-not (Test-Path $destDir)) {
    New-Item -ItemType Directory -Path $destDir -Force | Out-Null
}

Copy-Item -Path $srcDir\* -Destination $destDir -Recurse -Force

Write-Host "Copied Datta Able images from '$srcDir' to '$destDir'."
