/**
 * @file Admin Catalog screen: categories and the products in each.
 *
 * No mockup covers this screen; it follows the other admin screens' style. It
 * lists categories on the left and the chosen category's products on the right,
 * and offers a form for a new category and one for a new product.
 *
 * It is a display-only preview until the database exists. The forms validate
 * and hand their record to `onCreateCategory` / `onCreateProduct`, which App
 * supplies; today those report that nothing was saved, and this screen says so.
 * Connecting the database means changing those two handlers and where App reads
 * the lists from — this screen already treats both as asynchronous.
 */

import { useState } from 'react';

import { countByCategory } from '../lib/catalogRules.mjs';
import { formatMoney } from '../lib/format.mjs';
import { CategoryForm, ProductForm } from './CatalogForms.jsx';
import { Header, PreviewNote } from './tableParts.jsx';

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

/** Product status pill classes, spelled out for the same reason. */
const PRODUCT_STATUS = {
  active: { label: 'Active', className: 'bg-lpa-success-soft text-lpa-success' },
  draft: { label: 'Draft', className: 'bg-lpa-track text-lpa-subtle' },
};

/**
 * Render the Catalog screen.
 *
 * @param {object} props - Component props.
 * @param {ReadonlyArray<{id: string, name: string, slug: string,
 *   description: string}>} props.categories - Every category.
 * @param {ReadonlyArray<{id: string, categoryId: string, name: string,
 *   sku: string, price: number, stock: number, status: string}>}
 *   props.products - Every product.
 * @param {(record: object) => Promise<{saved: boolean}>} props.onCreateCategory
 *   - Persists a validated category; `saved` says whether it was stored.
 * @param {(record: object) => Promise<{saved: boolean}>} props.onCreateProduct
 *   - Persists a validated product; `saved` says whether it was stored.
 * @returns {JSX.Element} The screen, for placement in AdminLayout.
 */
export function Catalog({ categories, products, onCreateCategory, onCreateProduct }) {
  const [selectedId, setSelectedId] = useState(categories[0]?.id ?? null);
  const [form, setForm] = useState(null);
  const [notice, setNotice] = useState('');

  const counts = countByCategory(products);
  const selected = categories.find((category) => category.id === selectedId) ?? null;
  const shownProducts = products.filter((product) => product.categoryId === selectedId);

  /**
   * Open a form, clearing the previous submission's notice.
   *
   * @param {'category'|'product'} kind - Which form.
   * @returns {void}
   */
  function openForm(kind) {
    setNotice('');
    setForm(kind);
  }

  /**
   * Hand a validated record to its handler and report the outcome.
   *
   * @param {(record: object) => Promise<{saved: boolean}>} create - The handler.
   * @param {{name: string}} record - The validated record.
   * @returns {Promise<void>}
   */
  async function submit(create, record) {
    const { saved } = await create(record);
    setForm(null);
    setNotice(
      saved
        ? `“${record.name}” was saved.`
        : `“${record.name}” passed validation. It will be saved once the database is connected.`,
    );
  }

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
          onClick={() => openForm('category')}
          className="rounded-[10px] bg-lpa-ink px-5 py-3 text-sm font-semibold text-white hover:bg-lpa-ink-hover"
        >
          + New category
        </button>
      </header>

      <PreviewNote>
        Preview — sample catalog. The forms check what you enter, but nothing is saved until the
        database is connected.
      </PreviewNote>

      {/* A live region, so a screen reader hears the outcome of a submission. */}
      <p role="status" className={notice ? 'mb-5 text-[13px] font-semibold text-lpa-success' : 'sr-only'}>
        {notice}
      </p>

      {form === 'category' && (
        <CategoryForm
          categories={categories}
          onSave={(record) => submit(onCreateCategory, record)}
          onCancel={() => setForm(null)}
        />
      )}
      {form === 'product' && (
        <ProductForm
          categories={categories}
          products={products}
          defaultCategoryId={selectedId}
          onSave={(record) => submit(onCreateProduct, record)}
          onCancel={() => setForm(null)}
        />
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
                    onClick={() => setSelectedId(category.id)}
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
                  <p className="mt-0.5 text-xs text-lpa-subtle">/{selected.slug}</p>
                  {selected.description && <p className="mt-2 text-[13px] text-lpa-subtle">{selected.description}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => openForm('product')}
                  className="flex-none rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-lpa-track"
                >
                  + New product
                </button>
              </div>

              <table className="w-full table-fixed border-collapse text-[13px]">
                <colgroup>
                  <col className="w-[46%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                  <col className="w-[18%]" />
                </colgroup>
                <thead className="border-y border-lpa-line bg-lpa-canvas">
                  <tr>
                    <Header>Product</Header>
                    <Header>Price</Header>
                    <Header>Stock</Header>
                    <Header>Status</Header>
                  </tr>
                </thead>
                <tbody>
                  {shownProducts.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-lpa-subtle">
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
                          <div className="truncate text-xs text-lpa-subtle">{product.sku}</div>
                        </td>
                        <td className="py-4 pl-3 font-semibold">{formatMoney(product.price)}</td>
                        <td className="py-4 pl-3">
                          {product.stock === 0 ? (
                            <span className="font-semibold text-lpa-negative">Out of stock</span>
                          ) : (
                            product.stock
                          )}
                        </td>
                        <td className="py-4 pl-3 pr-6">
                          <span className={`inline-block rounded-2xl px-2.5 py-1 text-[11px] font-semibold ${status.className}`}>
                            {status.label}
                          </span>
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
