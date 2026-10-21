/**
 * @file Application shell for the renderer.
 *
 * Owns which screen is showing — the sign-in screen while nobody is signed in,
 * then the admin frame with the chosen section. Screens are mounted inside it
 * and load their own data; none of them knows the API's address — every call
 * goes through the preload bridge.
 *
 * Sign-in is real: the main process checks the credentials against the API,
 * refuses any account that is not an administrator, and keeps the access token
 * to itself. The renderer holds only the account's name and email, in memory,
 * so a restart returns to the sign-in screen — the safer default for an admin
 * console. When a call finds the token expired, the main process has already
 * ended the session; the shell returns to sign-in and says why.
 *
 * Settings is the one screen still a preview: Store info has no API yet, so
 * its save goes through the `saveStoreInfo` seam below.
 */

import { useState } from 'react';

import { AdminLayout } from './components/AdminLayout.jsx';
import { AdminLogin } from './components/AdminLogin.jsx';
import { Catalog } from './components/Catalog.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { Orders } from './components/Orders.jsx';
import { Settings } from './components/Settings.jsx';
import { Users } from './components/Users.jsx';
import { SESSION_EXPIRED_MESSAGE, describeSignIn } from './lib/signInResult.mjs';

/**
 * Persist the store's public details, for Settings → Store info.
 *
 * The seam for the database: replace the body with a call to a named function
 * on window.api once the API has a store-settings endpoint. Until then nothing
 * is stored.
 *
 * @param {{name: string, email: string, phone: string}} record - Details that
 *   passed lib/storeRules.mjs.
 * @returns {Promise<{saved: boolean}>} Whether the details were stored.
 */
async function saveStoreInfo(record) {
  void record;
  return { saved: false };
}

/**
 * Render the application shell.
 *
 * @returns {JSX.Element} The sign-in screen, or the admin frame with the
 *   current section.
 */
export function App() {
  const [account, setAccount] = useState(null);
  const [section, setSection] = useState('dashboard');
  // Shown on the sign-in screen after the session ended on its own.
  const [loginNotice, setLoginNotice] = useState(null);

  /**
   * Sign in through the main process and open the admin frame on success.
   *
   * @param {{email: string, password: string}} credentials - A form that passed
   *   lib/loginRules.mjs.
   * @returns {Promise<string|null>} The message for the form, or null once
   *   signed in.
   */
  async function signIn(credentials) {
    const result = describeSignIn(await window.api.signIn(credentials));
    if (result.message) return result.message;
    setLoginNotice(null);
    setSection('dashboard');
    setAccount(result.admin);
    return null;
  }

  /**
   * Return to sign-in because the token expired. The main process has already
   * forgotten it, so there is nothing to sign out of.
   *
   * @returns {void}
   */
  function expireSession() {
    setAccount(null);
    setLoginNotice(SESSION_EXPIRED_MESSAGE);
  }

  if (account === null) {
    return <AdminLogin onSignIn={signIn} notice={loginNotice} />;
  }

  /**
   * End the session and return to sign-in.
   *
   * @returns {Promise<void>}
   */
  async function signOut() {
    // Forget the token before leaving the frame, so nothing signed-in outlives it.
    await window.api.signOut();
    setAccount(null);
    setSection('dashboard');
  }

  return (
    <AdminLayout current={section} onNavigate={setSection} admin={account} onSignOut={signOut}>
      {section === 'dashboard' && <Dashboard onNavigate={setSection} onExpired={expireSession} />}
      {section === 'users' && <Users currentAdminId={account.id} onExpired={expireSession} />}
      {section === 'orders' && <Orders onExpired={expireSession} />}
      {section === 'catalog' && <Catalog onExpired={expireSession} />}
      {section === 'settings' && <Settings onSaveStoreInfo={saveStoreInfo} />}
    </AdminLayout>
  );
}
