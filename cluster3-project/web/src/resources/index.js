/**
 * @file CRUD resource registry.
 *
 * One entry per REST resource. Each definition declares what varies — model,
 * schemas, search, filters, access — and the generic model, controller and
 * router supply everything else. Adding a resource means adding a file here,
 * plus its Bruno requests.
 */

import category from './category.resource.js';
import product from './product.resource.js';
import role from './role.resource.js';
import gender from './gender.resource.js';
import documentType from './documentType.resource.js';
import template from './template.resource.js';
import user from './user.resource.js';

/**
 * @typedef {Object} ResourceFilter
 * @property {import('zod').ZodTypeAny} schema - Parses the query value.
 * @property {(value: any) => Object} where - Prisma where fragment for a parsed value.
 */

/**
 * @typedef {Object} Resource
 * @property {string} path - URL segment, e.g. "document-types".
 * @property {string} model - Prisma delegate name, e.g. "document_type".
 * @property {string} label - Singular noun for messages, e.g. "Document type".
 * @property {Array<string>} searchable - Text fields `search` matches.
 * @property {Array<string>} sortable - Fields `sort` accepts besides `id`.
 * @property {Object<string, ResourceFilter>} filters - Query filters by name.
 * @property {Object} [include] - Prisma include for every read.
 * @property {Object} [omit] - Prisma omit for every read.
 * @property {boolean} [hasDeletedAt] - Soft delete also sets `deletedAt` (user only).
 * @property {import('zod').ZodObject} createSchema - POST body.
 * @property {import('zod').ZodObject} updateSchema - PUT body.
 * @property {{read: 'public'|'ADMIN', write: 'ADMIN'}} access - Who may read and write.
 * @property {typeof import('../models/crud.model.js').CrudModel} Model - Model class.
 */

/** @type {Array<Resource>} */
export const resources = [category, product, role, gender, documentType, template, user];
