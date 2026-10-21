/**
 * @file Category and product forms for the Catalog screen, for creating and
 * editing alike.
 *
 * Both forms validate with lib/catalogRules.mjs and hand a normalised record to
 * `onSave`. They never store anything themselves: `onSave` (the Catalog
 * screen, through window.api) answers with what the API refused, and the form
 * shows it — per field where the API named one, above the buttons otherwise.
 */

import { useEffect, useId, useRef, useState } from 'react';

import { PRODUCT_STATUSES, toCode, validateCategory, validateProduct } from '../lib/catalogRules.mjs';
import { CONTROL, Field, borderClass } from './formParts.jsx';

/** Display names of the product statuses. */
const STATUS_LABEL = { active: 'Active', draft: 'Draft' };

/**
 * What `onSave` resolves to: null once stored, or what the API refused.
 *
 * @typedef {{fieldErrors: Record<string, string>, error: string|null}|null} SaveResult
 */

/**
 * Render the Cancel and submit buttons shared by both forms, with the save's
 * failure above them.
 *
 * @param {object} props - Component props.
 * @param {string} props.submitLabel - The submit button's text.
 * @param {boolean} props.busy - True while the save runs.
 * @param {string|null} props.error - Why the last save failed, when no field says.
 * @param {() => void} props.onCancel - Called when the form is dismissed.
 * @returns {JSX.Element} The button row.
 */
