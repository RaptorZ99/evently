import 'express-async-errors';
import cors from 'cors';
import express from 'express';
import morgan from 'morgan';
import { env } from './config/env';
import { apiRouter } from './routes';
import { notFound } from './middlewares/notFound';
import { errorHandler } from './middlewares/errorHandler';
import swaggerUi from 'swagger-ui-express';
import { openapiSpec } from './docs/openapi';

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigin,
      credentials: true,
    })
  );
  app.use(express.json());

  // Morgan logging only in non-test environments
  if (env.nodeEnv !== 'test') {
    app.use(morgan('dev'));
  }

  app.get('/health', (_req, res) => {
    res.json({ ok: true });
  });

  // OpenAPI spec and Swagger UI
  app.get('/openapi.json', (_req, res) => {
    res.json(openapiSpec);
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, { explorer: true }));

  // API routes
  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
