/**
 * @file Scalar fields per Prisma model.
 *
 * Read from the generated client's DMMF, so the list can never drift from the
 * schema. Used to drop keys a model does not have — `unixTime` exists only on
 * `template`, and the audit middleware sets it for every write.
 */

import { Prisma } from '@prisma/client';

/** @type {Map<string, Set<string>>} */
const cache = new Map();

/**
 * Scalar (and enum) field names of a model.
 *
 * @param {string} modelName - Model name as written in schema.prisma.
 * @returns {Set<string>} Field names.
 * @throws {Error} When the model does not exist.
 */
export function scalarFields(modelName) {
  if (!cache.has(modelName)) {
    const model = Prisma.dmmf.datamodel.models.find((m) => m.name === modelName);
    if (!model) throw new Error(`Unknown Prisma model: ${modelName}`);
    cache.set(
      modelName,
      new Set(model.fields.filter((f) => f.kind === 'scalar' || f.kind === 'enum').map((f) => f.name)),
    );
  }
  return cache.get(modelName);
}

/**
 * Keep only the keys that are scalar fields of a model.
 *
 * @param {string} modelName - Model name.
 * @param {Object} data - Candidate write data.
 * @returns {Object} A new object with the model's scalar fields only.
 * @throws {Error} When the model does not exist.
 */
export function pickFields(modelName, data) {
  const fields = scalarFields(modelName);
  return Object.fromEntries(Object.entries(data).filter(([key]) => fields.has(key)));
}
