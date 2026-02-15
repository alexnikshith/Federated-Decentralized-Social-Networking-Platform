import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

// Mapping of Test Files (or Suite Names) to User Stories
const USER_STORY_MAP = {
    'RefinedReportsPage': 'User Story: View Reports Dashboard',
    'EngagementReport': 'User Story: View Interaction Stats',
    'FederationReport': 'User Story: View Federation Stats',
    'InstanceUsageReport': 'User Story: View Instance Usage',
    'PostActivityReport': 'User Story: View Content Metrics',
    'TimeUsageSummary': 'User Story: View Activity Reports',
    'UserActivityReport': 'User Story: View Activity Reports',
};

// Default mapping for unknown tests
const DEFAULT_STORY = 'User Story: User Interface Components';

console.log('Running Frontend Unit Tests for Reports Epic...');

// Command to run vitest on the reports directory and output JSON
// We use npx vitest. Assuming the user has vitest installed.
// We target only the reports tests.
// Use npx.cmd for Windows compatibility
const command = `npx.cmd vitest run frontend/epics/reports/tests --reporter=json --outputFile=frontend-test-results.json --globals`;

exec(command, (error, stdout, stderr) => {
    // Vitest returns exit code 1 if tests fail, but we still want to parse the report.
    // So we don't return early on error unless it's a system error (not a test failure).
    if (error && error.code !== 1) {
        console.error(`Error executing tests: ${error.message}`);
        return;
    }

    const reportPath = path.join(process.cwd(), 'frontend-test-results.json');
    if (!fs.existsSync(reportPath)) {
        console.error('Test report file not found. Vitest might have failed to run.');
        console.error(stderr);
        return;
    }

    try {
        const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
        const stats = {};

        // reportData.testResults contains the results per file
        reportData.testResults.forEach(fileResult => {
            // Extract filename/suitename
            const fileName = path.basename(fileResult.name, '.test.tsx'); // Simplified

            // Try to match file name to key in map
            let storyName = DEFAULT_STORY;
            for (const key of Object.keys(USER_STORY_MAP)) {
                if (fileName.includes(key) || fileResult.name.includes(key)) {
                    storyName = USER_STORY_MAP[key];
                    break;
                }
            }

            // Also refine based on assertion titles if needed, but per-file is usually enough for high level stories
            // Let's iterate assertions to count pass/fail
            if (!stats[storyName]) {
                stats[storyName] = { passed: 0, failed: 0 };
            }

            fileResult.assertionResults.forEach(assertion => {
                if (assertion.status === 'passed') {
                    stats[storyName].passed++;
                } else if (assertion.status === 'failed') {
                    stats[storyName].failed++;
                }
            });
        });

        // Generate Table
        console.log('\n--- Frontend Test Report ---');
        const header = 'User Stories Tested'.padEnd(40) + 'Number of Test Cases Passed'.padEnd(30) + 'Number of Test Cases Failed'.padEnd(30);
        console.log(header);
        console.log('-'.repeat(40) + ' ' + '-'.repeat(30) + ' ' + '-'.repeat(30));

        let totalPassed = 0;
        let totalFailed = 0;

        Object.keys(stats).forEach(story => {
            const s = stats[story];
            const row = story.padEnd(40) + s.passed.toString().padEnd(30) + s.failed.toString().padEnd(30);
            console.log(row);
            totalPassed += s.passed;
            totalFailed += s.failed;
        });

        console.log('-'.repeat(40) + ' ' + '-'.repeat(30) + ' ' + '-'.repeat(30));
        const totalRow = 'TOTAL'.padEnd(40) + totalPassed.toString().padEnd(30) + totalFailed.toString().padEnd(30);
        console.log(totalRow);

        // Remove the temporary file
        try {
            fs.unlinkSync(reportPath);
        } catch (e) { }

        if (totalFailed > 0) {
            process.exit(1);
        }

    } catch (e) {
        console.error('Failed to parse test report:', e);
    }
});
