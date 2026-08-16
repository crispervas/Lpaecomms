/**
 * @file The rule engine behind every validated form.
 *
 * A form describes itself as a table of fields — what each one requires, how
 * long it may be, what shape it must take, and the exact sentence to show when
 * it does not. This module turns such a table into the three things every form
 * on the site needs: trimmed values, a map of errors, and HTML `pattern`
 * attributes derived from the same regular expressions the server checks.
 *
 * It holds no rules and no copy of its own. `contactValidation.js` and
 * `authValidation.js` own those; this file only knows how to apply them, so a
 * new form is a new table rather than a second copy of this logic.
 */

/**
 * Strip the anchors from a pattern so it can be an HTML `pattern` attribute.
 *
 * Lets the browser enforce the same shape the server does, from the same
 * regular expression, instead of a second copy written by hand in a template.
 *
 * @param {RegExp} pattern - A field's pattern. Must carry no flags: the HTML
 *   attribute cannot express one, so a flagged pattern would mean the browser
 *   and the server disagree about the same input.
 * @returns {string} The pattern source, unanchored, since HTML anchors it itself.
 */
export function toHtmlPattern(pattern) {
  return pattern.source.replace(/^\^/, '').replace(/\$$/, '');
}

/**
 * Attach each field's `htmlPattern` in place, derived from its `pattern`.
 *
 * Done once at module load so templates can read the attribute straight off the
 * rules. A view cannot import a module without switching the whole render to
 * async, which is why this is not computed in the template.
 *
 * @param {Record<string, {pattern?: RegExp, htmlPattern?: string}>} fields - A field table.
 * @returns {Record<string, object>} The same table, for convenient chaining.
 */
export function attachHtmlPatterns(fields) {
  for (const rules of Object.values(fields)) {
    if (rules.pattern) rules.htmlPattern = toHtmlPattern(rules.pattern);
  }
  return fields;
}

/**
 * Reduce a request body to a field table's own fields.
 *
 * Only the declared fields survive: `req.body` is whatever the client chose to
 * send, and carrying it onward wholesale is how an unexpected key ends up
 * somewhere it was never meant to reach.
 *
 * Values are trimmed unless the field sets `preserveWhitespace`, which exists
 * for passwords: one may legitimately begin or end with a space, and trimming
 * it would silently change what was typed.
 *
 * @param {Record<string, {preserveWhitespace?: boolean}>} fields - A field table.
 * @param {Record<string, unknown>} body - Parsed request body.
 * @returns {Record<string, string>} One entry per declared field; missing ones as empty strings.
 */
export function normaliseFields(fields, body = {}) {
  const values = {};
  for (const [field, rules] of Object.entries(fields)) {
    const raw = String(body[field] ?? '');
    values[field] = rules.preserveWhitespace ? raw : raw.trim();
  }
  return values;
}

/**
 * Validate normalised values against a field table.
 *
 * Each field stops at its first failure, checked in the order a person would
 * want to hear about them: whether it is there, whether it is a sane length,
 * and only then whether it is well formed. Reporting "that looks invalid" about
 * a 300-character string sends the reader hunting for a typo that is not the
 * problem.
 *
 * @param {Record<string, object>} fields - A field table.
 * @param {Record<string, string>} values - Normalised input.
 * @returns {Record<string, string>} Field name to error message; empty when everything passes.
 */
export function validateFields(fields, values) {
  const errors = {};

  for (const [field, rules] of Object.entries(fields)) {
    const value = rules.preserveWhitespace ? (values[field] ?? '') : (values[field] ?? '').trim();

    if (!value) {
      if (rules.required) errors[field] = rules.messages.required;
      continue;
    }
    if (value.length > rules.maxLength) {
      errors[field] = rules.messages.tooLong;
      continue;
    }
    if (rules.minLength && value.length < rules.minLength) {
      errors[field] = rules.messages.tooShort;
      continue;
    }
    if (rules.pattern && !rules.pattern.test(value)) {
      errors[field] = rules.messages.invalid;
    }
  }

  return errors;
}
