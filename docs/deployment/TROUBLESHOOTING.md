# Troubleshooting Guide - Common Issues and Solutions

## Overview

This comprehensive troubleshooting guide covers common issues across all deployment tiers (Free, Pro, Own Server) with step-by-step solutions and preventive measures.

**Coverage:** Vercel, Render, Supabase, Own Server deployment issues  
**Difficulty:** Beginner to Advanced  
**Response Time:** Solutions for immediate issue resolution  

## 🚨 Quick Diagnostic Checklist

When encountering issues, run through this checklist first:

```bash
□ Service Status: Are all services responding?
□ Health Endpoints: /health, /api/health working?
□ Environment Variables: All required vars set correctly?
□ Database Connection: Can backend connect to database?
□ SSL Certificates: Valid and not expired?
□ DNS Resolution: Domain resolving correctly?
□ Logs: Check service logs for error messages?
□ Recent Changes: Any deployments or configuration changes?
```

## 🔧 Service-Specific Issues

### Vercel Frontend Issues

#### Issue: Frontend Not Loading (502/503 Errors)

**Symptoms:**
- Vercel URL returns 502/503 errors
- Build succeeds but site doesn't load
- Domain shows "Application Error"

**Diagnosis:**
```bash
# Check Vercel deployment status
# Visit: https://vercel.com/dashboard → Your Project → Deployments

# Check build logs
# Visit: https://vercel.com/dashboard → Your Project → Deployments → Latest → View Build Logs

# Test direct Vercel URL
curl -I https://your-project.vercel.app
```

**Common Causes & Solutions:**

1. **Environment Variables Missing**
   ```bash
   # Check Vercel dashboard → Project → Environment Variables
   # Ensure these are set:
   NEXT_PUBLIC_API_URL=https://your-backend.onrender.com
   NEXT_PUBLIC_APP_URL=https://your-project.vercel.app
   NEXT_PUBLIC_BASE_DOMAIN=vercel.app
   
   # Solution:
   # 1. Add missing environment variables
   # 2. Redeploy: Push to main branch or manual redeploy
   ```

2. **Build Failures**
   ```bash
   # Check build logs for errors:
   # Common issues:
   # - Missing dependencies
   # - TypeScript errors
   # - Build timeout
   
   # Solution:
   # 1. Fix build errors locally: npm run build
   # 2. Check package.json scripts
   # 3. Increase build timeout if needed
   ```

3. **API Endpoint Issues**
   ```bash
   # Test backend connectivity from frontend
   # Check browser Network tab for failed requests
   
   # Solution:
   # 1. Verify backend URL in environment variables
   # 2. Check CORS configuration in backend
   # 3. Ensure backend is responding
   ```

#### Issue: Slow Frontend Performance

**Symptoms:**
- Pages load slowly (> 3 seconds)
- High Time to First Byte (TTFB)
- Poor Core Web Vitals scores

**Diagnosis:**
```bash
# Check Vercel Analytics
# Visit: https://vercel.com/dashboard → Project → Analytics

# Test from multiple locations
curl -w "@curl-format.txt" -o /dev/null -s https://your-project.vercel.app
```

**Solutions:**

1. **Optimize Bundle Size**
   ```bash
   # Check bundle analyzer
   npm install --save-dev @next/bundle-analyzer
   
   # Next.js config optimization
   // next.config.js
   module.exports = {
     compress: true,
     poweredByHeader: false,
     generateEtags: false,
     images: {
       domains: ['your-domain.com'],
       formats: ['image/webp'],
     },
   }
   ```

2. **Enable Edge Caching**
   ```javascript
   // Add to your API routes or pages
   export async function getStaticProps() {
     return {
       props: {},
       revalidate: 3600, // Cache for 1 hour
     }
   }
   ```

3. **Optimize Images**
   ```bash
   # Use Next.js Image component
   import Image from 'next/image'
   
   <Image
     src="/logo.png"
     alt="Logo"
     width={200}
     height={100}
     priority={true}
   />
   ```

#### Issue: Build Timeout Errors

**Symptoms:**
- Build fails with timeout message
- "Build exceeded maximum duration"
- Long build times (> 10 minutes)

**Solutions:**

1. **Optimize Build Process**
   ```bash
   # Split large dependencies
   # Use dynamic imports for large libraries
   
   // Instead of:
   import { heavyLib } from 'heavy-library'
   
   // Use:
   const heavyLib = dynamic(() => import('heavy-library'), {
     loading: () => <p>Loading...</p>
   })
   ```

