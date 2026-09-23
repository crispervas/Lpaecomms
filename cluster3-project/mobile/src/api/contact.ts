/**
 * @file Contact messages for the mobile About & Contact view.
 *
 * Wraps POST /contact (bruno/lpaecomms-web/contact) and turns the API's
 * field-tagged validation list into per-field messages for the form.
 */
import { apiPost, type ApiResult, type ApiValidationEntry } from './client';
import type { ContactErrors, ContactField, ContactValues } from '../lib/contactRules';

const FIELDS: readonly ContactField[] = ['name', 'email', 'message'];

/**
 * Send a contact message.
 *
 * @param values - Name, email and message as typed; the API trims them.
 * @returns The result envelope; a 422 carries `validation`.
 */
export async function sendContact(values: ContactValues): Promise<ApiResult<{ received: boolean }>> {
  return apiPost<{ received: boolean }>('/contact', values);
}

/**
 * Map the API's validation list onto the form's fields.
 *
 * @param validation - Entries from a failed result, if any.
 * @returns The first message for each field this form has; others are ignored.
 */
export function fieldErrors(validation: ApiValidationEntry[] | undefined): ContactErrors {
  const errors: ContactErrors = {};

  for (const { field, message } of validation ?? []) {
    const known = FIELDS.find((name) => name === field);
    if (known && errors[known] === undefined) errors[known] = message;
  }

  return errors;
}
