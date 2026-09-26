/**
 * @file Account controller.
 *
 * Serves the Account page, which carries two tabs on one URL: the profile form
 * and the order history. `?tab=orders` selects the second, so the switch is a
 * pair of links and works with no JavaScript.
 *
 * **This is a preview.** There is no authentication and no user model, so the
 * page shows the sample account from models/account.model.js and a profile
 * submission is validated, then answered with a notice saying it was not
 * saved. Nothing here pretends otherwise.
 */

import { AccountModel } from '../models/account.model.js';
import {
  PROFILE_FIELDS,
  initials,
  normaliseProfile,
  resolveAccountTab,
  validateProfile,
} from '../lib/accountValidation.js';

/** Page titles, one per tab. */
const PAGE_TITLES = {
  profile: 'Lpaecomms — Profile',
  orders: 'Lpaecomms — Orders',
};

/** Shown on any well-formed profile submission, because none can be saved. */
const PREVIEW_NOTICE =
  'Profile changes cannot be saved yet. This is a preview of your account page.';

/** The profile form's own script; the orders tab needs none. */
const ACCOUNT_SCRIPTS = ['/js/form-validation.js'];

/**
 * Controller for the Account page.
 */
export class AccountController {
  /** @type {AccountModel} */
  #model;

  /**
   * @param {AccountModel} [model] - Source of the profile and orders; injected
   *   so tests can supply a double.
   */
  constructor(model = new AccountModel()) {
    this.#model = model;
  }

  /**
   * Render whichever tab the query asks for, filled from the stored profile.
   *
   * @param {import('express').Request} req - Incoming request.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async show(req, res) {
    const profile = await this.#model.getProfile();
    await this.#render(res, { tab: resolveAccountTab(req.query.tab), profile, values: profile });
  }

  /**
   * Validate a profile submission and report that it cannot be saved.
   *
   * A malformed submission answers 422 with the errors; a well-formed one
   * answers 200 with the preview notice. Neither changes the stored profile,
   * so the sidebar keeps showing it while the form shows what was typed.
   *
   * @param {import('express').Request} req - Incoming request with form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async saveProfile(req, res) {
    const profile = await this.#model.getProfile();
    const values = normaliseProfile(req.body);
    const errors = validateProfile(values);

    if (Object.keys(errors).length > 0) {
      // 422 rather than 400: the body parsed fine, it just failed the rules.
      res.status(422);
      await this.#render(res, { tab: 'profile', profile, values, errors });
      return;
    }

    await this.#render(res, { tab: 'profile', profile, values, notice: PREVIEW_NOTICE });
  }

  /**
   * Render the Account page with a full set of locals.
   *
   * Orders are fetched only for the orders tab: the profile tab never shows
   * them, and a real orders query should not run for a page that discards it.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{
   *   tab: 'profile'|'orders',
   *   profile: import('../models/account.model.js').AccountProfile,
   *   values: Record<string, string>,
   *   errors?: Record<string, string>,
   *   notice?: string|null,
   * }} state - What to show.
   * @returns {Promise<void>}
   */
  async #render(res, { tab, profile, values, errors = {}, notice = null }) {
    const orders = tab === 'orders' ? await this.#model.listOrders() : [];

    res.render('layouts/base', {
      title: PAGE_TITLES[tab],
      page: 'account',
      scripts: tab === 'profile' ? ACCOUNT_SCRIPTS : [],
      tab,
      profile,
      initials: initials(profile.firstName, profile.lastName),
      fields: PROFILE_FIELDS,
      values,
      errors,
      notice,
      orders,
    });
  }
}
