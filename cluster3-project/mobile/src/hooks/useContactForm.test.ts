import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('../api/contact', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/contact')>()),
  sendContact: vi.fn(),
}));

import { sendContact } from '../api/contact';
import { useContactForm } from './useContactForm';

const mockedSend = vi.mocked(sendContact);

/** Render the hook and fill in a valid message. */
function renderFilled() {
  const hook = renderHook(() => useContactForm());
  act(() => {
    hook.result.current.setValue('name', 'Ana');
    hook.result.current.setValue('email', 'ana@example.com');
    hook.result.current.setValue('message', 'Hello');
  });
  return hook;
}

describe('useContactForm', () => {
  beforeEach(() => {
    mockedSend.mockReset();
  });

  it('shows client errors and sends nothing while a field is invalid', () => {
    const { result } = renderHook(() => useContactForm());

    act(() => result.current.submit());

    expect(result.current.errors.name).toBe('Please enter your name.');
    expect(mockedSend).not.toHaveBeenCalled();
  });

  it('confirms and clears the form once the message is accepted', async () => {
    mockedSend.mockResolvedValue({ ok: true, status: 202, data: { received: true }, error: null });
    const { result } = renderFilled();

    act(() => result.current.submit());
    expect(result.current.status).toBe('sending');

    await waitFor(() => expect(result.current.status).toBe('sent'));
    expect(result.current.values).toEqual({ name: '', email: '', message: '' });
  });

  it('puts server validation under its fields and keeps the values', async () => {
    mockedSend.mockResolvedValue({
      ok: false,
      status: 422,
      data: null,
      error: 'Some fields need attention.',
      validation: [{ field: 'email', message: 'Please enter a valid email address.' }],
    });
    const { result } = renderFilled();

    act(() => result.current.submit());

    await waitFor(() => expect(result.current.errors.email).toBe('Please enter a valid email address.'));
    expect(result.current.status).toBe('idle');
    expect(result.current.values.name).toBe('Ana');
  });

  it('reports a failed send and keeps what was typed', async () => {
    mockedSend.mockResolvedValue({ ok: false, status: null, data: null, error: 'Offline.' });
    const { result } = renderFilled();

    act(() => result.current.submit());

    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(result.current.formError).toBe('Offline.');
    expect(result.current.values.message).toBe('Hello');
  });

  it('clears a field error as soon as the field is edited', () => {
    const { result } = renderHook(() => useContactForm());
    act(() => result.current.submit());

    act(() => result.current.setValue('name', 'A'));

    expect(result.current.errors.name).toBeUndefined();
    expect(result.current.errors.email).toBe('Please enter your email.');
  });

  it('sends once for a double tap', async () => {
    mockedSend.mockResolvedValue({ ok: true, status: 202, data: { received: true }, error: null });
    const { result } = renderFilled();

    act(() => {
      result.current.submit();
      result.current.submit();
    });

    await waitFor(() => expect(result.current.status).toBe('sent'));
    expect(mockedSend).toHaveBeenCalledTimes(1);
  });
});
