/**
 * @file Application shell for the renderer.
 *
 * Owns the page frame and which screen is showing. Screens are mounted inside
 * it, and none of them knows the API's address — every call goes through the
 * preload bridge.
 *
 * The session is held in memory only. Until the API gains authentication there
 * is nothing worth persisting, and a restart returning to the sign-in screen is
 * the safer default for an admin console.
 */

import { useState } from 'react';

import { AdminLogin } from './components/AdminLogin.jsx';
import { ApiStatus } from './components/ApiStatus.jsx';

/**
 * Render the application shell.
 *
 * @returns {JSX.Element} The sign-in screen, or the signed-in frame with the
 *   status screen.
 */
export function App() {
  const [account, setAccount] = useState(null);

  if (account === null) {
    return <AdminLogin onSignIn={setAccount} />;
  }

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Lpaecomms Admin</h1>
          <p className="mt-1 text-sm text-slate-600">Signed in as {account.email}</p>
        </div>
        <button
          type="button"
          onClick={() => setAccount(null)}
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
        >
          Sign out
        </button>
      </div>
      <div className="mt-6 max-w-xl">
        <ApiStatus />
      </div>
    </main>
  );
}
