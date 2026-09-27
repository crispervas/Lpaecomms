/**
 * @file Sample accounts shown by the Users preview and the sidebar.
 *
 * The API has no users endpoint and sign-in has no account behind it yet, so
 * the Users screen lists the desktop mockup's people and the sidebar shows one
 * of them as the signed-in administrator. Replace these with calls through
 * window.api once the endpoints exist; the screens only depend on the shapes
 * below.
 */

/**
 * Every account, in the mockup's order.
 *
 * @type {ReadonlyArray<Readonly<{id: string, name: string, email: string,
 *   role: 'Customer'|'Admin', status: 'active'|'blocked', signedUpOn: string}>>}
 *   `signedUpOn` is "YYYY-MM-DD".
 */
export const SAMPLE_USERS = Object.freeze(
  [
    { id: 'u-1001', name: 'Jordan Kim', email: 'jordan.kim@email.com', role: 'Customer', status: 'active', signedUpOn: '2026-07-12' },
    { id: 'u-1002', name: 'Ava Chen', email: 'ava.chen@email.com', role: 'Customer', status: 'active', signedUpOn: '2026-06-28' },
    { id: 'u-1003', name: 'Marcus Lee', email: 'marcus.lee@email.com', role: 'Customer', status: 'blocked', signedUpOn: '2026-06-03' },
    { id: 'u-1004', name: 'Priya Nair', email: 'priya.nair@email.com', role: 'Customer', status: 'active', signedUpOn: '2026-05-19' },
    { id: 'u-0002', name: 'Sam Ortiz', email: 'sam.ortiz@lpaecomms.com', role: 'Admin', status: 'active', signedUpOn: '2024-01-04' },
    { id: 'u-1005', name: 'Diego Fonseca', email: 'diego.fonseca@email.com', role: 'Customer', status: 'active', signedUpOn: '2026-04-30' },
    { id: 'u-0001', name: 'Rina Alvarez', email: 'rina.alvarez@lpaecomms.com', role: 'Admin', status: 'active', signedUpOn: '2023-11-02' },
    { id: 'u-1006', name: 'Mina Sato', email: 'mina.sato@email.com', role: 'Customer', status: 'active', signedUpOn: '2026-03-11' },
  ].map((user) => Object.freeze(user)),
);

/**
 * The signed-in administrator: the mockup's sidebar person, taken from the
 * list so the Users screen can recognise their own row.
 *
 * @type {Readonly<{id: string, name: string, email: string, role: string}>}
 */
export const SAMPLE_ADMIN = Object.freeze({
  ...SAMPLE_USERS.find((user) => user.id === 'u-0002'),
  // The sidebar shows a job title, not the account's role.
  role: 'Store admin',
});
