/**
 * @file Tests for the admin sign-in rules.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { LOGIN_MAX_LENGTH, validateLogin } from '../src/renderer/lib/loginRules.mjs';

test('accepts a well-formed email and password', () => {
  assert.deepEqual(validateLogin({ email: 'admin@lpaecomms.com', password: 'secret' }), {});
});

test('requires both fields', () => {
  assert.deepEqual(validateLogin({ email: '   ', password: '' }), {
    email: 'Please enter your email.',
    password: 'Please enter your password.',
  });
});

test('rejects a malformed email', () => {
  const errors = validateLogin({ email: 'admin@lpaecomms', password: 'secret' });
  assert.equal(errors.email, 'Please enter a valid email address.');
});

test('trims the email but never the password', () => {
  assert.deepEqual(validateLogin({ email: '  admin@lpaecomms.com  ', password: ' ' }), {});
});

test('reports length before format', () => {
  const email = `${'a'.repeat(LOGIN_MAX_LENGTH.email)}@x`;
  const password = 'p'.repeat(LOGIN_MAX_LENGTH.password + 1);
  assert.deepEqual(validateLogin({ email, password }), {
    email: `Please keep this to ${LOGIN_MAX_LENGTH.email} characters or fewer.`,
    password: `Please keep this to ${LOGIN_MAX_LENGTH.password} characters or fewer.`,
  });
});
