# Script to run the Full Regression Suite (Unit + Integration + E2E)
$ErrorActionPreference = "Continue"

# Save the root directory to ensure we can always find our way back
$RootDir = $PSScriptRoot

Write-Host "==========================================" -ForegroundColor Yellow
Write-Host "   STARTING FULL REGRESSION SUITE   " -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow

# 1. Run All Unit Tests
Write-Host "`n[1/3] Running Unit Regression..." -ForegroundColor Cyan
Set-Location $RootDir
$unitScript = Join-Path $RootDir "run_all_tests.ps1"
& $unitScript

# 2. Run Integration Tests
Write-Host "`n[2/3] Running Integration Regression..." -ForegroundColor Cyan
Set-Location $RootDir
$integrationScript = Join-Path $RootDir "run_integration_tests.ps1"
if (Test-Path $integrationScript) {
    & $integrationScript
} else {
    Write-Error "Integration script not found at $integrationScript"
}

# 3. Run Playwright E2E Tests
Write-Host "`n[3/3] Running UI/E2E Regression..." -ForegroundColor Cyan
$frontendDir = Join-Path $RootDir "frontend"
if (Test-Path $frontendDir) {
    Set-Location $frontendDir
    npx playwright test
} else {
    Write-Error "Frontend directory not found at $frontendDir"
}

# Return to root
Set-Location $RootDir

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   REGRESSION SUITE COMPLETE   " -ForegroundColor Green
Write-Host "   All backend, database, and UI features verified.   " -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Green
