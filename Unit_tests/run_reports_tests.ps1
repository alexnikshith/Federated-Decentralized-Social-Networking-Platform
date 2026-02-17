# Script to run Reports Epic tests and generate reports
$ErrorActionPreference = "Stop"

$backendRoot = Join-Path $PSScriptRoot "..\backend"
$frontendRoot = Join-Path $PSScriptRoot "..\frontend"
$reportRoot = Join-Path $PSScriptRoot "..\Unit_test results"
$backendTestPath = "./epics/reports/service"
$reportDir = "reports_test_reports"
$reportDirAbs = Join-Path $reportRoot $reportDir

if (!(Test-Path $reportDirAbs)) { New-Item -ItemType Directory -Path $reportDirAbs -Force }

Write-Host "Starting Reports Epic Tests..." -ForegroundColor Cyan

# 1. Run Backend Tests
Write-Host "`nRunning Backend Tests..." -ForegroundColor Yellow
Set-Location $backendRoot
$backendOutput = go test -v $backendTestPath 2>&1 | Out-String
$backendOutput | Out-File -Encoding utf8 (Join-Path $reportDirAbs "backend_full_output.txt")
Set-Location $PSScriptRoot

# Analyze Backend Results
$backendStories = @{
    "R1: View Usage Hours"       = "To be done"
    "R2: View Post Count"        = "To be done"
    "R3: View Engagement Stats"  = "To be done"
    "R4: View Instance Activity" = "To be done"
    "R5: View Federation Stats"  = "To be done"
    "R6: View Activity Timeline" = "To be done"
}

$backendPass = 0
$backendFail = 0

foreach ($line in ($backendOutput -split "`r?`n")) {
    if ($line -match "^--- PASS: TestTimeBasedSummary\b") { $backendStories["R1: View Usage Hours"] = "Pass"; $backendPass++ }
    elseif ($line -match "^--- FAIL: TestTimeBasedSummary\b") { $backendStories["R1: View Usage Hours"] = "Fail"; $backendFail++ }

    if ($line -match "^--- PASS: TestGetPostActivityReport\b") { $backendStories["R2: View Post Count"] = "Pass"; $backendPass++ }
    elseif ($line -match "^--- FAIL: TestGetPostActivityReport\b") { $backendStories["R2: View Post Count"] = "Fail"; $backendFail++ }

    if ($line -match "^--- PASS: TestGetInteractionReport\b") { $backendStories["R3: View Engagement Stats"] = "Pass"; $backendPass++ }
    elseif ($line -match "^--- FAIL: TestGetInteractionReport\b") { $backendStories["R3: View Engagement Stats"] = "Fail"; $backendFail++ }

    if ($line -match "^--- PASS: TestGetFederationReport\b") { $backendStories["R5: View Federation Stats"] = "Pass"; $backendPass++ }
    elseif ($line -match "^--- FAIL: TestGetFederationReport\b") { $backendStories["R5: View Federation Stats"] = "Fail"; $backendFail++ }

    if ($line -match "^--- PASS: TestGetUserActivityReport\b") { $backendStories["R6: View Activity Timeline"] = "Pass"; $backendPass++ }
    elseif ($line -match "^--- FAIL: TestGetUserActivityReport\b") { $backendStories["R6: View Activity Timeline"] = "Fail"; $backendFail++ }
}

# Generate Backend Report
$reportLines = @()
$reportLines += "Backend Reports Test Report"
$reportLines += "============================"
$reportLines += "User Story                 | Status    "
$reportLines += "---------------------------|-----------"
$keys = "R1: View Usage Hours", "R2: View Post Count", "R3: View Engagement Stats", "R4: View Instance Activity", "R5: View Federation Stats", "R6: View Activity Timeline"
foreach ($story in $keys) {
    $status = $backendStories[$story]
    $reportLines += "{0,-26} | {1,-10}" -f $story, $status
}
$reportLines += ""
$reportLines += "Total Passed: $backendPass"
$reportLines += "Total Failed: $backendFail"
$reportLines | Set-Content -Path (Join-Path $reportDirAbs "backend_reports_report.txt") -Encoding ASCII

Write-Host "Backend Report Generated: $reportDir\backend_reports_report.txt"

# 2. Run Frontend Tests
Write-Host "`nRunning Frontend Tests..." -ForegroundColor Yellow
Set-Location $frontendRoot
if (Test-Path "vitest-reports-report.json") { Remove-Item "vitest-reports-report.json" }

& npx vitest run epics/reports/tests --reporter=json --outputFile=vitest-reports-report.json
Set-Location $PSScriptRoot

# Analyze Frontend Results
$reportLines = @()
$reportLines += "Frontend Reports Test Report"
$reportLines += "============================"
$reportLines += "User Story                 | Status    "
$reportLines += "---------------------------|-----------"

$frontendStories = @{
    "R1: Usage Summary"     = "To be done"
    "R2: Post Activity"     = "To be done"
    "R3: Engagement"        = "To be done"
    "R4: Instance Usage"    = "To be done"
    "R5: Federation Report" = "To be done"
    "R6: Activity Report"   = "To be done"
}

$frontendPass = 0
$frontendFail = 0

if (Test-Path (Join-Path $frontendRoot "vitest-reports-report.json")) {
    try {
        $json = Get-Content (Join-Path $frontendRoot "vitest-reports-report.json") | ConvertFrom-Json
        
        foreach ($testFile in $json.testResults) {
            $name = Split-Path $testFile.name -Leaf
            $allPassed = $true
            foreach ($assertion in $testFile.assertionResults) {
                if ($assertion.status -ne "passed") { $allPassed = $false }
            }
            
            $status = if ($allPassed) { "Pass" } else { "Fail" }

            if ($name -match "timeUsageSummary") { $frontendStories["R1: Usage Summary"] = $status }
            elseif ($name -match "postActivityReport") { $frontendStories["R2: Post Activity"] = $status }
            elseif ($name -match "engagementReport") { $frontendStories["R3: Engagement"] = $status }
            elseif ($name -match "instanceUsageReport") { 
                $frontendStories["R4: Instance Usage"] = "To be done" 
            }
            elseif ($name -match "federationReport") { $frontendStories["R5: Federation Report"] = $status }
            elseif ($name -match "userActivityReport") { $frontendStories["R6: Activity Report"] = $status }
        }
    }
    catch {
        Write-Host "Warning: Failed to parse frontend JSON" -ForegroundColor Yellow
    }
}

# Calculate final counts based on mapped stories
foreach ($val in $frontendStories.Values) {
    if ($val -eq "Pass") { $frontendPass++ }
    elseif ($val -eq "Fail") { $frontendFail++ }
}

$keys = "R1: Usage Summary", "R2: Post Activity", "R3: Engagement", "R4: Instance Usage", "R5: Federation Report", "R6: Activity Report"
foreach ($story in $keys) {
    $reportLines += "{0,-26} | {1,-10}" -f $story, $frontendStories[$story]
}

$reportLines += ""
$reportLines += "Total Passed: $frontendPass"
$reportLines += "Total Failed: $frontendFail"
$reportLines | Set-Content -Path (Join-Path $reportDirAbs "frontend_reports_report.txt") -Encoding ASCII

Write-Host "Frontend Report Generated: $(Join-Path $reportDirAbs 'frontend_reports_report.txt')"

Write-Host "`nReports saved to directory: $reportDir" -ForegroundColor Green
