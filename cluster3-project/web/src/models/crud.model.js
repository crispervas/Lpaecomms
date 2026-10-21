/**
 * @file Generic CRUD model over one Prisma delegate.
 *
 * The data-access half of every CRUD resource. Knows nothing about HTTP: it
 * returns records, `null` for "not found", or lets Prisma errors propagate for
 * the error middleware to map. Soft-deleted rows (status 0, or deletedAt on
 * user) are invisible to every read and write here.
 */

import { pickFields } from '../lib/modelFields.js';

/** Status values the schema uses; 0 marks a soft-deleted row. */
export const INACTIVE = { status: 0, statusName: 'INACTIVE' };

/**
 * CRUD over one model, configured by a resource definition.
 */
export class CrudModel {
  /**
   * @param {import('@prisma/client').PrismaClient} prisma - Client (fake in tests).
   * @param {import('../resources/index.js').Resource} resource - Resource definition.
   */
  constructor(prisma, resource) {
    /** @type {import('@prisma/client').PrismaClient} */
    this.prisma = prisma;
    /** @type {import('../resources/index.js').Resource} */
    this.resource = resource;
  }

  /**
   * The Prisma delegate for this resource's model.
   *
   * @returns {Object} e.g. `prisma.category`.
   */
  get delegate() {
    return this.prisma[this.resource.model];
  }

  /**
   * Where clause matching rows that have not been soft-deleted.
   *
   * Users mark deletion with `deletedAt` because their `status` also carries
   * PENDING (-2); every other model uses status 0.
   *
   * @returns {Object} Prisma where fragment.
   */
  activeWhere() {
    return this.resource.hasDeletedAt ? { deletedAt: null } : { status: { not: 0 } };
  }

  /**
   * Arguments every read shares: include/omit from the resource.
   *
   * @returns {Object} Prisma read args.
   */
  readArgs() {
    const args = {};
    if (this.resource.include) args.include = this.resource.include;
    if (this.resource.omit) args.omit = this.resource.omit;
    return args;
  }

  /**
   * Extra `where` for what this viewer may see, from the resource's
   * `visibility` hook.
   *
   * `undefined` means an internal read (the existence check before an update
   * or delete, which only admins reach): no visibility rule applies. `null` is
   * an anonymous caller.
   *
   * @param {{id: number, role: string}|null|undefined} viewer - Who is reading.
   * @returns {Array<Object>} Zero or one `where` fragments.
   */
  visibleWhere(viewer) {
    if (viewer === undefined || !this.resource.visibility) return [];
    const fragment = this.resource.visibility(viewer);
    return fragment ? [fragment] : [];
  }

  /**
   * Read one page of active rows.
   *
   * @param {Object} query - Parsed list query.
   * @param {number} query.page - 1-based page.
   * @param {number} query.limit - Page size.
   * @param {string} query.sort - Field to sort by.
   * @param {'asc'|'desc'} query.order - Sort direction.
   * @param {string} [query.search] - Case-insensitive text matched against `searchable`.
   * @param {Object} [query.filters] - Parsed filter values keyed by filter name.
   * @param {{id: number, role: string}|null} [query.viewer] - Who is reading;
   *   omitted for internal reads.
   * @returns {Promise<{items: Array<Object>, total: number}>} The page and the match count.
   */
  async list({ page, limit, sort, order, search, filters = {}, viewer }) {
    const and = [this.activeWhere(), ...this.visibleWhere(viewer)];

    for (const [name, value] of Object.entries(filters)) {
      const filter = this.resource.filters[name];
      // An admin-only filter would otherwise let anyone ask for hidden rows.
      if (filter.adminOnly && viewer?.role !== 'ADMIN') continue;
      if (value !== undefined) and.push(filter.where(value));
    }

    if (search && this.resource.searchable.length > 0) {
      and.push({
        OR: this.resource.searchable.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } })),
      });
    }

    const where = { AND: and };

    // One transaction so the count and the page describe the same snapshot.
    const [total, items] = await this.prisma.$transaction([
      this.delegate.count({ where }),
      this.delegate.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sort]: order },
        ...this.readArgs(),
      }),
    ]);

    return { items, total };
  }

  /**
   * Read one active row.
   *
   * @param {number} id - Primary key.
   * @param {{id: number, role: string}|null} [viewer] - Who is reading; omitted
   *   for internal reads.
   * @returns {Promise<Object|null>} The row, or null when missing, soft-deleted
   *   or hidden from this viewer.
   */
  async getById(id, viewer) {
    return this.delegate.findFirst({
      where: { AND: [this.activeWhere(), ...this.visibleWhere(viewer), { id }] },
      ...this.readArgs(),
    });
  }

  /**
   * Create a row.
   *
   * @param {Object} data - Validated body plus the audit block.
   * @returns {Promise<Object>} The created row.
   * @throws {Error} Prisma errors (unique, foreign key) for the error middleware.
   */
  async create(data) {
    return this.delegate.create({ data: pickFields(this.resource.model, data), ...this.readArgs() });
  }

  /**
   * Update an active row.
   *
   * Checked first so a soft-deleted row answers 404 like a missing one rather
   * than being silently edited back into view.
   *
   * @param {number} id - Primary key.
   * @param {Object} data - Validated partial body plus the audit block.
   * @returns {Promise<Object|null>} The updated row, or null when not active.
   * @throws {Error} Prisma errors for the error middleware.
   */
  async update(id, data) {
    if (!(await this.getById(id))) return null;
    return this.delegate.update({ where: { id }, data: pickFields(this.resource.model, data), ...this.readArgs() });
  }

  /**
   * Soft-delete an active row.
   *
   * @param {number} id - Primary key.
   * @param {Object} updated - Audit stamp for who deleted it.
   * @returns {Promise<{id: number}|null>} The id, or null when not active.
   */
  async softDelete(id, updated) {
    if (!(await this.getById(id))) return null;
    const data = { ...INACTIVE, updated };
    if (this.resource.hasDeletedAt) data.deletedAt = new Date();
    await this.delegate.update({ where: { id }, data });
    return { id };
  }
}
