/**
 * @file User resource.
 *
 * Store users, customers and administrators alike. Admin only. The password is
 * write-only: accepted on create and update, hashed by UserModel, and omitted
 * from every read.
 */

import { z } from 'zod';
import { bodyId, urlId } from '../lib/dbInt.js';
import { UserModel } from '../models/user.model.js';

const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(72, 'bcrypt ignores anything past 72 bytes.')
  .regex(/[A-Za-z]/, 'Include a letter.')
  .regex(/\d/, 'Include a digit.');

/**
 * An optional free-text field where a blank value means "none". Stored as
 * null rather than "": `document` is unique, and two users who left it blank
 * must not collide on an empty string.
 *
 * @param {number} max - Maximum length.
 * @returns {import('zod').ZodType} Schema yielding a trimmed string or null.
 */
const optionalText = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => value || null)
    .nullable()
    .optional();

const createSchema = z.object({
  roleId: bodyId(),
  genderId: bodyId(),
  documentTypeId: bodyId(),
  name: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email().max(254),
  password,
  document: optionalText(50),
  phone: optionalText(30),
  address: optionalText(300),
});

/** @type {import('./index.js').Resource} */
export default {
  path: 'users',
  model: 'user',
  label: 'User',
  searchable: ['name', 'lastName', 'email', 'document'],
  sortable: ['name', 'lastName', 'email', 'createdAt'],
  filters: {
    roleId: { schema: urlId(), where: (value) => ({ roleId: value }) },
  },
  include: { role: { select: { id: true, name: true, code: true } } },
  omit: { password: true },
  hasDeletedAt: true,
  createSchema,
  updateSchema: createSchema.partial(),
  access: { read: 'ADMIN', write: 'ADMIN' },
  Model: UserModel,
};
