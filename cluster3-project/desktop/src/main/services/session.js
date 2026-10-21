/**
 * @file The signed-in administrator's session, held by the main process.
 *
 * Owns the access token. The renderer receives the account's public fields and
 * never the token itself, so a compromised page cannot lift it and replay it
 * against the API. The token lives in memory only: quitting the app ends the
 * session, which is the safer default for an admin console.
 *
 * The API issues tokens to every role; this desktop client is for
 * administrators alone, so the role check happens here, before a token is kept.
 */

/** Role code, from the API's seed, that may hold a desktop session. */
const ADMIN_ROLE = 'ADMIN';

/** Shown to a valid account that is not an administrator. */
const ADMIN_ONLY_MESSAGE = 'This app is restricted to LPA Ecomms administrators.';

/**
 * Create an empty session bound to an API client.
 *
 * @param {Object} options - Session options.
 * @param {{login: Function}} options.apiClient - Client performing the login.
 * @returns {{signIn: Function, signOut: Function, token: Function}} The session.
 */
function createSession({ apiClient }) {
  /** @type {string|null} */
  let token = null;

  /**
   * Sign an administrator in.
   *
   * Any failure ends the previous session too, so a second admin's rejected
   * attempt never leaves the first admin's token behind.
   *
   * @param {{email: unknown, password: unknown}} credentials - From the renderer,
   *   so not yet trusted to be strings.
   * @returns {Promise<{ok: boolean, status: number|null,
   *   data: {user: object}|null, error: string|null}>} The result envelope;
   *   never rejects. A non-admin account is reported as a 403, the status the
   *   API itself gives a non-admin on an admin route.
   */
  async function signIn(credentials) {
    token = null;
    const { email, password } = credentials ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      return { ok: false, status: null, data: null, error: 'Enter an email and a password.' };
    }

    const envelope = await apiClient.login({ email, password });
    if (!envelope.ok || envelope.status !== 200) {
      return envelope;
    }

    const { token: issued, user } = envelope.data ?? {};
    if (typeof issued !== 'string' || !user) {
      return { ok: true, status: envelope.status, data: null, error: 'The API sent an unexpected sign-in reply.' };
    }
    if (user.role !== ADMIN_ROLE) {
      return { ok: true, status: 403, data: null, error: ADMIN_ONLY_MESSAGE };
    }

    token = issued;
    const { id, name, lastName, email: address, role } = user;
    return { ok: true, status: 200, data: { user: { id, name, lastName, email: address, role } }, error: null };
  }

  /**
   * End the session. The API keeps no session state, so forgetting the token
   * is the whole of signing out.
   *
   * @returns {void}
   */
  function signOut() {
    token = null;
  }

  /**
   * The current access token, for authenticated requests made in main.
   *
   * @returns {string|null} The token, or null when nobody is signed in.
   */
  function currentToken() {
    return token;
  }

  return { signIn, signOut, token: currentToken };
}

module.exports = { createSession, ADMIN_ONLY_MESSAGE };