2. **Use Build Cache**
   ```bash
   # Vercel automatically caches builds
   # Ensure .next folder is not in .gitignore for caching
   ```

3. **Parallel Builds**
   ```javascript
   // next.config.js
   module.exports = {
     experimental: {
       parallelServerBuildTraces: true,
     }
   }
   ```

### Render Backend Issues

#### Issue: Backend Not Responding (500 Errors)

**Symptoms:**
- API endpoints return 500 errors
- Backend URL shows "Application Error"
- Health check endpoint fails

**Diagnosis:**
```bash
# Check Render dashboard
# Visit: https://dashboard.render.com → Your Service → Logs

# Test health endpoint directly
curl -f https://your-backend.onrender.com/health
```

**Common Causes & Solutions:**

1. **Environment Variables Missing**
   ```bash
   # Check Render dashboard → Service → Environment
   # Ensure all required variables are set:
   
   NODE_ENV=production
   PORT=5000
   DB_HOST=your-supabase-host
   DB_PASSWORD=your-password
   JWT_ACCESS_SECRET=your-secret
   JWT_REFRESH_SECRET=your-secret
   FRONTEND_URL=https://your-frontend.vercel.app
   
   # Solution:
   # 1. Add missing environment variables
   # 2. Trigger redeploy
   ```

2. **Database Connection Issues**
   ```bash
   # Test database connection
   curl -X POST https://your-backend.onrender.com/api/auth/test-db
   
   # Common issues:
   # - Wrong database credentials
   # - SSL connection problems
   # - Database server down
   
   # Solutions:
   # 1. Verify Supabase credentials
   # 2. Check DB_SSL=false for local connections
   # 3. Ensure database is accessible
   ```

3. **Build/Start Command Issues**
   ```bash
   # Check Render dashboard → Settings → Build and Deploy
   # Verify commands:
   Build Command: npm install
   Start Command: npm start
   
   # If using custom start script:
   Start Command: node dist/server.js
   ```

#### Issue: Cold Start Performance

**Symptoms:**
- First request after idle takes 5-15 seconds
- Subsequent requests are fast
- Free tier only issue

**Diagnosis:**
```bash
# Check Render metrics
# Visit: https://dashboard.render.com → Service → Metrics

# Test cold start timing
time curl https://your-backend.onrender.com/health
```

**Solutions:**

1. **Upgrade to Pro Tier**
   ```bash
   # Render Pro eliminates cold starts
   # Upgrade in: Settings → Instance Type → Standard
   ```

2. **Optimize Application Startup**
   ```javascript
   // Reduce startup time
   // Move heavy initialization to lazy loading
   
   // Instead of:
   const db = require('./heavy-database-connection')
   
   // Use:
   let db
   const getDB = async () => {
     if (!db) {
       db = await require('./heavy-database-connection')
     }
     return db
   }
   ```

3. **Use Keep-Alive**
   ```bash
   # Set up periodic health checks
   # This keeps the service "warm"
   
   # Cron job or external service to ping:
   curl https://your-backend.onrender.com/health
   # Every 10 minutes
   ```

#### Issue: Memory Leaks/OOM Errors

**Symptoms:**
- Service restarts unexpectedly
- Memory usage keeps growing
- "Process exited with status 137" (OOM kill)

**Solutions:**

1. **Profile Memory Usage**
   ```javascript
   // Add memory monitoring
   console.log('Memory usage:', process.memoryUsage())
   
   // Monitor in logs:
   // Render dashboard → Logs → Filter for "Memory usage"
   ```

2. **Optimize Database Queries**
   ```javascript
   // Use connection pooling
   const pool = new Pool({
     max: 10, // Adjust based on needs
     idleTimeoutMillis: 30000,
   })
   
   // Close connections after use
   const result = await pool.query('SELECT * FROM users')
   pool.end() // Important for cleanup
   ```

3. **Implement Graceful Shutdown**
   ```javascript
   // server.js
   process.on('SIGTERM', () => {
     console.log('SIGTERM received, shutting down gracefully')
     server.close(() => {
       console.log('Process terminated')
       process.exit(0)
     })
   })
   ```

### Supabase Database Issues

#### Issue: Database Connection Failures

**Symptoms:**
- "Connection refused" errors
- "Authentication failed" messages
- Timeout connecting to database

