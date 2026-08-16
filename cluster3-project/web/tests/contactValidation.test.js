/**
 * @file Contact form validation rules.
 *
 * These rules are the single source of truth for the form: the controller
 * validates with them, and the template renders their messages into data
 * attributes for the browser script to read. A message that only exists in one
 * of those three places is the bug this module was extracted to prevent, so the
 * tests here pin the messages themselves and not merely that some error fired.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CONTACT_FIELDS,
  normaliseContact,
  toHtmlPattern,
  validateContact,
} from '../src/lib/contactValidation.js';

/** A submission that passes every rule, cloned per test and then broken. */
const valid = () => ({
  name: 'Jordan Kim',
  email: 'jordan@example.com',
  orderNumber: '',
  message: 'My keyboard arrived with a dead key.',
});

test('a complete submission raises no errors', () => {
  assert.deepEqual(validateContact(valid()), {});
});

test('the required fields each report their own message', () => {
  const errors = validateContact({ name: '', email: '', orderNumber: '', message: '' });

  assert.equal(errors.name, 'Please enter your name.');
  assert.equal(errors.email, 'Please enter your email.');
  assert.equal(errors.message, 'Please enter a message.');
});

test('whitespace does not satisfy a required field', () => {
  // The controller trims before validating, so this guards the case where a
  // future caller does not.
  const errors = validateContact({ ...valid(), name: '   ' });

  assert.equal(errors.name, 'Please enter your name.');
});

test('an address without a domain is not an email', () => {
  const errors = validateContact({ ...valid(), email: 'jordan@' });

  assert.equal(errors.email, 'Please enter a valid email address.');
});

test('an address without an @ is not an email', () => {
  const errors = validateContact({ ...valid(), email: 'jordan.example.com' });

  assert.equal(errors.email, 'Please enter a valid email address.');
});

test('an address with a domain but no dot is not an email', () => {
  const errors = validateContact({ ...valid(), email: 'jordan@example' });

  assert.equal(errors.email, 'Please enter a valid email address.');
});

test('the order number is optional', () => {
  assert.deepEqual(validateContact({ ...valid(), orderNumber: '' }), {});
});

test('an order number that is filled in must look like one', () => {
  const errors = validateContact({ ...valid(), orderNumber: '248' });

  assert.equal(errors.orderNumber, 'Order numbers look like LPA-00248.');
});

test('an order number is accepted whatever its case', () => {
  assert.deepEqual(validateContact({ ...valid(), orderNumber: 'lpa-00248' }), {});
});

test('each field refuses input past its limit', () => {
  const over = (field) => 'x'.repeat(CONTACT_FIELDS[field].maxLength + 1);
  const errors = validateContact({
    name: over('name'),
    email: `${'x'.repeat(CONTACT_FIELDS.email.maxLength)}@example.com`,
    orderNumber: `LPA-${'1'.repeat(CONTACT_FIELDS.orderNumber.maxLength)}`,
    message: over('message'),
  });

  assert.match(errors.name, /100 characters/);
  assert.match(errors.email, /254 characters/);
  assert.match(errors.orderNumber, /20 characters/);
  assert.match(errors.message, /2000 characters/);
});

test('input exactly at the limit is accepted', () => {
  // Off-by-one guard: the limit is inclusive, so a message of exactly 2000
  // characters must pass rather than fail by one.
  const errors = validateContact({
    ...valid(),
    message: 'x'.repeat(CONTACT_FIELDS.message.maxLength),
  });

  assert.deepEqual(errors, {});
});

test('length is reported instead of format when a field is both', () => {
  // Telling someone their 300-character address is badly formatted sends them
  // hunting for a typo that is not the problem.
  const errors = validateContact({ ...valid(), email: 'x'.repeat(300) });

  assert.match(errors.email, /254 characters/);
});

test('every field carries the messages its own rules can raise', () => {
  // The template renders these into data-error-* attributes, so a rule without
  // a message would leave the browser script with nothing to display.
  for (const [field, rules] of Object.entries(CONTACT_FIELDS)) {
    if (rules.required) {
      assert.ok(rules.messages.required, `${field} has a required message`);
    }
    if (rules.pattern) {
      assert.ok(rules.messages.invalid, `${field} has an invalid-format message`);
    }
    assert.ok(rules.messages.tooLong, `${field} has a too-long message`);
  }
});

test('no pattern carries a flag', () => {
  // The HTML pattern attribute cannot express a flag. A pattern with /i would
  // be enforced case-insensitively by the server and case-sensitively by the
  // browser, so the same order number would be accepted or rejected depending
  // on whether JavaScript ran.
  for (const [field, rules] of Object.entries(CONTACT_FIELDS)) {
    if (rules.pattern) {
      assert.equal(rules.pattern.flags, '', `${field}'s pattern is unflagged`);
    }
  }
});

test('the HTML pattern drops the anchors HTML adds back itself', () => {
  assert.equal(toHtmlPattern(/^[Ll][Pp][Aa]-\d+$/), '[Ll][Pp][Aa]-\\d+');
});

test('the browser and the server agree on every order number', () => {
  // Re-anchored the way a browser does, the attribute must reach the same
  // verdict as validateContact — the whole point of deriving one from the other.
  const asBrowser = new RegExp(`^(?:${toHtmlPattern(CONTACT_FIELDS.orderNumber.pattern)})$`);
  const cases = ['LPA-00248', 'lpa-00248', 'Lpa-1', '248', 'LPA-', 'LPA-12a', 'XPA-00248'];

  for (const candidate of cases) {
    const serverAccepts = !validateContact({
      name: 'Jordan Kim',
      email: 'jordan@example.com',
      orderNumber: candidate,
      message: 'Hello.',
    }).orderNumber;

    assert.equal(asBrowser.test(candidate), serverAccepts, `both agree on "${candidate}"`);
  }
});

test('normalising trims every field and fills in missing ones', () => {
  const values = normaliseContact({ name: '  Jordan Kim  ', email: 'jordan@example.com ' });

  assert.deepEqual(values, {
    name: 'Jordan Kim',
    email: 'jordan@example.com',
    orderNumber: '',
    message: '',
  });
});

test('normalising ignores body fields the form does not have', () => {
  // req.body is attacker-controlled; only the four known fields may survive.
  const values = normaliseContact({ name: 'Jordan', isAdmin: 'true' });

  assert.deepEqual(Object.keys(values), ['name', 'email', 'orderNumber', 'message']);
});
