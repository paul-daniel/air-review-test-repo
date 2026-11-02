import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'shared',
      root: 'libs/shared',
      include: ['src/**/*.spec.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'api',
      root: 'apps/api',
      include: ['src/**/*.spec.ts'],
      environment: 'node',
    },
  },
  {
    test: {
      name: 'web',
      root: 'apps/web',
      include: ['src/**/*.spec.ts'],
      environment: 'jsdom',
    },
  },
]);
