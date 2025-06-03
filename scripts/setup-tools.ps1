# PowerShell script to download required tools (UPX and 7zip)
param(
    # Dossier où installer UPX et 7-Zip. Par défaut dans l'espace utilisateur
    [string]$ToolsDir = $(Join-Path $env:USERPROFILE 'AppData\Local\indi-suivi-tools')
)

function Test-Command {
    param([string]$Command)
    (Get-Command $Command -ErrorAction SilentlyContinue) -ne $null
}

function Download-File {
    param([string]$Url, [string]$Destination)
    if (Test-Command 'curl') {
        & curl -L -o $Destination $Url
    } else {
        Invoke-WebRequest -Uri $Url -OutFile $Destination -UseBasicParsing
    }
}

if (-not (Test-Path $ToolsDir)) { New-Item -ItemType Directory -Path $ToolsDir | Out-Null }

$upxDir = Join-Path $ToolsDir 'upx'
$upxExe = Join-Path $upxDir 'upx.exe'
if (-not (Test-Path $upxExe)) {
    $zip = Join-Path $ToolsDir 'upx.zip'
    Download-File 'https://github.com/upx/upx/releases/download/v4.2.2/upx-4.2.2-win64.zip' $zip
    Expand-Archive -Path $zip -DestinationPath $ToolsDir -Force
    Move-Item -Path (Join-Path $ToolsDir 'upx-4.2.2-win64') $upxDir -Force
    Remove-Item $zip
}

$sevenDir = Join-Path $ToolsDir '7zip'
$sevenExe = Join-Path $sevenDir '7z.exe'
if (-not (Test-Path $sevenExe)) {
    $exe = Join-Path $ToolsDir '7zr.exe'
    Download-File 'https://www.7-zip.org/a/7zr.exe' $exe
    & $exe x -o$sevenDir
    Remove-Item $exe
}

Write-Host "Tools installed in $ToolsDir"
