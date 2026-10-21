/**
 * @file Product resource.
 *
 * The catalogue. Public to read, admin-only to write. Lists can be narrowed to
 * one category by id or by code; mobile uses the code because it is also the
 * slug in its routes.
 */

import { z } from 'zod';
import { bodyId, urlId, INT4_MAX } from '../lib/dbInt.js';
import { CrudModel } from '../models/crud.model.js';

const code = z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, 'Use lowercase letters, digits and hyphens.').max(60);
const images = z.array(z.string().url()).max(10);

const createSchema = z.object({
  categoryId: bodyId(),
  name: z.string().trim().min(1).max(150),
  code,
  stock: z.number().int().min(0).max(INT4_MAX).default(0),
  price: z.number().min(0),
  img: images.default([]),
  description: z.string().max(5000).nullable().optional(),
  published: z.boolean().default(true),
});

/** @type {import('./index.js').Resource} */
export default {
  path: 'products',
  model: 'product',
  label: 'Product',
  searchable: ['name', 'code', 'description'],
  sortable: ['name', 'price', 'stock', 'createdAt'],
  filters: {
    categoryId: {
      schema: urlId(),
      where: (value) => ({ categoryId: value }),
    },
    category: {
      schema: z.string().trim().min(1).max(50),
      where: (value) => ({ category: { code: { equals: value, mode: 'insensitive' } } }),
    },
    published: {
      schema: z.enum(['true', 'false']).transform((value) => value === 'true'),
      where: (value) => ({ published: value }),
      adminOnly: true,
    },
  },
  // Drafts exist for admins only; everyone else reads the catalogue without them.
  visibility: (viewer) => (viewer?.role === 'ADMIN' ? null : { published: true }),
  include: { category: { select: { id: true, name: true, code: true } } },
  createSchema,
  // Without the defaults: .partial() keeps them, which would reset stock and
  // images on every update that does not mention them.
  updateSchema: createSchema
    .extend({ stock: z.number().int().min(0).max(INT4_MAX), img: images, published: z.boolean() })
    .partial(),
  access: { read: 'public', write: 'ADMIN' },
  Model: CrudModel,
};
