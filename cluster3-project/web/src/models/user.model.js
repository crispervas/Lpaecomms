/**
 * @file User model.
 *
 * CrudModel plus the two things users need that other resources do not:
 * passwords are hashed on the way in and never read back out, and login needs
 * the one read that does include the hash.
 */

import bcrypt from 'bcrypt';
import { CrudModel } from './crud.model.js';

/** bcrypt cost; ~250 ms on a laptop, the usual balance for interactive login. */
export const BCRYPT_ROUNDS = 12;

/**
 * Data access for users.
 */
export class UserModel extends CrudModel {
  /**
   * Hash the password when present.
   *
   * @param {Object} data - Write data.
   * @returns {Promise<Object>} A copy with `password` hashed.
   */
  async #withHash(data) {
    if (data.password === undefined) return data;
    return { ...data, password: await bcrypt.hash(data.password, BCRYPT_ROUNDS) };
  }

  /**
   * Create an active user. Admin-created accounts are trusted, so they skip
   * the PENDING state the schema defaults to for self-registration.
   *
   * @param {Object} data - Validated body plus audit block.
   * @returns {Promise<Object>} The user, without its password.
   * @throws {Error} Prisma errors (duplicate email/document → 409).
   */
  async create(data) {
    return super.create({ ...(await this.#withHash(data)), status: 1, statusName: 'ACTIVE' });
  }

  /**
   * Update a user, rehashing the password only when a new one is sent.
   *
   * @param {number} id - User id.
   * @param {Object} data - Validated partial body plus audit block.
   * @returns {Promise<Object|null>} The user, or null when not active.
   * @throws {Error} Prisma errors for the error middleware.
   */
  async update(id, data) {
    return super.update(id, await this.#withHash(data));
  }

  /**
   * Read the fields login needs, including the hash. Never used by a route
   * that returns the row.
   *
   * @param {string} email - Normalised (lower-case) email.
   * @returns {Promise<{id: number, name: string, lastName: string, email: string, password: string, status: number, deletedAt: Date|null, role: {code: string}}|null>}
   *   The user, or null when no account has that email.
   */
  async findForLogin(email) {
    return this.delegate.findUnique({
      where: { email },
      select: {
        id: true, name: true, lastName: true, email: true, password: true,
        status: true, deletedAt: true, role: { select: { code: true } },
      },
    });
  }
}
