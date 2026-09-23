import { describe, expect, it } from 'vitest';
import { validateContact } from './contactRules';

const valid = { name: 'Ana', email: 'ana@example.com', message: 'Hello' };

describe('validateContact', () => {
  it('accepts a complete message', () => {
    expect(validateContact(valid)).toEqual({});
  });

  it('requires every field, ignoring surrounding whitespace', () => {
    expect(validateContact({ name: '  ', email: '', message: '\n' })).toEqual({
      name: 'Please enter your name.',
      email: 'Please enter your email.',
      message: 'Please enter a message.',
    });
  });

  it('rejects a malformed email', () => {
    expect(validateContact({ ...valid, email: 'ana@example' })).toEqual({
      email: 'Please enter a valid email address.',
    });
  });

  it('reports length before format, with the same wording as the web', () => {
    expect(validateContact({ ...valid, name: 'x'.repeat(101) })).toEqual({
      name: 'Please keep this to 100 characters or fewer.',
    });
  });
});
