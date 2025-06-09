# PowerShell script to download required tools (UPX and 7zip)
param(
    # Dossier où installer UPX et 7-Zip. Par défaut dans l'espace utilisateur
    [string]$ToolsDir = $(Join-Path $env:USERPROFILE 'AppData\Local\OtterCMS-tools')
)

function Test-Command {
    param([string]$Command)
    (Get-Command $Command -CommandType Application -ErrorAction SilentlyContinue) -ne $null
}

function Download-File {
    param([string]$Url, [string]$Destination)
    $curlCmd = Get-Command curl -CommandType Application -ErrorAction SilentlyContinue
    if ($curlCmd) {
        & $curlCmd.Path -L -o $Destination $Url
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
$sevenExeFile = Join-Path $sevenDir '7zr.exe'
if (-not (Test-Path $sevenExeFile)) {
    Write-Host "   Telechargement de 7zr.exe vers $sevenExeFile..."
    if (-not (Test-Path $sevenDir)) { New-Item -ItemType Directory -Path $sevenDir -Force | Out-Null }
    try {
        Download-File 'https://www.7-zip.org/a/7zr.exe' $sevenExeFile
        if (Test-Path $sevenExeFile) {
            Write-Host "   ✅ 7zr.exe telecharge vers $sevenExeFile."
        } else {
            Write-Host "   ❌ Echec du telechargement de 7zr.exe."
        }
    } catch {
        Write-Host "   ❌ Erreur lors du telechargement de 7zr.exe: $($_.Exception.Message)"
    }
}

Write-Host "Tools installed in $ToolsDir"
