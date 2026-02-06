#!/bin/bash

# Federation Database Initialization Script
# This script initializes trusted instances in both databases

echo "=== Federation Database Initialization ==="

# MongoDB connection details (from .env)
MONGO_URI="mongodb+srv://kaushal:mongodb_123@ecoquest.kntdk2q.mongodb.net/?retryWrites=true&w=majority"

echo "Initializing Server 1 database (federated_social)..."

# Initialize Server 1 - Add Server 2 as trusted instance
mongosh "$MONGO_URI/federated_social" --quiet --eval '
db.instances.insertOne({
  domain: "localhost:8081",
  inbox_url: "http://localhost:8081/federation/inbox",
  trust_level: "trusted",
  last_seen_at: new Date(),
  created_at: new Date(),
  updated_at: new Date()
});
print("✓ Added server2 (localhost:8081) as trusted instance in server1 database");
'

echo ""
echo "Initializing Server 2 database (federated_social_server2)..."

# Initialize Server 2 - Add Server 1 as trusted instance  
mongosh "$MONGO_URI/federated_social_server2" --quiet --eval '
db.instances.insertOne({
  domain: "localhost:8080",
  inbox_url: "http://localhost:8080/federation/inbox",
  trust_level: "trusted",
  last_seen_at: new Date(),
  created_at: new Date(),
  updated_at: new Date()
});
print("✓ Added server1 (localhost:8080) as trusted instance in server2 database");
'

echo ""
echo "=== Initialization Complete ==="
echo ""
echo "Both servers are now configured to trust each other."
echo "You can start the servers with: docker-compose up server1 server2"
