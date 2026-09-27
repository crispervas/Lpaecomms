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
 * Pull the offending field out of a P2002 `meta`. The built-in engine reports
 * `meta.target` as an array of fields or a constraint name; driver adapters
 * (this app uses @prisma/adapter-pg) report it under
 * `meta.driverAdapterError.cause.constraint.fields` instead.
 *
 * @param {Object} [meta] - `err.meta`.
 * @returns {string} A field name, or "value" when none can be read.
 */
function uniqueField(meta) {
  const adapterFields = meta?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(adapterFields) && adapterFields.length > 0) return String(adapterFields[0]);

  const target = meta?.target;
  if (Array.isArray(target) && target.length > 0) return String(target[0]);
  if (typeof target === 'string') {
    // Constraint names look like "category_code_key".
    const match = target.match(/_([A-Za-z]+)_key$/);
    if (match) return match[1];
  }
  return 'value';
}

/**
 * Pull the foreign key field out of a P2003 `meta`. Constraint names follow
 * Prisma's `<table>_<field>_fkey` convention, reported under `field_name` by
 * the built-in engine and under the adapter's constraint `index` otherwise.
 *
 * @param {Object} [meta] - `err.meta`.
 * @returns {string|null} The field, or null when none can be read.
 */
function foreignKeyField(meta) {
  const name = meta?.driverAdapterError?.cause?.constraint?.index ?? meta?.field_name ?? '';
  const match = String(name).match(/^[^_]+_([A-Za-z0-9]+)_fkey/);
  return match ? match[1] : null;
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
    const field = uniqueField(err.meta);
    return boom.conflict(`A record with this ${field} already exists.`, {
      details: [{ field, message: `${field} is already in use.` }],
    });
  }
  if (code === 'P2025') {
    return boom.notFound('The record does not exist.');
  }
  if (code === 'P2003') {
    const field = foreignKeyField(err.meta);
    return boom.badRequest('A referenced record does not exist.', {
      details: [
        field
          ? { field, message: `${field} does not reference an existing record.` }
          : { message: 'A referenced record does not exist.' },
      ],
    });
  }
  return null;
}
