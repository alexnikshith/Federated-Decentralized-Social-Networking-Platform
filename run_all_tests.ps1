# Script to run all Epic Unit Tests and consolidate results
$ErrorActionPreference = "Continue"

$unitTestsDir = Join-Path $PSScriptRoot "Unit_tests"
$resultsDir = Join-Path $PSScriptRoot "Unit_test results"

# Freshly generate results directory
if (Test-Path $resultsDir) {
    Remove-Item -Path $resultsDir -Recurse -Force | Out-Null
}
New-Item -ItemType Directory -Path $resultsDir -Force | Out-Null


Write-Host "==========================================" -ForegroundColor Magenta
Write-Host "   RUNNING ALL EPIC UNIT TESTS   " -ForegroundColor Magenta
Write-Host "==========================================" -ForegroundColor Magenta

$testScripts = @(
    "run_identity_tests.ps1",
    "run_content_sharing_tests.ps1",
    "run_federation_tests.ps1",
    "run_reports_tests.ps1",
    "run_safety_tests.ps1"
)

foreach ($script in $testScripts) {
    $scriptPath = Join-Path $unitTestsDir $script
    if (Test-Path $scriptPath) {
        Write-Host "`n>>> Executing $script ..." -ForegroundColor Cyan -Bold
        & $scriptPath
    }
    else {
        Write-Warning "Could not find test script: $scriptPath"
    }
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "   ALL TESTS COMPLETED   " -ForegroundColor Green
Write-Host "   Reports are available in: $resultsDir   " -ForegroundColor Gray
Write-Host "==========================================" -ForegroundColor Green
