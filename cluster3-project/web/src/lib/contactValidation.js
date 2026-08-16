/**
 * @file Contact form validation rules.
 *
 * The single source of truth for what the contact form accepts. Three consumers
 * read from here, which is the whole reason it is not inlined in the
 * controller:
 *
 *   1. `contact.controller.js` validates submissions with `validateContact`.
 *   2. `components/contact/formField.ejs` renders each field's limit as native
 *      HTML attributes and each message into a `data-error-*` attribute.
 *   3. `public/js/contact-form.js` reads those attributes back out of the DOM.
 *
 * The browser therefore never holds a copy of a message, and cannot drift from
 * the server. Rules the browser can enforce natively (required, maximum length,
 * shape) are expressed so they map onto HTML attributes; the script only has to
 * decide which of a field's messages applies.
 */

/** Basic email shape check: something@something.something. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Lpaecomms order number: the LPA prefix and a run of digits. Customers copy it
 * out of an email in whatever case they find it, so either case is accepted.
 *
 * Spelled with character classes rather than the `i` flag on purpose. These
 * patterns are handed to HTML `pattern` attributes, and that attribute has no
 * way to express a flag: `/^LPA-\d+$/i` would make the browser reject the
 * `lpa-00248` the server accepts, and the two validators would disagree on the
 * one input most likely to be pasted in lower case.
 */
const ORDER_PATTERN = /^[Ll][Pp][Aa]-\d+$/;

/**
 * Build the message shown when a field runs past its limit.
 *
 * @param {number} maxLength - The field's inclusive maximum.
 * @returns {string} Message naming the limit.
 */
const tooLong = (maxLength) => `Please keep this to ${maxLength} characters or fewer.`;

/**
 * Every field the form submits, keyed by its `name` attribute. `pattern` is
 * checked only once a field has a value, so an optional field with a shape —
 * the order number — stays optional.
 *
 * @type {Record<string, {
 *   required: boolean,
 *   maxLength: number,
 *   pattern?: RegExp,
 *   messages: { required?: string, invalid?: string, tooLong: string },
 * }>}
 */
export const CONTACT_FIELDS = {
  name: {
    required: true,
    maxLength: 100,
    messages: {
      required: 'Please enter your name.',
      tooLong: tooLong(100),
    },
  },
  email: {
    required: true,
    // The maximum length of an email address in RFC 5321.
    maxLength: 254,
    pattern: EMAIL_PATTERN,
    messages: {
      required: 'Please enter your email.',
      invalid: 'Please enter a valid email address.',
      tooLong: tooLong(254),
    },
  },
  orderNumber: {
    required: false,
    maxLength: 20,
    pattern: ORDER_PATTERN,
    messages: {
      invalid: 'Order numbers look like LPA-00248.',
      tooLong: tooLong(20),
    },
  },
  message: {
    required: true,
    maxLength: 2000,
    messages: {
      required: 'Please enter a message.',
      tooLong: tooLong(2000),
    },
  },
};

// Derive each field's HTML `pattern` attribute from the regular expression the
// server validates with, so the template never restates a rule. Done here
// rather than in the template because an EJS view cannot import a module
// without switching the whole render to async.
for (const rules of Object.values(CONTACT_FIELDS)) {
  if (rules.pattern) rules.htmlPattern = toHtmlPattern(rules.pattern);
}

/**
 * Render a rule's pattern for an HTML `pattern` attribute.
 *
 * Lets the browser enforce the same shape the server does, from the same
 * regular expression, instead of a second copy written by hand in the template.
 *
 * @param {RegExp} pattern - A field's pattern. Must carry no flags: the HTML
 *   attribute cannot express one, so a flagged pattern would mean the two
 *   validators disagree.
 * @returns {string} The pattern source without its anchors.
 */
export function toHtmlPattern(pattern) {
  // HTML anchors the attribute implicitly, so the anchors are redundant here
  // and only make the attribute harder to read.
  return pattern.source.replace(/^\^/, '').replace(/\$$/, '');
}

/**
 * Reduce a request body to the form's own fields, trimmed.
 *
 * Only the four known fields survive: `req.body` is whatever the client chose
 * to send, and passing it onward wholesale is how an unexpected key ends up
 * somewhere it was never meant to reach.
 *
 * @param {Record<string, unknown>} body - Parsed request body.
 * @returns {{ name: string, email: string, orderNumber: string, message: string }} Trimmed values, missing fields as empty strings.
 */
export function normaliseContact(body = {}) {
  const values = {};
  for (const field of Object.keys(CONTACT_FIELDS)) {
    values[field] = String(body[field] ?? '').trim();
  }
  return values;
}

/**
 * Validate normalised contact values.
 *
 * Each field stops at its first failure, checked in the order a person would
 * want to hear about them: whether it is there, whether it is a sane length,
 * and only then whether it is well formed. Reporting "that address looks
 * invalid" about a 300-character string sends the reader hunting for a typo
 * that is not the problem.
 *
 * @param {{ name: string, email: string, orderNumber: string, message: string }} values - Trimmed input, as returned by `normaliseContact`.
 * @returns {Record<string, string>} Field name to error message; empty when everything passes.
 */
export function validateContact(values) {
  const errors = {};

  for (const [field, rules] of Object.entries(CONTACT_FIELDS)) {
    const value = (values[field] ?? '').trim();

    if (!value) {
      if (rules.required) errors[field] = rules.messages.required;
      continue;
    }
    if (value.length > rules.maxLength) {
      errors[field] = rules.messages.tooLong;
      continue;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.messages.invalid;
    }
  }

  return errors;
}
