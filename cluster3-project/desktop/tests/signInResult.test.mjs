/**
 * @file Tests for turning a sign-in envelope into what the login screen shows.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SESSION_EXPIRED_MESSAGE, describeSignIn } from '../src/renderer/lib/signInResult.mjs';
import adminApi from '../src/main/services/adminApi.js';

const USER = { id: 7, name: 'Ada', lastName: 'Lovelace', email: 'ada@lpaecomms.com', role: 'ADMIN' };

test('turns a successful sign-in into the sidebar account', () => {
  assert.deepEqual(describeSignIn({ ok: true, status: 200, data: { user: USER }, error: null }), {
    admin: { id: 7, name: 'Ada Lovelace', email: 'ada@lpaecomms.com', role: 'Administrator' },
  });
});

test('shows the API message for wrong credentials', () => {
  assert.deepEqual(
    describeSignIn({ ok: true, status: 401, data: null, error: 'Email or password is incorrect.' }),
    { message: 'Email or password is incorrect.' },
  );
});

test('shows the admin-only refusal', () => {
  const message = 'This app is restricted to LPA Ecomms administrators.';
  assert.deepEqual(describeSignIn({ ok: true, status: 403, data: null, error: message }), { message });
});

test('says when the API cannot be reached, so it is not read as a wrong password', () => {
  const { message } = describeSignIn({ ok: false, status: null, data: null, error: 'Cannot reach the API at x.' });
  assert.match(message, /Cannot reach the API/);
});

test('hides server faults behind a retry message', () => {
  const { message } = describeSignIn({ ok: true, status: 500, data: null, error: 'Internal Server Error' });
  assert.match(message, /try again/i);
});

test('falls back to a generic message when none was given', () => {
  assert.deepEqual(describeSignIn({ ok: true, status: 418, data: null, error: null }), {
    message: 'Sign-in failed. Please try again.',
  });
});

test('uses the email when the account has no name', () => {
  const user = { ...USER, name: '', lastName: '' };
  assert.equal(describeSignIn({ ok: true, status: 200, data: { user }, error: null }).admin.name, 'ada@lpaecomms.com');
});

test('the expiry notice says what the main process says', () => {
  assert.equal(SESSION_EXPIRED_MESSAGE, adminApi.SESSION_EXPIRED);
});
