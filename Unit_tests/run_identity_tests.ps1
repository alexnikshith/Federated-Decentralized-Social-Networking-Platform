
# Script to run Identity Epic tests and generate reports

$backendRoot = Join-Path $PSScriptRoot "..\backend"
$frontendRoot = Join-Path $PSScriptRoot "..\frontend"
$backendServiceRelPath = "./epics/identity/service"
$frontendTestRelPath = "epics/identity/tests"
$backendReportFile = "backend_identity_test_report.txt"
$frontendReportFile = "frontend_identity_test_report.txt"

$reportRoot = Join-Path $PSScriptRoot "..\Unit_test results"
$reportDir = "identity_test_reports"
$reportDirAbsPath = Join-Path $reportRoot $reportDir

# Create report directory if it doesn't exist
if (-not (Test-Path $reportDirAbsPath)) {
    New-Item -ItemType Directory -Path $reportDirAbsPath -Force | Out-Null
}

# Absolute paths for reports
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

    if ($line -match "--- PASS: TestProfileService_GetActivity") { $backendStories["View User Activity"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestProfileService_GetActivity") { $backendStories["View User Activity"] = "Fail"; $backendFail++ }
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
    $frontendStories = @{
        "US1.1: Create Account"       = "To be done"
        "US1.2: Secure Login"         = "To be done"
        "US1.3: Logout"               = "To be done"
        "US1.4: Change Password"      = "To be done"
        "US1.5: Profile Visibility"   = "To be done"
        "US1.6: Edit Profile"         = "To be done"
        "US1.7: Account Deactivation" = "To be done"
        "US1.8: View User Activity"   = "To be done"
    }

    foreach ($result in $jsonContent.testResults) {
        $name = $result.name
        $allPassed = $true
        foreach ($assertion in $result.assertionResults) {
            if ($assertion.status -ne "passed") { $allPassed = $false }
        }
        $status = if ($allPassed) { "Pass" } else { "Fail" }

        if ($name -match "authStore") { 
            $frontendStories["US1.1: Create Account"] = $status
            $frontendStories["US1.2: Secure Login"] = $status
            $frontendStories["US1.3: Logout"] = $status
        }
        elseif ($name -match "SettingsPage") { 
            $frontendStories["US1.4: Change Password"] = $status
            $frontendStories["US1.5: Profile Visibility"] = $status
            $frontendStories["US1.6: Edit Profile"] = $status
            $frontendStories["US1.7: Account Deactivation"] = $status
            $frontendStories["US1.8: View User Activity"] = $status
        }
        elseif ($name -match "ProfileUI|Activity") {
            $frontendStories["US1.5: Profile Visibility"] = $status
            $frontendStories["US1.8: View User Activity"] = $status
        }
    }

    # Calculate final counts based on mapped stories
    foreach ($val in $frontendStories.Values) {
        if ($val -eq "Pass") { $frontendPass++ }
        elseif ($val -eq "Fail") { $frontendFail++ }
    }
    
    $feReport = "Frontend Identity Test Report`n"
    $feReport += "=============================`n"
    $feReport += "{0,-25} | {1,-10}`n" -f "User Story", "Status"
    $feReport += "--------------------------|------------`n"
    
    $keys = "US1.1: Create Account", "US1.2: Secure Login", "US1.3: Logout", "US1.4: Change Password", "US1.5: Profile Visibility", "US1.6: Edit Profile", "US1.7: Account Deactivation", "US1.8: View User Activity"
    foreach ($story in $keys) {
        $feReport += "{0,-28} | {1,-10}`n" -f $story, $frontendStories[$story]
    }

    $feReport += "`nTotal Passed: $frontendPass`n"
    $feReport += "Total Failed: $frontendFail`n"

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
if ($null -ne $frontendPass) {
    Write-Host "Frontend Tests: Passed: $frontendPass, Failed: $frontendFail"
}
else {
    Write-Host "Frontend Tests: Could not execute or parse results."
}
Write-Host "`nReports saved to directory: $reportDir"
Write-Host " - $backendReportFile"
Write-Host " - $frontendReportFile"
Write-Host " - backend_full_output.txt"
