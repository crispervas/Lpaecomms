/**
 * @file Admin Catalog screen: categories and the products in each.
 *
 * No mockup covers this screen; it follows the other admin screens' style. It
 * lists categories on the left and the chosen category's products on the right,
 * and lets the admin create, edit and delete both.
 *
 * Everything is read and written through window.api — drafts included, since
 * the admin's token sees them. After every successful write both lists are
 * loaded again, so the counts and the table never show a stale catalogue.
 */

import { useState } from 'react';

import {
  fromCategoryRecord,
  fromProductRecord,
  isSessionExpired,
  toCategory,
  toProduct,
  toSaveResult,
} from '../lib/apiMapping.mjs';
import { countByCategory } from '../lib/catalogRules.mjs';
import { formatMoney } from '../lib/format.mjs';
import { CategoryForm, ProductForm } from './CatalogForms.jsx';
import { ConfirmBar, LoadNotice, Outcome } from './dataParts.jsx';
import { Icon } from './Icon.jsx';
import { Header, SQUARE_BUTTON } from './tableParts.jsx';
import { useApiList } from './useApiList.js';

/**
 * Pick a category entry's classes, written out in full because Tailwind's
 * scanner cannot see a class name assembled from a variable.
 *
 * @param {boolean} isSelected - Whether the entry is the category on show.
 * @returns {string} The entry's state classes.
 */
function categoryItemClass(isSelected) {
  return isSelected ? 'bg-lpa-tint text-lpa-accent' : 'text-lpa-ink hover:bg-lpa-track';
}

/** Fields each form shows, so an API message for any other field is not lost. */
const CATEGORY_FIELDS = Object.freeze(['name', 'code', 'description']);
const PRODUCT_FIELDS = Object.freeze(['name', 'code', 'categoryId', 'price', 'stock', 'description']);

/** Product status pill classes, spelled out for the same reason. */
const PRODUCT_STATUS = {
  active: { label: 'Active', className: 'bg-lpa-success-soft text-lpa-success' },
  draft: { label: 'Draft', className: 'bg-lpa-track text-lpa-subtle' },
};

/**
 * Render the Catalog screen.
 *
 * @param {object} props - Component props.
 * @param {() => void} props.onExpired - Called when the session has expired.
 * @returns {JSX.Element} The screen, for placement in AdminLayout.
 */
