/**
 * @file New-category and new-product forms for the Catalog screen.
 *
 * Both forms validate with lib/catalogRules.mjs and hand a normalised record to
 * `onSave`. They never store anything themselves: what `onSave` does — today a
 * preview notice, later a call through window.api — is the Catalog screen's
 * decision, so connecting the database does not touch these forms.
 */

import { useEffect, useId, useRef, useState } from 'react';

import { PRODUCT_STATUSES, slugify, validateCategory, validateProduct } from '../lib/catalogRules.mjs';

/** Classes shared by every text field and select. */
const CONTROL =
  'w-full rounded-[10px] border bg-lpa-surface px-3.5 py-2.5 text-[13px] text-lpa-ink placeholder:text-lpa-placeholder ' +
  'focus:border-lpa-accent focus:outline-none focus:ring-2 focus:ring-lpa-accent/40';

/** Display names of the product statuses. */
const STATUS_LABEL = { active: 'Active', draft: 'Draft' };

/**
 * Pick a control's border from its validation state, written out in full
 * because Tailwind's scanner cannot see a class assembled from a variable.
 *
 * @param {string|undefined} error - The field's message, if it failed.
 * @returns {string} The border colour class.
 */
function borderClass(error) {
  return error ? 'border-lpa-danger' : 'border-lpa-control';
}

/**
 * Render a labelled control with its hint or error underneath.
 *
 * @param {object} props - Component props.
 * @param {string} props.id - The control's id.
 * @param {string} props.label - Visible label.
 * @param {string} [props.hint] - Help shown while the field is valid.
 * @param {string} [props.error] - Validation message; replaces the hint.
 * @param {string} [props.className] - Grid placement classes.
 * @param {(describedBy: string|undefined) => React.ReactNode} props.children -
 *   Renders the control, given the id it should name in aria-describedby.
 * @returns {JSX.Element} The field.
 */
function Field({ id, label, hint, error, className = '', children }) {
  const note = error ?? hint;
  const noteId = note ? `${id}-note` : undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      {children(noteId)}
      {note && (
        <p id={noteId} className={`mt-1.5 text-xs ${error ? 'text-lpa-danger' : 'text-lpa-subtle'}`}>
          {note}
        </p>
      )}
    </div>
  );
}

/**
 * Render the Cancel and submit buttons shared by both forms.
 *
 * @param {object} props - Component props.
 * @param {string} props.submitLabel - The submit button's text.
 * @param {() => void} props.onCancel - Called when the form is dismissed.
 * @returns {JSX.Element} The button row.
 */
function FormActions({ submitLabel, onCancel }) {
  return (
    <div className="col-span-2 flex justify-end gap-2 border-t border-lpa-track pt-5">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-lpa-track"
      >
        Cancel
      </button>
      <button
        type="submit"
        className="rounded-lg bg-lpa-ink px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-lpa-ink-hover"
      >
        {submitLabel}
      </button>
    </div>
  );
}

/**
 * Render the panel frame both forms sit in, focusing its heading on open.
 *
 * @param {object} props - Component props.
 * @param {string} props.title - Panel heading.
 * @param {(event: React.FormEvent<HTMLFormElement>) => void} props.onSubmit -
 *   The form's submit handler.
 * @param {React.ReactNode} props.children - The fields and actions.
 * @returns {JSX.Element} The panel.
 */
function FormPanel({ title, onSubmit, children }) {
  const titleId = useId();
  const headingRef = useRef(null);

  // Land keyboard users at the top of the form they just opened.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section aria-labelledby={titleId} className="mb-5 rounded-2xl border border-lpa-line bg-lpa-surface p-6">
      <h2
        id={titleId}
        ref={headingRef}
        tabIndex={-1}
        className="mb-5 font-display text-base font-semibold focus:outline-none"
      >
        {title}
      </h2>
      <form noValidate onSubmit={onSubmit} className="grid grid-cols-2 gap-x-5 gap-y-4">
        {children}
      </form>
    </section>
  );
}

/**
 * Render the new-category form.
 *
 * The slug follows the name until the user edits it, after which it is theirs.
 *
 * @param {object} props - Component props.
 * @param {ReadonlyArray<{name: string, slug: string}>} props.categories -
 *   Existing categories, for the uniqueness checks.
 * @param {(record: {name: string, slug: string, description: string}) => void}
 *   props.onSave - Called with the validated category.
 * @param {() => void} props.onCancel - Called when the form is dismissed.
 * @returns {JSX.Element} The form panel.
 */
