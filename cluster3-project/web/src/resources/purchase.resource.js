/**
 * @file Purchase resource.
 *
 * Orders with their product lines. Admin only until customers can sign in to
 * see their own. Totals are never accepted from the client; PurchaseModel
 * computes them from current product prices.
 */

import { z } from 'zod';
import { bodyId, urlId } from '../lib/dbInt.js';
import { PurchaseModel } from '../models/purchase.model.js';

/** Payment states the schema comment documents. */
export const PAYMENT_STATUSES = ['PENDING', 'SUCCESS', 'FAILED', 'REJECTED'];

const money = z.number().min(0).max(1_000_000);

const createSchema = z.object({
  userId: bodyId(),
  reference: z.string().trim().max(100).nullable().optional(),
  taxes: money.default(0),
  discountAmount: money.default(0),
  paymentStatus: z.enum(PAYMENT_STATUSES),
  invoice: z.string().trim().max(100).nullable().optional(),
  paymentDate: z.coerce.date().nullable().optional(),
  data: z.record(z.string(), z.unknown()).nullable().optional(),
  products: z
    .array(z.object({ productId: bodyId(), quantity: z.number().int().min(1).max(999) }))
    .min(1, 'Add at least one product.')
    .max(100),
});

// Money and lines are fixed at creation; only the order's status and
// paperwork can change afterwards.
const updateSchema = z
  .object({
    reference: createSchema.shape.reference,
    paymentStatus: createSchema.shape.paymentStatus,
    invoice: createSchema.shape.invoice,
    paymentDate: createSchema.shape.paymentDate,
    data: createSchema.shape.data,
  })
  .partial();

/** @type {import('./index.js').Resource} */
export default {
  path: 'purchases',
  model: 'purchase',
  label: 'Purchase',
  searchable: ['reference', 'invoice'],
  sortable: ['createdAt', 'finalAmount', 'paymentDate'],
  filters: {
    userId: { schema: urlId(), where: (value) => ({ userId: value }) },
    paymentStatus: { schema: z.enum(PAYMENT_STATUSES), where: (value) => ({ paymentStatus: value }) },
  },
  include: {
    user: { select: { id: true, name: true, lastName: true, email: true } },
    products: { include: { product: { select: { id: true, name: true, code: true } } } },
  },
  createSchema,
  updateSchema,
  access: { read: 'ADMIN', write: 'ADMIN' },
  Model: PurchaseModel,
};
