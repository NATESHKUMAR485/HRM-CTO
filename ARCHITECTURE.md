# HRM SaaS - Architecture Documentation

## System Overview

The HRM SaaS platform is built as a modern, enterprise-level application with a clear separation between frontend and backend, utilizing a multi-tenant architecture for complete data isolation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Browser (Desktop/Mobile)                                       │
│  - Next.js 14 (React)                                          │
│  - Tailwind CSS                                                │
│  - TypeScript                                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS
                       │ (REST API)
┌──────────────────────▼──────────────────────────────────────────┐
│                    Application Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Express.js Backend                                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Middleware Layer                                          │ │
│  │ • CORS                                                    │ │
│  │ • Helmet (Security Headers)                               │ │
│  │ • Rate Limiting                                           │ │
│  │ • Authentication (JWT)                                    │ │
│  │ • Tenant Extraction                                       │ │
│  │ • Error Handling                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ API Routes                                                │ │
│  │ /api/auth/*                                               │ │
│  │ /api/employees/* (future)                                 │ │
│  │ /api/payroll/* (future)                                   │ │
│  │ /api/leaves/* (future)                                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Business Logic Layer                                      │ │
│  │ • Services (Business Logic)                               │ │
│  │ • Controllers (Request Handling)                          │ │
│  │ • Validators (Input Validation)                           │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ SQL
                       │ (pg - node-postgres)
┌──────────────────────▼──────────────────────────────────────────┐
│                      Data Layer                                 │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database                                           │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Core Tables                                               │ │
│  │ • tenants                                                 │ │
│  │ • tenant_settings                                         │ │
│  │ • users                                                   │ │
│  │ • roles                                                   │ │
│  │ • user_roles                                              │ │
│  │ • audit_logs                                              │ │
│  │ • refresh_tokens                                          │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.x
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Cookie Management**: js-cookie

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express.js 5.x
- **Language**: TypeScript 5.x
- **Database Driver**: pg (node-postgres)
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **Security**: Helmet, CORS
- **Rate Limiting**: express-rate-limit

### Database
- **RDBMS**: PostgreSQL 13+
- **Extensions**: uuid-ossp

### DevOps
- **Containerization**: Docker & Docker Compose
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Railway, Render, or VPS
- **Database Hosting**: Neon, Supabase, or self-hosted

## Multi-Tenant Architecture

### Tenant Isolation Strategy

The application uses **Database-per-Schema** pattern with tenant_id isolation:

```sql
-- Every tenant-specific table includes tenant_id
CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255),
    ...
);

-- All queries are automatically filtered
SELECT * FROM users WHERE tenant_id = $1 AND email = $2;
```

### Tenant Identification Flow

```
1. Client Request
   ↓
   Host: acme.hrm-saas.com

2. Tenant Extraction Middleware
   ↓
   Extract subdomain: "acme"

3. Database Lookup
   ↓
   SELECT * FROM tenants WHERE subdomain = 'acme'

4. Validation
   ↓
   Check: tenant exists && status is active/trial

5. Context Injection
   ↓
   req.tenant = { id, name, subdomain, ... }

6. Query Execution
   ↓
   All queries filtered by tenant_id
```

### Data Isolation Benefits

1. **Security**: Complete data separation between tenants
2. **Performance**: Indexed queries on tenant_id
3. **Compliance**: Easy data export/deletion per tenant
4. **Scalability**: Can migrate to separate databases if needed

## Authentication & Authorization

### Authentication Flow

```
┌──────────┐                ┌──────────┐               ┌──────────┐
│  Client  │                │  Backend │               │ Database │
└─────┬────┘                └─────┬────┘               └─────┬────┘
      │                           │                          │
      │ POST /auth/register       │                          │
      ├──────────────────────────►│                          │
      │                           │ Create tenant & user     │
      │                           ├─────────────────────────►│
      │                           │                          │
      │                           │ Generate JWT tokens      │
      │                           │◄─────────────────────────┤
      │ Tokens + User data        │                          │
      │◄──────────────────────────┤                          │
      │                           │                          │
      │ Store tokens in cookies   │                          │
      │                           │                          │
      │ GET /auth/me              │                          │
      │ (Authorization: Bearer)   │                          │
      ├──────────────────────────►│                          │
      │                           │ Verify JWT               │
      │                           │                          │
      │                           │ Get user data            │
      │                           ├─────────────────────────►│
      │                           │◄─────────────────────────┤
      │ User data                 │                          │
      │◄──────────────────────────┤                          │
```

### Token Strategy

#### Access Token
- **Expiration**: 15 minutes
- **Purpose**: Short-lived authentication
- **Storage**: Memory (React state)
- **Algorithm**: HS256

#### Refresh Token
- **Expiration**: 7 days
- **Purpose**: Long-term session management
- **Storage**: HTTP-only cookie (recommended) or localStorage
- **Algorithm**: HS256

### Authorization Levels

```
Super Admin (Platform Level)
    ↓
Tenant Admin (Tenant Level)
    ↓
HR Manager (Tenant Level)
    ↓
Employee (Tenant Level)
```

## Security Architecture

### Security Layers

1. **Transport Security**
   - HTTPS/TLS encryption
   - Secure WebSocket connections

2. **Application Security**
   - JWT token authentication
   - Password hashing (bcrypt, 12 rounds)
   - Rate limiting
   - CSRF protection
   - XSS prevention

3. **Database Security**
   - SQL injection prevention (parameterized queries)
   - Row-level security with tenant_id
   - Encrypted connections (SSL)
   - Regular backups

4. **Network Security**
   - CORS restrictions
   - Helmet security headers
   - API rate limiting

### Security Best Practices Implemented

```typescript
// 1. Password Hashing
const hash = await bcrypt.hash(password, 12);

// 2. Parameterized Queries
await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// 3. JWT Verification
const payload = jwt.verify(token, secret);

// 4. Tenant Isolation
SELECT * FROM users WHERE tenant_id = $1 AND id = $2

// 5. Role-Based Access
if (!allowedRoles.includes(user.role)) {
  throw new Error('Forbidden');
}
```

## Database Design

### Entity Relationship Diagram

```
┌──────────────┐
│   tenants    │
├──────────────┤
│ id (PK)      │
│ name         │
│ subdomain    │◄────┐
│ subscription │     │
│ status       │     │
└──────────────┘     │
                     │
        ┌────────────┴────────────┐
        │                         │
┌───────▼────────┐         ┌──────▼──────┐
│ tenant_settings│         │    users    │
├────────────────┤         ├─────────────┤
│ id (PK)        │         │ id (PK)     │
│ tenant_id (FK) │         │ tenant_id   │◄───┐
│ branding       │         │ email       │    │
│ features       │         │ password    │    │
└────────────────┘         │ role        │    │
                           └─────────────┘    │
                                   │           │
                           ┌───────┴───────┐   │
                           │               │   │
                    ┌──────▼─────┐  ┌──────▼──────┐
                    │ audit_logs │  │ refresh_tokens│
                    ├────────────┤  ├─────────────┤
                    │ id (PK)    │  │ id (PK)     │
                    │ tenant_id  │  │ user_id (FK)│
                    │ user_id    │  │ token       │
                    │ action     │  │ expires_at  │
                    │ entity     │  └─────────────┘
                    │ changes    │
                    └────────────┘
```

### Indexing Strategy

```sql
-- Tenant lookups (most frequent)
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);

-- User authentication
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);

-- Token management
CREATE INDEX idx_refresh_tokens_token ON refresh_tokens(token);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Audit queries
CREATE INDEX idx_audit_logs_tenant_id ON audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
```

## API Architecture

### RESTful Design Principles

```
Resource-based URLs:
✓ /api/auth/login
✓ /api/auth/register
✓ /api/users/{id}
✓ /api/employees/{id}

HTTP Methods:
GET    - Retrieve resources
POST   - Create resources
PUT    - Update entire resource
PATCH  - Update partial resource
DELETE - Remove resources
```

### Response Structure

All API responses follow a consistent structure:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
```

## Scalability Considerations

### Horizontal Scaling

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Backend    │     │   Backend    │     │   Backend    │
│  Instance 1  │     │  Instance 2  │     │  Instance N  │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       └────────────────────┴────────────────────┘
                           │
                    ┌──────▼──────┐
                    │ Load Balancer│
                    └──────┬───────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │ (Primary)   │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  PostgreSQL │
                    │ (Replica)   │
                    └─────────────┘
```

### Performance Optimizations

1. **Database Connection Pooling**
   ```typescript
   const pool = new Pool({
     max: 20,
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   });
   ```

2. **Query Optimization**
   - Proper indexing on tenant_id and foreign keys
   - Query result pagination
   - SELECT only needed columns

3. **Caching Strategy** (Future)
   - Redis for session management
   - Cache tenant settings
   - Cache user permissions

4. **CDN for Static Assets**
   - Vercel Edge Network for frontend
   - Asset optimization and compression

## Monitoring & Observability

### Logging Strategy

```typescript
// Application Logs
console.log('INFO', { message, context });
console.error('ERROR', { error, stack });

// Audit Logs (Database)
INSERT INTO audit_logs (
  tenant_id, user_id, action, entity, changes
) VALUES ($1, $2, $3, $4, $5);
```

### Metrics to Monitor

- API response times
- Database query performance
- Error rates
- Authentication success/failure
- Active users per tenant
- Database connection pool usage

## Future Architecture Enhancements

1. **Microservices**
   - Employee Service
   - Payroll Service
   - Attendance Service
   - Notification Service

2. **Event-Driven Architecture**
   - Message queue (RabbitMQ/Redis)
   - Event sourcing for audit
   - Async job processing

3. **Advanced Caching**
   - Redis for session management
   - Query result caching
   - API response caching

4. **Search Engine**
   - Elasticsearch for full-text search
   - Employee directory search
   - Document search

5. **File Storage**
   - S3/CloudStorage for documents
   - Employee photos and attachments
   - Payslip PDFs

## Development Workflow

```
1. Feature Branch
   ↓
2. Local Development
   ↓
3. Unit Tests
   ↓
4. Code Review
   ↓
5. Merge to Main
   ↓
6. Automated Tests (CI)
   ↓
7. Deploy to Staging
   ↓
8. QA Testing
   ↓
9. Deploy to Production
```

## Deployment Architecture

### Production Environment

```
┌─────────────────────────────────────────┐
│           Vercel Edge Network           │
│  (Frontend CDN & Serverless Functions)  │
└──────────────┬──────────────────────────┘
               │
               │ HTTPS
               │
┌──────────────▼──────────────────────────┐
│        Railway/Render/VPS               │
│     (Backend API Servers)               │
│  ┌──────────────────────────────────┐   │
│  │  PM2 Process Manager             │   │
│  │  ┌─────────┐  ┌─────────┐       │   │
│  │  │Backend 1│  │Backend 2│       │   │
│  │  └─────────┘  └─────────┘       │   │
│  └──────────────────────────────────┘   │
└──────────────┬──────────────────────────┘
               │
               │ PostgreSQL Protocol
               │
┌──────────────▼──────────────────────────┐
│      Neon/Supabase/Self-hosted         │
│      PostgreSQL Database                │
│  ┌──────────────────────────────────┐   │
│  │  Primary + Replicas              │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

## Conclusion

This architecture provides:
- **Scalability**: Horizontal scaling capability
- **Security**: Multi-layered security approach
- **Maintainability**: Clean separation of concerns
- **Performance**: Optimized database queries and caching
- **Reliability**: Error handling and audit logging
- **Flexibility**: Easy to extend with new modules
