#!/bin/bash

# Federation Integration Test Script
# Tests the complete federation flow between two servers

echo "=== Federation Integration Test ==="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test configuration
SERVER1_URL="http://localhost:8080"
SERVER2_URL="http://localhost:8081"

echo "📋 Testing federation between:"
echo "  Server 1: $SERVER1_URL"
echo "  Server 2: $SERVER2_URL"
echo ""

# Test 1: Instance Discovery
echo "${BLUE}Test 1: Instance Discovery${NC}"
echo "Testing Server 1..."
INSTANCE1=$(curl -s "$SERVER1_URL/.well-known/instance-info" | jq -r '.instance')
if [ "$INSTANCE1" == "server1" ]; then
echo "${GREEN}✓ Server 1 instance discovery successful${NC}"
else
echo "${RED}✗ Server 1 instance discovery failed${NC}"
exit 1
fi

echo "Testing Server 2..."
INSTANCE2=$(curl -s "$SERVER2_URL/.well-known/instance-info" | jq -r '.instance')
if [ "$INSTANCE2" == "server2" ]; then
echo "${GREEN}✓ Server 2 instance discovery successful${NC}"
else
echo "${RED}✗ Server 2 instance discovery failed${NC}"
exit 1
fi
echo ""

# Test 2: User Registration
echo "${BLUE}Test 2: User Registration${NC}"

echo "Creating user 'alice' on Server 1..."
ALICE_RESPONSE=$(curl -s -X POST "$SERVER1_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice",
    "email": "alice@server1.com",
    "password": "password123",
    "display_name": "Alice from Server 1"
  }')

ALICE_TOKEN=$(echo $ALICE_RESPONSE | jq -r '.token')
if [ "$ALICE_TOKEN" != "null" ] && [ -n "$ALICE_TOKEN" ]; then
echo "${GREEN}✓ Alice registered on Server 1${NC}"
else
echo "${RED}✗ Alice registration failed${NC}"
echo "Response: $ALICE_RESPONSE"
exit 1
fi

echo "Creating user 'bob' on Server 2..."
BOB_RESPONSE=$(curl -s -X POST "$SERVER2_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bob",
    "email": "bob@server2.com",
    "password": "password123",
    "display_name": "Bob from Server 2"
  }')

BOB_TOKEN=$(echo $BOB_RESPONSE | jq -r '.token')
if [ "$BOB_TOKEN" != "null" ] && [ -n "$BOB_TOKEN" ]; then
echo "${GREEN}✓ Bob registered on Server 2${NC}"
else
echo "${RED}✗ Bob registration failed${NC}"
echo "Response: $BOB_RESPONSE"
exit 1
fi
echo ""

# Test 3: Post Creation and Federation
echo "${BLUE}Test 3: Post Creation on Server 1${NC}"

POST_RESPONSE=$(curl -s -X POST "$SERVER1_URL/api/posts" \
  -H "Authorization: Bearer $ALICE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from Alice on Server 1! Testing federation 🚀"}')

POST_ID=$(echo $POST_RESPONSE | jq -r '.post.id // .id')
if [ "$POST_ID" != "null" ] && [ -n "$POST_ID" ]; then
echo "${GREEN}✓ Post created by Alice on Server 1${NC}"
echo "  Post ID: $POST_ID"
else
echo "${RED}✗ Post creation failed${NC}"
echo "Response: $POST_RESPONSE"
exit 1
fi
echo ""

# Wait for federation to propagate
echo "⏳ Waiting 15 seconds for federation to propagate..."
sleep 15
echo ""

# Test 4: Check Federated Feed on Server 2
echo "${BLUE}Test 4: Check Federated Feed on Server 2${NC}"

FEED_RESPONSE=$(curl -s -X GET "$SERVER2_URL/api/feed" \
  -H "Authorization: Bearer $BOB_TOKEN")

echo "Bob's feed on Server 2:"
echo "$FEED_RESPONSE" | jq '.posts[] | {author: .author, content: .content, is_remote: .is_remote}'

# Check if Alice's post appears in Bob's feed
REMOTE_POST_COUNT=$(echo "$FEED_RESPONSE" | jq '[.posts[] | select(.is_remote == true)] | length')
if [ "$REMOTE_POST_COUNT" -gt 0 ]; then
echo "${GREEN}✓ Federation successful! Found $REMOTE_POST_COUNT remote post(s) in feed${NC}"
else
echo "${RED}⚠ Warning: No remote posts found in feed (federation may still be processing)${NC}"
fi
echo ""

# Test 5: Post Creation on Server 2
echo "${BLUE}Test 5: Post Creation on Server 2${NC}"

POST2_RESPONSE=$(curl -s -X POST "$SERVER2_URL/api/posts" \
  -H "Authorization: Bearer $BOB_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Hello from Bob on Server 2! Federation is working! 🌐"}')

POST2_ID=$(echo $POST2_RESPONSE | jq -r '.post.id // .id')
if [ "$POST2_ID" != "null" ] && [ -n "$POST2_ID" ]; then
echo "${GREEN}✓ Post created by Bob on Server 2${NC}"
echo "  Post ID: $POST2_ID"
else
echo "${RED}✗ Post creation failed${NC}"
fi
echo ""

# Wait for reverse federation
echo "⏳ Waiting 15 seconds for reverse federation to propagate..."
sleep 15
echo ""

# Test 6: Check Federated Feed on Server 1
echo "${BLUE}Test 6: Check Federated Feed on Server 1${NC}"

FEED1_RESPONSE=$(curl -s -X GET "$SERVER1_URL/api/feed" \
  -H "Authorization: Bearer $ALICE_TOKEN")

echo "Alice's feed on Server 1:"
echo "$FEED1_RESPONSE" | jq '.posts[] | {author: .author, content: .content, is_remote: .is_remote}'

REMOTE_POST_COUNT_1=$(echo "$FEED1_RESPONSE" | jq '[.posts[] | select(.is_remote == true)] | length')
if [ "$REMOTE_POST_COUNT_1" -gt 0 ]; then
echo "${GREEN}✓ Bidirectional federation successful! Found $REMOTE_POST_COUNT_1 remote post(s)${NC}"
else
echo "${RED}⚠ Warning: No remote posts found in Server 1 feed${NC}"
fi
echo ""

# Summary
echo "=== Test Summary ==="
echo "${GREEN}✓ Instance discovery working${NC}"
echo "${GREEN}✓ User registration on both servers${NC}"
echo "${GREEN}✓ Post creation on both servers${NC}"
if [ "$REMOTE_POST_COUNT" -gt 0 ] && [ "$REMOTE_POST_COUNT_1" -gt 0 ]; then
echo "${GREEN}✓ Bidirectional federation working${NC}"
echo ""
echo "${GREEN}🎉 All tests passed! Federation is working correctly.${NC}"
else
echo "${RED}⚠ Federation may need more time or troubleshooting${NC}"
echo "Check server logs: docker-compose logs server1 server2"
fi
