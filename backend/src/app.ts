import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config';
import { extractTenant } from './middleware/tenant';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimit';
import routes from './routes';

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      const allowedOrigins = config.cors.allowedOrigins;
      const isAllowed = allowedOrigins.some((allowed) => {
        if (allowed.includes('*')) {
          const regex = new RegExp(allowed.replace('*', '.*'));
          return regex.test(origin);
        }
        return allowed === origin;
      });

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(generalRateLimiter);

app.use(extractTenant);

app.use('/api', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
