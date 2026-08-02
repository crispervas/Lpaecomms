/**
 * @file Application shell for the renderer.
 *
 * Owns the page frame only. Screens are mounted inside it, and none of them
 * knows the API's address — every call goes through the preload bridge.
 */

/**
 * Render the application shell.
 *
 * @returns {JSX.Element} The page frame.
 */
export function App() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">Lpaecomms Admin</h1>
    </main>
  );
}
