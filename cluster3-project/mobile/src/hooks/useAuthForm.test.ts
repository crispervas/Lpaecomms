import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { AUTH_PREVIEW_NOTICE, useAuthForm } from './useAuthForm';

describe('useAuthForm', () => {
  it('shows field errors and no notice for an invalid submit', () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => result.current.submit());

    expect(result.current.errors.email).toBe('Please enter your email.');
    expect(result.current.notice).toBeNull();
  });

  it('shows the preview notice for a valid submit and clears only the password', () => {
    const { result } = renderHook(() => useAuthForm('signup'));
    act(() => {
      result.current.setValue('name', 'Ana');
      result.current.setValue('email', 'ana@example.com');
      result.current.setValue('password', 'longenough');
    });

    act(() => result.current.submit());

    expect(result.current.notice).toBe(AUTH_PREVIEW_NOTICE);
    expect(result.current.errors).toEqual({});
    expect(result.current.values).toEqual({ name: 'Ana', email: 'ana@example.com', password: '' });
  });

  it('resets errors and the notice on a mode switch but keeps the email', () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.setValue('email', 'ana@example.com'));
    act(() => result.current.submit());
    expect(result.current.errors.password).toBeDefined();

    act(() => result.current.setMode('signup'));

    expect(result.current.mode).toBe('signup');
    expect(result.current.errors).toEqual({});
    expect(result.current.notice).toBeNull();
    expect(result.current.values.email).toBe('ana@example.com');
  });

  it('clears a field error, and the notice, when the user edits', () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.submit());

    act(() => result.current.setValue('email', 'a'));

    expect(result.current.errors.email).toBeUndefined();
    expect(result.current.errors.password).toBe('Please enter your password.');
  });
});
