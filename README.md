# HRM SaaS - Enterprise HR Management System

A comprehensive, enterprise-level Human Resources Management (HRM) SaaS platform built with modern web technologies, featuring multi-tenant architecture, role-based access control, and scalable infrastructure.

## 🚀 Features

- **Multi-Tenant Architecture**: Subdomain-based tenant isolation with complete data security
- **Authentication & Authorization**: JWT-based authentication with refresh tokens and RBAC
- **Employee Management**: Comprehensive employee database with profiles and document management
- **Payroll & Compensation**: Automated payroll processing (foundation for future development)
- **Leave & Attendance Management**: Track attendance and manage leave requests (foundation for future development)
- **Audit Logging**: Complete audit trail for all sensitive operations
- **Subscription Plans**: Support for multiple subscription tiers
- **Responsive UI**: Modern, mobile-friendly interface built with Next.js 14 and Tailwind CSS

## 🏗️ Tech Stack

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **State Management**: React Context API
- **Cookie Management**: js-cookie

### Backend
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: Any Node.js hosting (Railway, Render, etc.)
- **Database**: PostgreSQL (Neon, Supabase, or self-hosted)
- **Development**: Docker Compose for local PostgreSQL

## 📁 Project Structure

```
hrm-saas/
├── backend/                  # Express.js backend API
│   ├── src/
│   │   ├── config/          # Configuration files
│   │   ├── controllers/     # Request handlers
│   │   ├── database/        # Database migrations
│   │   ├── middleware/      # Express middleware
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   ├── types/           # TypeScript types
│   │   ├── utils/           # Utility functions
│   │   ├── app.ts          # Express app setup
│   │   └── server.ts       # Server entry point
│   ├── .env.example        # Environment variables template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/                # Next.js frontend
│   ├── src/
│   │   ├── app/            # Next.js App Router pages
│   │   │   ├── auth/       # Authentication pages
│   │   │   ├── dashboard/  # Dashboard pages
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/     # React components
│   │   │   ├── auth/       # Auth-related components
│   │   │   ├── layout/     # Layout components
│   │   │   └── ui/         # Reusable UI components
│   │   ├── lib/            # Libraries and utilities
│   │   │   ├── api/        # API client
│   │   │   └── hooks/      # React hooks
│   │   └── types/          # TypeScript types
│   ├── .env.example        # Environment variables template
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml       # Docker setup for PostgreSQL
├── vercel.json             # Vercel deployment config
└── README.md               # This file
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for local PostgreSQL)
- PostgreSQL (if not using Docker)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd hrm-saas
   ```

2. **Set up the database**
   ```bash
   # Start PostgreSQL with Docker
   docker-compose up -d
   
   # Wait for PostgreSQL to be ready
   docker-compose ps
   ```

3. **Set up the backend**
   ```bash
   cd backend
   npm install
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env with your configuration
   
   # Run database migrations
   npm run dev &
   # Then run migrations in another terminal
   npm run migrate
   ```

4. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   
   # Copy environment variables
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

5. **Start development servers**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm run dev
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Health Check: http://localhost:5000/api/health

## 🗄️ Database Schema

The application uses PostgreSQL with the following main tables:

- **tenants**: Multi-tenant company information
- **tenant_settings**: Tenant-specific configurations and branding
- **users**: User accounts with tenant isolation
- **roles**: Role-based access control definitions
- **user_roles**: User-role mappings
- **audit_logs**: Audit trail for all operations
- **refresh_tokens**: JWT refresh token management

All tables include proper indexing, foreign keys, and timestamps for optimal performance and data integrity.

## 🔐 Authentication Flow

1. **Registration**: Creates a new tenant and admin user
2. **Login**: Issues JWT access token (15min) and refresh token (7 days)
3. **Token Refresh**: Automatically refreshes expired access tokens
4. **Logout**: Invalidates refresh tokens

## 👥 User Roles

- **Super Admin**: Platform-level administration
- **Tenant Admin**: Full access within their tenant
- **HR Manager**: Employee, payroll, and leave management
- **Employee**: Basic access to personal information

## 🔒 Security Features

- Password hashing with bcrypt (12 rounds)
- JWT-based authentication with refresh tokens
- Rate limiting on authentication endpoints
- CORS protection with configurable origins
- Helmet.js for security headers
- Row-level security with tenant isolation
- Comprehensive audit logging
- SQL injection protection via parameterized queries

## 🌐 Multi-Tenant Architecture

The application uses subdomain-based multi-tenancy:

- Each company gets a unique subdomain (e.g., `acme.hrm-saas.com`)
- Complete data isolation at the database level
- Tenant context extracted from request headers
- All queries automatically filtered by tenant_id

## 📝 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new tenant and admin
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/refresh-token` - Refresh access token
- `GET /api/auth/me` - Get current user

### Health Check
- `GET /api/health` - API health status

## 🚢 Deployment

### Frontend (Vercel)

1. Connect your GitHub repository to Vercel
2. Set environment variables in Vercel dashboard:
   - `NEXT_PUBLIC_API_URL`
   - `NEXT_PUBLIC_APP_URL`
3. Deploy automatically on push to main branch

### Backend (Railway/Render)

1. Connect your GitHub repository
2. Set environment variables:
   - All variables from `.env.example`
   - Update database credentials
   - Update JWT secrets with strong random values
3. Run database migrations after deployment
4. Configure custom domain for API

### Database (Neon/Supabase)

1. Create a PostgreSQL database
2. Run migrations using the migration script
3. Update backend environment variables with connection details

## 🧪 Testing

```bash
# Backend tests (to be implemented)
cd backend
npm test

# Frontend tests (to be implemented)
cd frontend
npm test
```

## 📊 Future Enhancements

- [ ] Complete employee management module
- [ ] Payroll calculation and processing
- [ ] Leave request workflow
- [ ] Attendance tracking
- [ ] Recruitment module
- [ ] Performance reviews
- [ ] Reports and analytics dashboard
- [ ] Email notifications
- [ ] Document management
- [ ] Two-factor authentication
- [ ] SSO integration
- [ ] Mobile app
- [ ] API documentation with Swagger
- [ ] Automated testing suite
- [ ] CI/CD pipeline improvements

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a pull request

## 📄 License

This project is licensed under the ISC License.

## 👨‍💻 Development Team

Built with ❤️ for enterprise HR management.

## 📞 Support

For support and questions, please open an issue in the GitHub repository.

---

**Note**: This is a development version. For production deployment, ensure all security best practices are followed, including:
- Strong JWT secrets
- SSL/TLS encryption
- Regular security audits
- Database backups
- Monitoring and logging
- Rate limiting configuration
- CORS configuration for your domain
