/**
 * @file Account controller.
 *
 * Serves the signed-in customer's Account page, which carries two tabs on one
 * URL: the profile form and the order history. `?tab=orders` selects the
 * second, so the switch is a pair of links and works with no JavaScript. The
 * routes put requireCustomer in front, so `req.customer` is always set here.
 *
 * Everything is read and written through CustomerModel and scoped to the
 * customer's own id: the profile saves name, last name, phone and address,
 * and the orders tab lists the orders this customer placed at the checkout.
 */

import {
  PROFILE_FIELDS,
  initials,
  normaliseProfile,
  resolveAccountTab,
  validateProfile,
} from '../lib/accountValidation.js';
import { stamp } from '../middlewares/audit.js';
import { CUSTOMER_ROLE } from '../models/customer.model.js';

/** Page titles, one per tab. */
const PAGE_TITLES = {
  profile: 'Lpaecomms — Profile',
  orders: 'Lpaecomms — Orders',
};

/** Shown after the redirect that follows a successful save. */
const SAVED_NOTICE = 'Your profile has been saved.';

/** The profile form's own script; the orders tab needs none. */
const ACCOUNT_SCRIPTS = ['/js/form-validation.js'];

/**
 * Map a stored profile to the form's field names.
 *
 * @param {{name: string, lastName: string, phone: string|null, address: string|null}} profile - Stored profile.
 * @returns {{firstName: string, lastName: string, phone: string, address: string}} Form values.
 */
const toFormValues = (profile) => ({
  firstName: profile.name,
  lastName: profile.lastName,
  phone: profile.phone ?? '',
  address: profile.address ?? '',
});

/**
 * Controller for the Account page.
 */
export class AccountController {
  /**
   * @param {import('../models/customer.model.js').CustomerModel} customerModel - Injected model.
   */
  constructor(customerModel) {
    /** @type {import('../models/customer.model.js').CustomerModel} */
    this.customerModel = customerModel;
  }

  /**
   * Render whichever tab the query asks for, filled from the stored profile.
   *
   * @param {import('express').Request} req - Request with `req.customer`.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async show(req, res) {
    const profile = await this.customerModel.findActive(req.customer.id);
    // Gone between the session check and here: sign in again.
    if (!profile) return res.redirect(303, '/login');

    await this.#render(res, {
      customerId: req.customer.id,
      tab: resolveAccountTab(req.query.tab),
      profile,
      values: toFormValues(profile),
      notice: req.query.saved === '1' ? SAVED_NOTICE : null,
    });
  }

  /**
   * Validate and save a profile submission.
   *
   * A malformed submission answers 422 with the errors and saves nothing; a
   * well-formed one is saved and answered with a 303 back to the page, so a
   * refresh does not offer to resubmit.
   *
   * @param {import('express').Request} req - Request with `req.customer` and the form body.
   * @param {import('express').Response} res - Outgoing response.
   * @returns {Promise<void>}
   */
  async saveProfile(req, res) {
    const values = normaliseProfile(req.body);
    const errors = validateProfile(values);

    if (Object.keys(errors).length > 0) {
      const profile = await this.customerModel.findActive(req.customer.id);
      if (!profile) return res.redirect(303, '/login');
      // 422 rather than 400: the body parsed fine, it just failed the rules.
      res.status(422);
      await this.#render(res, { customerId: req.customer.id, tab: 'profile', profile, values, errors });
      return;
    }

    await this.customerModel.updateProfile(req.customer.id, {
      name: values.firstName,
      lastName: values.lastName,
      phone: values.phone,
      address: values.address,
      updated: {
        ...stamp({ time: new Date().toISOString(), user: { id: req.customer.id, role: CUSTOMER_ROLE } }),
        source: 'web',
      },
    });
    res.redirect(303, '/account?saved=1');
  }

  /**
   * Render the Account page with a full set of locals.
   *
   * Orders are fetched only for the orders tab: the profile tab never shows
   * them, and the query should not run for a page that discards it.
   *
   * @param {import('express').Response} res - Outgoing response.
   * @param {{
   *   customerId: number,
   *   tab: 'profile'|'orders',
   *   profile: {name: string, lastName: string, email: string},
   *   values: Record<string, string>,
   *   errors?: Record<string, string>,
   *   notice?: string|null,
   * }} state - What to show.
   * @returns {Promise<void>}
   */
  async #render(res, { customerId, tab, profile, values, errors = {}, notice = null }) {
    const orders = tab === 'orders' ? await this.customerModel.listOrders(customerId) : [];

    res.render('layouts/base', {
      title: PAGE_TITLES[tab],
      page: 'account',
      scripts: tab === 'profile' ? ACCOUNT_SCRIPTS : [],
      tab,
      profile,
      initials: initials(profile.name, profile.lastName),
      fields: PROFILE_FIELDS,
      values,
      errors,
      notice,
      orders,
    });
  }
}
