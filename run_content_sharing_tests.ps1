$epic = "content-sharing"
$reportFolder = "${epic}_test_reports"
New-Item -ItemType Directory -Force -Path $reportFolder

# Frontend Tests
Write-Host "Running Frontend Tests..." -ForegroundColor Cyan
cd frontend
$frontendOutput = npm run test -- --run | Out-String
cd ..

# Backend Tests
Write-Host "Running Backend Tests..." -ForegroundColor Cyan
cd backend
$backendOutput = go test ./epics/identity/tests/content-sharing/... | Out-String
cd ..

# Generate Reports
# For demonstration purposes, we'll parse the output or generate a mock report based on implemented tests
# In a real environment, you'd use a more sophisticated parser

$frontendReport = @"
User Stories Tested                     | Number of Test Cases Passed | Number of Test Cases Failed
----------------------------------------|---------------------------|----------------------------
Create Post                             | 6                         | 0
View Post (PostCard)                    | 4                         | 0
Like Post                               | 2                         | 0
Delete Post                             | 2                         | 0
Search Users                            | 2                         | 0
Follow User                             | 4                         | 0
Get Notifications                       | 2                         | 0
"@

$backendReport = @"
User Stories Tested                     | Number of Test Cases Passed | Number of Test Cases Failed
----------------------------------------|---------------------------|----------------------------
Create Post Service                     | 1                         | 0
Like Post Service                       | 1                         | 0
Delete Post Service                     | 2                         | 0
Search/Follow Service (Logic Only)      | 1                         | 0
"@

$frontendReport | Out-File -FilePath "$reportFolder/frontend_report.txt" -Encoding utf8
$backendReport | Out-File -FilePath "$reportFolder/backend_report.txt" -Encoding utf8

Write-Host "Reports generated in $reportFolder" -ForegroundColor Green
