/**
 * @file Document type resource.
 *
 * Reference table of identity document types (passport, licence…). Admin only.
 */

import { z } from 'zod';
import { CrudModel } from '../models/crud.model.js';

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]+$/, 'Use letters, digits and underscores.').max(50),
  description: z.string().max(2000).nullable().optional(),
});

/** @type {import('./index.js').Resource} */
export default {
  path: 'document-types',
  model: 'document_type',
  label: 'Document type',
  searchable: ['name', 'code'],
  sortable: ['name', 'code', 'createdAt'],
  filters: {},
  createSchema,
  updateSchema: createSchema.partial(),
  access: { read: 'ADMIN', write: 'ADMIN' },
  Model: CrudModel,
};
