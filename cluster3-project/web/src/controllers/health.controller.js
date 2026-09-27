/**
 * @file Health controller.
 *
 * API endpoint that reports service health. Part of the API layer: it
 * orchestrates the health model and answers in the shared response envelope.
 * It never builds queries itself; that is the model's responsibility.
 */

import { sendOk } from '../lib/apiResponse.js';

/**
 * Controller for the health check endpoint.
 */
export class HealthController {
  /**
   * @param {import('../models/health.model.js').HealthModel} healthModel - Injected health model.
   */
  constructor(healthModel) {
    /** @type {import('../models/health.model.js').HealthModel} */
    this.healthModel = healthModel;
  }

  /**
   * Report whether the service and its database are healthy.
   *
   * Responds 200 when the database is reachable and 503 when it is not, so
   * uptime checks can rely on the status code as well as the body.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async check(req, res) {
    const dbReachable = await this.healthModel.isDatabaseReachable();
    sendOk(
      res,
      { status: dbReachable ? 'ok' : 'degraded', db: dbReachable ? 'connected' : 'unreachable' },
      dbReachable ? 'Service healthy' : 'Database unreachable',
      dbReachable ? 200 : 503,
    );
  }
}
