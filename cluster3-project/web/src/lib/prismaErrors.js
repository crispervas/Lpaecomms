/**
 * @file Prisma error translation.
 *
 * Prisma reports constraint failures as PrismaClientKnownRequestError with a
 * stable `code`. Left alone they become 500s, although each one is the
 * client's fault; this module turns the ones a client can cause into Boom
 * errors with a status that says so.
 */

import boom from '@hapi/boom';

/**
 * Pull the offending field out of a P2002 `meta.target`, which Prisma reports
 * as an array of fields or, with some adapters, as the constraint name.
 *
 * @param {unknown} target - `err.meta.target`.
 * @returns {string} A field name, or "value" when none can be read.
 */
function uniqueField(target) {
  if (Array.isArray(target) && target.length > 0) return String(target[0]);
  if (typeof target === 'string') {
    // Constraint names look like "category_code_key".
    const match = target.match(/_([A-Za-z]+)_key$/);
    if (match) return match[1];
  }
  return 'value';
}

/**
 * Map a Prisma known request error to a Boom error.
 *
 * Duck-typed on `code` instead of `instanceof`, so it keeps working across
 * Prisma client copies and in tests that build the error by hand.
 *
 * @param {unknown} err - Any thrown value.
 * @returns {import('@hapi/boom').Boom|null} The Boom error, or null when this
 *   is not a Prisma error a client could have caused.
 */
export function toBoom(err) {
  const code = err && typeof err === 'object' ? err.code : undefined;

  if (code === 'P2002') {
    const field = uniqueField(err.meta?.target);
    return boom.conflict(`A record with this ${field} already exists.`, {
      details: [{ field, message: `${field} is already in use.` }],
    });
  }
  if (code === 'P2025') {
    return boom.notFound('The record does not exist.');
  }
  if (code === 'P2003') {
    return boom.badRequest('A referenced record does not exist.', {
      details: [{ message: `Invalid reference: ${err.meta?.field_name ?? 'unknown field'}.` }],
    });
  }
  return null;
}
