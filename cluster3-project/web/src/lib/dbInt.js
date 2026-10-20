/**
 * @file PostgreSQL integer bounds for request validation.
 *
 * Every id and count column in the schema is `int4`. zod's integer checks
 * accept any safe integer, and a value past int4 reaches PostgreSQL as an
 * out-of-range error that Prisma does not report as a client fault — a 500
 * for what is really a malformed request. Bounding the schemas here turns it
 * into the 400 it is.
 */

import { z } from 'zod';

/** Largest value a PostgreSQL `int4` column holds. */
export const INT4_MAX = 2_147_483_647;

/**
 * A positive int4 id in a JSON body.
 *
 * @returns {import('zod').ZodNumber} Schema for a body id.
 */
export const bodyId = () => z.number().int().positive().max(INT4_MAX);

/**
 * A positive int4 id from a URL (path or query string), coerced from text.
 *
 * @returns {import('zod').ZodNumber} Schema for a URL id.
 */
export const urlId = () => z.coerce.number().int().positive().max(INT4_MAX);
