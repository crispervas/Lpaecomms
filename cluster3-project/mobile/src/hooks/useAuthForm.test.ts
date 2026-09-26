import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useAuthForm } from './useAuthForm';

describe('useAuthForm', () => {
  it('shows field errors for an invalid submit', () => {
    const { result } = renderHook(() => useAuthForm());

    act(() => result.current.submit());

    expect(result.current.errors.email).toBe('Please enter your email.');
  });

  it('clears only the password after a valid submit', () => {
    const { result } = renderHook(() => useAuthForm('signup'));
    act(() => {
      result.current.setValue('name', 'Ana');
      result.current.setValue('email', 'ana@example.com');
      result.current.setValue('password', 'longenough');
    });

    act(() => result.current.submit());

    expect(result.current.errors).toEqual({});
    expect(result.current.values).toEqual({ name: 'Ana', email: 'ana@example.com', password: '' });
  });

  it('resets errors on a mode switch but keeps the email', () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.setValue('email', 'ana@example.com'));
    act(() => result.current.submit());
    expect(result.current.errors.password).toBeDefined();

    act(() => result.current.setMode('signup'));

    expect(result.current.mode).toBe('signup');
    expect(result.current.errors).toEqual({});
    expect(result.current.values.email).toBe('ana@example.com');
  });

  it('clears a field error when the user edits', () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => result.current.submit());

    act(() => result.current.setValue('email', 'a'));

    expect(result.current.errors.email).toBeUndefined();
    expect(result.current.errors.password).toBe('Please enter your password.');
  });

  it('reports the first invalid field so the page can move focus to it', () => {
    const { result } = renderHook(() => useAuthForm('signup'));
    act(() => result.current.setValue('name', 'Ana'));

    let first: string | null = 'unset';
    act(() => {
      first = result.current.submit();
    });

    expect(first).toBe('email');
  });

  it('reports no field for a valid submit', () => {
    const { result } = renderHook(() => useAuthForm());
    act(() => {
      result.current.setValue('email', 'ana@example.com');
      result.current.setValue('password', 'x');
    });

    let first: string | null = 'unset';
    act(() => {
      first = result.current.submit();
    });

    expect(first).toBeNull();
  });
});
