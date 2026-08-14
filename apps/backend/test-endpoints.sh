#!/bin/bash

# Configuration
API_URL="http://localhost:4000"
COOKIE_JAR="cookies.txt"

# Admin Credentials
EMAIL="nishanrajak01@gmail.com"
PASSWORD="nishanr31@"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "Starting API Tests..."
rm -f $COOKIE_JAR

# ---------------------------------------------------------
# 1. Login
# ---------------------------------------------------------
echo -e "\n${GREEN}Testing: POST /login${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/login" \
  -c $COOKIE_JAR -b $COOKIE_JAR \
  -H "Content-Type: application/json" \
  -d '{
    "email": "'$EMAIL'",
    "password": "'$PASSWORD'"
  }')
echo $LOGIN_RESPONSE | jq . || echo $LOGIN_RESPONSE

# Extract the Access Token using jq
ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.accessToken')

if [ "$ACCESS_TOKEN" == "null" ] || [ -z "$ACCESS_TOKEN" ]; then
    echo -e "${RED}Failed to get Access Token. Cannot proceed with authenticated endpoints.${NC}"
    exit 1
fi

echo -e "\n${GREEN}Access Token Extracted Successfully!${NC}"

# ---------------------------------------------------------
# 2. Create Member
# ---------------------------------------------------------
echo -e "\n${GREEN}Testing: POST /members${NC}"
CREATE_MEMBER_RESPONSE=$(curl -s -X POST "$API_URL/members" \
  -c $COOKIE_JAR -b $COOKIE_JAR \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "phone": "1234567890",
    "email": "johndoe@example.com"
  }')
echo $CREATE_MEMBER_RESPONSE | jq .

# Extract the new member ID
# Fastify standard response wrap typically has it at .data.member.id or .member.id depending on your standard.
MEMBER_ID=$(echo $CREATE_MEMBER_RESPONSE | jq -r '.data.member.id // .member.id // .id // empty')

if [ "$MEMBER_ID" == "null" ] || [ -z "$MEMBER_ID" ]; then
    echo -e "${RED}Failed to create Member. Cannot test fetch or delete.${NC}"
else
    # ---------------------------------------------------------
    # 3. Fetch Member (Check)
    # ---------------------------------------------------------
    echo -e "\n${GREEN}Testing: GET /members/$MEMBER_ID${NC}"
    curl -s -X GET "$API_URL/members/$MEMBER_ID" \
      -c $COOKIE_JAR -b $COOKIE_JAR \
      -H "Authorization: Bearer $ACCESS_TOKEN" | jq .

    # ---------------------------------------------------------
    # 4. Delete Member
    # ---------------------------------------------------------
    echo -e "\n${GREEN}Testing: DELETE /members/$MEMBER_ID${NC}"
    curl -s -X DELETE "$API_URL/members/$MEMBER_ID" \
      -c $COOKIE_JAR -b $COOKIE_JAR \
      -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
      
    # ---------------------------------------------------------
    # 5. Verify Deletion
    # ---------------------------------------------------------
    echo -e "\n${GREEN}Testing: GET /members/$MEMBER_ID (Should fail or return 404)${NC}"
    curl -s -X GET "$API_URL/members/$MEMBER_ID" \
      -c $COOKIE_JAR -b $COOKIE_JAR \
      -H "Authorization: Bearer $ACCESS_TOKEN" | jq .
fi

# ---------------------------------------------------------
# 6. Test Refresh Token: POST /refresh
# ---------------------------------------------------------
echo -e "\n${GREEN}Testing: POST /refresh (using cookie jar)${NC}"
REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/refresh" \
  -c $COOKIE_JAR -b $COOKIE_JAR \
  -H "Content-Type: application/json")
echo $REFRESH_RESPONSE | jq .

# Extract NEW Access Token using jq
NEW_ACCESS_TOKEN=$(echo $REFRESH_RESPONSE | jq -r '.accessToken')

# ---------------------------------------------------------
# 7. Logout
# ---------------------------------------------------------
echo -e "\n${GREEN}Testing: POST /logout${NC}"
curl -s -X POST "$API_URL/logout" \
  -c $COOKIE_JAR -b $COOKIE_JAR \
  -H "Authorization: Bearer $NEW_ACCESS_TOKEN" | jq .

echo -e "\n${GREEN}Tests Complete!${NC}"