export function Catalog({ onExpired }) {
  const categoryList = useApiList(window.api.listCategories, toCategory, onExpired);
  const productList = useApiList(window.api.listProducts, toProduct, onExpired);
  const categories = categoryList.items;
  const products = productList.items;

  const [chosenId, setChosenId] = useState(null);
  // {kind: 'category'|'product', item: object|null} — item null for "new".
  const [form, setForm] = useState(null);
  // {kind, item, busy, error} for the delete awaiting confirmation.
  const [pendingDelete, setPendingDelete] = useState(null);
  const [notice, setNotice] = useState('');

  // Fall back to the first category until the admin picks one, and after the
  // chosen one is deleted.
  const selected = categories.find((category) => category.id === chosenId) ?? categories[0] ?? null;
  const selectedId = selected?.id ?? null;
  const counts = countByCategory(products);
  const shownProducts = products.filter((product) => product.categoryId === selectedId);

  /**
   * Load both lists again after a write.
   *
   * @returns {Promise<void>}
   */
  async function reloadAll() {
    await Promise.all([categoryList.reload(), productList.reload()]);
  }

  /**
   * Open a form, closing any delete confirmation and clearing the last notice.
   *
   * @param {'category'|'product'} kind - Which form.
   * @param {object|null} item - The record to edit, or null for a new one.
   * @returns {void}
   */
  function openForm(kind, item) {
    setNotice('');
    setPendingDelete(null);
    setForm({ kind, item });
  }

  /**
   * Send a validated record to the API, then close the form and reload.
   *
   * @param {Promise<object>} request - The window.api write in flight.
   * @param {string} name - The record's name, for the notice.
   * @param {boolean} creating - Whether this was a new record.
   * @param {ReadonlyArray<string>} fields - The fields the open form shows.
   * @returns {Promise<{fieldErrors: Record<string, string>, error: string|null}|null>}
   *   What the API refused, or null once stored.
   */
  async function save(request, name, creating, fields) {
    const result = await request;
    if (isSessionExpired(result)) {
      onExpired();
      return null;
    }
    const refused = toSaveResult(result, {}, fields);
    if (refused) return refused;

    setForm(null);
    setNotice(`“${name}” was ${creating ? 'created' : 'saved'}.`);
    await reloadAll();
    return null;
  }

  /**
   * Save the category form.
   *
   * @param {{name: string, code: string, description: string}} record - The validated category.
   * @returns {Promise<object|null>} As save().
   */
  function saveCategory(record) {
    const editing = form.item;
    const body = fromCategoryRecord(record);
    const request = editing ? window.api.updateCategory(editing.id, body) : window.api.createCategory(body);
    return save(request, record.name, !editing, CATEGORY_FIELDS);
  }

  /**
   * Save the product form.
   *
   * @param {object} record - The validated product.
   * @returns {Promise<object|null>} As save().
   */
  function saveProduct(record) {
    const editing = form.item;
    const body = fromProductRecord(record);
    const request = editing ? window.api.updateProduct(editing.id, body) : window.api.createProduct(body);
    return save(request, record.name, !editing, PRODUCT_FIELDS);
  }

  /**
   * Delete the record awaiting confirmation; on failure keep the bar open with
   * the API's reason, e.g. a category that still holds products.
   *
   * @returns {Promise<void>}
   */
  async function confirmDelete() {
    const { kind, item } = pendingDelete;
    setPendingDelete((current) => ({ ...current, busy: true, error: null }));
    const result = await (kind === 'category' ? window.api.deleteCategory(item.id) : window.api.deleteProduct(item.id));
    if (isSessionExpired(result)) {
      onExpired();
      return;
    }
    if (!result.ok || result.status !== 200) {
      setPendingDelete((current) => ({ ...current, busy: false, error: result.error ?? 'It could not be deleted.' }));
      return;
    }
    setPendingDelete(null);
    setNotice(`“${item.name}” was deleted.`);
    await reloadAll();
  }

  const loading = categoryList.state !== 'ready' ? categoryList : productList;

  return (
    <>
      <header className="mb-7 flex items-baseline justify-between gap-4">
        <div>
          <h1 className="mb-1 font-display text-[26px] font-bold">Catalog</h1>
          <p className="text-sm text-lpa-subtle">
            {categories.length} {categories.length === 1 ? 'category' : 'categories'} · {products.length}{' '}
            {products.length === 1 ? 'product' : 'products'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => openForm('category', null)}
          className="rounded-[10px] bg-lpa-ink px-5 py-3 text-sm font-semibold text-white hover:bg-lpa-ink-hover"
        >
          + New category
        </button>
      </header>

      <LoadNotice state={loading.state} error={loading.error} onRetry={reloadAll} noun="catalog" />
      <Outcome message={notice} />

      {/* Keyed by the record, so switching from one edit to another starts a fresh form. */}
      {form?.kind === 'category' && (
        <CategoryForm
          key={form.item?.id ?? 'new'}
          categories={categories}
          initial={form.item}
          onSave={saveCategory}
          onCancel={() => setForm(null)}
        />
      )}
      {form?.kind === 'product' && (
        <ProductForm
          key={form.item?.id ?? 'new'}
          categories={categories}
          products={products}
          defaultCategoryId={selectedId}
          initial={form.item}
          onSave={saveProduct}
          onCancel={() => setForm(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmBar
          id="catalog-delete-title"
          confirmLabel="Delete"
          busy={Boolean(pendingDelete.busy)}
          error={pendingDelete.error ?? null}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDelete(null)}
        >
          Delete the {pendingDelete.kind} <strong>{pendingDelete.item.name}</strong>? It disappears from the
          catalog and the store.
        </ConfirmBar>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[260px_1fr]">
        <section aria-labelledby="catalog-categories" className="self-start rounded-2xl border border-lpa-line bg-lpa-surface p-4">
          <h2 id="catalog-categories" className="mb-3 px-2 font-display text-base font-semibold">
            Categories
          </h2>
          <ul className="flex flex-col gap-1">
            {categories.map((category) => {
              const isSelected = category.id === selectedId;
              return (
                <li key={category.id}>
                  <button
                    type="button"
                    aria-current={isSelected ? 'true' : undefined}
                    onClick={() => setChosenId(category.id)}
                    className={`flex w-full items-center justify-between rounded-[10px] px-3 py-2.5 text-left text-sm font-semibold ${categoryItemClass(isSelected)}`}
                  >
                    {category.name}
                    <span className="text-xs font-normal text-lpa-subtle">{counts.get(category.id) ?? 0}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          aria-labelledby={selected ? 'catalog-selected' : undefined}
          className="self-start overflow-hidden rounded-2xl border border-lpa-line bg-lpa-surface">
          {selected === null ? (
            <p className="px-6 py-10 text-center text-[13px] text-lpa-subtle">Create a category to start the catalog.</p>
          ) : (
            <>
              <div className="flex items-start justify-between gap-4 p-6">
                <div className="min-w-0">
                  <h2 id="catalog-selected" className="font-display text-base font-semibold">
                    {selected.name}
                  </h2>
                  <p className="mt-0.5 text-xs text-lpa-subtle">/{selected.code}</p>
                  {selected.description && <p className="mt-2 text-[13px] text-lpa-subtle">{selected.description}</p>}
                </div>
                <div className="flex flex-none gap-2">
                  <button
                    type="button"
                    onClick={() => openForm('category', selected)}
                    aria-label={`Edit category ${selected.name}`}
                    title={`Edit category ${selected.name}`}
                    className={`h-[34px] w-[34px] ${SQUARE_BUTTON}`}
                  >
                    <Icon name="edit" size={13} className="text-lpa-ink" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setForm(null);
                      setPendingDelete({ kind: 'category', item: selected });
                    }}
                    aria-label={`Delete category ${selected.name}`}
                    title={`Delete category ${selected.name}`}
                    className={`h-[34px] w-[34px] ${SQUARE_BUTTON}`}
                  >
                    <Icon name="trash" size={13} className="text-lpa-negative" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openForm('product', null)}
                    className="rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-lpa-track"
                  >
                    + New product
                  </button>
                </div>
              </div>

              <table className="w-full table-fixed border-collapse text-[13px]">
                <colgroup>
                  <col className="w-[38%]" />
                  <col className="w-[15%]" />
                  <col className="w-[15%]" />
                  <col className="w-[14%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead className="border-y border-lpa-line bg-lpa-canvas">
                  <tr>
                    <Header>Product</Header>
                    <Header>Price</Header>
                    <Header>Stock</Header>
                    <Header>Status</Header>
                    <Header alignRight>Actions</Header>
                  </tr>
                </thead>
                <tbody>
                  {shownProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-10 text-center text-lpa-subtle">
                        No products in this category yet.
                      </td>
                    </tr>
                  )}
                  {shownProducts.map((product) => {
                    const status = PRODUCT_STATUS[product.status];
                    return (
                      <tr key={product.id} className="border-b border-lpa-track last:border-b-0">
                        <td className="py-4 pl-3 first:pl-6 last:pr-6">
                          <div className="truncate font-semibold">{product.name}</div>
                          <div className="truncate text-xs text-lpa-subtle">{product.code}</div>
                        </td>
                        <td className="py-4 pl-3 font-semibold">{formatMoney(product.price)}</td>
                        <td className="py-4 pl-3">
                          {product.stock === 0 ? (
                            <span className="font-semibold text-lpa-negative">Out of stock</span>
                          ) : (
                            product.stock
                          )}
                        </td>
                        <td className="py-4 pl-3">
                          <span className={`inline-block rounded-2xl px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4 pl-3 pr-6">
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openForm('product', product)}
                              aria-label={`Edit ${product.name}`}
                              title={`Edit ${product.name}`}
                              className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                            >
                              <Icon name="edit" size={13} className="text-lpa-ink" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setForm(null);
                                setPendingDelete({ kind: 'product', item: product });
                              }}
                              aria-label={`Delete ${product.name}`}
                              title={`Delete ${product.name}`}
                              className={`h-[30px] w-[30px] ${SQUARE_BUTTON}`}
                            >
                              <Icon name="trash" size={13} className="text-lpa-negative" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </>
          )}
        </section>
      </div>
    </>
  );
}
