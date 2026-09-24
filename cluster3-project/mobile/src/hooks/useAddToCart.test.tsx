import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

vi.mock('@capacitor/preferences', () => ({
  Preferences: { get: vi.fn().mockResolvedValue({ value: null }), set: vi.fn().mockResolvedValue(undefined) },
}));

const present = vi.fn();
const push = vi.fn();

vi.mock('@ionic/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ionic/react')>()),
  useIonToast: () => [present, vi.fn()],
  useIonRouter: () => ({ push }),
}));

import CartProvider from '../context/CartProvider';
import { useCart } from '../context/cartContext';
import { useAddToCart } from './useAddToCart';

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

const cap = { id: 2, name: 'Blue Cap', priceAud: 20, imageUrl: '' };

describe('useAddToCart', () => {
  beforeEach(() => {
    present.mockReset();
    push.mockReset();
  });

  it('adds the product and offers a way to the cart', async () => {
    const { result } = renderHook(() => ({ addToCart: useAddToCart(), cart: useCart() }), { wrapper });
    await waitFor(() => expect(result.current.cart.loaded).toBe(true));

    act(() => result.current.addToCart(cap, 2));

    expect(result.current.cart.count).toBe(2);
    expect(present).toHaveBeenCalledWith(expect.objectContaining({ message: 'Added to cart' }));

    const { buttons } = present.mock.calls[0][0];
    buttons[0].handler();
    expect(push).toHaveBeenCalledWith('/cart', 'none', 'push');
  });

  it('adds one unit when no quantity is given', async () => {
    const { result } = renderHook(() => ({ addToCart: useAddToCart(), cart: useCart() }), { wrapper });
    await waitFor(() => expect(result.current.cart.loaded).toBe(true));

    act(() => result.current.addToCart(cap));

    expect(result.current.cart.count).toBe(1);
  });
});
