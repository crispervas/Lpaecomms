/**
 * @file Application shell for the renderer.
 *
 * Owns which screen is showing — the sign-in screen while nobody is signed in,
 * then the admin frame with the chosen section — and the session's sample
 * accounts and orders, and the catalog. Screens are mounted inside it, and none of them knows the API's
 * address — every call goes through the preload bridge.
 *
 * The session is held in memory only. Until the API gains authentication there
 * is nothing worth persisting, and a restart returning to the sign-in screen is
 * the safer default for an admin console.
 */

import { useState } from 'react';

import { AdminLayout } from './components/AdminLayout.jsx';
import { AdminLogin } from './components/AdminLogin.jsx';
import { Catalog } from './components/Catalog.jsx';
import { Dashboard } from './components/Dashboard.jsx';
import { Orders } from './components/Orders.jsx';
import { Users } from './components/Users.jsx';
import { SAMPLE_CATALOG_CATEGORIES, SAMPLE_CATALOG_PRODUCTS } from './data/catalog.mjs';
import { SAMPLE_ORDERS } from './data/orders.mjs';
import { SAMPLE_ADMIN, SAMPLE_USERS } from './data/users.mjs';

/**
 * Persist a new category.
 *
 * The seam for the database: replace the body with a call to a named function
 * on window.api (e.g. `window.api.createCategory(record)`) that returns the
 * stored row, and add it to the list App renders. Until then nothing is stored.
 *
 * @param {{name: string, slug: string, description: string}} record - A
 *   category that passed lib/catalogRules.mjs.
 * @returns {Promise<{saved: boolean}>} Whether the category was stored.
 */
async function createCategory(record) {
  void record;
  return { saved: false };
}

/**
 * Persist a new product. The same seam as createCategory, for products.
 *
 * @param {{name: string, sku: string, categoryId: string, price: number,
 *   stock: number, status: string}} record - A product that passed
 *   lib/catalogRules.mjs.
 * @returns {Promise<{saved: boolean}>} Whether the product was stored.
 */
async function createProduct(record) {
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
  // Held here rather than in their screens so a change survives a visit to
  // another section, and so the Dashboard sees the same orders as Orders. Both
  // reset on sign-out, like everything in the preview.
  const [users, setUsers] = useState(SAMPLE_USERS);
  const [orders, setOrders] = useState(SAMPLE_ORDERS);

  if (account === null) {
    return <AdminLogin onSignIn={setAccount} />;
  }

  /**
   * End the session and start the next one from a fresh preview.
   *
   * @returns {void}
   */
  function signOut() {
    setAccount(null);
    setSection('dashboard');
    setUsers(SAMPLE_USERS);
    setOrders(SAMPLE_ORDERS);
  }

  /**
   * Block an active account, or unblock a blocked one.
   *
   * @param {string} id - The account's id.
   * @returns {void}
   */
  function toggleBlock(id) {
    setUsers((current) =>
      current.map((user) =>
        user.id === id ? { ...user, status: user.status === 'blocked' ? 'active' : 'blocked' } : user,
      ),
    );
  }

  /**
   * Remove an account.
   *
   * @param {string} id - The account's id.
   * @returns {void}
   */
  function deleteUser(id) {
    setUsers((current) => current.filter((user) => user.id !== id));
  }

  /**
   * Set an order's status.
   *
   * @param {string} id - The order's id.
   * @param {string} status - The new status.
   * @returns {void}
   */
  function updateOrderStatus(id, status) {
    setOrders((current) => current.map((order) => (order.id === id ? { ...order, status } : order)));
  }

  return (
    <AdminLayout current={section} onNavigate={setSection} admin={SAMPLE_ADMIN} onSignOut={signOut}>
      {section === 'dashboard' && <Dashboard orders={orders} onNavigate={setSection} />}
      {section === 'users' && (
        <Users
          users={users}
          currentAdminId={SAMPLE_ADMIN.id}
          onToggleBlock={toggleBlock}
          onDelete={deleteUser}
        />
      )}
      {section === 'orders' && <Orders orders={orders} onUpdateStatus={updateOrderStatus} />}
      {section === 'catalog' && (
        <Catalog
          categories={SAMPLE_CATALOG_CATEGORIES}
          products={SAMPLE_CATALOG_PRODUCTS}
          onCreateCategory={createCategory}
          onCreateProduct={createProduct}
        />
      )}
    </AdminLayout>
  );
}
