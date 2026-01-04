# HRM SaaS - API Documentation

Base URL: `http://localhost:5000/api` (Development)

## Authentication

All authenticated endpoints require a Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email format"
    }
  ]
}
```

## Endpoints

### Health Check

#### GET /api/health

Check API health status.

**Response:**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2024-01-04T12:00:00.000Z"
}
```

---

## Authentication Endpoints

### Register Tenant and Admin

#### POST /api/auth/register

Register a new company (tenant) and create an admin user.

**Rate Limited:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "companyName": "Acme Inc.",
  "subdomain": "acme",
  "email": "admin@acme.com",
  "password": "SecurePassword123!",
  "firstName": "John",
  "lastName": "Doe"
}
```

**Validation Rules:**
- `companyName`: 2-255 characters, required
- `subdomain`: 3-63 characters, lowercase letters, numbers, and hyphens only, required
- `email`: Valid email format, required
- `password`: Minimum 8 characters, required
- `firstName`: 2-100 characters, required
- `lastName`: 2-100 characters, required

**Success Response (201):**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "tenant_id": "123e4567-e89b-12d3-a456-426614174001",
      "email": "admin@acme.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "tenant_admin",
      "status": "active",
      "created_at": "2024-01-04T12:00:00.000Z",
      "updated_at": "2024-01-04T12:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `409 Conflict`: Subdomain already exists

---

### Login

#### POST /api/auth/login

Authenticate a user and receive tokens.

**Rate Limited:** 5 requests per 15 minutes

**Request Body:**
```json
{
  "email": "admin@acme.com",
  "password": "SecurePassword123!"
}
```

**Headers:**
- `Host`: Should include tenant subdomain for tenant-specific login (e.g., `acme.localhost:3000`)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "tenant_id": "123e4567-e89b-12d3-a456-426614174001",
      "email": "admin@acme.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "tenant_admin",
      "status": "active",
      "created_at": "2024-01-04T12:00:00.000Z",
      "updated_at": "2024-01-04T12:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `400 Bad Request`: Validation errors
- `401 Unauthorized`: Invalid credentials or inactive user

---

### Logout

#### POST /api/auth/logout

Logout user and invalidate refresh token.

**Authentication:** Required

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logout successful"
}
```

---

### Refresh Token

#### POST /api/auth/refresh-token

Get a new access token using a refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Invalid or expired refresh token

---

### Get Current User

#### GET /api/auth/me

Get the currently authenticated user's information.

**Authentication:** Required

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "tenant_id": "123e4567-e89b-12d3-a456-426614174001",
      "email": "admin@acme.com",
      "first_name": "John",
      "last_name": "Doe",
      "role": "tenant_admin",
      "status": "active",
      "created_at": "2024-01-04T12:00:00.000Z",
      "updated_at": "2024-01-04T12:00:00.000Z"
    }
  }
}
```

**Error Responses:**
- `401 Unauthorized`: Missing or invalid token
- `404 Not Found`: User not found

---

## User Roles

### Role Hierarchy

1. **super_admin** (Platform Level)
   - Full platform access
   - Manage all tenants
   - System configuration

2. **tenant_admin** (Tenant Level)
   - Full tenant access
   - User management
   - Settings configuration
   - All HR operations

3. **hr_manager** (Tenant Level)
   - Employee management
   - Payroll management
   - Leave approval
   - Attendance management

4. **employee** (Tenant Level)
   - View own profile
   - Request leave
   - View attendance
   - View payslips

### Role Permissions

#### Super Admin
```json
{
  "platform:manage": true,
  "tenants:manage": true,
  "users:manage": true
}
```

#### Tenant Admin
```json
{
  "tenant:manage": true,
  "users:manage": true,
  "roles:manage": true,
  "employees:manage": true,
  "payroll:manage": true,
  "leave:manage": true,
  "attendance:manage": true
}
```

#### HR Manager
```json
{
  "employees:view": true,
  "employees:create": true,
  "employees:edit": true,
  "payroll:view": true,
  "payroll:manage": true,
  "leave:view": true,
  "leave:approve": true,
  "attendance:view": true,
  "attendance:manage": true
}
```

#### Employee
```json
{
  "profile:view": true,
  "profile:edit": true,
  "leave:request": true,
  "attendance:view": true,
  "payslip:view": true
}
```

---

## Multi-Tenant Support

### Tenant Isolation

All API requests are automatically isolated by tenant based on the subdomain in the request:

```
Host: acme.yourdomain.com
```

The middleware extracts the subdomain (`acme`) and:
1. Validates the tenant exists
2. Checks tenant status is active or trial
3. Adds tenant context to the request
4. Enforces tenant-level data access

### Tenant Context

All database queries automatically filter by `tenant_id`:

```sql
SELECT * FROM users WHERE tenant_id = $1 AND email = $2
```

### Cross-Tenant Protection

Users cannot:
- Access data from other tenants
- Perform actions on behalf of other tenants
- View or modify other tenants' resources

---

## Rate Limiting

### Authentication Endpoints
- Window: 15 minutes
- Max Requests: 5
- Applies to: `/api/auth/register`, `/api/auth/login`

### General Endpoints
- Window: 15 minutes
- Max Requests: 100
- Applies to: All other endpoints

### Rate Limit Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

---

## Error Codes

| Status Code | Description |
|------------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request - Validation error |
| 401 | Unauthorized - Missing or invalid token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## JWT Token Structure

### Access Token Payload
```json
{
  "userId": "123e4567-e89b-12d3-a456-426614174000",
  "tenantId": "123e4567-e89b-12d3-a456-426614174001",
  "email": "admin@acme.com",
  "role": "tenant_admin",
  "iat": 1609459200,
  "exp": 1609460100
}
```

### Token Expiration
- Access Token: 15 minutes
- Refresh Token: 7 days

---

## Examples

### Register and Login Flow

```javascript
// 1. Register new tenant
const registerResponse = await fetch('http://localhost:5000/api/auth/register', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    companyName: 'Acme Inc.',
    subdomain: 'acme',
    email: 'admin@acme.com',
    password: 'SecurePassword123!',
    firstName: 'John',
    lastName: 'Doe'
  })
});

const { data } = await registerResponse.json();
const { accessToken, refreshToken } = data;

// 2. Use access token for authenticated requests
const userResponse = await fetch('http://localhost:5000/api/auth/me', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

// 3. Refresh token when access token expires
const refreshResponse = await fetch('http://localhost:5000/api/auth/refresh-token', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    refreshToken
  })
});

const newTokens = await refreshResponse.json();
```

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Store tokens securely** (HTTP-only cookies recommended)
3. **Rotate JWT secrets regularly**
4. **Implement token blacklisting for critical operations**
5. **Use strong passwords** (min 8 chars, mixed case, numbers, special chars)
6. **Enable rate limiting**
7. **Monitor for suspicious activity**
8. **Implement CORS properly**
9. **Keep dependencies updated**
10. **Regular security audits**

---

## Future Endpoints (Planned)

- Employee Management (`/api/employees`)
- Payroll (`/api/payroll`)
- Leave Management (`/api/leaves`)
- Attendance (`/api/attendance`)
- Reports (`/api/reports`)
- Settings (`/api/settings`)
- Audit Logs (`/api/audit-logs`)
