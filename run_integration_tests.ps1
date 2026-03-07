# Run this script to execute all Backend Integration Tests
# Ensure your MongoDB container is running!

Write-Host ">>> Starting Integration Tests..." -ForegroundColor Cyan

Set-Location backend

# Run the tests with verbose output
go test -v ./tests/integration/...

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n>>> ALL INTEGRATION TESTS PASSED! <<<" -ForegroundColor Green -Bold
} else {
    Write-Host "`n>>> INTEGRATION TESTS FAILED! <<<" -ForegroundColor Red -Bold
}

Set-Location ..
pause
