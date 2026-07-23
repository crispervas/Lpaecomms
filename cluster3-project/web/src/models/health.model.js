/**
 * @file Health model.
 *
 * Data-layer check that the database is reachable. It talks to PostgreSQL
 * through the injected Prisma client and returns a plain result. It knows
 * nothing about HTTP — that separation keeps the model reusable and testable.
 */

/**
 * Reports on the health of the database connection.
 */
export class HealthModel {
  /**
   * @param {import('@prisma/client').PrismaClient} prismaClient - Shared Prisma client.
   */
  constructor(prismaClient) {
    /** @type {import('@prisma/client').PrismaClient} */
    this.prisma = prismaClient;
  }

  /**
   * Check that the database answers a trivial query.
   *
   * @returns {Promise<boolean>} True when the database is reachable, false otherwise.
   */
  async isDatabaseReachable() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      // A failed connection is an expected, reportable state, not a crash.
      return false;
    }
  }
}
