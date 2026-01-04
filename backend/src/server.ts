import app from './app';
import { config } from './config';
import { pool } from './config/database';

const startServer = async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection established');

    app.listen(config.port, () => {
      console.log(`🚀 Server is running on port ${config.port}`);
      console.log(`📍 Environment: ${config.env}`);
      console.log(`🔗 API Base URL: ${config.apiBaseUrl}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing server');
  pool.end(() => {
    console.log('Database pool closed');
    process.exit(0);
  });
});

startServer();
