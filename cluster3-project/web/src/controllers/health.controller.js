/**
 * @file Health controller.
 *
 * API endpoint that reports service health. Part of the API layer: it
 * orchestrates the health model and returns JSON. It never builds queries
 * itself; that is the model's responsibility.
 */

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
    res.status(dbReachable ? 200 : 503).json({
      status: dbReachable ? 'ok' : 'degraded',
      db: dbReachable ? 'connected' : 'unreachable',
    });
  }
}