export function FormActions({ submitLabel, busy, error, onCancel }) {
  return (
    <div className="col-span-2 flex items-center justify-end gap-2 border-t border-lpa-track pt-5">
      {/* Always mounted, so a screen reader announces a failure when it appears. */}
      <p role="alert" className="mr-auto text-[13px] font-semibold text-lpa-negative empty:hidden">
        {error}
      </p>
      <button
        type="button"
        onClick={onCancel}
        className="rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-[13px] font-semibold hover:bg-lpa-track"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-lpa-ink px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-lpa-ink-hover disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? 'Saving…' : submitLabel}
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
export function FormPanel({ title, onSubmit, children }) {
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
 * Run a validated record through `onSave` and keep its outcome.
 *
 * @param {(record: object) => Promise<SaveResult>} onSave - The screen's save.
 * @param {(errors: Record<string, string>) => void} setErrors - The form's field errors.
 * @returns {{busy: boolean, error: string|null, save: (record: object) => Promise<void>,
 *   clearError: () => void}} The save state.
 */
function useSave(onSave, setErrors) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Save a record, showing what the API refused.
   *
   * @param {object} record - A record that passed the client rules.
   * @returns {Promise<void>}
   */
  async function save(record) {
    setBusy(true);
    setError(null);
    const result = await onSave(record);
    // On success the screen closes this form, so there is nothing to reset.
    if (result) {
      setBusy(false);
      setErrors(result.fieldErrors);
      setError(result.error);
    }
  }

  return { busy, error, save, clearError: () => setError(null) };
}

/**
 * Render the category form.
 *
 * The code follows the name until the user edits it, after which it is
 * theirs; an edited category starts with its own code, so it never follows.
 *
 * @param {object} props - Component props.
 * @param {ReadonlyArray<{id: number, name: string, code: string}>} props.categories -
 *   Existing categories, for the uniqueness checks.
 * @param {{id: number, name: string, code: string, description: string}|null} [props.initial] -
 *   The category being edited; omitted for a new one.
 * @param {(record: {name: string, code: string, description: string}) => Promise<SaveResult>}
 *   props.onSave - Stores the validated category.
 * @param {() => void} props.onCancel - Called when the form is dismissed.
 * @returns {JSX.Element} The form panel.
 */
export function CategoryForm({ categories, initial = null, onSave, onCancel }) {
  const id = useId();
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    description: initial?.description ?? '',
  });
  const [codeEdited, setCodeEdited] = useState(initial !== null);
  const [errors, setErrors] = useState({});
  const { busy, error, save, clearError } = useSave(onSave, setErrors);

  /**
   * Store an edited field and clear its stale message.
   *
   * @param {'name'|'code'|'description'} field - The field edited.
   * @param {string} value - Its new text.
   * @returns {void}
   */
  function update(field, value) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === 'name' && !codeEdited) next.code = toCode(value);
      return next;
    });
    if (field === 'code') setCodeEdited(true);
    setErrors((current) => ({ ...current, [field]: undefined, ...(field === 'name' ? { code: undefined } : {}) }));
    clearError();
  }

  /**
   * Validate, then hand a passing category to the screen.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {void}
   */
  function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const { errors: found, record } = validateCategory(values, categories, { exceptId: initial?.id });
    setErrors(found);
    if (record) save(record);
  }

  return (
    <FormPanel title={initial ? `Edit ${initial.name}` : 'New category'} onSubmit={handleSubmit}>
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
      <Field id={`${id}-code`} label="Code" hint="Used in catalogue URLs." error={errors.code}>
        {(describedBy) => (
          <input
            id={`${id}-code`}
            value={values.code}
            onChange={(event) => update('code', event.target.value)}
            placeholder="speakers"
            aria-invalid={Boolean(errors.code)}
            aria-describedby={describedBy}
            className={`${CONTROL} ${borderClass(errors.code)}`}
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
      <FormActions
        submitLabel={initial ? 'Save changes' : 'Create category'}
        busy={busy}
        error={error}
        onCancel={onCancel}
      />
    </FormPanel>
  );
}

/**
 * Render the product form.
 *
 * @param {object} props - Component props.
 * @param {ReadonlyArray<{id: number, name: string}>} props.categories - The
 *   categories a product can belong to.
 * @param {ReadonlyArray<{id: number, code: string}>} props.products - Existing
 *   products, for the code uniqueness check.
 * @param {number|null} props.defaultCategoryId - The category preselected for a
 *   new product: the one the admin is looking at.
 * @param {{id: number, name: string, code: string, categoryId: number,
 *   price: number, stock: number, status: string, description: string}|null} [props.initial] -
 *   The product being edited; omitted for a new one.
 * @param {(record: {name: string, code: string, categoryId: number,
 *   price: number, stock: number, status: string, description: string}) => Promise<SaveResult>}
 *   props.onSave - Stores the validated product.
 * @param {() => void} props.onCancel - Called when the form is dismissed.
 * @returns {JSX.Element} The form panel.
 */
export function ProductForm({ categories, products, defaultCategoryId, initial = null, onSave, onCancel }) {
  const id = useId();
  // Inputs hold text; the rules turn it back into numbers on submit.
  const [values, setValues] = useState({
    name: initial?.name ?? '',
    code: initial?.code ?? '',
    categoryId: String(initial?.categoryId ?? defaultCategoryId ?? ''),
    price: initial ? String(initial.price) : '',
    stock: initial ? String(initial.stock) : '0',
    status: initial?.status ?? 'draft',
    description: initial?.description ?? '',
  });
  const [errors, setErrors] = useState({});
  const { busy, error, save, clearError } = useSave(onSave, setErrors);

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
    clearError();
  }

  /**
   * Validate, then hand a passing product to the screen.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {void}
   */
  function handleSubmit(event) {
    event.preventDefault();
    if (busy) return;
    const { errors: found, record } = validateProduct(values, { categories, products, exceptId: initial?.id });
    setErrors(found);
    if (record) save(record);
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
    <FormPanel title={initial ? `Edit ${initial.name}` : 'New product'} onSubmit={handleSubmit}>
      <Field id={`${id}-name`} label="Name" error={errors.name}>
        {textInput('name', { placeholder: 'Aria 75 Wireless' })}
      </Field>
      <Field id={`${id}-code`} label="Code" hint="Stored in lowercase." error={errors.code}>
        {textInput('code', { placeholder: 'kb-aria-75' })}
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
      <Field id={`${id}-price`} label="Price (AUD)" error={errors.price}>
        {textInput('price', { inputMode: 'decimal', placeholder: '139.00' })}
      </Field>
      <Field id={`${id}-stock`} label="Units in stock" error={errors.stock}>
        {textInput('stock', { inputMode: 'numeric' })}
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
            rows={3}
            value={values.description}
            onChange={(event) => update('description', event.target.value)}
            aria-invalid={Boolean(errors.description)}
            aria-describedby={describedBy}
            className={`${CONTROL} resize-none ${borderClass(errors.description)}`}
          />
        )}
      </Field>
      <FormActions
        submitLabel={initial ? 'Save changes' : 'Create product'}
        busy={busy}
        error={error}
        onCancel={onCancel}
      />
    </FormPanel>
  );
}
