import { describe, expect, it } from 'vitest';
import {
  cartProductFromDetail,
  cartReducer,
  cartTotals,
  clampQuantity,
  MAX_QUANTITY,
  parseStoredCart,
  serialiseCart,
  type CartItem,
} from './cart';

const cap = { id: 2, name: 'Blue Cap', priceAud: 20, imageUrl: 'https://img.test/cap.jpg' };
const shoe = { id: 5, name: 'Runner', priceAud: 19.99, imageUrl: '' };

describe('clampQuantity', () => {
  it.each([
    [0, 1],
    [-4, 1],
    [2.7, 2],
    [150, MAX_QUANTITY],
    [Number.NaN, 1],
  ])('%s becomes %s', (input, expected) => {
    expect(clampQuantity(input)).toBe(expected);
  });
});

describe('cartReducer', () => {
  it('adds a new line', () => {
    expect(cartReducer([], { type: 'add', product: cap, quantity: 2 })).toEqual([{ ...cap, quantity: 2 }]);
  });

  it('merges an add into the existing line and refreshes its snapshot', () => {
    const renamed = { ...cap, name: 'Blue Cap v2', priceAud: 22 };

    const items = cartReducer([{ ...cap, quantity: 2 }], { type: 'add', product: renamed, quantity: 3 });

    expect(items).toEqual([{ ...renamed, quantity: 5 }]);
  });

  it('never lets a line pass the maximum', () => {
    const items = cartReducer([{ ...cap, quantity: 98 }], { type: 'add', product: cap, quantity: 5 });

    expect(items[0].quantity).toBe(MAX_QUANTITY);
  });

  it('sets a quantity within the limits and ignores an unknown id', () => {
    const start: CartItem[] = [{ ...cap, quantity: 2 }];

    expect(cartReducer(start, { type: 'setQuantity', id: 2, quantity: 0 })[0].quantity).toBe(1);
    expect(cartReducer(start, { type: 'setQuantity', id: 99, quantity: 7 })).toEqual(start);
  });

  it('removes a line and clears the cart', () => {
    const start: CartItem[] = [
      { ...cap, quantity: 1 },
      { ...shoe, quantity: 1 },
    ];

    expect(cartReducer(start, { type: 'remove', id: 2 })).toEqual([{ ...shoe, quantity: 1 }]);
    expect(cartReducer(start, { type: 'clear' })).toEqual([]);
  });

  it('hydrates by replaying lines added before the stored cart loaded', () => {
    const addedEarly: CartItem[] = [
      { ...cap, quantity: 1 },
      { ...shoe, quantity: 2 },
    ];

    const items = cartReducer(addedEarly, { type: 'hydrate', stored: [{ ...cap, quantity: 4 }] });

    expect(items).toEqual([
      { ...cap, quantity: 5 },
      { ...shoe, quantity: 2 },
    ]);
  });
});

describe('cartTotals', () => {
  it('counts units and sums to the cent', () => {
    expect(
      cartTotals([
        { ...shoe, quantity: 3 },
        { ...cap, priceAud: 0.1, quantity: 1 },
      ]),
    ).toEqual({ count: 4, subtotalAud: 60.07 });
  });

  it('is zero for an empty cart', () => {
    expect(cartTotals([])).toEqual({ count: 0, subtotalAud: 0 });
  });
});

describe('parseStoredCart', () => {
  it('reads what serialiseCart wrote', () => {
    const items: CartItem[] = [{ ...cap, quantity: 3 }];

    expect(parseStoredCart(serialiseCart(items))).toEqual(items);
  });

  it.each([null, '', 'not json', '{"a":1}'])('starts empty for %s', (raw) => {
    expect(parseStoredCart(raw)).toEqual([]);
  });

  it('drops invalid lines, defaults the image, clamps and merges duplicates', () => {
    const raw = JSON.stringify([
      { id: 'x', name: 'Bad', priceAud: 1, quantity: 1 },
      { id: 2, name: 'Blue Cap', priceAud: -3, quantity: 1 },
      { id: 5, name: 'Runner', priceAud: 19.99, quantity: 500 },
      { id: 7, name: 'Hat', priceAud: 9, quantity: 2 },
      { id: 7, name: 'Hat', priceAud: 9, quantity: 3 },
    ]);

    expect(parseStoredCart(raw)).toEqual([
      { id: 5, name: 'Runner', priceAud: 19.99, imageUrl: '', quantity: MAX_QUANTITY },
      { id: 7, name: 'Hat', priceAud: 9, imageUrl: '', quantity: 5 },
    ]);
  });
});

describe('cartProductFromDetail', () => {
  it('takes the first image as the line image', () => {
    expect(
      cartProductFromDetail({
        id: 2,
        name: 'Blue Cap',
        category: { name: 'Clothes', slug: 'clothes' },
        priceAud: 20,
        description: '',
        imageUrls: ['https://img.test/cap.jpg', 'https://img.test/cap2.jpg'],
      }),
    ).toEqual(cap);
  });
});