**Diagnosis:**
```bash
# Check Supabase dashboard
# Visit: https://supabase.com/dashboard → Project → Reports

# Test connection manually
psql "postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres" -c "SELECT 1;"
```

**Solutions:**

1. **Verify Connection String**
   ```bash
   # Check Supabase dashboard → Settings → API
   # Get correct connection string:
   postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres
   
   # Ensure SSL is enabled for external connections
   DB_SSL=true
   ```

2. **Check Connection Limits**
   ```bash
   # Supabase Free tier: 20 concurrent connections
   # Monitor in: Supabase dashboard → Database → Reports
   
   # If hitting limits:
   # 1. Upgrade to Pro (100 connections)
   # 2. Optimize connection usage
   # 3. Implement connection pooling
   ```

3. **Row Level Security Issues**
   ```sql
   -- Check RLS policies
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
   FROM pg_policies
   WHERE schemaname = 'public';
   
   -- Temporarily disable RLS for testing
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ```

#### Issue: Slow Database Performance

**Symptoms:**
- Queries taking > 1 second
- Application feels sluggish
- High database CPU usage

**Solutions:**

1. **Add Missing Indexes**
   ```sql
   -- Check slow queries
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   ORDER BY mean_time DESC
   LIMIT 10;
   
   -- Add indexes for frequently queried columns
   CREATE INDEX CONCURRENTLY idx_users_tenant_id ON users(tenant_id);
   CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
   CREATE INDEX CONCURRENTLY idx_audit_logs_created_at ON audit_logs(created_at);
   ```

2. **Optimize Queries**
   ```sql
   -- Use EXPLAIN ANALYZE to understand query plans
   EXPLAIN ANALYZE SELECT * FROM users WHERE tenant_id = 'uuid';
   
   -- Avoid SELECT *
   SELECT id, email, first_name FROM users WHERE tenant_id = 'uuid';
   
   -- Use LIMIT for large result sets
   SELECT * FROM audit_logs WHERE tenant_id = 'uuid' ORDER BY created_at DESC LIMIT 50;
   ```

3. **Connection Pooling**
   ```javascript
   // Backend connection pool optimization
   const pool = new Pool({
     host: process.env.DB_HOST,
     port: process.env.DB_PORT,
     database: process.env.DB_NAME,
     user: process.env.DB_USER,
     password: process.env.DB_PASSWORD,
     ssl: process.env.DB_SSL === 'true',
     max: 10, // Maximum connections
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
   })
   ```

#### Issue: Storage Limits Exceeded

**Symptoms:**
- "Disk quota exceeded" errors
- Cannot insert new records
- Database operations failing

**Solutions:**

1. **Check Storage Usage**
   ```sql
   -- Check database size
   SELECT pg_size_pretty(pg_database_size('postgres'));
   
   -- Check table sizes
   SELECT 
     schemaname,
     tablename,
     pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
   FROM pg_tables
   WHERE schemaname = 'public'
   ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
   ```

2. **Clean Up Old Data**
   ```sql
   -- Archive old audit logs
   CREATE TABLE audit_logs_archive AS
   SELECT * FROM audit_logs 
   WHERE created_at < NOW() - INTERVAL '90 days';
   
   -- Delete old logs
   DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
   
   -- Vacuum to reclaim space
   VACUUM FULL;
   ```

3. **Upgrade Storage**
   ```bash
   # Upgrade to Supabase Pro for 8GB storage
   # Visit: https://supabase.com/dashboard → Project → Settings → Billing
   ```

### Own Server Issues

#### Issue: 502 Bad Gateway

**Symptoms:**
- NGINX returns 502 Bad Gateway
- Backend service not accessible
- PM2 shows running processes

**Diagnosis:**
```bash
# Check PM2 status
pm2 status

# Check NGINX error logs
sudo tail -f /var/log/nginx/error.log

# Test backend directly
curl -f http://localhost:5000/health
```

**Solutions:**

1. **Restart Backend Service**
   ```bash
   pm2 restart hrm-saas-backend
   
   # Check logs
   pm2 logs hrm-saas-backend
   ```

2. **Check NGINX Configuration**
   ```bash
   # Test NGINX configuration
   sudo nginx -t
   
   # Reload NGINX
   sudo systemctl reload nginx
   ```

