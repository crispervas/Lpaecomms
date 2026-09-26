import { describe, expect, it } from 'vitest';
import { initials, validateProfile } from './profileRules';

const valid = { firstName: 'Jordan', email: 'jordan.kim@email.com', phone: '+1 (415) 555-0148' };

describe('validateProfile', () => {
  it('accepts a complete profile', () => {
    expect(validateProfile(valid)).toEqual({});
  });

  it('requires the name and email but not the phone', () => {
    expect(validateProfile({ firstName: ' ', email: '', phone: '' })).toEqual({
      firstName: 'Please enter your first name.',
      email: 'Please enter your email.',
    });
  });

  it('rejects a malformed email with the sign-in wording', () => {
    expect(validateProfile({ ...valid, email: 'jordan@email' })).toEqual({
      email: 'Please enter a valid email address.',
    });
  });

  it('accepts common phone formats', () => {
    for (const phone of ['0412 345 678', '+61 2 9876 5432', '415.555.0148']) {
      expect(validateProfile({ ...valid, phone })).toEqual({});
    }
  });

  it('rejects letters and too few digits in a phone number', () => {
    for (const phone of ['call me', '555-01']) {
      expect(validateProfile({ ...valid, phone })).toEqual({ phone: 'Please enter a valid phone number.' });
    }
  });

  it('reports length before format', () => {
    expect(validateProfile({ ...valid, phone: '1'.repeat(21) })).toEqual({
      phone: 'Please keep this to 20 characters or fewer.',
    });
  });
});

describe('initials', () => {
  it('takes the first letter of each name', () => {
    expect(initials('jordan', ' Kim')).toBe('JK');
  });

  it('copes with a missing family name', () => {
    expect(initials('Jordan', '')).toBe('J');
  });
});
