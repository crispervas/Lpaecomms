import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { PROFILE_PREVIEW_NOTICE, useProfileForm } from './useProfileForm';

const initial = { firstName: 'Jordan', email: 'jordan.kim@email.com', phone: '' };

describe('useProfileForm', () => {
  it('starts from the given values with no errors or notice', () => {
    const { result } = renderHook(() => useProfileForm(initial));

    expect(result.current.values).toEqual(initial);
    expect(result.current.errors).toEqual({});
    expect(result.current.notice).toBeNull();
  });

  it('shows the preview notice for a valid save and keeps the edits', () => {
    const { result } = renderHook(() => useProfileForm(initial));
    act(() => result.current.setValue('firstName', 'Jo'));

    let first: string | null = 'unset';
    act(() => {
      first = result.current.submit();
    });

    expect(first).toBeNull();
    expect(result.current.notice).toBe(PROFILE_PREVIEW_NOTICE);
    expect(result.current.values.firstName).toBe('Jo');
  });

  it('reports the first invalid field and shows no notice', () => {
    const { result } = renderHook(() => useProfileForm(initial));
    act(() => {
      result.current.setValue('firstName', '');
      result.current.setValue('email', 'nope');
    });

    let first: string | null = 'unset';
    act(() => {
      first = result.current.submit();
    });

    expect(first).toBe('firstName');
    expect(result.current.errors.email).toBe('Please enter a valid email address.');
    expect(result.current.notice).toBeNull();
  });

  it('clears a field error and the notice when the user edits', () => {
    const { result } = renderHook(() => useProfileForm(initial));
    act(() => result.current.setValue('email', ''));
    act(() => result.current.submit());

    act(() => result.current.setValue('email', 'j'));

    expect(result.current.errors.email).toBeUndefined();
    expect(result.current.notice).toBeNull();
  });
});