3. **Verify Backend Port**
   ```bash
   # Check if backend is listening on correct port
   sudo netstat -tlnp | grep :5000
   
   # Check .env file
   cat /home/hrm-saas/apps/hrm-saas/backend/.env | grep PORT
   ```

#### Issue: SSL Certificate Problems

**Symptoms:**
- "Certificate expired" warnings
- SSL handshake failures
- Mixed content warnings

**Solutions:**

1. **Renew SSL Certificate**
   ```bash
   # Manual renewal
   sudo certbot renew
   
   # Check certificate status
   sudo certbot certificates
   
   # Force renewal if needed
   sudo certbot renew --force-renewal
   ```

2. **Update NGINX Configuration**
   ```bash
   # Ensure correct certificate paths
   sudo nano /etc/nginx/sites-available/hrm-saas
   
   ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
   ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
   
   # Test and reload
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. **Check Certificate Chain**
   ```bash
   # Verify certificate chain
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
   
   # Should show:
   # Verify return code: 0 (ok)
   ```

#### Issue: High Server Resource Usage

**Symptoms:**
- Server becomes unresponsive
- High CPU/memory usage
- Slow application performance

**Diagnosis:**
```bash
# Check system resources
htop
iotop

# Check PostgreSQL
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"

# Check PM2 processes
pm2 monit
```

**Solutions:**

1. **Optimize PostgreSQL**
   ```bash
   # Edit PostgreSQL configuration
   sudo nano /etc/postgresql/15/main/postgresql.conf
   
   # Reduce memory usage
   shared_buffers = 512MB
   effective_cache_size = 1GB
   work_mem = 16MB
   
   # Restart PostgreSQL
   sudo systemctl restart postgresql
   ```

2. **Optimize PM2 Configuration**
   ```javascript
   // ecosystem.config.js
   module.exports = {
     apps: [{
       name: 'hrm-saas-backend',
       instances: 1, // Reduce from 'max' if needed
       max_memory_restart: '512M',
       node_args: '--max-old-space-size=512',
     }]
   }
   ```

3. **Database Optimization**
   ```sql
   -- Analyze database
   ANALYZE;
   
   -- Vacuum database
   VACUUM ANALYZE;
   
   -- Check for unused indexes
   SELECT 
     schemaname, 
     tablename, 
     indexname,
     idx_scan,
     idx_tup_read,
     idx_tup_fetch
   FROM pg_stat_user_indexes
   ORDER BY idx_scan ASC;
   ```

## 🔍 Performance Issues

### Frontend Performance Problems

#### Issue: Slow Page Loads

**Symptoms:**
- Initial page load > 3 seconds
- Poor Core Web Vitals scores
- High First Contentful Paint (FCP)

**Solutions:**

1. **Optimize Bundle Size**
   ```bash
   # Analyze bundle
   npm install --save-dev @next/bundle-analyzer
   
   # next.config.js
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   })
   
   module.exports = withBundleAnalyzer({
     // your config
   })
   ```

2. **Implement Code Splitting**
   ```javascript
   // Dynamic imports
   const DynamicComponent = dynamic(() => import('../components/HeavyComponent'))
   
   // Route-based code splitting (Next.js does this automatically)
   // Use next/router for conditional loading
   ```

3. **Optimize Images**
   ```javascript
   // Use Next.js Image component
   import Image from 'next/image'
   
   <Image
     src="/hero-image.jpg"
     alt="Hero"
     width={1200}
     height={600}
     priority={true}
     placeholder="blur"
     blurDataURL="data:image/jpeg;base64,..."
   />
   ```

#### Issue: High Cumulative Layout Shift (CLS)

**Symptoms:**
- Content shifts during page load
- Poor CLS scores in Google PageSpeed
- User interface elements move unexpectedly

**Solutions:**

1. **Reserve Space for Images**
   ```javascript
   // Always specify width and height
   <Image
     src="/image.jpg"
     alt="Description"
     width={400}
     height={300}
     // This prevents layout shift
   />
   ```

2. **Use CSS Containment**
   ```css
   .container {
     contain: layout style;
   }
   
   .component {
     contain: layout;
   }
   ```

3. **Optimize Font Loading**
   ```javascript
   // next.config.js
   module.exports = {
     experimental: {
       optimizeCss: true,
     },
     webpack: (config) => {
       config.experiments = { ...config.experiments, topLevelAwait: true }
       return config
     },
   }
   ```

### Backend Performance Issues

#### Issue: Slow API Response Times

**Symptoms:**
- API endpoints take > 1 second to respond
- High server response times
- Timeout errors from frontend

**Solutions:**

1. **Database Query Optimization**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX CONCURRENTLY idx_users_tenant_email ON users(tenant_id, email);
   CREATE INDEX CONCURRENTLY idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
   
   -- Use EXPLAIN ANALYZE to understand query plans
   EXPLAIN ANALYZE SELECT * FROM users WHERE tenant_id = $1 AND email = $2;
   ```

