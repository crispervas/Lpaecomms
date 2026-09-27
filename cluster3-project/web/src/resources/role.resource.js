/**
 * @file Role resource.
 *
 * Reference table of user roles. `code` is what the JWT carries and what
 * `authorize()` compares against, so it is upper-case and stable. Admin only.
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
  path: 'roles',
  model: 'role',
  label: 'Role',
  searchable: ['name', 'code'],
  sortable: ['name', 'code', 'createdAt'],
  filters: {},
  createSchema,
  updateSchema: createSchema.partial(),
  access: { read: 'ADMIN', write: 'ADMIN' },
  Model: CrudModel,
};
