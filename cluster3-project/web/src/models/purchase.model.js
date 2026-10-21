/**
 * @file Purchase model.
 *
 * Creates a purchase and its product lines in one write, pricing every line
 * from the product table at that moment. Clients never send amounts: a total
 * computed on the client is a total the client can choose.
 *
 * `purchase_products` has no quantity column, so each line's `amount` stores
 * the line total and the quantities are kept in `purchase.data.lines`.
 */

import boom from '@hapi/boom';
import { Prisma } from '@prisma/client';
import { CrudModel } from './crud.model.js';
import { pickFields } from '../lib/modelFields.js';

/**
 * Data access for purchases.
 */
export class PurchaseModel extends CrudModel {
  /**
   * Update a purchase's status and paperwork.
   *
   * `data` is merged so a client can annotate an order, but the recorded
   * `lines` always survive: they are the only place quantities and unit prices
   * live, and replacing the JSON column wholesale would erase what was bought.
   *
   * @param {number} id - Purchase id.
   * @param {Object} input - Validated partial body plus the `updated` audit block.
   * @returns {Promise<Object|null>} The purchase, or null when not active.
   * @throws {Error} Prisma errors for the error middleware.
   */
  async update(id, input) {
    if (!('data' in input)) return super.update(id, input);

    const current = await this.getById(id);
    if (!current) return null;

    const lines = current.data?.lines;
    const data = { ...(input.data ?? {}), ...(lines ? { lines } : {}) };
    return this.delegate.update({
      where: { id },
      data: pickFields(this.resource.model, { ...input, data }),
      ...this.readArgs(),
    });
  }

  /**
   * Create a purchase with its lines.
   *
   * @param {Object} input - Validated body plus the `created` audit block.
   * @param {Array<{productId: number, quantity: number}>} input.products - Lines.
   * @param {number} [input.taxes] - Taxes added to the total.
   * @param {number} [input.discountAmount] - Discount subtracted from the total.
   * @param {Object} input.created - Audit stamp.
   * @returns {Promise<Object>} The purchase with lines and user.
   * @throws {import('@hapi/boom').Boom} 400 when a product is missing or inactive.
   * @throws {Error} Prisma errors (unknown userId → 400 via P2003).
   */
  async create({ products: lines, taxes = 0, discountAmount = 0, created, ...rest }) {
    const ids = [...new Set(lines.map((line) => line.productId))];

    return this.prisma.$transaction(async (tx) => {
      const found = await tx.product.findMany({
        // A draft is not for sale, exactly like a deleted product.
        where: { id: { in: ids }, status: { not: 0 }, published: true },
        select: { id: true, price: true },
      });
      const priceById = new Map(found.map((p) => [p.id, new Prisma.Decimal(p.price)]));

      const missing = ids.filter((id) => !priceById.has(id));
      if (missing.length > 0) {
        throw boom.badRequest('Some products are not available.', {
          details: missing.map((id) => ({ field: 'products', message: `Product ${id} does not exist or is inactive.` })),
        });
      }

      // Decimal arithmetic: float sums drift by cents over enough lines.
      const priced = lines.map((line) => {
        const unitPrice = priceById.get(line.productId);
        return { ...line, unitPrice, amount: unitPrice.times(line.quantity) };
      });
      const totalAmount = priced.reduce((sum, line) => sum.plus(line.amount), new Prisma.Decimal(0));
      const gross = totalAmount.plus(taxes).minus(discountAmount);
      const finalAmount = gross.isNegative() ? new Prisma.Decimal(0) : gross;

      return tx.purchase.create({
        data: {
          // Drops the audit middleware's `unixTime`, which purchase does not have.
          ...pickFields(this.resource.model, rest),
          taxes,
          discountAmount,
          totalAmount,
          finalAmount,
          created,
          data: {
            ...(rest.data ?? {}),
            lines: priced.map((l) => ({
              productId: l.productId,
              quantity: l.quantity,
              unitPrice: l.unitPrice.toString(),
            })),
          },
          products: { create: priced.map((l) => ({ productId: l.productId, amount: l.amount, created })) },
        },
        ...this.readArgs(),
      });
    });
  }
}
