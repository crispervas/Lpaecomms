/**
 * @file Application shell for the renderer.
 *
 * Owns the page frame only. Screens are mounted inside it, and none of them
 * knows the API's address — every call goes through the preload bridge.
 */

import { ApiStatus } from './components/ApiStatus.jsx';

/**
 * Render the application shell.
 *
 * @returns {JSX.Element} The page frame with the status screen.
 */
export function App() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Lpaecomms Admin</h1>
      <p className="mt-1 text-sm text-slate-600">Store administration client</p>
      <div className="mt-6 max-w-xl">
        <ApiStatus />
      </div>
    </main>
  );
}
