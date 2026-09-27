/**
 * @file CRUD router factory.
 *
 * Builds the five REST routes of a resource from its definition, with the
 * middleware order the audit design depends on:
 * authenticate → authorize → validate → audit → controller.
 * Validation must run before the audit stamp so a client-sent `created` or
 * `updated` is dropped and then overwritten, never merged.
 */

import express from 'express';
import { z } from 'zod';

import { authenticate } from '../../middlewares/authenticate.js';
import { authorize } from '../../middlewares/authorize.js';
import { validate } from '../../middlewares/validate.js';
import { createTime, updateTime } from '../../middlewares/audit.js';
import { paginationQuerySchema } from '../../lib/pagination.js';
import { CrudController } from '../../controllers/crud.controller.js';

/** Route params of a single-record URL. */
const idParams = z.object({ id: z.coerce.number().int().positive() });

/**
 * Middlewares that gate an access level.
 *
 * @param {'public'|'ADMIN'} level - Access level from the resource.
 * @returns {Array<import('express').RequestHandler>} Empty for public.
 */
const guard = (level) => (level === 'public' ? [] : [authenticate, authorize(level)]);

/**
 * Build a resource's router.
 *
 * @param {import('../../resources/index.js').Resource} resource - Resource definition.
 * @param {import('@prisma/client').PrismaClient} prisma - Client to inject into the model.
 * @returns {import('express').Router} Router with GET list/one, POST, PUT, DELETE.
 */
export function buildCrudRouter(resource, prisma) {
  const router = express.Router();
  const controller = new CrudController(new resource.Model(prisma, resource), resource);
  const base = `/${resource.path}`;

  const listQuery = paginationQuerySchema(resource.sortable).extend(
    Object.fromEntries(
      Object.entries(resource.filters).map(([name, filter]) => [name, filter.schema.optional()]),
    ),
  );

  // At least one field: an empty update would only move updatedAt.
  const updateBody = resource.updateSchema.refine((body) => Object.keys(body).length > 0, {
    message: 'Send at least one field to update.',
  });

  const read = guard(resource.access.read);
  const write = guard(resource.access.write);

  router.get(base, ...read, validate({ query: listQuery }), (req, res, next) => controller.list(req, res, next));
  router.get(`${base}/:id`, ...read, validate({ params: idParams }), (req, res, next) =>
    controller.show(req, res, next));
  router.post(base, ...write, validate({ body: resource.createSchema }), createTime, (req, res, next) =>
    controller.create(req, res, next));
  router.put(`${base}/:id`, ...write, validate({ params: idParams, body: updateBody }), updateTime, (req, res, next) =>
    controller.update(req, res, next));
  router.delete(`${base}/:id`, ...write, validate({ params: idParams }), updateTime, (req, res, next) =>
    controller.destroy(req, res, next));

  return router;
}
