# HRM SaaS - System Architecture Overview

## Architecture Overview

The HRM SaaS platform implements a modern, scalable architecture designed for multi-tenant SaaS applications. This document provides detailed architecture diagrams and explanations for all deployment tiers.

## 🏗️ System Architecture

### Free Tier Architecture (Vercel + Render + Supabase)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Browser (Desktop/Mobile)                                       │
│  - Next.js 14 (React)                                          │
│  - Tailwind CSS                                                │
│  - TypeScript                                                  │
│  - Axios HTTP Client                                           │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS (Custom Domain)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    Vercel Edge Network                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Hosting (Hobby Plan)                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Static Site Generation                                    │ │
│  │ Edge Caching                                             │ │
│  │ Automatic SSL                                            │ │
│  │ Global CDN                                               │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ API Calls (HTTPS)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                   Render Platform                               │
├─────────────────────────────────────────────────────────────────┤
│  Backend API Server (Free Tier)                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Express.js 5.x + TypeScript                              │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ Middleware Stack                                    │   │ │
│  │ │ • CORS (Cross-Origin Resource Sharing)             │   │ │
│  │ │ • Helmet (Security Headers)                        │   │ │
│  │ │ • Rate Limiting                                    │   │ │
│  │ │ • JWT Authentication                               │   │ │
│  │ │ • Tenant Extraction (Subdomain-based)              │   │ │
│  │ │ • Error Handling                                   │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ API Routes                                          │   │ │
│  │ │ /api/auth/* (Authentication)                        │   │ │
│  │ │ /api/employees/* (Future Module)                   │   │ │
│  │ │ /api/payroll/* (Future Module)                     │   │ │
│  │ │ /api/leaves/* (Future Module)                      │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  │                                                             │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ Business Logic Layer                                │   │ │
│  │ │ • Service Classes (Business Logic)                 │   │ │
│  │ │ • Controllers (Request Handling)                   │   │ │
│  │ │ • Validators (Input Validation with Joi)           │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ PostgreSQL Connection
                       │ (SSL encrypted)
┌──────────────────────▼──────────────────────────────────────────┐
│                      Supabase                                   │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database (Free Tier)                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Database Management                                      │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Multi-Tenant Schema Design                         │ │ │
│  │ │ tenants                                             │ │ │
│  │ │ tenant_settings                                     │ │ │
│  │ │ users                                               │ │ │
│  │ │ roles                                               │ │ │
│  │ │ user_roles                                          │ │ │
│  │ │ audit_logs                                          │ │ │
│  │ │ refresh_tokens                                      │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Built-in Features                                   │ │ │
│  │ │ • Automatic Backups                                │ │ │
│  │ │ • Row Level Security                               │ │ │
│  │ │ • Real-time Subscriptions                          │ │ │
│  │ │ • API Generation                                   │ │ │
│  │ │ • Dashboard Management                             │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Pro Tier Architecture (Vercel Pro + Render Pro + Supabase Pro)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Browser (Desktop/Mobile)                                       │
│  - Next.js 14 (React)                                          │
│  - Enhanced Performance                                        │
│  - Real-time Features Enabled                                  │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS (Custom Domain)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                 Vercel Pro Network                              │
├─────────────────────────────────────────────────────────────────┤
│  Frontend Hosting (Pro Plan)                                   │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Enhanced Features                                         │ │
│  │ • Higher Performance                                     │ │
│  │ • Web Analytics                                          │ │
│  │ • Edge Functions                                         │ │
│  │ • Serverless API Routes                                  │ │
│  │ • Advanced Caching                                       │ │
│  │ • Priority Support                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ API Calls (HTTPS)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                  Render Pro Platform                            │
├─────────────────────────────────────────────────────────────────┤
│  Backend API Server (Pro Tier)                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Enhanced Performance                                      │ │
│  │ • Auto-scaling                                           │ │
│  │ • Dedicated Resources                                    │ │
│  │ • Better Response Times                                  │ │
│  │ • Zero Cold Starts                                       │ │
│  │ • Multiple Regions                                       │ │
│  │ • Persistent Disks                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ PostgreSQL Connection
                       │ (SSL encrypted, optimized)
┌──────────────────────▼──────────────────────────────────────────┐
│                   Supabase Pro                                  │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL Database (Pro Tier)                                │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Enhanced Features                                         │ │
│  │ • Higher Limits (8GB vs 500MB)                          │ │
│  │ • Better Performance                                     │ │
│  │ • Point-in-time Recovery                                 │ │
│  │ • Database Branching                                     │ │
│  │ • Advanced Monitoring                                    │ │
│  │ • Priority Support                                       │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Own Server Architecture (VPS + PM2 + PostgreSQL)

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Layer                            │
├─────────────────────────────────────────────────────────────────┤
│  Browser (Desktop/Mobile)                                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTPS (Custom Domain)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                    NGINX Reverse Proxy                          │
├─────────────────────────────────────────────────────────────────┤
│  Web Server & Load Balancer                                    │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Features                                                  │ │
│  │ • SSL Termination (Let's Encrypt)                        │ │
│  │ • Static File Serving                                    │ │
│  │ • Reverse Proxy to Backend                               │ │
│  │ • Gzip Compression                                       │ │
│  │ • Security Headers                                       │ │
│  │ • Rate Limiting                                          │ │
│  │ • Load Balancing (if multiple backends)                  │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ HTTP/1.1 (Internal)
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                   PM2 Process Manager                           │
├─────────────────────────────────────────────────────────────────┤
│  Node.js Application Processes                                  │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Process Management                                        │ │
│  │ ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │ │
│  │ │ Backend #1  │  │ Backend #2  │  │ Backend #N  │        │ │
│  │ │ (Node.js)   │  │ (Node.js)   │  │ (Node.js)   │        │ │
│  │ └─────────────┘  └─────────────┘  └─────────────┘        │ │
│  │                                                             │ │
│  │ ┌─────────────────────────────────────────────────────┐   │ │
│  │ │ Cluster Mode Benefits                               │   │ │
│  │ │ • Load Distribution                                 │   │ │
│  │ │ • Auto-restart on Crashes                          │   │ │
│  │ │ • Zero-downtime Reloads                            │   │ │
│  │ │ • Memory Management                                 │   │ │
│  │ │ • CPU Core Utilization                              │   │ │
│  │ └─────────────────────────────────────────────────────┘   │ │
│  └───────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────────┘
                       │ PostgreSQL Connection
                       │ (Local or Remote)
┌──────────────────────▼──────────────────────────────────────────┐
│                  Self-Hosted PostgreSQL                         │
├─────────────────────────────────────────────────────────────────┤
│  Database Server                                               │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │ Database Configuration                                    │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Database Features                                   │ │ │
│  │ │ • ACID Compliance                                   │ │ │
│  │ │ • Full-text Search                                  │ │ │
│  │ │ • JSON/JSONB Support                                │ │ │
│  │ │ • Extensible (Custom Functions)                     │ │ │
│  │ │ • Advanced Indexing                                 │ │ │
│  │ │ • Replication Ready                                 │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  │                                                             │ │
│  │ ┌─────────────────────────────────────────────────────┐ │ │
│  │ │ Backup & Recovery                                   │ │ │
│  │ │ • Automated Daily Backups                           │ │ │
│  │ │ • Point-in-time Recovery                            │ │ │
│  │ │ • WAL Archiving                                     │ │ │
│  │ │ • Backup Verification                               │ │ │
│  │ └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 Service Responsibilities

### Frontend (Next.js)
- **User Interface**: React components with TypeScript
- **State Management**: React Context API for authentication
- **Styling**: Tailwind CSS for responsive design
- **Build & Deploy**: Vercel Edge Network
- **Performance**: Static generation, code splitting, image optimization

### Backend (Express.js)
- **API Layer**: RESTful API endpoints
- **Authentication**: JWT-based authentication system
- **Authorization**: Role-based access control
- **Business Logic**: Service layer architecture
- **Validation**: Input validation with Joi
- **Security**: Helmet, CORS, rate limiting

### Database (PostgreSQL)
- **Data Storage**: Multi-tenant schema design
- **ACID Compliance**: Transaction support
- **Extensibility**: Custom functions and extensions
- **Backup & Recovery**: Automated backup strategies
- **Performance**: Optimized indexing and query planning

## 🔄 Data Flow Diagrams

### User Registration Flow

```
┌─────────────┐    1. POST /auth/register     ┌─────────────┐    3. Create Tenant    ┌─────────────┐
│   Browser   │ ───────────────────────────►  │   Vercel    │ ───────────────────►   │   Render    │
└─────────────┘                              └─────────────┘                          └─────────────┘
       ▲                                           │                                          │
       │                                           │                                          │
       │              8. Frontend Redirect         │                                          │
       │  ◄───────────────────────────────────────┘                                          │
       │                                                                                      │
       │                                                                                      ▼
┌─────────────┐    5. Create User      ┌─────────────┐    6. Generate JWT      ┌─────────────┐
│   Browser   │ ◄────────────────────  │   Render    │ ◄────────────────────  │   Supabase  │
└─────────────┘                       └─────────────┘                         └─────────────┘
```

**Step-by-Step Flow:**
1. **Frontend**: User submits registration form to Vercel
2. **Vercel**: Routes request to Render backend
3. **Backend**: Creates tenant record in Supabase
4. **Backend**: Creates initial admin user
5. **Backend**: Generates JWT tokens (access + refresh)
6. **Backend**: Stores refresh token in database
7. **Backend**: Returns user data and tokens to frontend
8. **Frontend**: Redirects to tenant dashboard

### Authentication Flow

```
┌─────────────┐    1. POST /auth/login    ┌─────────────┐    2. Validate User    ┌─────────────┐
│   Browser   │ ────────────────────────► │   Render    │ ──────────────────────► │   Supabase  │
└─────────────┘                          └─────────────┘                          └─────────────┘
       ▲                                        │                                        │
       │                                        │                                        ▼
       │              6. User Dashboard          │                             ┌─────────────┐
       │  ◄─────────────────────────────────────┘                             │   Query     │
       │                                                                   │  Validation │
       │                                                                   └─────────────┘
       │                                                                              │
       │              5. JWT Token + User Data                                    ▼
       │  ◄─────────────────────────────────────────────────────────────────────────────┘
       │                                                                              
       │                                                                   ┌─────────────┐
       │                                                                   │   Success   │
       │                                                                   │  / Failure  │
       │                                                                   └─────────────┘
```

## 📊 Feature Availability Matrix

| Feature | Free Tier | Pro Tier | Own Server |
|---------|-----------|----------|------------|
| **Multi-Tenant Support** | ✅ | ✅ | ✅ |
| **Custom Domains** | ✅ | ✅ | ✅ |
| **SSL/HTTPS** | ✅ | ✅ | ✅ |
| **User Authentication** | ✅ | ✅ | ✅ |
| **Role-Based Access** | ✅ | ✅ | ✅ |
| **Audit Logging** | ✅ | ✅ | ✅ |
| **Database Backups** | ✅ (Daily) | ✅ (Hourly) | ✅ (Configurable) |
| **API Rate Limiting** | ✅ | ✅ | ✅ |
| **Real-time Updates** | ✅ | ✅ (Enhanced) | ✅ (Enhanced) |
| **Performance** | Good | Excellent | Excellent |
| **Uptime SLA** | 99.5% | 99.9% | 99.95% |
| **Support** | Community | Priority | Full Control |
| **Customization** | Limited | Moderate | Full |
| **Data Control** | Limited | Moderate | Complete |

## 🚀 Performance Characteristics by Tier

### Free Tier Performance
- **Response Time**: 200-500ms (API), 100-300ms (Frontend)
- **Throughput**: 10-50 concurrent users
- **Cold Starts**: 5-15 seconds (Render free tier)
- **Database Connections**: Up to 20 concurrent
- **Storage**: 500MB database limit
- **Bandwidth**: 100GB/month transfer limit

### Pro Tier Performance
- **Response Time**: 100-200ms (API), 50-150ms (Frontend)
- **Throughput**: 100-500 concurrent users
- **Cold Starts**: 0-2 seconds (Render pro tier)
- **Database Connections**: Up to 100 concurrent
- **Storage**: 8GB database limit
- **Bandwidth**: 1TB/month transfer limit

### Own Server Performance
- **Response Time**: 50-150ms (API), 30-100ms (Frontend)
- **Throughput**: 500-2000+ concurrent users
- **Cold Starts**: None (PM2 persistent processes)
- **Database Connections**: Configurable (20-1000+)
- **Storage**: Unlimited (VPS disk space)
- **Bandwidth**: Unlimited* (VPS provider limits)

## 🔧 Technology Stack Details

### Frontend Technologies
```
Next.js 14 (App Router)
├── React 18 (UI Framework)
├── TypeScript 5.x (Type Safety)
├── Tailwind CSS 3.x (Styling)
├── Axios (HTTP Client)
├── React Context API (State Management)
├── js-cookie (Cookie Management)
└── Vercel Edge Network (Deployment)
```

### Backend Technologies
```
Express.js 5.x
├── Node.js 18+ (Runtime)
├── TypeScript 5.x (Type Safety)
├── PostgreSQL (Database)
├── pg (Database Driver)
├── jsonwebtoken (JWT Authentication)
├── bcryptjs (Password Hashing)
├── Joi (Input Validation)
├── Helmet (Security Headers)
├── CORS (Cross-Origin Resource Sharing)
└── express-rate-limit (Rate Limiting)
```

### Infrastructure Technologies
```
Infrastructure Stack
├── Vercel (Frontend Hosting)
├── Render/Railway (Backend Hosting)
├── Supabase (Database Hosting)
├── Let's Encrypt (SSL Certificates)
├── NGINX (Reverse Proxy)
├── PM2 (Process Manager)
└── PostgreSQL (Database)
```

## 🎯 Key Architecture Principles

### 1. Zero Feature Compromise
- **All features available on free tier**
- **Upgrade path provides performance, not features**
- **No code changes required for tier upgrades**
- **Consistent API across all tiers**

### 2. Multi-Tenancy
- **Database-per-tenant isolation**
- **Subdomain-based tenant identification**
- **Row-level security implementation**
- **Scalable tenant management**

### 3. Security First
- **JWT-based authentication**
- **Role-based authorization**
- **Input validation and sanitization**
- **SQL injection prevention**
- **HTTPS enforcement**

### 4. Scalability Design
- **Horizontal scaling capability**
- **Database connection pooling**
- **Stateless application design**
- **Caching strategies**
- **Load balancing ready**

### 5. Reliability
- **Automated backup strategies**
- **Error handling and recovery**
- **Health check endpoints**
- **Monitoring and alerting**
- **Rollback procedures**

## 📈 Scaling Strategy

### Vertical Scaling (Resource Upgrade)
```
Current Tier → Next Tier
Free → Pro → Own Server
├── More CPU/Memory
├── Better Performance
├── Higher Limits
└── Enhanced Features
```

### Horizontal Scaling (Instance Multiplication)
```
Single Instance → Multiple Instances
├── Load Balancer (NGINX)
├── PM2 Clustering
├── Database Replication
└── CDN Distribution
```

### Geographic Scaling (Multi-Region)
```
Single Region → Multiple Regions
├── Edge Caching
├── Database Read Replicas
├── CDN Distribution
└── Regional Load Balancing
```

---

**Next Steps:**
- Review [FREE_TIER_SETUP.md](./FREE_TIER_SETUP.md) for deployment guide
- Check [PRO_TIER_UPGRADE.md](./PRO_TIER_UPGRADE.md) for upgrade strategy
- See [OWN_SERVER_SETUP.md](./OWN_SERVER_SETUP.md) for self-hosting guide