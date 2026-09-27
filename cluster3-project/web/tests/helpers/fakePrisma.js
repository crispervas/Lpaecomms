/**
 * @file Recording fake of the Prisma client for tests.
 *
 * Each delegate method records its arguments and returns whatever the test
 * configured. Tests then assert on the query a model built — the part this
 * code owns — without a database. `$transaction` supports both forms Prisma
 * does: an array of promises and an interactive callback.
 */

/**
 * Create a fake Prisma client.
 *
 * @param {Object<string, Object<string, Function|unknown>>} delegates - Per
 *   model, per method: a function (called with the args) or a value (returned).
 * @returns {Object} Fake client with `calls` (array of `{model, method, args}`).
 */
export function createFakePrisma(delegates = {}) {
  const calls = [];
  const client = { calls };

  for (const [model, methods] of Object.entries(delegates)) {
    client[model] = {};
    for (const [method, impl] of Object.entries(methods)) {
      client[model][method] = async (args) => {
        calls.push({ model, method, args });
        return typeof impl === 'function' ? impl(args) : impl;
      };
    }
  }

  client.$transaction = async (input) =>
    Array.isArray(input) ? Promise.all(input) : input(client);

  return client;
}
