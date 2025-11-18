# PowerShell setup script for Windows

Write-Host "🚀 Setting up plan-viz..." -ForegroundColor Cyan
Write-Host ""

# Check Node.js version
Write-Host "📦 Checking Node.js version..." -ForegroundColor Yellow
try {
    $nodeVersion = (node -v) -replace 'v', '' -split '\.' | Select-Object -First 1
    if ([int]$nodeVersion -lt 20) {
        Write-Host "❌ Node.js 20+ is required. Current version: $(node -v)" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Node.js version: $(node -v)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js 20+" -ForegroundColor Red
    exit 1
}

# Install dependencies
Write-Host "📥 Installing dependencies..." -ForegroundColor Yellow
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Dependencies installed" -ForegroundColor Green
Write-Host ""

# Build the project
Write-Host "🔨 Building the project..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build successful" -ForegroundColor Green
Write-Host ""

# Run tests
Write-Host "🧪 Running tests..." -ForegroundColor Yellow
npm test
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Some tests failed" -ForegroundColor Yellow
} else {
    Write-Host "✅ All tests passed" -ForegroundColor Green
}
Write-Host ""

# Run linter
Write-Host "🔍 Running linter..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  Linting issues found. Run 'npm run lint:fix' to auto-fix" -ForegroundColor Yellow
} else {
    Write-Host "✅ No linting issues" -ForegroundColor Green
}
Write-Host ""

Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "  • Run 'npm test' to run tests"
Write-Host "  • Run 'npm run build' to build the project"
Write-Host "  • Run 'node dist/cli.js -i examples/simple-plan.txt -o output.json' to try the CLI"
Write-Host "  • Check out QUICKSTART.md for more examples"
Write-Host ""

