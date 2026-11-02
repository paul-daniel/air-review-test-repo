import { createServer } from 'node:http';
import { createApp } from './app';
import { loadConfig } from './config';
import { createLogger } from './lib/logger';

const config = loadConfig();
const logger = createLogger(config.logLevel, { service: 'atlas-api' });
const app = createApp(config, logger);

const server = createServer((req, res) => {
  void app.handle(req, res);
});

server.listen(config.port, config.host, () => {
  logger.info('api listening', { host: config.host, port: config.port });
});

const shutdown = (signal: NodeJS.Signals): void => {
  logger.info('shutting down', { signal });
  server.close((error) => {
    if (error) {
      logger.error('server close failed', { error: error.message });
      process.exit(1);
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
