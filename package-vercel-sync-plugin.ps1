# PowerShell script to package the Echo5 Leads Vercel Sync plugin

$pluginDir = "wp-plugin-vercel-sync"
$pluginSlug = "echo5-leads-vercel-sync"
$version = "1.2.0"  # Updated version with migration feature
$zipName = "$pluginSlug-v$version.zip"

# Create temp directory
$tempDir = "_package-temp-$pluginSlug"
$targetDir = Join-Path $tempDir $pluginSlug

if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}

New-Item -ItemType Directory -Path $targetDir | Out-Null

# Copy plugin files
Copy-Item -Path "$pluginDir\*.php" -Destination $targetDir -Recurse
Copy-Item -Path "$pluginDir\*.md" -Destination $targetDir -Recurse -ErrorAction SilentlyContinue
Copy-Item -Path "$pluginDir\admin" -Destination $targetDir -Recurse

# Create zip
if (Test-Path $zipName) {
    Remove-Item $zipName
}

Add-Type -Assembly "System.IO.Compression.FileSystem"
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $zipName)

# List contents
Write-Host "`nPackaged entries:"
Add-Type -Assembly "System.IO.Compression.FileSystem"
$zip = [System.IO.Compression.ZipFile]::OpenRead($zipName)
$zip.Entries | ForEach-Object { Write-Host " - $($_.FullName)" }
$zip.Dispose()

# Cleanup
Remove-Item -Recurse -Force $tempDir

Write-Host "`n✅ Created $zipName" -ForegroundColor Green
