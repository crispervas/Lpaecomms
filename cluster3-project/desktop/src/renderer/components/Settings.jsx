/**
 * @file Admin Settings screen.
 *
 * Built from the "Admin Settings" desktop mockup: a sub-navigation of six tabs
 * — Store info, Shipping options, Admin users & roles, Email templates,
 * Activity log and System status — beside the chosen tab's panel.
 *
 * Everything is sample data from data/settings.mjs except System status's
 * REST API row, which is live: it asks the main process for the API's health
 * through window.api. Store info validates and hands its details to
 * `onSaveStoreInfo`, which App supplies; until the database exists that
 * reports nothing was saved. Actions whose flows no mockup draws (uploading a
 * logo, adding shipping methods, inviting admins, editing templates) stay
 * disabled.
 */

import { useCallback, useEffect, useId, useState } from 'react';

import {
  SAMPLE_ACTIVITY,
  SAMPLE_ADMIN_TEAM,
  SAMPLE_EMAIL_TEMPLATES,
  SAMPLE_SERVICES,
  SAMPLE_SHIPPING_OPTIONS,
  SAMPLE_STORE_INFO,
} from '../data/settings.mjs';
import { describeHealth } from '../lib/describeHealth.mjs';
import { formatMoney } from '../lib/format.mjs';
import { validateStoreInfo } from '../lib/storeRules.mjs';
import { initialsOf } from '../lib/userTable.mjs';
import { CONTROL, Field, borderClass } from './formParts.jsx';
import { PreviewNote } from './tableParts.jsx';

/** Tabs in the mockup's order. */
const TABS = Object.freeze([
  { key: 'store', label: 'Store info' },
  { key: 'shipping', label: 'Shipping options' },
  { key: 'admins', label: 'Admin users & roles' },
  { key: 'templates', label: 'Email templates' },
  { key: 'logs', label: 'Activity log' },
  { key: 'status', label: 'System status' },
]);

/**
 * Label and colour per service state, written out in full because Tailwind's
 * scanner cannot see a class name assembled from a variable.
 */
const SERVICE_STATE = {
  operational: { label: 'Operational', text: 'text-lpa-success', dot: 'bg-lpa-success' },
  degraded: { label: 'Degraded', text: 'text-lpa-warning', dot: 'bg-lpa-warning' },
  down: { label: 'Down', text: 'text-lpa-negative', dot: 'bg-lpa-negative' },
  unknown: { label: 'Unknown', text: 'text-lpa-subtle', dot: 'bg-lpa-subtle' },
  checking: { label: 'Checking…', text: 'text-lpa-subtle', dot: 'bg-lpa-line' },
};

/** Classes for the outlined secondary buttons. */
const OUTLINE_BUTTON =
  'rounded-lg border border-lpa-line bg-lpa-surface font-semibold text-lpa-ink hover:bg-lpa-track ' +
  'aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-lpa-surface';

/**
 * Pick a tab's classes, spelled out per branch for Tailwind's scanner.
 *
 * @param {boolean} isCurrent - Whether the tab is the one on show.
 * @returns {string} The tab's state classes.
 */
function tabClass(isCurrent) {
  return isCurrent ? 'bg-lpa-tint text-lpa-accent' : 'text-lpa-subtle hover:bg-lpa-track hover:text-lpa-ink';
}

/**
 * Render a settings panel: the white card with its heading.
 *
 * @param {object} props - Component props.
 * @param {string} props.title - The panel heading.
 * @param {React.ReactNode} [props.action] - A control beside the heading.
 * @param {string} [props.width] - Max-width class; the mockup widens only the
 *   admin list.
 * @param {React.ReactNode} props.children - Panel content.
 * @returns {JSX.Element} The panel.
 */
