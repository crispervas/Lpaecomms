import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./client')>()),
  apiPost: vi.fn(),
}));

import { apiPost } from './client';
import { fieldErrors, sendContact } from './contact';

const mockedPost = vi.mocked(apiPost);

describe('sendContact', () => {
  beforeEach(() => {
    mockedPost.mockReset();
  });

  it('posts the three fields to /contact', async () => {
    mockedPost.mockResolvedValue({ ok: true, status: 202, data: { received: true }, error: null });
    const values = { name: 'Ana', email: 'ana@example.com', message: 'Hi' };

    const result = await sendContact(values);

    expect(mockedPost).toHaveBeenCalledWith('/contact', values);
    expect(result.ok).toBe(true);
  });
});

describe('fieldErrors', () => {
  it('maps known fields and keeps the first message for each', () => {
    expect(
      fieldErrors([
        { field: 'email', message: 'Bad email.' },
        { field: 'email', message: 'Second.' },
        { field: 'orderNumber', message: 'Not on this form.' },
        { message: 'No field.' },
      ]),
    ).toEqual({ email: 'Bad email.' });
  });

  it('returns no errors without a list', () => {
    expect(fieldErrors(undefined)).toEqual({});
  });
});
