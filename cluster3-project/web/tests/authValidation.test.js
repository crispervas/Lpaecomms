/**
 * @file Login and sign-up form rules.
 *
 * The two modes share a page and a POST handler, so most of what is worth
 * testing here is that they stay *different* where it matters: sign-up asks for
 * a name and a password long enough to be worth having, log in asks for
 * neither. A mode that quietly borrows the other's rules is the failure this
 * file is looking for.
 *
 * These rules decide whether a submission is well formed; the auth
 * controller's own tests cover signing in.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AUTH_FIELDS,
  normaliseAuth,
  resolveMode,
  validateAuth,
} from '../src/lib/authValidation.js';

test('a complete log in raises no errors', () => {
  assert.deepEqual(
    validateAuth('login', { email: 'jordan@example.com', password: 'hunter2!' }),
    {},
  );
});

test('a complete sign up raises no errors', () => {
  assert.deepEqual(
    validateAuth('signup', {
      name: 'Jordan',
      lastName: 'Kim',
      email: 'jordan@example.com',
      password: 'correct-horse',
    }),
    {},
  );
});

test('logging in asks for both fields', () => {
  const errors = validateAuth('login', { email: '', password: '' });

  assert.equal(errors.email, 'Please enter your email.');
  assert.equal(errors.password, 'Please enter your password.');
});

test('logging in does not ask for a name', () => {
  // The name input is not even rendered in this mode; demanding it would make
  // the form unsubmittable.
  const errors = validateAuth('login', { email: '', password: '' });

  assert.equal(errors.name, undefined);
});

test('signing up asks for a name', () => {
  const errors = validateAuth('signup', {
    name: '',
    email: 'jordan@example.com',
    password: 'correct-horse',
  });

  assert.equal(errors.name, 'Please enter your name.');
});

test('a malformed address is rejected in both modes', () => {
  for (const mode of ['login', 'signup']) {
    const errors = validateAuth(mode, {
      name: 'Jordan Kim',
      email: 'jordan@',
      password: 'correct-horse',
    });

    assert.equal(errors.email, 'Please enter a valid email address.', `${mode} checks the address`);
  }
});

test('signing up refuses a password too short to be worth having', () => {
  const errors = validateAuth('signup', {
    name: 'Jordan Kim',
    email: 'jordan@example.com',
    password: 'short',
  });

  assert.match(errors.password, /8 characters/);
});

test('logging in accepts a short password', () => {
  // The minimum applies to passwords being chosen, not to ones already set. An
  // existing account with a five-character password must still be able to try.
  const errors = validateAuth('login', {
    email: 'jordan@example.com',
    password: 'short',
  });

  assert.deepEqual(errors, {});
});

test('a password of exactly the minimum is accepted', () => {
  const min = AUTH_FIELDS.signup.password.minLength;
  const errors = validateAuth('signup', {
    name: 'Jordan',
    lastName: 'Kim',
    email: 'jordan@example.com',
    password: 'x'.repeat(min),
  });

  assert.deepEqual(errors, {});
});

test('a password is not trimmed away at its edges', () => {
  // Passwords may legitimately begin or end with a space. Trimming one would
  // silently change what the user typed, and later reject the password they set.
  const values = normaliseAuth('login', { email: ' jordan@example.com ', password: ' spaced ' });

  assert.equal(values.email, 'jordan@example.com');
  assert.equal(values.password, ' spaced ');
});

test('normalising keeps only the fields that mode renders', () => {
  const values = normaliseAuth('login', {
    email: 'jordan@example.com',
    password: 'hunter2!',
    name: 'Sneaked in',
    isAdmin: 'true',
  });

  assert.deepEqual(Object.keys(values), ['email', 'password']);
});

test('no pattern carries a flag', () => {
  // Same invariant as the contact form: these are handed to HTML `pattern`
  // attributes, which cannot express a flag.
  for (const [mode, fields] of Object.entries(AUTH_FIELDS)) {
    for (const [field, rules] of Object.entries(fields)) {
      if (rules.pattern) {
        assert.equal(rules.pattern.flags, '', `${mode}.${field} is unflagged`);
      }
    }
  }
});

test('every rule a field declares has a message to show for it', () => {
  for (const [mode, fields] of Object.entries(AUTH_FIELDS)) {
    for (const [field, rules] of Object.entries(fields)) {
      const where = `${mode}.${field}`;
      if (rules.required) assert.ok(rules.messages.required, `${where} explains being empty`);
      if (rules.pattern) assert.ok(rules.messages.invalid, `${where} explains a bad format`);
      if (rules.minLength) assert.ok(rules.messages.tooShort, `${where} explains being short`);
      assert.ok(rules.messages.tooLong, `${where} explains being long`);
    }
  }
});

test('signing up asks for a last name', () => {
  const errors = validateAuth('signup', {
    name: 'Jordan', lastName: '', email: 'jordan@example.com', password: 'correct-horse',
  });
  assert.equal(errors.lastName, 'Please enter your last name.');
});

test('emails are lower-cased in both modes, because accounts match them exactly', () => {
  for (const mode of ['login', 'signup']) {
    assert.equal(normaliseAuth(mode, { email: ' Jordan@Example.COM ' }).email, 'jordan@example.com', mode);
  }
});

test('the tab query picks the mode', () => {
  assert.equal(resolveMode('signup'), 'signup');
  assert.equal(resolveMode('login'), 'login');
});

test('anything unrecognised falls back to logging in', () => {
  // ?tab= is public and arrives as whatever someone types. An unknown value
  // must not reach the template, which renders one of two known modes.
  for (const tab of [undefined, '', 'admin', 'SIGNUP', ['signup'], null]) {
    assert.equal(resolveMode(tab), 'login', `"${String(tab)}" falls back`);
  }
});
