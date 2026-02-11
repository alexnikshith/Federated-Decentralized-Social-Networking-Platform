// Migration: Fix reports collection indexes
// This fixes the duplicate key error when reporting multiple posts from the same user
// 
// Issue: The 'reports' collection (for post reports) had an incorrect index on 
// (reporter_id, reported_id) which caused conflicts when reported_id was null.
//
// Solution: 
// 1. Drop the incorrect index
// 2. Create correct index on (reporter_id, post_id) to prevent duplicate post reports

db = db.getSiblingDB('federated_social');

print('Starting reports collection index migration...');

// Step 1: Check and drop incorrect index if it exists
try {
    const indexes = db.reports.getIndexes();
    const hasIncorrectIndex = indexes.some(idx => idx.name === 'reporter_id_1_reported_id_1');

    if (hasIncorrectIndex) {
        print('Dropping incorrect index: reporter_id_1_reported_id_1');
        db.reports.dropIndex('reporter_id_1_reported_id_1');
        print('✓ Incorrect index dropped successfully');
    } else {
        print('ℹ Incorrect index not found, skipping drop');
    }
} catch (e) {
    print('⚠ Error dropping index: ' + e.message);
}

// Step 2: Create correct unique index on (reporter_id, post_id)
try {
    print('Creating correct index: reporter_id_1_post_id_1');
    db.reports.createIndex(
        { reporter_id: 1, post_id: 1 },
        {
            unique: true,
            name: 'reporter_id_1_post_id_1'
        }
    );
    print('✓ Correct index created successfully');
} catch (e) {
    if (e.code === 85) {
        print('ℹ Index already exists, skipping creation');
    } else {
        print('⚠ Error creating index: ' + e.message);
        throw e;
    }
}

// Step 3: Verify user_reports collection has correct index
try {
    const userReportsIndexes = db.user_reports.getIndexes();
    const hasCorrectUserIndex = userReportsIndexes.some(
        idx => idx.name === 'reporter_id_1_reported_id_1'
    );

    if (!hasCorrectUserIndex) {
        print('Creating index for user_reports: reporter_id_1_reported_id_1');
        db.user_reports.createIndex(
            { reporter_id: 1, reported_id: 1 },
            {
                unique: true,
                name: 'reporter_id_1_reported_id_1'
            }
        );
        print('✓ User reports index created successfully');
    } else {
        print('✓ User reports index already exists');
    }
} catch (e) {
    print('⚠ Error with user_reports index: ' + e.message);
}

print('\n=== Migration Summary ===');
print('Reports collection indexes:');
db.reports.getIndexes().forEach(idx => {
    print('  - ' + idx.name + ': ' + JSON.stringify(idx.key));
});

print('\nUser reports collection indexes:');
db.user_reports.getIndexes().forEach(idx => {
    print('  - ' + idx.name + ': ' + JSON.stringify(idx.key));
});

print('\n✓ Migration completed successfully!');
