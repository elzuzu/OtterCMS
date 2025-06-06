param(
    [string]$ElectronVersion = "36.3.2",
    [string]$OracleVersion = "6.3.0"
)

$binaryDir = "node_modules\oracledb\build\Release"
$binaryFile = "oracledb.node"
$binaryPath = Join-Path $binaryDir $binaryFile

if (Test-Path $binaryPath) {
    Write-Host "✅ oracledb.node déjà présent"
    exit 0
}

Write-Host "📥 Téléchargement binaire oracledb v$OracleVersion pour Electron v$ElectronVersion..."

$urls = @(
    "https://registry.npmmirror.com/-/binary/oracledb/v${OracleVersion}/oracledb-v${OracleVersion}-electron-v${ElectronVersion}-win32-x64.tar.gz",
    "https://github.com/oracle/node-oracledb/releases/download/v${OracleVersion}/oracledb-v${OracleVersion}-electron-v${ElectronVersion}-win32-x64.tar.gz",
    "https://registry.npmjs.org/@mapbox/node-pre-gyp/-/download/oracledb/v${OracleVersion}/oracledb-v${OracleVersion}-electron-v${ElectronVersion}-win32-x64.tar.gz"
)

New-Item -Path $binaryDir -ItemType Directory -Force | Out-Null

foreach ($url in $urls) {
    try {
        Write-Host "   Tentative: $url"
        $tempFile = "${env:TEMP}\oracledb-binary.tar.gz"
        Invoke-WebRequest -Uri $url -OutFile $tempFile -ErrorAction Stop
        if (Get-Command tar -ErrorAction SilentlyContinue) {
            tar -xzf $tempFile -C $binaryDir
        } elseif (Test-Path "C:\\Program Files\\7-Zip\\7z.exe") {
            & "C:\\Program Files\\7-Zip\\7z.exe" x $tempFile -o"$binaryDir" | Out-Null
        }
        if (Test-Path $binaryPath) {
            Write-Host "✅ Binaire oracledb téléchargé avec succès"
            Remove-Item $tempFile -Force
            exit 0
        }
    } catch {
        Write-Host "   Échec: $_"
    }
}

Write-Host "❌ Impossible de télécharger le binaire oracledb"
exit 1
