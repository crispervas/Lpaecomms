/**
 * @file Category model (storefront).
 *
 * Categories for the catalog's filter bar, from PostgreSQL. Only active
 * categories holding at least one active product are offered: a filter that
 * leads to an empty page is a dead end. `code` is exposed as `slug`, the name
 * the catalog URLs already use.
 */

import { prisma as defaultPrisma } from '../lib/prisma.js';

/**
 * Storefront reads of categories.
 */
export class CategoryModel {
  /**
   * @param {import('@prisma/client').PrismaClient} [prisma] - Client; tests inject a fake.
   */
  constructor(prisma = defaultPrisma) {
    /** @type {import('@prisma/client').PrismaClient} */
    this.prisma = prisma;
  }

  /**
   * Categories worth offering as a filter, alphabetically.
   *
   * @returns {Promise<Array<{id: number, name: string, slug: string}>>} Categories.
   */
  async listCategories() {
    const rows = await this.prisma.category.findMany({
      where: { status: { not: 0 }, products: { some: { status: { not: 0 }, published: true } } },
      select: { id: true, name: true, code: true },
      orderBy: { name: 'asc' },
    });
    return rows.map(({ id, name, code }) => ({ id, name, slug: code }));
  }
}