2. **Implement Caching**
   ```javascript
   // Add Redis caching
   const Redis = require('redis')
   const redis = Redis.createClient()
   
   // Cache frequently accessed data
   const getTenantSettings = async (tenantId) => {
     const cacheKey = `tenant_settings:${tenantId}`
     let settings = await redis.get(cacheKey)
     
     if (!settings) {
       settings = await db.query('SELECT * FROM tenant_settings WHERE tenant_id = $1', [tenantId])
       await redis.setex(cacheKey, 3600, JSON.stringify(settings)) // 1 hour cache
     }
     
     return JSON.parse(settings)
   }
   ```

3. **Connection Pooling**
   ```javascript
   // Optimize connection pool
   const pool = new Pool({
     max: 20, // Increase if needed
     min: 5,  // Minimum connections to maintain
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
     maxUses: 7500, // Close (and replace) a connection after it has been used 7500 times
   })
   ```

#### Issue: Memory Leaks

**Symptoms:**
- Server memory usage increases over time
- Application restarts due to OOM
- Performance degrades over time

**Solutions:**

1. **Memory Monitoring**
   ```javascript
   // Add memory usage logging
   setInterval(() => {
     const usage = process.memoryUsage()
     console.log('Memory usage:', {
       rss: Math.round(usage.rss / 1024 / 1024) + 'MB',
       heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
       heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
       external: Math.round(usage.external / 1024 / 1024) + 'MB'
     })
   }, 60000) // Every minute
   ```

2. **Close Database Connections**
   ```javascript
   // Always close connections
   const queryDatabase = async (query, params) => {
     const client = await pool.connect()
     try {
       const result = await client.query(query, params)
       return result
     } finally {
       client.release() // Important!
     }
   }
   ```

3. **Event Listener Cleanup**
   ```javascript
   // Clean up event listeners
   const EventEmitter = require('events')
   
   class MyClass extends EventEmitter {
     constructor() {
       super()
       // Set max listeners to prevent memory leaks
       this.setMaxListeners(100)
     }
     
     cleanup() {
       this.removeAllListeners()
     }
   }
   ```

## 🔐 Authentication Issues

### JWT Token Problems

#### Issue: "Invalid Token" Errors

**Symptoms:**
- Users get logged out unexpectedly
- "Invalid token" messages in logs
- Authentication failures

**Solutions:**

1. **Check JWT Secret**
   ```bash
   # Ensure JWT secrets are consistent across environments
   JWT_ACCESS_SECRET=your-super-secret-access-key-32-chars-min
   JWT_REFRESH_SECRET=your-super-secret-refresh-key-32-chars-min
   
   # Both should be 32+ characters and match across all environments
   ```

2. **Verify Token Expiration**
   ```javascript
   // Check token expiration
   const decoded = jwt.decode(token)
   console.log('Token expires:', new Date(decoded.exp * 1000))
   console.log('Current time:', new Date())
   
   // Refresh token if close to expiration
   if (decoded.exp * 1000 < Date.now() + 60000) { // 1 minute warning
     // Trigger refresh
   }
   ```

3. **Handle Token Refresh**
   ```javascript
   // Frontend token refresh logic
   const refreshToken = async () => {
     try {
       const response = await axios.post('/api/auth/refresh', {}, {
         withCredentials: true
       })
       
       const { accessToken } = response.data
       setAccessToken(accessToken)
       return accessToken
     } catch (error) {
       // Redirect to login
       window.location.href = '/login'
     }
   }
   ```

#### Issue: Cross-Origin Issues

**Symptoms:**
- CORS errors in browser console
- Preflight requests failing
- Authentication not working across domains

**Solutions:**

1. **Configure CORS Properly**
   ```javascript
   // Backend CORS configuration
   const corsOptions = {
     origin: [
       'https://your-frontend.vercel.app',
       'https://yourdomain.com',
       'http://localhost:3000' // Development
     ],
     credentials: true,
     optionsSuccessStatus: 200
   }
   
   app.use(cors(corsOptions))
   ```

