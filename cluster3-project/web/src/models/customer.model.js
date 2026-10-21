/**
 * @file Customer model (storefront).
 *
 * Everything the web storefront reads or writes about the signed-in customer:
 * the login lookup, self sign-up, the profile and the customer's own orders.
 * Views use this model directly — never the API — and every order read is
 * scoped to the customer's id, so one customer can never load another's.
 *
 * Admin-side user management stays in UserModel, behind the API.
 */

import bcrypt from 'bcrypt';
import { config } from '../config/env.js';
import { prisma as defaultPrisma } from '../lib/prisma.js';
import { BCRYPT_ROUNDS } from './user.model.js';

/** The role every web account has. */
export const CUSTOMER_ROLE = 'CUSTOMER';

/** Profile columns the storefront reads; never the password. */
const PROFILE_SELECT = { id: true, name: true, lastName: true, email: true, phone: true, address: true };

/** Orders a customer may see: theirs, not soft-deleted. */
const LIVE = { status: { not: 0 } };

/** "YYYY-MM-DD" in the store's time zone: en-CA formats dates that way. */
const dateFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: config.appTimezone });

/**
 * Format a timestamp as the store's calendar date, so an order placed late in
 * the evening is not listed under the next day's UTC date.
 *
 * @param {Date} date - A timestamp.
 * @returns {string} "YYYY-MM-DD".
 */
const isoDate = (date) => dateFormatter.format(new Date(date));

/**
 * Data access for the signed-in customer.
 */
export class CustomerModel {
  /**
   * @param {import('@prisma/client').PrismaClient} [prisma] - Client; tests inject a fake.
   */
  constructor(prisma = defaultPrisma) {
    /** @type {import('@prisma/client').PrismaClient} */
    this.prisma = prisma;
  }

