import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const push = vi.fn();

vi.mock('@ionic/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ionic/react')>()),
  useIonRouter: () => ({ push }),
}));

import ProductCard from './ProductCard';

const product = { id: 2, name: 'Blue Cap', priceAud: 20, imageUrl: '' };

describe('ProductCard navigation', () => {
  it('opens its product through the Ionic router as a forward push', () => {
    // A plain router push carries no direction, and Ionic's stack then leaves
    // the previous product page on top when both share /product/:id.
    render(
      <MemoryRouter>
        <ProductCard product={product} to="/home/product/2" />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('link'));

    expect(push).toHaveBeenCalledWith('/home/product/2', 'forward', 'push');
  });
});