function SettingsPanel({ title, action, width = 'max-w-[640px]', children }) {
  const titleId = useId();
  return (
    <section aria-labelledby={titleId} className={`rounded-2xl border border-lpa-line bg-lpa-surface p-7 ${width}`}>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 id={titleId} className="font-display text-base font-semibold">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Render a disabled control for a flow no mockup defines yet.
 *
 * @param {object} props - Component props.
 * @param {string} props.hint - Tooltip saying what is coming.
 * @param {string} props.className - The control's classes.
 * @param {React.ReactNode} props.children - The control's text.
 * @returns {JSX.Element} The button.
 */
function ComingSoonButton({ hint, className, children }) {
  return (
    <button type="button" aria-disabled="true" title={hint} className={className}>
      {children}
    </button>
  );
}

/**
 * Render the Store info tab: the logo and the store's public details.
 *
 * @param {object} props - Component props.
 * @param {(record: {name: string, email: string, phone: string}) =>
 *   Promise<{saved: boolean}>} props.onSave - Persists validated details.
 * @returns {JSX.Element} The panel.
 */
function StoreInfo({ onSave }) {
  const id = useId();
  const [values, setValues] = useState({ ...SAMPLE_STORE_INFO });
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  /**
   * Store an edited field and clear its stale message and the last notice.
   *
   * @param {'name'|'email'|'phone'} field - The field edited.
   * @param {string} value - Its new text.
   * @returns {void}
   */
  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
    setNotice('');
  }

  /**
   * Validate, then hand passing details to App and report the outcome.
   *
   * @param {React.FormEvent<HTMLFormElement>} event - The form submission.
   * @returns {Promise<void>}
   */
  async function handleSubmit(event) {
    event.preventDefault();
    const { errors: found, record } = validateStoreInfo(values);
    setErrors(found);
    if (!record) return;
    const { saved } = await onSave(record);
    setNotice(saved ? 'Changes saved.' : 'Details are valid. They will be saved once the database is connected.');
  }

  /**
   * Render one text field of the form.
   *
   * @param {'name'|'email'|'phone'} field - The field.
   * @param {string} label - Its label.
   * @param {object} [extra] - Extra input attributes.
   * @returns {JSX.Element} The field.
   */
  const textField = (field, label, extra = {}) => (
    <Field id={`${id}-${field}`} label={label} error={errors[field]}>
      {(describedBy) => (
        <input
          id={`${id}-${field}`}
          value={values[field]}
          onChange={(event) => update(field, event.target.value)}
          aria-invalid={Boolean(errors[field])}
          aria-describedby={describedBy}
          className={`${CONTROL} ${borderClass(errors[field])}`}
          {...extra}
        />
      )}
    </Field>
  );

  return (
    <SettingsPanel title="Store info">
      <div className="mb-6 flex items-center gap-4">
        {/* The mockup leaves a logo slot; the brand mark stands in until
            uploads exist. */}
        <div
          role="img"
          aria-label="Current store logo"
          className="flex h-16 w-16 flex-none items-center justify-center rounded-xl bg-lpa-ink font-display text-lg font-bold text-white"
        >
          LPA
        </div>
        <ComingSoonButton hint="Logo uploads are coming soon" className={`px-4 py-[9px] text-xs ${OUTLINE_BUTTON}`}>
          Upload new logo
        </ComingSoonButton>
      </div>

      <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-[18px]">
        {textField('name', 'Store name')}
        {textField('email', 'Contact email', { type: 'email' })}
        {textField('phone', 'Phone', { type: 'tel' })}
        <div className="mt-1.5 flex items-center gap-4">
          <button
            type="submit"
            className="rounded-lg bg-lpa-ink px-6 py-3 text-sm font-semibold text-white hover:bg-lpa-ink-hover"
          >
            Save changes
          </button>
          <p role="status" className="text-[13px] font-semibold text-lpa-success">
            {notice}
          </p>
        </div>
      </form>
    </SettingsPanel>
  );
}

/**
 * Render the Shipping options tab.
 *
 * @returns {JSX.Element} The panel.
 */
function ShippingOptions() {
  return (
    <SettingsPanel title="Shipping options">
      <ul className="flex flex-col gap-3">
        {SAMPLE_SHIPPING_OPTIONS.map((option) => (
          <li key={option.id} className="flex items-center justify-between rounded-xl border border-lpa-line p-4">
            <div>
              <div className="text-sm font-semibold">{option.name}</div>
              <div className="text-xs text-lpa-subtle">{option.eta}</div>
            </div>
            <span className="text-sm font-bold">{formatMoney(option.price, { alwaysCents: true })}</span>
          </li>
        ))}
      </ul>
      <ComingSoonButton hint="Adding shipping methods is coming soon" className={`mt-5 px-5 py-[11px] text-[13px] ${OUTLINE_BUTTON}`}>
        + Add shipping method
      </ComingSoonButton>
    </SettingsPanel>
  );
}

/**
 * Render the Admin users & roles tab.
 *
 * @returns {JSX.Element} The panel.
 */
function AdminTeam() {
  return (
    <SettingsPanel
      title="Admin users & roles"
      width="max-w-[720px]"
      action={
        <ComingSoonButton
          hint="Inviting admins is coming soon"
          className="rounded-lg bg-lpa-ink px-4 py-[9px] text-xs font-semibold text-white aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
        >
          + Invite admin
        </ComingSoonButton>
      }
    >
      <ul>
        {SAMPLE_ADMIN_TEAM.map((admin) => (
          <li key={admin.email} className="flex items-center justify-between gap-4 border-b border-lpa-track py-3.5 last:border-b-0">
            <div className="flex min-w-0 items-center gap-3">
              <div
                aria-hidden="true"
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-lpa-tint text-[11px] font-semibold text-lpa-accent"
              >
                {initialsOf(admin.name)}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[13px] font-semibold">{admin.name}</div>
                <div className="truncate text-xs text-lpa-subtle">{admin.email}</div>
              </div>
            </div>
            <span className="flex-none rounded-2xl bg-lpa-tint px-3 py-1 text-xs font-semibold text-lpa-accent">
              {admin.role}
            </span>
          </li>
        ))}
      </ul>
    </SettingsPanel>
  );
}

/**
 * Render the Email templates tab.
 *
 * @returns {JSX.Element} The panel.
 */
function EmailTemplates() {
  return (
    <SettingsPanel title="Email templates">
      <ul>
        {SAMPLE_EMAIL_TEMPLATES.map((template) => (
          <li key={template.id} className="flex items-center justify-between gap-4 border-b border-lpa-track py-3.5 last:border-b-0">
            <div>
              <div className="text-sm font-semibold">{template.name}</div>
              <div className="text-xs text-lpa-subtle">{template.description}</div>
            </div>
            <ComingSoonButton
              hint="Editing templates is coming soon"
              className="text-[13px] font-semibold text-lpa-accent aria-disabled:cursor-not-allowed"
            >
              <span className="sr-only">{template.name}: </span>Edit
            </ComingSoonButton>
          </li>
        ))}
      </ul>
    </SettingsPanel>
  );
}

/**
 * Render the Activity log tab.
 *
 * @returns {JSX.Element} The panel.
 */
function ActivityLog() {
  return (
    <SettingsPanel title="Activity log">
      <ol className="flex flex-col gap-4">
        {SAMPLE_ACTIVITY.map((entry) => (
          <li key={entry.id} className="flex gap-3">
            <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 flex-none rounded-full bg-lpa-accent" />
            <div>
              <div className="text-[13px]">{entry.text}</div>
              <div className="text-xs text-lpa-subtle">{entry.when}</div>
            </div>
          </li>
        ))}
      </ol>
    </SettingsPanel>
  );
}

/**
 * Ask the main process for the REST API's health, on mount and on demand.
 *
 * @returns {{health: ({state: string, title: string, detail: string}|null),
 *   isChecking: boolean, check: () => Promise<void>}} The latest result (null
 *   before the first answer), whether a check is running, and a re-check.
 */
function useApiHealth() {
  const [health, setHealth] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(async () => {
    setIsChecking(true);
    try {
      setHealth(describeHealth(await window.api.getHealth()));
    } catch {
      // The preload's envelope never rejects (see preload.js), but invoke()
      // itself can — e.g. window.api is undefined, or no handler is registered
      // on the other end. Report it as a down API rather than leaving the row
      // stuck on "Checking…" forever.
      setHealth(
        describeHealth({ ok: false, status: null, data: null, error: 'The desktop bridge is unavailable.' }),
      );
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return { health, isChecking, check };
}

/**
 * Render one service row: its name, and its state as a dot and a word.
 *
 * @param {object} props - Component props.
 * @param {string} props.name - The service.
 * @param {keyof typeof SERVICE_STATE} props.state - Its state.
 * @param {React.ReactNode} [props.children] - Extra lines under the name.
 * @returns {JSX.Element} The row.
 */
function ServiceRow({ name, state, children }) {
  const look = SERVICE_STATE[state];
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-lpa-line px-4 py-3.5">
      <div className="min-w-0">
        <span className="text-[13px] font-semibold">{name}</span>
        {children}
      </div>
      <span className={`flex flex-none items-center gap-1.5 text-xs font-semibold ${look.text}`}>
        <span aria-hidden="true" className={`h-[7px] w-[7px] rounded-full ${look.dot}`} />
        {look.label}
      </span>
    </li>
  );
}

/**
 * Render the System status tab: the live REST API row, then sample services.
 *
 * @returns {JSX.Element} The panel.
 */
function SystemStatus() {
  const { health, isChecking, check } = useApiHealth();

  return (
    <SettingsPanel
      title="System status"
      action={
        <button
          type="button"
          onClick={check}
          disabled={isChecking}
          className="rounded-lg border border-lpa-line bg-lpa-surface px-3.5 py-2 text-xs font-semibold hover:bg-lpa-track disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isChecking ? 'Checking…' : 'Check again'}
        </button>
      }
    >
      <ul className="flex flex-col gap-3" aria-live="polite">
        <ServiceRow name="REST API" state={health === null ? 'checking' : health.state}>
          {health && (
            <p className="mt-0.5 text-xs text-lpa-subtle">
              {health.title} — {health.detail} <span className="font-semibold">Live.</span>
            </p>
          )}
        </ServiceRow>
        {SAMPLE_SERVICES.map((service) => (
          <ServiceRow key={service.name} name={service.name} state={service.state} />
        ))}
      </ul>
      <p className="mt-4 text-xs text-lpa-subtle">
        Only the REST API is checked live; the other services show sample states.
      </p>
    </SettingsPanel>
  );
}

/**
 * Render the Settings screen.
 *
 * @param {object} props - Component props.
 * @param {(record: {name: string, email: string, phone: string}) =>
 *   Promise<{saved: boolean}>} props.onSaveStoreInfo - Persists the store's
 *   details; `saved` says whether they were stored.
 * @returns {JSX.Element} The screen, for placement in AdminLayout.
 */
export function Settings({ onSaveStoreInfo }) {
  const [tab, setTab] = useState('store');

  return (
    <div className="grid grid-cols-[200px_1fr] items-start gap-10">
      <nav aria-label="Settings sections" className="sticky top-9 flex flex-col gap-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-current={item.key === tab ? 'page' : undefined}
            onClick={() => setTab(item.key)}
            className={`rounded-lg px-3 py-2.5 text-left text-[13px] font-semibold ${tabClass(item.key === tab)}`}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="min-w-0">
        <h1 className="mb-7 font-display text-[26px] font-bold">Settings</h1>
        <div className="max-w-[640px]">
          <PreviewNote>
            Preview — sample settings. Only the REST API row under System status is live.
          </PreviewNote>
        </div>
        {tab === 'store' && <StoreInfo onSave={onSaveStoreInfo} />}
        {tab === 'shipping' && <ShippingOptions />}
        {tab === 'admins' && <AdminTeam />}
        {tab === 'templates' && <EmailTemplates />}
        {tab === 'logs' && <ActivityLog />}
        {tab === 'status' && <SystemStatus />}
      </div>
    </div>
  );
}
