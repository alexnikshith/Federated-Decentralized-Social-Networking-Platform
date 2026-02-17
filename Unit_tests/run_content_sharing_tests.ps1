
# Script to run Content Sharing Epic tests and generate reports

$backendRoot = Join-Path $PSScriptRoot "..\backend"
$frontendRoot = Join-Path $PSScriptRoot "..\frontend"
$backendServiceRelPath = "./epics/content-sharing/service"
$frontendTestRelPath = "epics/content-sharing/tests"
$backendReportFile = "backend_content-sharing_test_report.txt"
$frontendReportFile = "frontend_content-sharing_test_report.txt"

$reportRoot = Join-Path $PSScriptRoot "..\Unit_test results"
$reportDir = "content-sharing_test_reports"
$reportDirAbsPath = Join-Path $reportRoot $reportDir

# Create report directory if it doesn't exist
if (-not (Test-Path $reportDirAbsPath)) {
    New-Item -ItemType Directory -Path $reportDirAbsPath -Force | Out-Null
}

# Absolute paths for reports
$backendReportAbsPath = Join-Path $reportDirAbsPath $backendReportFile
$frontendReportAbsPath = Join-Path $reportDirAbsPath $frontendReportFile
$backendFullOutputAbsPath = Join-Path $reportDirAbsPath "backend_full_output.txt"

Write-Host "Starting Content Sharing Epic Tests..." -ForegroundColor Cyan

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
    if ($line -match "--- PASS: TestPostService_CreatePost") { $backendStories["Create Post"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestPostService_CreatePost") { $backendStories["Create Post"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestPostService_ViewPosts") { $backendStories["View Posts"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestPostService_ViewPosts") { $backendStories["View Posts"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestPostService_LikePost") { $backendStories["Like Posts"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestPostService_LikePost") { $backendStories["Like Posts"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestPostService_CommentOnPost") { $backendStories["Comment on Posts"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestPostService_CommentOnPost") { $backendStories["Comment on Posts"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestPostService_DeleteOwnPost") { $backendStories["Delete Own Posts"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestPostService_DeleteOwnPost") { $backendStories["Delete Own Posts"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestPostService_FollowOthers") { $backendStories["Follow Others"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestPostService_FollowOthers") { $backendStories["Follow Others"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestPostService_ViewNotifications") { $backendStories["View Notifications"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestPostService_ViewNotifications") { $backendStories["View Notifications"] = "Fail"; $backendFail++ }

    if ($line -match "--- PASS: TestPostService_SearchUsers") { $backendStories["Search Users"] = "Pass"; $backendPass++ }
    elseif ($line -match "--- FAIL: TestPostService_SearchUsers") { $backendStories["Search Users"] = "Fail"; $backendFail++ }
}

# Generate Backend Report
$reportContent = "Backend Content Sharing Test Report`n"
$reportContent += "===================================`n"
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
# Run vitest and capture output as JSON
$frontendOutput = cmd /c "npx -y vitest run $frontendTestRelPath --reporter=json --outputFile=frontend_temp_output.json" 2>&1
# Check if json was created
if (Test-Path "frontend_temp_output.json") {
    $jsonContent = Get-Content "frontend_temp_output.json" | ConvertFrom-Json
    $frontendPass = 0
    $frontendFail = 0
    $frontendStories = @{
        "US2.1: Post Creation"      = "To be done"
        "US2.2: View Posts"         = "To be done"
        "US2.3: Like Posts"         = "To be done"
        "US2.4: Comment on Posts"   = "To be done"
        "US2.5: Delete Own Posts"   = "To be done"
        "US2.6: Follow Others"      = "To be done"
        "US2.7: View Notifications" = "To be done"
        "US2.8: Search Users"       = "To be done"
    }

    foreach ($result in $jsonContent.testResults) {
        $name = $result.name
        $allPassed = $true
        foreach ($assertion in $result.assertionResults) {
            if ($assertion.status -ne "passed") { $allPassed = $false }
        }
        $status = if ($allPassed) { "Pass" } else { "Fail" }

        if ($name -match "PostCard|Comment") { 
            $frontendStories["US2.2: View Posts"] = $status
            $frontendStories["US2.3: Like Posts"] = $status
            $frontendStories["US2.4: Comment on Posts"] = $status
            $frontendStories["US2.5: Delete Own Posts"] = $status
        }
        elseif ($name -match "Feed|PostList") { 
            $frontendStories["US2.2: View Posts"] = $status
            $frontendStories["US2.5: Delete Own Posts"] = $status
        }
        elseif ($name -match "CreatePost|Editor") { 
            $frontendStories["US2.1: Post Creation"] = $status
        }
        elseif ($name -match "Notification") {
            $frontendStories["US2.7: View Notifications"] = $status
        }
        elseif ($name -match "Search|UserList") {
            $frontendStories["US2.8: Search Users"] = $status
            $frontendStories["US2.6: Follow Others"] = $status
        }
    }

    # Calculate final counts based on mapped stories
    foreach ($val in $frontendStories.Values) {
        if ($val -eq "Pass") { $frontendPass++ }
        elseif ($val -eq "Fail") { $frontendFail++ }
    }
    
    # Generate Frontend Report
    $feReport = "Frontend Content Sharing Test Report`n"
    $feReport += "====================================`n"
    $feReport += "{0,-25} | {1,-10}`n" -f "User Story", "Status"
    $feReport += "--------------------------|------------`n"
    
    $keys = "US2.1: Post Creation", "US2.2: View Posts", "US2.3: Like Posts", "US2.4: Comment on Posts", "US2.5: Delete Own Posts", "US2.6: Follow Others", "US2.7: View Notifications", "US2.8: Search Users"
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
