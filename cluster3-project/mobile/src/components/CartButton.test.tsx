import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

const push = vi.fn();

vi.mock('@ionic/react', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@ionic/react')>()),
  useIonRouter: () => ({ push }),
}));

import CartButton from './CartButton';

describe('CartButton', () => {
  it('switches to the Cart tab without pushing onto the current tab', () => {
    // A forward push from a product page records /cart in the Home or Catalog
    // tab's history; returning to that tab then leaves its back button dead.
    render(<CartButton />);

    // ion-button has no ARIA role under jsdom (no shadow DOM), so it is found by its label.
    fireEvent.click(screen.getByLabelText('Cart'));

    expect(push).toHaveBeenCalledWith('/cart', 'none', 'push');
  });
});
