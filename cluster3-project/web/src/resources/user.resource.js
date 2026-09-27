/**
 * @file User resource.
 *
 * Store users, customers and administrators alike. Admin only. The password is
 * write-only: accepted on create and update, hashed by UserModel, and omitted
 * from every read.
 */

import { z } from 'zod';
import { UserModel } from '../models/user.model.js';

const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'bcrypt ignores anything past 72 bytes.')
  .regex(/[A-Za-z]/, 'Include a letter.')
  .regex(/\d/, 'Include a digit.');

const createSchema = z.object({
  roleId: z.number().int().positive(),
  genderId: z.number().int().positive(),
  documentTypeId: z.number().int().positive(),
  name: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password,
  document: z.string().trim().max(50).nullable().optional(),
  phone: z.string().trim().max(30).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
});

/** @type {import('./index.js').Resource} */
export default {
  path: 'users',
  model: 'user',
  label: 'User',
  searchable: ['name', 'lastName', 'email', 'document'],
  sortable: ['name', 'lastName', 'email', 'createdAt'],
  filters: {
    roleId: { schema: z.coerce.number().int().positive(), where: (value) => ({ roleId: value }) },
  },
  include: { role: { select: { id: true, name: true, code: true } } },
  omit: { password: true },
  hasDeletedAt: true,
  createSchema,
  updateSchema: createSchema.partial(),
  access: { read: 'ADMIN', write: 'ADMIN' },
  Model: UserModel,
};
