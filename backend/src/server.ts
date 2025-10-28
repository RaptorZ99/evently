import { createApp } from './app';
import { connectMongo, disconnectMongo, prisma } from './config/db';
import { env } from './config/env';

async function bootstrap() {
  await prisma.$connect();
  await connectMongo();

  const app = createApp();

  const server = app.listen(env.port, () => {
    console.log(`Server ready on http://localhost:${env.port}`);
  });

  const shutdown = async () => {
    console.log('Shutting down gracefully');
    await prisma.$disconnect();
    await disconnectMongo();
    server.close(() => process.exit(0));
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

bootstrap().catch((error) => {
  console.error('Failed to start server', error);
  process.exit(1);
});
