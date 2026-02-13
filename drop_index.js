const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://kaushal:mongodb_123@ecoquest.kntdk2q.mongodb.net/federated_social?retryWrites=true&w=majority";

async function dropIndex() {
    const client = new MongoClient(uri);

    try {
        await client.connect();
        console.log("Connected to MongoDB Atlas");

        const db = client.db('federated_social');
        const collection = db.collection('remote_follows');

        // List all indexes first
        const indexes = await collection.indexes();
        console.log("Current indexes:", JSON.stringify(indexes, null, 2));

        // Drop the problematic index
        try {
            await collection.dropIndex('activity_id_1');
            console.log("Successfully dropped activity_id_1 index");
        } catch (err) {
            console.log("Error dropping index (might not exist):", err.message);
        }

        // List indexes after dropping
        const indexesAfter = await collection.indexes();
        console.log("Indexes after drop:", JSON.stringify(indexesAfter, null, 2));

    } finally {
        await client.close();
    }
}

dropIndex().catch(console.error);
