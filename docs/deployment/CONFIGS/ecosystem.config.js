module.exports = {
  apps: [
    {
      name: 'hrm-saas-backend',
      script: './dist/server.js',
      cwd: '/home/hrm-saas/apps/hrm-saas/backend',
      
      // Instance Management
      instances: 'max', // Use all CPU cores for maximum performance
      exec_mode: 'cluster', // Cluster mode for better performance
      
      // Auto Restart Configuration
      autorestart: true,
      watch: false, // Set to true for development
      max_memory_restart: '1G', // Restart if memory exceeds 1GB
      
      // Environment Configuration
      env: {
        NODE_ENV: 'production',
        PORT: 5000
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000
      },
      env_staging: {
        NODE_ENV: 'staging',
        PORT: 5000
      },
      
      // Error Handling
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      
      // Advanced Settings
      kill_timeout: 5000,
      listen_timeout: 3000,
      shutdown_with_message: true,
      wait_ready: true,
      
      // Logging Configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      combine_logs: true,
      
      // Instance Configuration
      instance_var: 'INSTANCE_ID',
      
      // Memory Management
      max_old_space_size: 1024, // 1GB
      
      // Health Monitoring
      monitoring: false, // Set to true for detailed monitoring
      
      // Restart Strategy
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      
      // Development Settings
      source_map_support: true,
      
      // Auto-scaling Configuration
      scale_up_down: {
        enabled: true,
        threshold: 70, // CPU percentage threshold
        cooldown: 60000, // 1 minute cooldown
        increment: 1, // Increment by 1 instance
        max_instances: 4, // Maximum 4 instances
        decrement: 1, // Decrement by 1 instance
        min_instances: 1 // Minimum 1 instance
      },
      
      // Performance Monitoring
      metrics: {
        enable: true,
        port: 3000 // Metrics port
      },
      
      // Graceful Shutdown
      kill_signals: ['SIGINT', 'SIGTERM'],
      shutdown_with_message: true,
      
      // Resource Limits
      node_args: '--max-old-space-size=1024',
      
      // Log Rotation
      log_type: 'json', // or 'raw'
      
      // Load Balancing (for cluster mode)
      load_balanced: true
    },
    
    // Optional: Separate monitoring service
    {
      name: 'hrm-saas-monitor',
      script: './scripts/monitor.js',
      cwd: '/home/hrm-saas/apps/hrm-saas',
      
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      
      env: {
        NODE_ENV: 'production'
      },
      
      // Run only on one instance
      instance_variable: 'INSTANCE_ID',
      
      // Logging
      log_file: '/home/hrm-saas/logs/monitor.log',
      time: true,
      
      // Health check interval
      health_check_grace_period: 3000
    }
  ],
  
  // Deployment Configuration
  deploy: {
    production: {
      user: 'hrm-saas',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'https://github.com/yourusername/hrm-saas.git',
      path: '/home/hrm-saas/apps/hrm-saas',
      'pre-deploy-local': '',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    },
    
    staging: {
      user: 'hrm-saas',
      host: 'staging-server.com',
      ref: 'origin/staging',
      repo: 'https://github.com/yourusername/hrm-saas.git',
      path: '/home/hrm-saas/apps/hrm-saas-staging',
      'post-deploy': 'cd backend && npm install && npm run build && pm2 reload ecosystem.config.js --env staging'
    }
  }
};