  /**
   * Read what login needs, including the hash. The caller decides whether the
   * account may sign in; this only finds it.
   *
   * @param {string} email - Lower-cased email.
   * @returns {Promise<{id: number, name: string, lastName: string, email: string, password: string, status: number, deletedAt: Date|null, role: {code: string}}|null>}
   *   The user, or null when no account has that email.
   */
  async findForLogin(email) {
    return this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, name: true, lastName: true, email: true, password: true,
        status: true, deletedAt: true, role: { select: { code: true } },
      },
    });
  }

  /**
   * Find a customer who may use the site right now.
   *
   * @param {number} id - User id from the session token.
   * @returns {Promise<{id: number, name: string, lastName: string, email: string, phone: string|null, address: string|null}|null>}
   *   The profile, or null when the account is gone, blocked or not a customer.
   */
  async findActive(id) {
    return this.prisma.user.findFirst({
      where: { id, status: 1, deletedAt: null, role: { code: CUSTOMER_ROLE } },
      select: PROFILE_SELECT,
    });
  }

  /**
   * Whether any account, of any role or state, already uses an email.
   *
   * @param {string} email - Lower-cased email.
   * @returns {Promise<boolean>} True when the address is taken.
   */
  async emailExists(email) {
    return (await this.prisma.user.findUnique({ where: { email }, select: { id: true } })) !== null;
  }

  /**
   * Create an active customer account from the sign-up form.
   *
   * Gender and document type are required columns the form does not ask
   * about; "Prefer not to say" and a passport with no number are the honest
   * defaults until the customer says otherwise.
   *
   * @param {Object} input - Sign-up values.
   * @param {string} input.name - Given name.
   * @param {string} input.lastName - Family name.
   * @param {string} input.email - Lower-cased email.
   * @param {string} input.password - Plain password; hashed here.
   * @param {Object} input.created - Audit stamp.
   * @returns {Promise<{id: number, name: string, lastName: string, email: string, phone: string|null, address: string|null}>}
   *   The new profile.
   * @throws {Error} Prisma P2002 when the email was taken in the meantime.
   */
  async create({ name, lastName, email, password, created }) {
    return this.prisma.user.create({
      data: {
        name,
        lastName,
        email,
        password: await bcrypt.hash(password, BCRYPT_ROUNDS),
        role: { connect: { code: CUSTOMER_ROLE } },
        gender: { connect: { code: 'UNDISCLOSED' } },
        documentType: { connect: { code: 'PASSPORT' } },
        status: 1,
        statusName: 'ACTIVE',
        created,
      },
      select: PROFILE_SELECT,
    });
  }

  /**
   * Save the editable profile fields. Email and password are not editable
   * here, whatever the input carries.
   *
   * @param {number} id - The customer's id.
   * @param {{name: string, lastName: string, phone: string, address: string, updated: Object}} input - Profile values and audit stamp.
   * @returns {Promise<Object>} The saved profile.
   */
  async updateProfile(id, { name, lastName, phone, address, updated }) {
    return this.prisma.user.update({
      where: { id },
      // An emptied optional field is stored as NULL, not as an empty string.
      data: { name, lastName, phone: phone || null, address: address || null, updated },
      select: PROFILE_SELECT,
    });
  }

  /**
   * The customer's orders, newest first, as list summaries.
   *
   * @param {number} userId - The customer's id.
   * @returns {Promise<Array<{id: number, reference: string|null, placedOn: string, items: number, title: string, finalAmount: number, paymentStatus: string, fulfillmentStatus: string}>>}
   *   One summary per order.
   */
  async listOrders(userId) {
    const rows = await this.prisma.purchase.findMany({
      where: { userId, ...LIVE },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, reference: true, createdAt: true, finalAmount: true,
        paymentStatus: true, fulfillmentStatus: true, data: true,
        products: { select: { product: { select: { name: true } } } },
      },
    });
    return rows.map((row) => {
      const names = row.products.map((line) => line.product.name);
      const lines = row.data?.lines ?? [];
      return {
        id: row.id,
        reference: row.reference,
        placedOn: isoDate(row.createdAt),
        items: lines.reduce((sum, line) => sum + line.quantity, 0),
        title: names.length > 1 ? `${names[0]} and ${names.length - 1} more` : (names[0] ?? 'Order'),
        finalAmount: Number(row.finalAmount),
        paymentStatus: row.paymentStatus,
        fulfillmentStatus: row.fulfillmentStatus,
      };
    });
  }

  /**
   * One of the customer's orders, with its lines.
   *
   * @param {number} userId - The customer's id.
   * @param {number} id - Order id from the URL.
   * @returns {Promise<{id: number, reference: string|null, placedOn: string, finalAmount: number, paymentStatus: string, fulfillmentStatus: string, shipping: Object|null, payment: Object|null, lines: Array<{name: string, quantity: number, unitPrice: number, amount: number}>}|null>}
   *   The order, or null when it does not exist or belongs to someone else.
   */
  async getOrder(userId, id) {
    const row = await this.prisma.purchase.findFirst({
      where: { id, userId, ...LIVE },
      select: {
        id: true, reference: true, createdAt: true, finalAmount: true,
        paymentStatus: true, fulfillmentStatus: true, data: true,
        products: { select: { productId: true, amount: true, product: { select: { name: true } } } },
      },
    });
    if (!row) return null;

    const quantities = new Map((row.data?.lines ?? []).map((line) => [line.productId, line]));
    return {
      id: row.id,
      reference: row.reference,
      placedOn: isoDate(row.createdAt),
      finalAmount: Number(row.finalAmount),
      paymentStatus: row.paymentStatus,
      fulfillmentStatus: row.fulfillmentStatus,
      shipping: row.data?.shipping ?? null,
      payment: row.data?.payment ?? null,
      lines: row.products.map((line) => ({
        name: line.product.name,
        quantity: quantities.get(line.productId)?.quantity ?? 1,
        unitPrice: Number(quantities.get(line.productId)?.unitPrice ?? line.amount),
        amount: Number(line.amount),
      })),
    };
  }
}