2. **Handle Cookies Properly**
   ```javascript
   // Frontend: Set credentials for requests
   axios.defaults.withCredentials = true
   
   // Or per request:
   axios.post('/api/auth/login', data, {
     withCredentials: true
   })
   ```

3. **Domain Configuration**
   ```bash
   # Ensure BASE_DOMAIN is correct
   BASE_DOMAIN=vercel.app  # For Vercel
   BASE_DOMAIN=yourdomain.com  # For custom domain
   ```

## 🌐 Multi-Tenancy Issues

### Subdomain Routing Problems

#### Issue: Subdomains Not Working

**Symptoms:**
- subdomain.yourdomain.com doesn't load
- All subdomains show same content
- 404 errors on subdomain routes

**Solutions:**

1. **Check DNS Configuration**
   ```bash
   # DNS should have:
   A Record: @ → [your-server-ip]
   CNAME: * → yourdomain.com
   
   # Test DNS resolution
   nslookup test.yourdomain.com
   ```

2. **Verify NGINX Configuration**
   ```nginx
   server {
       listen 443 ssl http2;
       server_name *.yourdomain.com yourdomain.com;
       
       location / {
           root /var/www/hrm-saas;
           try_files $uri $uri/ /index.html;
       }
   }
   ```

3. **Backend Subdomain Extraction**
   ```javascript
   // Verify subdomain extraction
   const extractTenant = (req) => {
     const host = req.headers.host
     const subdomain = host.split('.')[0]
     console.log('Host:', host, 'Subdomain:', subdomain)
     return subdomain
   }
   ```

#### Issue: Tenant Data Leakage

**Symptoms:**
- Users see other tenants' data
- Cross-tenant data access
- Security vulnerabilities

**Solutions:**

1. **Verify Tenant Isolation**
   ```javascript
   // All database queries must include tenant_id
   const getUser = async (userId, tenantId) => {
     const query = 'SELECT * FROM users WHERE id = $1 AND tenant_id = $2'
     const result = await pool.query(query, [userId, tenantId])
     return result.rows[0]
   }
   
   // Never do this:
   // const getUser = async (userId) => {
   //   const query = 'SELECT * FROM users WHERE id = $1' // Missing tenant_id!
   ```

2. **Test Tenant Isolation**
   ```javascript
   // Add tenant isolation tests
   describe('Tenant Isolation', () => {
     it('should not allow cross-tenant access', async () => {
       const userFromTenantA = await createTestUser('tenant-a')
       const tenantBId = await createTestTenant('tenant-b')
       
       // Try to access tenant A user from tenant B context
       const result = await getUser(userFromTenantA.id, tenantBId)
       expect(result).toBeNull()
     })
   })
   ```

## 📱 Database Issues

### Connection Pool Exhaustion

**Symptoms:**
- "connection pool exhausted" errors
- Requests timing out
- Database connection errors

**Solutions:**

1. **Increase Pool Size**
   ```javascript
   const pool = new Pool({
     max: 50, // Increase from default 10
     min: 10, // Maintain minimum connections
     idleTimeoutMillis: 30000,
     connectionTimeoutMillis: 2000,
     maxUses: 7500,
   })
   ```

2. **Implement Connection Retry**
   ```javascript
   const queryWithRetry = async (query, params, maxRetries = 3) => {
     for (let i = 0; i < maxRetries; i++) {
       try {
         return await pool.query(query, params)
       } catch (error) {
         if (error.code === '53300' && i < maxRetries - 1) {
           // Connection error, wait and retry
           await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)))
           continue
         }
         throw error
       }
     }
   }
   ```

3. **Monitor Pool Usage**
   ```javascript
   // Add pool monitoring
   setInterval(() => {
     console.log('Pool stats:', {
       totalCount: pool.totalCount,
       idleCount: pool.idleCount,
       waitingCount: pool.waitingCount
     })
   }, 30000)
   ```

### Slow Queries

**Symptoms:**
- Database queries taking > 1 second
- High database CPU usage
- Application timeouts

**Solutions:**

1. **Add Missing Indexes**
   ```sql
   -- Find slow queries
   SELECT query, mean_time, calls
   FROM pg_stat_statements
   WHERE mean_time > 100
   ORDER BY mean_time DESC;
   
   -- Add appropriate indexes
   CREATE INDEX CONCURRENTLY idx_users_tenant_active ON users(tenant_id, status) 
   WHERE status = 'active';
   ```

