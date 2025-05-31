$ErrorActionPreference = 'Stop'

$source = "docs/datta-able-bootstrap-dashboard-master/src/assets/images"
$destination = "public/datta-able-assets/images"

if (-not (Test-Path $source)) {
    Write-Error "Source path not found: $source"
    exit 1
}

if (-not (Test-Path $destination)) {
    New-Item -ItemType Directory -Path $destination | Out-Null
}

Get-ChildItem $source -Directory | ForEach-Object {
    $destSub = Join-Path $destination $_.Name
    if (-not (Test-Path $destSub)) {
        New-Item -ItemType Directory -Path $destSub | Out-Null
    }
    Copy-Item (Join-Path $_.FullName '*') $destSub -Recurse -Force
}

Get-ChildItem $source -File | ForEach-Object {
    Copy-Item $_.FullName $destination -Force
}
