/**
 * @file Controller for blocking and unblocking user accounts.
 *
 * Kept apart from the generic CrudController: blocking is not an update of a
 * client-supplied field — `status` is never accepted in a body — but an action
 * with its own rule, that an admin cannot lock their own account.
 */

import boom from '@hapi/boom';
import { sendOk } from '../lib/apiResponse.js';

/**
 * Controller for POST /users/:id/block and /users/:id/unblock.
 */
export class UserStatusController {
  /**
   * @param {import('../models/user.model.js').UserModel} userModel - Injected model.
   */
  constructor(userModel) {
    /** @type {import('../models/user.model.js').UserModel} */
    this.userModel = userModel;
  }

  /**
   * Build the handler for one direction.
   *
   * @param {boolean} blocked - True for block, false for unblock.
   * @returns {import('express').RequestHandler} The route handler.
   */
  handler(blocked) {
    return async (req, res, next) => {
      try {
        const { id } = req.valid.params;
        if (blocked && id === req.user.id) {
          throw boom.conflict('You cannot block your own account.');
        }
        const user = await this.userModel.setBlocked(id, blocked, req.body.updated);
        if (!user) throw boom.notFound('User not found.');
        sendOk(res, user, blocked ? 'User blocked' : 'User unblocked');
      } catch (error) {
        next(error);
      }
    };
  }
}
