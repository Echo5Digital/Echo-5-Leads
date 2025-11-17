# PowerShell packaging script for Echo5 Leads Connector
# Usage: Run from repository root:  ./package-plugin.ps1
# Produces: echo5-leads-connector-v2.0.0.zip in current directory

$ErrorActionPreference = 'Stop'

$pluginSource = Join-Path $PSScriptRoot 'wp-plugin-lightweight'
$pluginSlug   = 'echo5-leads-connector'
$version      = '2.0.0'
$stagingDir   = Join-Path $PSScriptRoot "_package-temp-$pluginSlug"
$zipName      = "${pluginSlug}-v${version}.zip"

if (-Not (Test-Path $pluginSource)) { Write-Error "Source folder not found: $pluginSource" }

# Clean previous staging
if (Test-Path $stagingDir) { Remove-Item $stagingDir -Recurse -Force }
New-Item -ItemType Directory -Path $stagingDir | Out-Null

$targetRoot = Join-Path $stagingDir $pluginSlug
New-Item -ItemType Directory -Path $targetRoot | Out-Null

# Copy required files (exclude README-old.md and any local dev cruft)
$include = @('echo5-leads-connector.php','README.md','INSTALL.md','assets','includes')
foreach ($item in $include) {
  $src = Join-Path $pluginSource $item
  if (Test-Path $src) {
    Copy-Item $src -Destination $targetRoot -Recurse -Force
  } else {
    Write-Warning "Missing expected item: $item"
  }
}

# Remove any .DS_Store or .git artifacts accidentally present
Get-ChildItem -Path $targetRoot -Recurse -Force -Include '.DS_Store','.git','.gitignore' | ForEach-Object { Remove-Item $_.FullName -Force }

# Create zip
if (Test-Path $zipName) { Remove-Item $zipName -Force }
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($stagingDir, (Join-Path $PSScriptRoot $zipName), [System.IO.Compression.CompressionLevel]::Optimal, $true)

# Verify contents
$zip = [System.IO.Compression.ZipFile]::OpenRead((Join-Path $PSScriptRoot $zipName))
Write-Host "Packaged entries:" -ForegroundColor Cyan
$zip.Entries | ForEach-Object { Write-Host " -" $_.FullName }
$zip.Dispose()

# Cleanup staging
Remove-Item $stagingDir -Recurse -Force

Write-Host "\n✅ Created $zipName" -ForegroundColor Green
Write-Host "Upload this ZIP via WordPress > Plugins > Add New > Upload Plugin" -ForegroundColor Yellow
