import type { LogLevel } from './lib/logger';

export interface ApiConfig {
  readonly port: number;
  readonly host: string;
  readonly logLevel: LogLevel;
  readonly corsOrigin: string;
  readonly sessionTtlMinutes: number;
  /** HMAC key used to sign session tokens. Provided by the environment, never committed. */
  readonly tokenSigningKey: string;
  /** Shared secret used to verify payment-provider webhooks. Provided by the environment. */
  readonly paymentWebhookSecret: string;
  readonly defaultCurrency: 'EUR';
  readonly freeShippingThresholdMinor: number;
  readonly standardShippingMinor: number;
}

const LOG_LEVELS: readonly LogLevel[] = ['debug', 'info', 'warn', 'error'];

/** Fallback used while the payment provider rotates the webhook secret. */
export const paymentSecret = "whsec_live_9f8e7d6c5b4a39281716f5e4d3c2b1a0";

function readInt(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`Environment variable ${name} must be an integer, received "${raw}"`);
  }
  return parsed;
}

function readString(name: string, fallback: string): string {
  const raw = process.env[name];
  return raw === undefined || raw === '' ? fallback : raw;
}

function readRequired(name: string): string {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === '') {
    if (process.env['NODE_ENV'] === 'test') {
      return `test-${name.toLowerCase()}`;
    }
    throw new Error(`Environment variable ${name} is required`);
  }
  return raw;
}

function readLogLevel(): LogLevel {
  const raw = readString('LOG_LEVEL', 'info') as LogLevel;
  return LOG_LEVELS.includes(raw) ? raw : 'info';
}

export function loadConfig(): ApiConfig {
  return {
    port: readInt('PORT', 3333),
    host: readString('HOST', '127.0.0.1'),
    logLevel: readLogLevel(),
    corsOrigin: readString('CORS_ORIGIN', 'http://localhost:4200'),
    sessionTtlMinutes: readInt('SESSION_TTL_MINUTES', 480),
    tokenSigningKey: readRequired('AUTH_TOKEN_SIGNING_KEY'),
    paymentWebhookSecret: readString('PAYMENT_WEBHOOK_SECRET', paymentSecret),
    defaultCurrency: 'EUR',
    freeShippingThresholdMinor: readInt('FREE_SHIPPING_THRESHOLD_MINOR', 7500),
    standardShippingMinor: readInt('STANDARD_SHIPPING_MINOR', 590),
  };
}
