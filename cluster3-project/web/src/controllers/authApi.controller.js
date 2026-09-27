/**
 * @file API login controller.
 *
 * Exchanges email and password for an access token. Every failure answers the
 * same 401 with the same message, and the password is compared even when the
 * email is unknown, so neither the body nor the timing reveals which emails
 * have accounts.
 */

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import boom from '@hapi/boom';
import { signToken } from '../lib/jwt.js';
import { sendOk } from '../lib/apiResponse.js';
import { BCRYPT_ROUNDS } from '../models/user.model.js';

/**
 * Hash compared against when no user matches, so an unknown email costs the
 * same bcrypt work as a wrong password. Computed once at load, at the same cost.
 */
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);

/** The one message every failed sign-in gets. */
const INVALID = 'Email or password is incorrect.';

/**
 * Controller for POST /auth/login.
 */
export class AuthApiController {
  /**
   * @param {import('../models/user.model.js').UserModel} userModel - Injected model.
   */
  constructor(userModel) {
    /** @type {import('../models/user.model.js').UserModel} */
    this.userModel = userModel;
  }

  /**
   * Sign a user in.
   *
   * @param {import('express').Request} req - Validated `{ email, password }` body.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Error forwarding.
   * @returns {Promise<void>}
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await this.userModel.findForLogin(email);
      const matches = await bcrypt.compare(password, user?.password ?? DUMMY_HASH);

      if (!user || !matches || user.status !== 1 || user.deletedAt) {
        throw boom.unauthorized(INVALID);
      }

      const token = signToken({ id: user.id, role: user.role.code });
      sendOk(
        res,
        {
          token,
          user: { id: user.id, name: user.name, lastName: user.lastName, email: user.email, role: user.role.code },
        },
        'Signed in',
      );
    } catch (error) {
      next(error);
    }
  }
}
