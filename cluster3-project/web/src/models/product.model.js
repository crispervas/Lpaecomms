/**
 * @file Product model (storefront).
 *
 * Reads the catalogue from PostgreSQL for the EJS views, in the shapes those
 * views already use: cards for grids, a detail object for the product page.
 * The REST API does not use this model — it goes through CrudModel — so the
 * page shapes (priceAud, imageUrl) stay a view concern and never leak into the
 * API contract. Only active products are shown.
 */

import { prisma as defaultPrisma } from '../lib/prisma.js';
import { INT4_MAX } from '../lib/dbInt.js';

/** The home page's "Trending now" grid holds eight cards. */
const DEFAULT_FEATURED_LIMIT = 8;

/** The catalog's grid is three rows of four. */
const DEFAULT_CATALOG_LIMIT = 12;

/** Where fragment for products the storefront may show. */
const ACTIVE = { status: { not: 0 }, published: true };

/** Columns a card needs; the detail page adds `description`. */
const CARD_SELECT = {
  id: true,
  name: true,
  price: true,
  img: true,
  category: { select: { id: true, name: true, code: true } },
};

/**
 * Map a row to the card shape, including its category id.
 *
 * @param {Object} row - Product with its category.
 * @returns {{id: number, name: string, category: string, categoryId: number|null, priceAud: number, imageUrl: string}}
 *   The card.
 */
function toCard(row) {
  return {
    id: row.id,
    name: row.name,
    category: row.category?.name ?? '',
    categoryId: row.category?.id ?? null,
    priceAud: row.price,
    imageUrl: row.img?.[0] ?? '',
  };
}

/**
 * Map a row to the grid card shape, which never carried the category id.
 *
 * @param {Object} row - Product with its category.
 * @returns {{id: number, name: string, category: string, priceAud: number, imageUrl: string}} The card.
 */
function toGridCard(row) {
  const { categoryId, ...card } = toCard(row);
  return card;
}

/**
 * Storefront reads of the catalogue.
 */
export class ProductModel {
  /**
   * @param {import('@prisma/client').PrismaClient} [prisma] - Client; tests inject a fake.
   */
  constructor(prisma = defaultPrisma) {
    /** @type {import('@prisma/client').PrismaClient} */
    this.prisma = prisma;
  }

  /**
   * Products for a grid, optionally in one category, newest first.
   *
   * @param {number|null} categoryId - Category, or null for all.
   * @param {number} [limit] - Page size.
   * @param {number} [offset] - Rows to skip.
   * @returns {Promise<Array<{id: number, name: string, category: string, priceAud: number, imageUrl: string}>>}
   *   Cards.
   */
  async listByCategory(categoryId, limit = DEFAULT_CATALOG_LIMIT, offset = 0) {
    const where = categoryId === null ? { ...ACTIVE } : { ...ACTIVE, categoryId };
    const rows = await this.prisma.product.findMany({
      where, select: CARD_SELECT, orderBy: { id: 'desc' }, skip: offset, take: limit,
    });
    return rows.map(toGridCard);
  }

  /**
   * One page of the catalogue, optionally narrowed to a category and to
   * products whose name, code or description contains the search text.
   *
   * @param {Object} options - What to read.
   * @param {number|null} options.categoryId - Category, or null for all.
   * @param {string} options.q - Search text; empty for none.
   * @param {number} options.page - Page number, from 1.
   * @param {number} [options.pageSize] - Cards per page.
   * @returns {Promise<{items: Array<{id: number, name: string, category: string, priceAud: number, imageUrl: string}>, total: number, page: number, pageCount: number}>}
   *   The page's cards, the total match count and the number of pages (at least 1).
   */
  async search({ categoryId, q, page, pageSize = DEFAULT_CATALOG_LIMIT }) {
    const where = { ...ACTIVE };
    if (categoryId !== null) where.categoryId = categoryId;
    if (q) {
      where.OR = ['name', 'code', 'description'].map((field) => ({
        [field]: { contains: q, mode: 'insensitive' },
      }));
    }
    // One transaction so the count and the page come from the same snapshot.
    const [total, rows] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where, select: CARD_SELECT, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize,
      }),
    ]);
    return { items: rows.map(toGridCard), total, page, pageCount: Math.max(1, Math.ceil(total / pageSize)) };
  }

  /**
   * Products for the home page's trending grid.
   *
   * @param {number} [limit] - How many.
   * @returns {Promise<Array<{id: number, name: string, category: string, priceAud: number, imageUrl: string}>>}
   *   Cards.
   */
  async listFeatured(limit = DEFAULT_FEATURED_LIMIT) {
    return this.listByCategory(null, limit);
  }

  /**
   * One active product for the detail page.
   *
   * @param {number|string} id - Product id from the URL.
   * @returns {Promise<{id: number, name: string, category: {id: number|null, name: string, slug: string}, priceAud: number, description: string, imageUrls: Array<string>, stock: number}|null>}
   *   The product, or null when it does not exist or is inactive.
   */
  async getById(id) {
    // A route param like "1abc" must not become 1: that would serve a product
    // under a URL that does not name it.
    if (!/^\d+$/.test(String(id))) return null;
    // Past int4 no product can exist, and PostgreSQL would reject the query.
    if (Number(id) > INT4_MAX) return null;

    const row = await this.prisma.product.findFirst({
      where: { ...ACTIVE, id: Number(id) },
      select: { ...CARD_SELECT, description: true, stock: true },
    });
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      category: { id: row.category?.id ?? null, name: row.category?.name ?? '', slug: row.category?.code ?? '' },
      priceAud: row.price,
      description: row.description ?? '',
      imageUrls: row.img ?? [],
      stock: row.stock,
    };
  }

  /**
   * Several products by id, in the order asked for; ids no longer active are
   * dropped, since this list comes from a visitor's browsing history.
   *
   * @param {Array<number>} ids - Ids in display order.
   * @returns {Promise<Array<{id: number, name: string, category: string, categoryId: number|null, priceAud: number, imageUrl: string}>>}
   *   The products that still exist, in the requested order.
   */
  async findByIds(ids) {
    if (ids.length === 0) return [];
    const rows = await this.prisma.product.findMany({ where: { ...ACTIVE, id: { in: ids } }, select: CARD_SELECT });
    const byId = new Map(rows.map((row) => [row.id, row]));
    return ids.filter((id) => byId.has(id)).map((id) => toCard(byId.get(id)));
  }

  /**
   * Products in one category, leaving out some ids.
   *
   * @param {number} categoryId - Category.
   * @param {Array<number>} excludeIds - Ids to leave out.
   * @param {number} limit - How many.
   * @returns {Promise<Array<{id: number, name: string, category: string, priceAud: number, imageUrl: string}>>}
   *   Cards, at most `limit`.
   */
  async findByCategoryExcluding(categoryId, excludeIds, limit) {
    const rows = await this.prisma.product.findMany({
      where: { ...ACTIVE, categoryId, id: { notIn: excludeIds } },
      select: CARD_SELECT,
      orderBy: { id: 'desc' },
      take: limit,
    });
    return rows.map(toGridCard);
  }
}