export function CategoryForm({ categories, onSave, onCancel }) {
  const id = useId();
  const [values, setValues] = useState({ name: '', slug: '', description: '' });
  const [slugEdited, setSlugEdited] = useState(false);
  const [errors, setErrors] = useState({});

  /**
   * Store an edited field and clear its stale message.
   *
   * @param {'name'|'slug'|'description'} field - The field edited.
   * @param {string} value - Its new text.
   * @returns {void}
   */
  function update(field, value) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'name' && !slugEdited) next.slug = slugify(value);
      return next;
    });
    if (field === 'slug') setSlugEdited(true);
    setErrors((current) => ({ ...current, [field]: undefined, ...(field === 'name' ? { slug: undefined } : {}) }));
  }

  /**
   * Validate, then hand a passing category to the screen.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {void}
   */
  function handleSubmit(event) {
    event.preventDefault();
    const { errors: found, record } = validateCategory(values, categories);
    setErrors(found);
    if (record) onSave(record);
  }

  return (
    <FormPanel title="New category" onSubmit={handleSubmit}>
      <Field id={`${id}-name`} label="Name" error={errors.name}>
        {(describedBy) => (
          <input
            id={`${id}-name`}
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Speakers"
            aria-invalid={Boolean(errors.name)}
            aria-describedby={describedBy}
            className={`${CONTROL} ${borderClass(errors.name)}`}
          />
        )}
      </Field>
      <Field id={`${id}-slug`} label="Slug" hint="Used in catalogue URLs." error={errors.slug}>
        {(describedBy) => (
          <input
            id={`${id}-slug`}
            value={values.slug}
            onChange={(event) => update('slug', event.target.value)}
            placeholder="speakers"
            aria-invalid={Boolean(errors.slug)}
            aria-describedby={describedBy}
            className={`${CONTROL} ${borderClass(errors.slug)}`}
          />
        )}
      </Field>
      <Field
        id={`${id}-description`}
        label="Description"
        hint="Optional."
        error={errors.description}
        className="col-span-2"
      >
        {(describedBy) => (
          <textarea
            id={`${id}-description`}
            rows={2}
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy}
            className={`${CONTROL} resize-none ${borderClass(errors.description)}`}
          />
        )}
      </Field>
      <FormActions submitLabel="Create category" onCancel={onCancel} />
    </FormPanel>
  );
}

/**
 * Render the new-product form.
 *
 * @param {object} props - Component props.
 * @param {ReadonlyArray<{id: string, name: string}>} props.categories - The
 *   categories a product can belong to.
 * @param {ReadonlyArray<{sku: string}>} props.products - Existing products, for
 *   the SKU uniqueness check.
 * @param {string} props.defaultCategoryId - The category preselected: the one
 *   the admin is looking at.
 * @param {(record: {name: string, sku: string, categoryId: string,
 *   price: number, stock: number, status: string}) => void} props.onSave -
 *   Called with the validated product.
 * @param {() => void} props.onCancel - Called when the form is dismissed.
 * @returns {JSX.Element} The form panel.
 */
export function ProductForm({ categories, products, defaultCategoryId, onSave, onCancel }) {
  const id = useId();
  const [values, setValues] = useState({
    name: '',
    sku: '',
    categoryId: defaultCategoryId,
    price: '',
    stock: '0',
    status: 'draft',
  });
  const [errors, setErrors] = useState({});

  /**
   * Store an edited field and clear its stale message.
   *
   * @param {string} field - The field edited.
   * @param {string} value - Its new value.
   * @returns {void}
   */
  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  /**
   * Validate, then hand a passing product to the screen.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {void}
   */
  function handleSubmit(event) {
    event.preventDefault();
    const { errors: found, record } = validateProduct(values, { categories, products });
    setErrors(found);
    if (record) onSave(record);
  }

  /**
   * Render a text input bound to a field.
   *
   * @param {string} field - The field name.
   * @param {object} [extra] - Extra input attributes, e.g. inputMode.
   * @returns {(describedBy: string|undefined) => JSX.Element} Field renderer.
   */
  const textInput = (field, extra = {}) => (describedBy) => (
    <input
      id={`${id}-${field}`}
      value={values[field]}
      onChange={(event) => update(field, event.target.value)}
      aria-invalid={Boolean(errors[field])}
      aria-describedby={describedBy}
      className={`${CONTROL} ${borderClass(errors[field])}`}
      {...extra}
    />
  );

  return (
    <FormPanel title="New product" onSubmit={handleSubmit}>
      <Field id={`${id}-name`} label="Name" error={errors.name}>
        {textInput('name', { placeholder: 'Aria 75 Wireless' })}
      </Field>
      <Field id={`${id}-sku`} label="SKU" hint="Stored in uppercase." error={errors.sku}>
        {textInput('sku', { placeholder: 'KB-ARIA-75' })}
      </Field>
      <Field id={`${id}-categoryId`} label="Category" error={errors.categoryId}>
        {(describedBy) => (
          <select
            id={`${id}-categoryId`}
            value={values.categoryId}
            onChange={(event) => update('categoryId', event.target.value)}
            aria-invalid={Boolean(errors.categoryId)}
            aria-describedby={describedBy}
            className={`${CONTROL} ${borderClass(errors.categoryId)}`}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id={`${id}-status`} label="Status" hint="Drafts stay off the storefront." error={errors.status}>
        {(describedBy) => (
          <select
            id={`${id}-status`}
            value={values.status}
            onChange={(event) => update('status', event.target.value)}
            aria-describedby={describedBy}
            className={`${CONTROL} ${borderClass(errors.status)}`}
          >
            {PRODUCT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABEL[status]}
              </option>
            ))}
          </select>
        )}
      </Field>
      <Field id={`${id}-price`} label="Price (USD)" error={errors.price}>
        {textInput('price', { inputMode: 'decimal', placeholder: '139.00' })}
      </Field>
      <Field id={`${id}-stock`} label="Units in stock" error={errors.stock}>
        {textInput('stock', { inputMode: 'numeric' })}
      </Field>
      <FormActions submitLabel="Create product" onCancel={onCancel} />
    </FormPanel>
  );
}
