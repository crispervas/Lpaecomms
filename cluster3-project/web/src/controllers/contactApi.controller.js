/**
 * @file Contact API controller.
 *
 * Accepts contact messages from the mobile and desktop clients. Part of the
 * API layer: it validates the JSON body with the same rules as the web
 * contact form (lib/contactValidation.js), so all three clients agree on what
 * a valid message is. Like the web form, nothing is delivered yet — delivery
 * is a separate integration — so acceptance answers 202, not 201.
 */

import boom from '@hapi/boom';

import { normaliseContact, validateContact } from '../lib/contactValidation.js';
import { sendOk } from '../lib/apiResponse.js';

/**
 * Controller for the contact endpoint.
 */
export class ContactApiController {
  /**
   * Validate and accept a contact message.
   *
   * @param {import('express').Request} req - Incoming request; reads the JSON body.
   * @param {import('express').Response} res - Outgoing response.
   * @param {import('express').NextFunction} next - Forwards failures to the error middleware.
   * @returns {void}
   */
  submit(req, res, next) {
    try {
      const { body } = req;
      // No body, a non-JSON body, or JSON that is not a plain object leaves
      // nothing to validate field by field.
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        throw boom.badRequest('Send the message as a JSON object.');
      }

      const errors = validateContact(normaliseContact(body));
      const details = Object.entries(errors).map(([field, message]) => ({ field, message }));

      if (details.length > 0) {
        throw boom.badData('Some fields need attention.', { details });
      }

      sendOk(res, { received: true }, 'Message received', 202);
    } catch (error) {
      next(error);
    }
  }
}
