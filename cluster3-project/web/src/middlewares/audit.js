/**
 * @file Audit stamps for the `created` / `updated` JSON columns.
 *
 * Adapted from the team's audit middleware. Each write records when it
 * happened — in the client's words, the server's, and as local date/time in
 * APP_TIMEZONE — and who did it, taken from the verified JWT. The time is
 * resolved per request: resolving it at module load stamps every row with the
 * process start time, which is exactly the block people read when they need to
 * reconstruct what happened.
 *
 * Runs after `validate`, which has already dropped any `created`, `updated` or
 * `unixTime` the client sent, so the stamp cannot be forged.
 */

import { config } from '../config/env.js';

/**
 * Format an instant as local calendar date and wall-clock time in a zone.
 *
 * `en-CA` gives ISO-ordered dates (YYYY-MM-DD); `hourCycle: 'h23'` avoids the
 * "24:00:00" some runtimes print for midnight.
 *
 * @param {Date} date - Instant to format.
 * @param {string} timeZone - IANA zone.
 * @returns {{serverDate: string, serverTime: string}} Local date and time.
 */
function localParts(date, timeZone) {
  const serverDate = new Intl.DateTimeFormat('en-CA', {
    timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
  const serverTime = new Intl.DateTimeFormat('en-GB', {
    timeZone, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).format(date);
  return { serverDate, serverTime };
}

/**
 * Build the audit middlewares around an injectable clock.
 *
 * @param {Object} [options] - Overrides for tests.
 * @param {() => Date} [options.now] - Clock.
 * @param {string} [options.timeZone] - IANA zone for serverDate/serverTime.
 * @returns {{stamp: Function, createTime: import('express').RequestHandler, updateTime: import('express').RequestHandler}}
 *   The stamp builder and the two middlewares.
 */
export function makeAudit({ now = () => new Date(), timeZone = config.appTimezone } = {}) {
  /**
   * Build one audit stamp for a request.
   *
   * @param {import('express').Request} req - Request carrying `time`, `clientTime`, `user`.
   * @returns {{client: string, server: string, serverDate: string, serverTime: string, unixTime: number, user: number|null, role: string|null}}
   *   The stamp.
   */
  const stamp = (req) => {
    const date = now();
    return {
      client: req.clientTime ?? req.time,
      server: req.time,
      ...localParts(date, timeZone),
      unixTime: Math.floor(date.getTime() / 1000),
      // No session means a system actor (seed, future jobs): record the gap
      // instead of inventing a user.
      user: req.user?.id ?? null,
      role: req.user?.role ?? null,
    };
  };

  /**
   * Stamp `req.body.created` for an insert.
   *
   * @param {import('express').Request} req - Request being handled.
   * @param {import('express').Response} res - Unused.
   * @param {import('express').NextFunction} next - Continues the chain.
   * @returns {void}
   */
  const createTime = (req, res, next) => {
    req.body = req.body ?? {};
    req.body.created = stamp(req);
    // Only `template` has this column; CrudModel drops it for every other model.
    req.body.unixTime = req.body.created.unixTime;
    next();
  };

  /**
   * Stamp `req.body.updated` for an update or a soft delete.
   *
   * @param {import('express').Request} req - Request being handled.
   * @param {import('express').Response} res - Unused.
   * @param {import('express').NextFunction} next - Continues the chain.
   * @returns {void}
   */
  const updateTime = (req, res, next) => {
    req.body = req.body ?? {};
    req.body.updated = stamp(req);
    req.body.unixTime = req.body.updated.unixTime;
    next();
  };

  return { stamp, createTime, updateTime };
}

/**
 * Default instances, on the real clock and APP_TIMEZONE. `stamp` is exported
 * for the web views, which write rows without going through these middlewares.
 */
export const { stamp, createTime, updateTime } = makeAudit();
