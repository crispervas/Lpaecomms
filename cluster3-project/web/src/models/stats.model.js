/**
 * @file Store statistics for the admin dashboard.
 *
 * Counts in the database rather than in the client: the desktop would
 * otherwise download every user, order and product just to count them.
 * Deleted rows never count — users by `deletedAt`, everything else by
 * `status: 0` — and drafts count as products, since the admin manages them.
 */

import { FULFILLMENT_STATUSES } from '../resources/purchase.resource.js';

const ALIVE = { status: { not: 0 } };
const LIVE_USER = { deletedAt: null };

/**
 * @typedef {Object} StoreStats
 * @property {{total: number, customers: number, admins: number, blocked: number}} users
 * @property {{total: number, byFulfillment: Object<string, number>, revenue: number}} orders
 * @property {{total: number, published: number, drafts: number}} products
 * @property {Array<{id: number, name: string, products: number}>} categories - Most products first.
 */

/**
 * Reads the dashboard figures.
 */
export class StatsModel {
  /**
   * @param {import('@prisma/client').PrismaClient} prisma - Injected client.
   */
  constructor(prisma) {
    /** @type {import('@prisma/client').PrismaClient} */
    this.prisma = prisma;
  }

  /**
   * Gather every figure the dashboard shows.
   *
   * @returns {Promise<StoreStats>} The figures.
   */
  async summary() {
    const { user, purchase, product, category } = this.prisma;
    const [
      users, customers, admins, blocked,
      orders, byFulfillment, paid,
      products, published, categories,
    ] = await Promise.all([
      user.count({ where: LIVE_USER }),
      user.count({ where: { ...LIVE_USER, role: { code: 'CUSTOMER' } } }),
      user.count({ where: { ...LIVE_USER, role: { code: 'ADMIN' } } }),
      user.count({ where: { ...LIVE_USER, status: 2 } }),
      purchase.count({ where: ALIVE }),
      purchase.groupBy({ by: ['fulfillmentStatus'], where: ALIVE, _count: { _all: true } }),
      // Revenue is money actually taken and not handed back.
      purchase.aggregate({
        where: { ...ALIVE, paymentStatus: 'SUCCESS', fulfillmentStatus: { not: 'CANCELLED' } },
        _sum: { finalAmount: true },
      }),
      product.count({ where: ALIVE }),
      product.count({ where: { ...ALIVE, published: true } }),
      category.findMany({
        where: ALIVE,
        select: { id: true, name: true, _count: { select: { products: { where: ALIVE } } } },
      }),
    ]);

    // Every status appears, so the dashboard never has to guess at a missing key.
    const fulfillment = Object.fromEntries(FULFILLMENT_STATUSES.map((status) => [status, 0]));
    for (const row of byFulfillment) fulfillment[row.fulfillmentStatus] = row._count._all;

    return {
      users: { total: users, customers, admins, blocked },
      orders: {
        total: orders,
        byFulfillment: fulfillment,
        revenue: Math.round(Number(paid._sum.finalAmount ?? 0) * 100) / 100,
      },
      products: { total: products, published, drafts: products - published },
      categories: categories
        .map(({ id, name, _count }) => ({ id, name, products: _count.products }))
        .sort((a, b) => b.products - a.products),
    };
  }
}
