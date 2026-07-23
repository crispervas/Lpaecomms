/**
 * @file Prisma CLI configuration for the web platform.
 *
 * Read by Prisma CLI commands (generate, migrate, db) to locate the schema and
 * migrations and to resolve the database connection string from the
 * environment. The application runtime reads the same DATABASE_URL through
 * src/config/env.js and connects using a pg driver adapter.
 */

import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
