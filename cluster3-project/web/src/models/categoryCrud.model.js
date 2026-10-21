/**
 * @file CRUD model for categories.
 *
 * The generic soft delete would hide a category while its products still point
 * at it, leaving them filed under a category nobody can see or pick. Deleting
 * is refused until the category is empty; drafts count, since they will be
 * published under it later.
 */

import boom from '@hapi/boom';
import { CrudModel } from './crud.model.js';

/**
 * Category model with a delete guard.
 */
export class CategoryCrudModel extends CrudModel {
  /**
   * Soft-delete an empty category.
   *
   * @param {number} id - Category id.
   * @param {Object} updated - Audit stamp for who deleted it.
   * @returns {Promise<{id: number}|null>} The id, or null when not active.
   * @throws {import('@hapi/boom').Boom} 409 while the category holds products.
   */
  async softDelete(id, updated) {
    if (!(await this.getById(id))) return null;
    const products = await this.prisma.product.count({ where: { categoryId: id, status: { not: 0 } } });
    if (products > 0) throw boom.conflict("Move or delete this category's products first.");
    return super.softDelete(id, updated);
  }
}
