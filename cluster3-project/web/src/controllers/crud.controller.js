/**
 * @file Generic CRUD controller.
 *
 * The HTTP half of every CRUD resource: reads the already-validated request,
 * calls the model, and answers in the shared envelope. Turns a model's `null`
 * into a 404; every other failure is forwarded to the error middleware.
 */

import boom from '@hapi/boom';
import { sendOk, sendCreated, sendPage } from '../lib/apiResponse.js';
import { buildPagination } from '../lib/pagination.js';

/**
 * Controller for one resource.
 */
export class CrudController {
  /**
   * @param {import('../models/crud.model.js').CrudModel} model - Injected model.
   * @param {import('../resources/index.js').Resource} resource - Resource definition.
   */
  constructor(model, resource) {
    /** @type {import('../models/crud.model.js').CrudModel} */
    this.model = model;
    /** @type {import('../resources/index.js').Resource} */
    this.resource = resource;
  }

  /**
   * Split the parsed query into paging options and filter values.
   *
   * @param {Object} query - `req.valid.query`.
   * @returns {Object} Arguments for `CrudModel.list`.
   */
  listArgs(query) {
    const { page, limit, sort, order, search, ...rest } = query;
    const filters = Object.fromEntries(
      Object.keys(this.resource.filters).map((name) => [name, rest[name]]),
    );
    return { page, limit, sort, order, search, filters };
  }

  /**
   * GET /{resource} — one page of records.
   *
   * @param {import('express').Request} req - Validated query in `req.valid.query`.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Error forwarding.
   * @returns {Promise<void>}
   */
  async list(req, res, next) {
    try {
      const args = this.listArgs(req.valid.query);
      const { items, total } = await this.model.list({ ...args, viewer: req.user ?? null });
      sendPage(
        res,
        items,
        buildPagination({ total, page: args.page, limit: args.limit, count: items.length }),
        `${this.resource.label} list`,
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /{resource}/:id — one record.
   *
   * @param {import('express').Request} req - Validated id in `req.valid.params`.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Error forwarding.
   * @returns {Promise<void>}
   */
  async show(req, res, next) {
    try {
      const record = await this.model.getById(req.valid.params.id, req.user ?? null);
      if (!record) throw boom.notFound(`${this.resource.label} not found.`);
      sendOk(res, record, `${this.resource.label} found`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /{resource} — create.
   *
   * @param {import('express').Request} req - Validated body plus `created`.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Error forwarding.
   * @returns {Promise<void>}
   */
  async create(req, res, next) {
    try {
      sendCreated(res, await this.model.create(req.body), `${this.resource.label} created`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /{resource}/:id — partial update.
   *
   * @param {import('express').Request} req - Validated id and partial body plus `updated`.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Error forwarding.
   * @returns {Promise<void>}
   */
  async update(req, res, next) {
    try {
      const record = await this.model.update(req.valid.params.id, req.body);
      if (!record) throw boom.notFound(`${this.resource.label} not found.`);
      sendOk(res, record, `${this.resource.label} updated`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /{resource}/:id — soft delete.
   *
   * @param {import('express').Request} req - Validated id plus `updated`.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Error forwarding.
   * @returns {Promise<void>}
   */
  async destroy(req, res, next) {
    try {
      const result = await this.model.softDelete(req.valid.params.id, req.body.updated);
      if (!result) throw boom.notFound(`${this.resource.label} not found.`);
      sendOk(res, result, `${this.resource.label} deleted`);
    } catch (error) {
      next(error);
    }
  }
}
