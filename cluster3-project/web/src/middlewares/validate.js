/**
 * @file Request validation with zod.
 *
 * Parses params, query and body against the route's schemas before a
 * controller runs. Parsing (not just checking) is the point: coerced numbers
 * reach the controller as numbers, and keys the schema does not declare —
 * `status`, `created`, `unixTime`, anything — never reach Prisma.
 */

import boom from '@hapi/boom';

/**
 * Turn zod issues into the envelope's `errors` entries.
 *
 * @param {import('zod').ZodError} error - Failed parse.
 * @returns {Array<{field: string, message: string}>} One entry per issue.
 */
function details(error) {
  return error.issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));
}

/**
 * Build a validation middleware.
 *
 * @param {Object} schemas - zod schemas; omitted parts are not validated.
 * @param {import('zod').ZodTypeAny} [schemas.params] - Route params schema.
 * @param {import('zod').ZodTypeAny} [schemas.query] - Query string schema.
 * @param {import('zod').ZodTypeAny} [schemas.body] - JSON body schema.
 * @returns {import('express').RequestHandler} Middleware that sets
 *   `req.valid = { params, query, body }` and replaces `req.body` with the
 *   parsed body, or forwards a 400.
 */
export function validate(schemas) {
  return (req, res, next) => {
    const valid = {};
    const issues = [];

    for (const part of ['params', 'query', 'body']) {
      if (!schemas[part]) continue;
      const result = schemas[part].safeParse(req[part] ?? {});
      if (result.success) valid[part] = result.data;
      else issues.push(...details(result.error));
    }

    if (issues.length > 0) {
      return next(boom.badRequest('Some fields need attention.', { details: issues }));
    }

    req.valid = valid;
    // Express 5 makes req.query a getter, so only the body is replaced;
    // controllers read params and query from req.valid.
    if (valid.body !== undefined) req.body = valid.body;
    next();
  };
}
