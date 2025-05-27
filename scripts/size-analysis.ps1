Write-Host "📊 Analyse de taille des dépendances..." -ForegroundColor Cyan

if (Test-Path "node_modules") {
    $largest = Get-ChildItem "node_modules" -Directory | ForEach-Object {
        $size = (Get-ChildItem $_.FullName -Recurse | Measure-Object -Property Length -Sum).Sum
        [PSCustomObject]@{
            Name = $_.Name
            SizeMB = [math]::Round($size / 1MB, 2)
        }
    } | Sort-Object SizeMB -Descending | Select-Object -First 10

    $largest | Format-Table -AutoSize
}
