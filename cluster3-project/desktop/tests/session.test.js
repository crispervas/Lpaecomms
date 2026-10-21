/**
 * @file Tests for the main-process admin session.
 *
 * The API client is stubbed, so these pin down the two rules the session adds
 * on top of a login response: only an ADMIN may hold a session, and the token
 * never appears in what the renderer receives.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createSession, ADMIN_ONLY_MESSAGE } = require('../src/main/services/session.js');

/** A login payload as the API returns it, for a given role. */
function loginData(role) {
  return {
    token: 'secret-jwt',
    user: { id: 7, name: 'Ada', lastName: 'Lovelace', email: 'ada@lpaecomms.com', role },
  };
}

/**
 * Build a session whose client answers login with the given envelope.
 *
 * @param {object} envelope - What the stubbed login resolves to.
 * @returns {ReturnType<typeof createSession>} The session under test.
 */
function sessionAnswering(envelope) {
  return createSession({ apiClient: { login: async () => envelope } });
}

const CREDENTIALS = { email: 'ada@lpaecomms.com', password: 'secret' };

test('signs an administrator in and keeps the token in the main process', async () => {
  const session = sessionAnswering({ ok: true, status: 200, data: loginData('ADMIN'), error: null });

  const result = await session.signIn(CREDENTIALS);

  assert.deepEqual(result, {
    ok: true,
    status: 200,
    data: { user: { id: 7, name: 'Ada', lastName: 'Lovelace', email: 'ada@lpaecomms.com', role: 'ADMIN' } },
    error: null,
  });
  assert.doesNotMatch(JSON.stringify(result), /secret-jwt/, 'the token never reaches the renderer');
  assert.equal(session.token(), 'secret-jwt');
});

test('refuses a valid account that is not an administrator', async () => {
  const session = sessionAnswering({ ok: true, status: 200, data: loginData('CUSTOMER'), error: null });

  const result = await session.signIn(CREDENTIALS);

  assert.deepEqual(result, { ok: true, status: 403, data: null, error: ADMIN_ONLY_MESSAGE });
  assert.equal(session.token(), null, 'a refused token is discarded');
});

test('passes a rejected login through without a token', async () => {
  const rejected = { ok: true, status: 401, data: null, error: 'Email or password is incorrect.' };
  const session = sessionAnswering(rejected);

  assert.deepEqual(await session.signIn(CREDENTIALS), rejected);
  assert.equal(session.token(), null);
});

test('passes an unreachable API through', async () => {
  const unreachable = { ok: false, status: null, data: null, error: 'Cannot reach the API at x.' };
  const session = sessionAnswering(unreachable);

  assert.deepEqual(await session.signIn(CREDENTIALS), unreachable);
});

test('treats a 200 without a token as an unexpected reply', async () => {
  const session = sessionAnswering({ ok: true, status: 200, data: { user: null }, error: null });

  const result = await session.signIn(CREDENTIALS);

  assert.equal(result.data, null);
  assert.match(result.error, /unexpected/);
  assert.equal(session.token(), null);
});

test('rejects credentials that are not strings before any request', async () => {
  let called = false;
  const session = createSession({ apiClient: { login: async () => { called = true; } } });

  const result = await session.signIn({ email: 42, password: null });

  assert.equal(called, false);
  assert.deepEqual(result, { ok: false, status: null, data: null, error: 'Enter an email and a password.' });
});

test('a failed sign-in ends the previous session', async () => {
  const responses = [
    { ok: true, status: 200, data: loginData('ADMIN'), error: null },
    { ok: true, status: 401, data: null, error: 'Email or password is incorrect.' },
  ];
  const session = createSession({ apiClient: { login: async () => responses.shift() } });

  await session.signIn(CREDENTIALS);
  await session.signIn(CREDENTIALS);

  assert.equal(session.token(), null);
});

test('signing out forgets the token', async () => {
  const session = sessionAnswering({ ok: true, status: 200, data: loginData('ADMIN'), error: null });
  await session.signIn(CREDENTIALS);

  session.signOut();

  assert.equal(session.token(), null);
});
