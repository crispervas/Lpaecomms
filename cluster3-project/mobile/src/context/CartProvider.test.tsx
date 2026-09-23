import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({ Preferences: { get: vi.fn(), set: vi.fn() } }));

import { Preferences } from '@capacitor/preferences';
import CartProvider from './CartProvider';
import { CART_STORAGE_KEY, useCart } from './cartContext';

const get = vi.mocked(Preferences.get);
const set = vi.mocked(Preferences.set);

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

const cap = { id: 2, name: 'Blue Cap', priceAud: 20, imageUrl: '' };

describe('CartProvider', () => {
  beforeEach(() => {
    get.mockReset();
    set.mockReset();
    set.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads the stored cart', async () => {
    get.mockResolvedValue({ value: JSON.stringify([{ ...cap, quantity: 2 }]) });

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(get).toHaveBeenCalledWith({ key: CART_STORAGE_KEY });
    expect(result.current.items).toEqual([{ ...cap, quantity: 2 }]);
    expect(result.current.count).toBe(2);
    expect(result.current.subtotalAud).toBe(40);
  });

  it('saves the cart after a change', async () => {
    get.mockResolvedValue({ value: null });
    const { result } = renderHook(() => useCart(), { wrapper });
    await waitFor(() => expect(result.current.loaded).toBe(true));

    act(() => result.current.add(cap, 3));

    await waitFor(() =>
      expect(set).toHaveBeenLastCalledWith({ key: CART_STORAGE_KEY, value: JSON.stringify([{ ...cap, quantity: 3 }]) }),
    );
  });

  it('keeps an add made before the stored cart loaded, without saving early', async () => {
    let finishLoad: (value: { value: string | null }) => void = () => {};
    get.mockImplementation(() => new Promise((resolve) => (finishLoad = resolve)));
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.add(cap, 1));
    expect(set).not.toHaveBeenCalled();

    await act(async () => finishLoad({ value: JSON.stringify([{ ...cap, quantity: 2 }]) }));

    expect(result.current.items).toEqual([{ ...cap, quantity: 3 }]);
  });

  it('starts empty when storage cannot be read', async () => {
    get.mockRejectedValue(new Error('denied'));

    const { result } = renderHook(() => useCart(), { wrapper });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.items).toEqual([]);
  });

  it('refuses to be used outside the provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => renderHook(() => useCart())).toThrow(/CartProvider/);
  });
});
