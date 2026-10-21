/**
 * @file Controller for GET /stats.
 */

import { sendOk } from '../lib/apiResponse.js';

/**
 * Controller for the admin statistics endpoint.
 */
export class StatsController {
  /**
   * @param {import('../models/stats.model.js').StatsModel} statsModel - Injected model.
   */
  constructor(statsModel) {
    /** @type {import('../models/stats.model.js').StatsModel} */
    this.statsModel = statsModel;
  }

  /**
   * Answer the dashboard figures.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Error forwarding.
   * @returns {Promise<void>}
   */
  async show(req, res, next) {
    try {
      sendOk(res, await this.statsModel.summary(), 'Store statistics');
    } catch (error) {
      next(error);
    }
  }
}