2. **Optimize Query Structure**
   ```sql
   -- Instead of:
   SELECT * FROM users WHERE email LIKE '%@example.com%';
   
   -- Use:
   SELECT id, email FROM users WHERE email ILIKE '%@example.com%';
   
   -- Use indexes on frequently filtered columns
   CREATE INDEX CONCURRENTLY idx_users_email_trgm ON users USING gin(email gin_trgm_ops);
   ```

3. **Implement Query Monitoring**
   ```javascript
   // Log slow queries
   const logSlowQuery = (query, duration) => {
     if (duration > 1000) { // Log queries > 1 second
       console.warn(`Slow query (${duration}ms):`, query)
     }
   }
   ```

## 📧 Email Issues

### SMTP Configuration Problems

**Symptoms:**
- Emails not being sent
- SMTP authentication errors
- Connection timeouts

**Solutions:**

1. **Verify SMTP Configuration**
   ```javascript
   // Check SMTP settings
   const smtpConfig = {
     host: process.env.SMTP_HOST,
     port: process.env.SMTP_PORT,
     secure: process.env.SMTP_SECURE === 'true',
     auth: {
       user: process.env.SMTP_USER,
       pass: process.env.SMTP_PASS
     }
   }
   ```

2. **Test SMTP Connection**
   ```javascript
   // Add SMTP test endpoint
   app.post('/api/admin/test-email', async (req, res) => {
     try {
       const transporter = nodemailer.createTransporter(smtpConfig)
       await transporter.verify()
       res.json({ success: true, message: 'SMTP connection successful' })
     } catch (error) {
       res.status(500).json({ success: false, error: error.message })
     }
   })
   ```

3. **Handle Email Sending Errors**
   ```javascript
   // Robust email sending
   const sendEmail = async (to, subject, html) => {
     try {
       const transporter = nodemailer.createTransporter(smtpConfig)
       await transporter.sendMail({
         from: process.env.FROM_EMAIL,
         to,
         subject,
         html
       })
       console.log('Email sent successfully to:', to)
     } catch (error) {
       console.error('Email sending failed:', error)
       // Log error but don't crash the application
       // Consider implementing a retry queue
     }
   }
   ```

## 🛡️ Security Issues

### SSL/TLS Problems

**Symptoms:**
- "Not secure" warnings in browser
- SSL certificate errors
- Mixed content warnings

**Solutions:**

1. **Check Certificate Status**
   ```bash
   # Check certificate expiration
   openssl x509 -in /etc/letsencrypt/live/yourdomain.com/cert.pem -text -noout | grep "Not After"
   
   # Test SSL configuration
   curl -I https://yourdomain.com
   
   # Check certificate chain
   openssl s_client -connect yourdomain.com:443 -servername yourdomain.com
   ```

2. **Fix Mixed Content**
   ```javascript
   // Ensure all resources use HTTPS
   // Check for hardcoded HTTP URLs
   const resourceUrl = process.env.NODE_ENV === 'production' 
     ? 'https://cdn.yourdomain.com/resource.js'
     : 'http://localhost:3000/resource.js'
   ```

3. **Update Security Headers**
   ```nginx
   # NGINX security headers
   add_header X-Frame-Options DENY;
   add_header X-Content-Type-Options nosniff;
   add_header X-XSS-Protection "1; mode=block";
   add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload";
   add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline'";
   ```

### Rate Limiting Issues

**Symptoms:**
- Legitimate users blocked
- Rate limit errors (429)
- Unable to make requests

**Solutions:**

1. **Adjust Rate Limits**
   ```javascript
   // Adjust rate limiting based on your needs
   const rateLimit = require('express-rate-limit')
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
     message: 'Too many requests from this IP, please try again later',
     standardHeaders: true,
     legacyHeaders: false,
   })
   
   // Apply to specific routes only
   app.use('/api/auth', limiter)
   ```

2. **Whitelist Important IPs**
   ```javascript
   // Whitelist admin or critical IPs
   const adminIPs = ['192.168.1.100', '10.0.0.50']
   
   const customLimiter = rateLimit({
     windowMs: 15 * 60 * 1000,
     max: 100,
     skip: (req) => adminIPs.includes(req.ip),
   })
   ```

