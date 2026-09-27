/**
 * @file Access tokens.
 *
 * Signs and verifies the JWT the API issues at login. The payload is the
 * minimum authorisation needs — user id as `sub`, role code as `role` — so a
 * token never carries personal data.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Sign an access token.
 *
 * @param {{id: number, role: string}} user - The authenticated user.
 * @returns {string} Signed JWT.
 */
export function signToken({ id, role }) {
  return jwt.sign({ role }, config.jwtSecret, {
    subject: String(id),
    expiresIn: config.jwtExpiresIn,
    algorithm: 'HS256',
  });
}

/**
 * Verify an access token.
 *
 * @param {string} token - Raw JWT.
 * @returns {{id: number, role: string}} The token's user.
 * @throws {Error} When the signature, expiry or payload is invalid.
 */
export function verifyToken(token) {
  // Pinning the algorithm refuses tokens that downgrade to "none".
  const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
  const id = Number(payload.sub);
  if (!Number.isInteger(id) || typeof payload.role !== 'string') {
    throw new Error('Malformed token payload');
  }
  return { id, role: payload.role };
}
