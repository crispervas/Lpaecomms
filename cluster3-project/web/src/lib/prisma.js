/**
 * @file Prisma client singleton.
 *
 * Exposes a single shared PrismaClient instance for the whole application.
 * A singleton prevents exhausting the database connection pool, which happens
 * when a client is created per request. Prisma 7 requires an explicit driver
 * adapter for a direct connection, so the client is built on a pg adapter whose
 * connection string comes from the validated environment configuration.
 */

import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { config } from '../config/env.js';

/**
 * pg driver adapter that Prisma uses to talk to PostgreSQL.
 * @type {PrismaPg}
 */
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

/**
 * Shared PrismaClient instance for the application.
 * @type {PrismaClient}
 */
export const prisma = new PrismaClient({ adapter });
