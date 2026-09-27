/**
 * @file Template resource.
 *
 * Email/message templates. `html` is stored as given and never rendered by
 * the API; whoever renders it later owns escaping. Admin only.
 */

import { z } from 'zod';
import { CrudModel } from '../models/crud.model.js';

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9_]+$/, 'Use letters, digits and underscores.').max(50),
  subject: z.string().trim().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
  html: z.string().min(1).max(100_000),
});

/** @type {import('./index.js').Resource} */
export default {
  path: 'templates',
  model: 'template',
  label: 'Template',
  searchable: ['name', 'code', 'subject'],
  sortable: ['name', 'code', 'createdAt'],
  filters: {},
  createSchema,
  updateSchema: createSchema.partial(),
  access: { read: 'ADMIN', write: 'ADMIN' },
  Model: CrudModel,
};
