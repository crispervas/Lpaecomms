/**
 * @file Auth controller.
 *
 * Serves the login page, which carries two modes on one URL: logging in and
 * signing up. `?tab=signup` selects the second, and a hidden `mode` field
 * carries the choice through a submission so a rejected sign-up comes back on
 * the sign-up tab with its fields intact.
 *
 * Both modes are real for customers: log in checks the password against the
 * account, sign-up creates a CUSTOMER account, and either one ends with the
 * session cookie set (lib/session.js). Admins are refused here — they work in
 * the desktop app — with the same message as a wrong password. A hidden `next`
 * field carries where the visitor was going, such as the checkout, through a
 * failed attempt and back after a successful one.
 */

import { randomBytes } from 'node:crypto';
import bcrypt from 'bcrypt';
import {
  AUTH_FIELDS,
  normaliseAuth,
  resolveMode,
  validateAuth,
} from '../lib/authValidation.js';
import { signToken } from '../lib/jwt.js';
import { SESSION_COOKIE, safeNext, sessionCookieOptions } from '../lib/session.js';
import { stamp } from '../middlewares/audit.js';
import { BCRYPT_ROUNDS } from '../models/user.model.js';
import { CUSTOMER_ROLE } from '../models/customer.model.js';

/** Page titles, one per mode. */
const PAGE_TITLES = {
  login: 'Lpaecomms — Log in',
  signup: 'Lpaecomms — Create your account',
};

/** The one message every refused log in gets, so none reveals which emails exist. */
const INVALID = 'Email or password is incorrect.';

/** Shown on a sign-up whose email already has an account. */
const EMAIL_TAKEN = 'An account with this email already exists.';

/**
 * Hash compared against when no account matches, so an unknown email costs the
 * same bcrypt work as a wrong password. Computed once at load, at the same cost.
 */
const DUMMY_HASH = bcrypt.hashSync(randomBytes(16).toString('hex'), BCRYPT_ROUNDS);

/** The form's own script; the page needs no third-party asset. */
const AUTH_SCRIPTS = ['/js/form-validation.js'];

/**
 * Controller for the login page.
 */
export class AuthController {
  /**
   * @param {import('../models/customer.model.js').CustomerModel} customerModel - Injected model.
   * @param {Object} [options] - Test seams.
   * @param {(plain: string, hash: string) => Promise<boolean>} [options.compare] - Password check.
   */
  constructor(customerModel, { compare = bcrypt.compare } = {}) {
    /** @type {import('../models/customer.model.js').CustomerModel} */
    this.customerModel = customerModel;
    this.compare = compare;
  }

  /**
   * Render the page in whichever mode the query asks for. A customer who is
   * already signed in has nothing to do here and goes to their account.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  showLogin(req, res) {
    if (req.customer) {
      res.redirect(303, '/account');
      return;
    }
    this.#render(res, { mode: resolveMode(req.query.tab), next: safeNext(req.query.next) });
  }

  /**
   * Validate a submission, then log the customer in or create their account.
   *
   * A malformed submission answers 422 with the errors; a refused log in 401;
   * a taken email 422. Success sets the session cookie and redirects (303) to
   * the `next` path when it is on this site, otherwise to /account.
   *
   * @param {import('express').Request} req - Incoming request with form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   * @throws {Error} Database errors, for the error middleware.
   */
  async login(req, res) {
    // `mode` arrives from the client like every other field, so it is resolved
    // through the same whitelist as the query string rather than trusted.
    const mode = resolveMode(req.body.mode);
    const next = safeNext(req.body.next);
    const values = normaliseAuth(mode, req.body);
    const errors = validateAuth(mode, values);

    if (Object.keys(errors).length > 0) {
      // 422 rather than 400: the body parsed fine, it just failed the rules.
      res.status(422);
      this.#render(res, { mode, values, errors, next });
      return;
    }

    if (mode === 'login') {
      await this.#logIn(res, values, next);
      return;
    }
    await this.#signUp(res, values, next);
  }

  /**
   * End the session.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {void}
   */
  logout(req, res) {
    const { maxAge, ...options } = sessionCookieOptions();
    res.clearCookie(SESSION_COOKIE, options);
    res.redirect(303, '/');
  }

  /**
   * Check a well-formed log in against the account.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{email: string, password: string}} values - Normalised input.
   * @param {string} next - Where to go on success.
   * @returns {Promise<void>}
   */
  async #logIn(res, values, next) {
    const account = await this.customerModel.findForLogin(values.email);
    // Always compared, even with no account, so the timing does not reveal
    // which emails exist.
    const matches = await this.compare(values.password, account?.password ?? DUMMY_HASH);

    if (!account || !matches || account.status !== 1 || account.deletedAt || account.role.code !== CUSTOMER_ROLE) {
      res.status(401);
      this.#render(res, { mode: 'login', values, errors: { form: INVALID }, next });
      return;
    }

    this.#startSession(res, account.id, next);
  }

  /**
   * Create the account for a well-formed sign-up, then sign it in.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{name: string, lastName: string, email: string, password: string}} values - Normalised input.
   * @param {string} next - Where to go on success.
   * @returns {Promise<void>}
   */
  async #signUp(res, values, next) {
    if (await this.customerModel.emailExists(values.email)) {
      res.status(422);
      this.#render(res, { mode: 'signup', values, errors: { email: EMAIL_TAKEN }, next });
      return;
    }

    const now = new Date();
    const created = {
      ...stamp({ time: now.toISOString(), user: { id: null, role: CUSTOMER_ROLE } }),
      source: 'web',
    };
    const customer = await this.customerModel.create({ ...values, created });
    this.#startSession(res, customer.id, next);
  }

  /**
   * Set the session cookie and leave the page.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {number} id - The customer's id.
   * @param {string} next - A same-site path.
   * @returns {void}
   */
  #startSession(res, id, next) {
    res.cookie(SESSION_COOKIE, signToken({ id, role: CUSTOMER_ROLE }), sessionCookieOptions());
    // 303 so the browser follows with a GET: a refresh must not offer to
    // resubmit the password.
    res.redirect(303, next);
  }

  /**
   * Render the login page with a full set of locals.
   *
   * The password is dropped on the way out, whatever the caller passed. Putting
   * it back in the markup would write it into the browser cache, any proxy log
   * along the way, and view-source — for a field the reader can simply retype.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{ mode: 'login'|'signup', values?: object, errors?: object, next?: string }} state - What to show.
   * @returns {void}
   */
  #render(res, { mode, values = {}, errors = {}, next = '/account' }) {
    res.render('layouts/base', {
      title: PAGE_TITLES[mode],
      page: 'login',
      // The split screen runs edge to edge, so this page skips the shared
      // container the other pages sit in.
      bleed: true,
      scripts: AUTH_SCRIPTS,
      mode,
      fields: AUTH_FIELDS[mode],
      values: { ...values, password: '' },
      errors,
      next,
    });
  }
}
