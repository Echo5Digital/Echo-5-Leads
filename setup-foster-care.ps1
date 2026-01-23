# Foster Care Application Setup Script
# Run this from the backend directory

Write-Host "🚀 Setting up Foster Care Application System..." -ForegroundColor Green
Write-Host ""

# Check if we're in the backend directory
if (-not (Test-Path "package.json")) {
    Write-Host "❌ Error: Please run this script from the backend directory" -ForegroundColor Red
    exit 1
}

# Install required npm packages
Write-Host "📦 Installing PDF generation libraries..." -ForegroundColor Cyan
npm install pdfkit pdf-lib

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Dependencies installed successfully" -ForegroundColor Green
Write-Host ""

# Create uploads directory
Write-Host "📁 Creating uploads directory..." -ForegroundColor Cyan
$uploadsDir = "uploads\foster-applications"

if (-not (Test-Path $uploadsDir)) {
    New-Item -ItemType Directory -Path $uploadsDir -Force | Out-Null
    Write-Host "✅ Created directory: $uploadsDir" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Directory already exists: $uploadsDir" -ForegroundColor Yellow
}

Write-Host ""

# Check environment variables
Write-Host "🔍 Checking environment configuration..." -ForegroundColor Cyan

$envFile = ".env"
$requiredVars = @("MONGODB_URI", "SMTP_HOST", "SMTP_USER", "SMTP_PASS")
$missingVars = @()

if (Test-Path $envFile) {
    $envContent = Get-Content $envFile -Raw
    
    foreach ($var in $requiredVars) {
        if ($envContent -notmatch "$var=") {
            $missingVars += $var
        }
    }
    
    if ($missingVars.Count -eq 0) {
        Write-Host "✅ All required environment variables are configured" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Missing environment variables:" -ForegroundColor Yellow
        foreach ($var in $missingVars) {
            Write-Host "   - $var" -ForegroundColor Yellow
        }
        Write-Host ""
        Write-Host "Please add these to your .env file" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️  .env file not found" -ForegroundColor Yellow
    Write-Host "Please create a .env file with the following variables:" -ForegroundColor Yellow
    foreach ($var in $requiredVars) {
        Write-Host "   - $var" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
Write-Host "✨ Setup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Ensure all environment variables are set in .env"
Write-Host "   2. Run 'npm run dev' to start the backend server"
Write-Host "   3. Navigate to /foster-care-application on the frontend"
Write-Host ""
Write-Host "📚 Documentation: FOSTER_CARE_APPLICATION_GUIDE.md"
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Gray
