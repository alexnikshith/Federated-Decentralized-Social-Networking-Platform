# Script to run Safety Epic tests and generate pretty reports

$backendRoot = "backend"
$frontendRoot = "frontend"
$backendTestPath = "./epics/safety/tests"
$frontendTestPath = "epics/safety/tests"
$reportDir = "SAFETY_test_reports"
$reportDirAbs = Join-Path (Get-Location) $reportDir

if (-not (Test-Path $reportDirAbs)) {
    New-Item -ItemType Directory -Path $reportDirAbs | Out-Null
}

$reportFile = Join-Path $reportDirAbs "SAFETY_FINAL_REPORT.txt"
$backendReportFile = Join-Path $reportDirAbs "backend_safety_report.txt"
$frontendReportFile = Join-Path $reportDirAbs "frontend_safety_report.txt"
$backendFullOutput = Join-Path $reportDirAbs "backend_full_output.txt"

Write-Host "Starting Safety Epic Tests..." -ForegroundColor Cyan

# --- Backend Tests ---
Write-Host "`nRunning Backend Tests..." -ForegroundColor Yellow
Push-Location $backendRoot
$backendOutput = go test -v $backendTestPath/... 2>&1
Pop-Location

$backendOutput | Out-File $backendFullOutput -Encoding UTF8

$backendPass = 0
$backendFail = 0
$backendStories = @{}

foreach ($line in $backendOutput) {
    if ($line -match "--- PASS: TestAuth_Signup_PasswordHashing") { $backendStories["Secure Password Storage"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestAuth_Signup_PasswordHashing") { $backendStories["Secure Password Storage"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestAuth_Login_OTPGeneration") { $backendStories["OTP Generation"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestAuth_Login_OTPGeneration") { $backendStories["OTP Generation"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestAuth_VerifyOTP") { $backendStories["Verify OTP (2FA)"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestAuth_VerifyOTP") { $backendStories["Verify OTP (2FA)"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestBlock_BlockUser") { $backendStories["Block User Logic"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestBlock_BlockUser") { $backendStories["Block User Logic"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestBlock_UnblockUser") { $backendStories["Unblock User Logic"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestBlock_UnblockUser") { $backendStories["Unblock User Logic"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestReport_SubmitReport") { $backendStories["Report User Logic"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestReport_SubmitReport") { $backendStories["Report User Logic"] = "Fail"; $backendFail++ }
}

$backendResults = "Backend Safety Test Report`n"
$backendResults += "==========================`n"
$backendResults += "{0,-30} | {1,-10}`n" -f "User Story / Feature", "Status"
$backendResults += "-------------------------------|------------`n"
foreach ($key in $backendStories.Keys) {
    $backendResults += "{0,-30} | {1,-10}`n" -f $key, $backendStories[$key]
}
$backendResults += "`nTotal Passed: $backendPass`n"
$backendResults += "Total Failed: $backendFail`n"
$backendResults | Out-File $backendReportFile -Encoding UTF8

# --- Frontend Tests ---
Write-Host "Running Frontend Tests..." -ForegroundColor Yellow
Push-Location $frontendRoot
# Run vitest and capture JSON
$null = cmd /c "npx -y vitest run $frontendTestPath --reporter=json --outputFile=temp_safety.json"
if (Test-Path "temp_safety.json") {
    $json = Get-Content "temp_safety.json" | ConvertFrom-Json
    $frontendPass = 0
    $frontendFail = 0
    $feDetails = ""

    foreach ($result in $json.testResults) {
        foreach ($assertion in $result.assertionResults) {
            $status = $assertion.status
            if ($status -eq "passed") { $frontendPass++ } else { $frontendFail++ }
            $feDetails += "- {0}: {1}`n" -f $assertion.title, $status
        }
    }

    $frontendResults = "Frontend Safety Test Report`n"
    $frontendResults += "===========================`n"
    $frontendResults += "{0,-30} | {1,-10} | {2,-10}`n" -f "Component/Story", "Passed", "Failed"
    $frontendResults += "-------------------------------|------------|------------`n"
    $frontendResults += "{0,-30} | {1,-10} | {2,-10}`n" -f "Total Tests", $frontendPass, $frontendFail
    $frontendResults += "`nDetailed Tests:`n"
    $frontendResults += $feDetails
    $frontendResults | Out-File $frontendReportFile -Encoding UTF8
    
    Remove-Item "temp_safety.json"
}
Pop-Location

# Create Consolidated Report
$finalReport = $backendResults + "`n" + $frontendResults
$finalReport | Out-File $reportFile -Encoding UTF8

Write-Host "`n=== Consolidated Summary ===`n" -ForegroundColor White
Write-Host "Backend Tests: Passed: $backendPass, Failed: $backendFail"
Write-Host "Frontend Tests: Passed: $frontendPass, Failed: $frontendFail"
Write-Host "`nReports saved to directory: $reportDir"
Write-Host " - SAFETY_FINAL_REPORT.txt"
Write-Host " - backend_safety_report.txt"
Write-Host " - frontend_safety_report.txt"
