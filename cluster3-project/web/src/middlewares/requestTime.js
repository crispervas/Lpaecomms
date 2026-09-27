/**
 * @file Request time.
 *
 * Fixes the moment a request arrived, once, so every audit stamp written while
 * handling it agrees on `server`. Also captures the client's optional `time`
 * field before body validation strips undeclared keys; the audit block keeps it
 * as `client`. Mounted on /api after express.json(), so the body is parsed.
 */

/** Longest client-supplied time kept; anything longer is not a timestamp. */
const MAX_CLIENT_TIME_LENGTH = 64;

/**
 * Set `req.time` (ISO string) and `req.clientTime` (client-supplied, if any).
 *
 * @param {import('express').Request} req - Incoming request.
 * @param {import('express').Response} res - Unused.
 * @param {import('express').NextFunction} next - Continues the chain.
 * @returns {void}
 */
export function requestTime(req, res, next) {
  req.time = new Date().toISOString();
  const clientTime = req.body?.time;
  req.clientTime =
    typeof clientTime === 'string' && clientTime.length <= MAX_CLIENT_TIME_LENGTH ? clientTime : undefined;
  next();
}
