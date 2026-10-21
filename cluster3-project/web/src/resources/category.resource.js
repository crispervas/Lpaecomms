/**
 * @file Category resource.
 *
 * Product categories. Public to read — the storefront and the mobile app list
 * them — and admin-only to write. `code` doubles as the URL slug.
 */

import { z } from 'zod';
import { CategoryCrudModel } from '../models/categoryCrud.model.js';

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, digits and hyphens.').max(50),
  img: z.string().url().nullable().optional(),
  description: z.string().max(2000).nullable().optional(),
});

/** @type {import('./index.js').Resource} */
export default {
  path: 'categories',
  model: 'category',
  label: 'Category',
  searchable: ['name', 'code'],
  sortable: ['name', 'code', 'createdAt'],
  filters: {},
  createSchema,
  updateSchema: createSchema.partial(),
  access: { read: 'public', write: 'ADMIN' },
  Model: CategoryCrudModel,
};
