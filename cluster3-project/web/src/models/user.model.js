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

/** Status of an account that may sign in. */
export const ACTIVE_STATUS = Object.freeze({ status: 1, statusName: 'ACTIVE' });

/** Status of an account an admin has blocked: kept, but unable to sign in. */
export const BLOCKED_STATUS = Object.freeze({ status: 2, statusName: 'BLOCKED' });

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
    return super.create({ ...(await this.#withHash(data)), ...ACTIVE_STATUS });
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
   * Block or unblock an active account.
   *
   * Unblocking always lands on ACTIVE, including from PENDING: an admin who
   * unblocks an account means for it to work.
   *
   * @param {number} id - User id.
   * @param {boolean} blocked - True to block, false to unblock.
   * @param {Object} updated - Audit stamp for who did it.
   * @returns {Promise<Object|null>} The updated user (no password), or null
   *   when there is no such active user.
   */
  async setBlocked(id, blocked, updated) {
    if (!(await this.getById(id))) return null;
    return this.delegate.update({
      where: { id },
      data: { ...(blocked ? BLOCKED_STATUS : ACTIVE_STATUS), updated },
      ...this.readArgs(),
    });
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
