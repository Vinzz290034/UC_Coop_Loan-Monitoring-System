import app from './app.js';
import { initRetentionScheduler } from './services/retentionService.js';
import { runMigrations } from './db/run_migrations.js';

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  // Run automated database migrations for schema integrity
  await runMigrations();
  // Initialize background data retention scheduler (30-day log cleanup)
  initRetentionScheduler();
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

// Graceful shutdown on SIGTERM / SIGINT (e.g. Railway container restarts & redeployments)
process.on('SIGTERM', () => {
  console.log('Received SIGTERM. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed successfully.');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT. Closing server gracefully...');
  server.close(() => {
    console.log('Server closed successfully.');
    process.exit(0);
  });
});
