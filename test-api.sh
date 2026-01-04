#!/bin/bash

# HRM SaaS API Test Script
# This script tests the authentication endpoints

API_URL="http://localhost:5000/api"
FRONTEND_URL="http://localhost:3000"

echo "========================================"
echo "HRM SaaS API Testing Script"
echo "========================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Health Check${NC}"
HEALTH_RESPONSE=$(curl -s -X GET "$API_URL/health")
echo "Response: $HEALTH_RESPONSE"
if echo "$HEALTH_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Health check passed${NC}"
else
    echo -e "${RED}✗ Health check failed${NC}"
fi
echo ""

# Test 2: Register New Tenant
echo -e "${YELLOW}Test 2: Register New Tenant${NC}"
TIMESTAMP=$(date +%s)
REGISTER_DATA="{
  \"companyName\": \"Test Company $TIMESTAMP\",
  \"subdomain\": \"testco$TIMESTAMP\",
  \"email\": \"admin$TIMESTAMP@testcompany.com\",
  \"password\": \"SecurePassword123!\",
  \"firstName\": \"Test\",
  \"lastName\": \"Admin\"
}"

REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA")

echo "Response: $REGISTER_RESPONSE"

if echo "$REGISTER_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Registration successful${NC}"
    
    # Extract tokens
    ACCESS_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    REFRESH_TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"refreshToken":"[^"]*"' | cut -d'"' -f4)
    USER_EMAIL=$(echo "$REGISTER_RESPONSE" | grep -o '"email":"[^"]*"' | cut -d'"' -f4)
    
    echo "Access Token: ${ACCESS_TOKEN:0:50}..."
    echo "Refresh Token: ${REFRESH_TOKEN:0:50}..."
else
    echo -e "${RED}✗ Registration failed${NC}"
    exit 1
fi
echo ""

# Test 3: Get Current User
echo -e "${YELLOW}Test 3: Get Current User${NC}"
ME_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "Response: $ME_RESPONSE"
if echo "$ME_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Get current user successful${NC}"
else
    echo -e "${RED}✗ Get current user failed${NC}"
fi
echo ""

# Test 4: Login
echo -e "${YELLOW}Test 4: Login${NC}"
LOGIN_DATA="{
  \"email\": \"$USER_EMAIL\",
  \"password\": \"SecurePassword123!\"
}"

LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA")

echo "Response: $LOGIN_RESPONSE"
if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Login successful${NC}"
    
    # Extract new tokens
    NEW_ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"accessToken":"[^"]*"' | cut -d'"' -f4)
    echo "New Access Token: ${NEW_ACCESS_TOKEN:0:50}..."
else
    echo -e "${RED}✗ Login failed${NC}"
fi
echo ""

# Test 5: Refresh Token
echo -e "${YELLOW}Test 5: Refresh Token${NC}"
REFRESH_DATA="{
  \"refreshToken\": \"$REFRESH_TOKEN\"
}"

REFRESH_RESPONSE=$(curl -s -X POST "$API_URL/auth/refresh-token" \
  -H "Content-Type: application/json" \
  -d "$REFRESH_DATA")

echo "Response: $REFRESH_RESPONSE"
if echo "$REFRESH_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Token refresh successful${NC}"
else
    echo -e "${RED}✗ Token refresh failed${NC}"
fi
echo ""

# Test 6: Logout
echo -e "${YELLOW}Test 6: Logout${NC}"
LOGOUT_DATA="{
  \"refreshToken\": \"$REFRESH_TOKEN\"
}"

LOGOUT_RESPONSE=$(curl -s -X POST "$API_URL/auth/logout" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -d "$LOGOUT_DATA")

echo "Response: $LOGOUT_RESPONSE"
if echo "$LOGOUT_RESPONSE" | grep -q '"success":true'; then
    echo -e "${GREEN}✓ Logout successful${NC}"
else
    echo -e "${RED}✗ Logout failed${NC}"
fi
echo ""

# Test 7: Invalid Token (should fail)
echo -e "${YELLOW}Test 7: Invalid Token Test${NC}"
INVALID_RESPONSE=$(curl -s -X GET "$API_URL/auth/me" \
  -H "Authorization: Bearer invalid_token_123")

echo "Response: $INVALID_RESPONSE"
if echo "$INVALID_RESPONSE" | grep -q '"success":false'; then
    echo -e "${GREEN}✓ Invalid token correctly rejected${NC}"
else
    echo -e "${RED}✗ Invalid token test failed${NC}"
fi
echo ""

# Summary
echo "========================================"
echo -e "${GREEN}All tests completed!${NC}"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Open $FRONTEND_URL in your browser"
echo "2. Register a new account"
echo "3. Explore the dashboard"
echo ""
