
# Script to run Identity Epic tests and generate reports

$backendRoot = "backend"
$frontendRoot = "frontend"
$backendServiceRelPath = "./epics/identity/service"
$frontendTestRelPath = "epics/identity/tests"
$backendReportFile = "backend_identity_test_report.txt"
$frontendReportFile = "frontend_identity_test_report.txt"

$reportDir = "identity_test_reports"
# Create report directory if it doesn't exist
if (-not (Test-Path $reportDir)) {
    New-Item -ItemType Directory -Path $reportDir | Out-Null
}

# Absolute paths for reports (to ensure they end up in the report directory)
$reportDirAbsPath = Join-Path (Get-Location) $reportDir
$backendReportAbsPath = Join-Path $reportDirAbsPath $backendReportFile
$frontendReportAbsPath = Join-Path $reportDirAbsPath $frontendReportFile
$backendFullOutputAbsPath = Join-Path $reportDirAbsPath "backend_full_output.txt"

Write-Host "Starting Identity Epic Tests..." -ForegroundColor Cyan

# --- Backend Tests ---
Write-Host "`nRunning Backend Tests..." -ForegroundColor Yellow
Push-Location $backendRoot
$backendOutput = go test -v $backendServiceRelPath 2>&1
Pop-Location

# Save output to analyze
$backendOutput | Out-File $backendFullOutputAbsPath -Encoding UTF8
Write-Host "Backend Full Output saved to: $reportDir\backend_full_output.txt" -ForegroundColor Gray

# Parse Backend Output
$backendPass = 0
$backendFail = 0
$backendStories = @{}

foreach ($line in $backendOutput) {
    if ($line -match "--- PASS: TestAuthService_Signup") { $backendStories["Create Account"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestAuthService_Signup") { $backendStories["Create Account"] = "Fail"; $backendFail++ }
    
    if ($line -match "--- PASS: TestAuthService_InitiateLogin") { $backendStories["Secure Login"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestAuthService_InitiateLogin") { $backendStories["Secure Login"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestAuthService_Logout") { $backendStories["Logout"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestAuthService_Logout") { $backendStories["Logout"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestAuthService_ChangePassword") { $backendStories["Change Password"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestAuthService_ChangePassword") { $backendStories["Change Password"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestProfileService_GetProfile") { $backendStories["Profile Visibility"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestProfileService_GetProfile") { $backendStories["Profile Visibility"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestProfileService_UpdateProfile") { $backendStories["Edit Profile"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestProfileService_UpdateProfile") { $backendStories["Edit Profile"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestProfileService_DeactivateAccount") { $backendStories["Account Deactivation"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestProfileService_DeactivateAccount") { $backendStories["Account Deactivation"] = "Fail"; $backendFail++ }
}

# Generate Backend Report
$reportContent = "Backend Identity Test Report`n"
$reportContent += "============================`n"
$reportContent += "{0,-25} | {1,-10}`n" -f "User Story", "Status"
$reportContent += "--------------------------|------------`n"
foreach ($key in $backendStories.Keys) {
    $reportContent += "{0,-25} | {1,-10}`n" -f $key, $backendStories[$key]
}
$reportContent += "`nTotal Passed: $backendPass`n"
$reportContent += "Total Failed: $backendFail`n"
$reportContent | Out-File $backendReportAbsPath -Encoding UTF8
Write-Host "Backend Report Generated: $reportDir\$backendReportFile" -ForegroundColor Green


# --- Frontend Tests ---
Write-Host "`nRunning Frontend Tests..." -ForegroundColor Yellow
Push-Location $frontendRoot
# Run vitest and capture output as JSON for easier parsing if possible, or text
# Note: npx vitest might require interaction if not installed, using --yes
$frontendOutput = cmd /c "npx -y vitest run $frontendTestRelPath --reporter=json --outputFile=frontend_temp_output.json" 2>&1
# Check if json was created
if (Test-Path "frontend_temp_output.json") {
    $jsonContent = Get-Content "frontend_temp_output.json" | ConvertFrom-Json
    $frontendPass = 0
    $frontendFail = 0
    $frontendStories = @{}

    # Map output to stories (Logic simplified for demo)
    # Mapping logic:
    # authStore -> Login/Session Logic
    # SettingsPage -> Profile/Account UI
    
    foreach ($result in $jsonContent.testResults) {
        foreach ($assertion in $result.assertionResults) {
            if ($assertion.status -eq "passed") { $frontendPass++ }
            else { $frontendFail++ }
            
             # Basic mapping based on ancestor titles
            if ($assertion.ancestorTitles -contains "useAuthStore") {
                $frontendStories["Auth State Management"] = "Tested" 
            }
            if ($assertion.ancestorTitles -contains "SettingsPage") {
                $frontendStories["Profile Settings UI"] = "Tested"
            }
        }
    }
    
    # Generate Frontend Report
    $feReport = "Frontend Identity Test Report`n"
    $feReport += "=============================`n"
    $feReport += "{0,-30} | {1,-10} | {2,-10}`n" -f "Component/Story", "Passed", "Failed"
    $feReport += "-------------------------------|------------|------------`n"
    # Simplified reporting since JSON structure varies by version
    $feReport += "{0,-30} | {1,-10} | {2,-10}`n" -f "Total Tests", $frontendPass, $frontendFail
    $feReport += "`nDetailed Tests:`n"
    foreach ($result in $jsonContent.testResults) {
         foreach ($assertion in $result.assertionResults) {
            $feReport += "- {0}: {1}`n" -f $assertion.title, $assertion.status
         }
    }

    $feReport | Out-File $frontendReportAbsPath -Encoding UTF8
    Write-Host "Frontend Report Generated: $reportDir\$frontendReportFile" -ForegroundColor Green
    
    # Cleanup json
    Remove-Item "frontend_temp_output.json" -ErrorAction SilentlyContinue
}
else {
    Write-Host "Frontend tests failed to generate JSON output. Check console." -ForegroundColor Red
    $frontendOutput | Out-File "$reportDirAbsPath\frontend_error_log.txt" -Encoding UTF8
}
Pop-Location

# --- Summary ---
Write-Host "`n=== Consolidated Summary ===`n" -ForegroundColor White
Write-Host "Backend Tests: Passed: $backendPass, Failed: $backendFail"
if ($frontendPass -ne $null) {
    Write-Host "Frontend Tests: Passed: $frontendPass, Failed: $frontendFail"
}
else {
    Write-Host "Frontend Tests: Could not execute or parse results."
}
Write-Host "`nReports saved to directory: $reportDir"
Write-Host " - $backendReportFile"
Write-Host " - $frontendReportFile"
Write-Host " - backend_full_output.txt"