## 🔄 Deployment Issues

### Build Failures

**Symptoms:**
- Deployment fails with build errors
- TypeScript compilation errors
- Missing dependencies

**Solutions:**

1. **Fix TypeScript Errors**
   ```bash
   # Check TypeScript errors locally
   npm run type-check
   
   # Fix common issues:
   # - Missing type definitions
   # - Type mismatches
   # - Unused variables
   ```

2. **Resolve Dependency Issues**
   ```bash
   # Clear npm cache
   npm cache clean --force
   
   # Delete node_modules and reinstall
   rm -rf node_modules package-lock.json
   npm install
   
   # Check for peer dependency conflicts
   npm ls --depth=0
   ```

3. **Environment Variable Issues**
   ```bash
   # Ensure all required environment variables are set
   # Check build logs for missing variable errors
   ```

### Environment Variable Problems

**Symptoms:**
- "undefined" values in application
- Build fails due to missing variables
- Runtime errors

**Solutions:**

1. **Validate Environment Variables**
   ```javascript
   // Add environment validation
   const requiredEnvVars = [
     'DB_HOST',
     'DB_PASSWORD',
     'JWT_ACCESS_SECRET',
     'JWT_REFRESH_SECRET'
   ]
   
   requiredEnvVars.forEach(envVar => {
     if (!process.env[envVar]) {
       throw new Error(`Missing required environment variable: ${envVar}`)
     }
   })
   ```

2. **Use Default Values**
   ```javascript
   // Provide sensible defaults
   const config = {
     port: process.env.PORT || 5000,
     nodeEnv: process.env.NODE_ENV || 'development',
     dbPort: process.env.DB_PORT || 5432,
   }
   ```

## 📊 Monitoring and Debugging

### Log Analysis

**Common Log Patterns:**

1. **Application Errors**
   ```bash
   # Check for common error patterns
   grep -i "error\|exception\|failed" /var/log/hrm-saas/application.log
   
   # Look for specific error types
   grep "ECONNREFUSED" /var/log/hrm-saas/application.log  # Connection issues
   grep "timeout" /var/log/hrm-saas/application.log      # Timeout issues
   grep "out of memory" /var/log/hrm-saas/application.log # Memory issues
   ```

2. **Performance Issues**
   ```bash
   # Check for slow operations
   grep "slow\|timeout\|took.*ms" /var/log/hrm-saas/performance.log
   
   # Analyze response times
   grep "response.*time.*ms" /var/log/hrm-saas/access.log
   ```

### Debug Mode

**Enable Debug Logging:**

```javascript
// Enable debug logging
const debug = process.env.NODE_ENV === 'development'

if (debug) {
  console.log('Debug: Database connection:', {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
  })
  
  // Log SQL queries
  const originalQuery = pool.query
  pool.query = function(...args) {
    console.log('SQL Query:', args[0])
    console.log('SQL Params:', args[1])
    return originalQuery.apply(this, args)
  }
}
```

## ✅ Prevention Best Practices

### Monitoring Setup

1. **Health Checks**
   ```bash
   # Implement comprehensive health checks
   /health - Basic application health
   /health/db - Database connectivity
   /health/cache - Cache connectivity
   /health/external - External service connectivity
   ```

2. **Alerting**
   ```bash
   # Set up alerts for:
   # - High error rates
   # - Slow response times
   # - Resource usage
   # - Failed deployments
   ```

3. **Logging**
   ```bash
   # Structured logging with correlation IDs
   # Include context in all logs
   # Use log levels appropriately
   ```

### Testing

1. **Automated Tests**
   ```bash
   # Unit tests for critical functions
   # Integration tests for API endpoints
   # End-to-end tests for user flows
   # Load tests for performance
   ```

2. **Staging Environment**
   ```bash
   # Test all changes in staging first
   # Mirror production configuration
   # Test backup and recovery procedures
   ```

### Documentation

1. **Runbooks**
   ```bash
   # Document common issues and solutions
   # Create step-by-step resolution guides
   # Include contact information for escalations
   ```

2. **Monitoring Dashboards**
   ```bash
   # Create dashboards for key metrics
   # Include alerts and notifications
   # Regular review and optimization
   ```

---

**💡 Pro Tip**: When troubleshooting, start with the most obvious solutions first (check logs, verify environment variables, test connectivity) before diving into complex debugging. Most issues are caused by simple configuration problems or missing dependencies.