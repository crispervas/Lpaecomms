import { describe, expect, it } from 'vitest';
import { authFields, validateAuth } from './authRules';

const blank = { name: '', email: '', password: '' };

describe('authFields', () => {
  it('asks for a name only when signing up', () => {
    expect(authFields('login')).toEqual(['email', 'password']);
    expect(authFields('signup')).toEqual(['name', 'email', 'password']);
  });
});

describe('validateAuth — login', () => {
  it('requires email and password with the web wording', () => {
    expect(validateAuth('login', blank)).toEqual({
      email: 'Please enter your email.',
      password: 'Please enter your password.',
    });
  });

  it('ignores the name and accepts a short password', () => {
    expect(validateAuth('login', { name: '', email: 'ana@example.com', password: 'x' })).toEqual({});
  });

  it('rejects a malformed email and an overlong password', () => {
    expect(validateAuth('login', { name: '', email: 'ana@', password: 'p'.repeat(129) })).toEqual({
      email: 'Please enter a valid email address.',
      password: 'Please keep this to 128 characters or fewer.',
    });
  });
});

describe('validateAuth — signup', () => {
  it('requires a name and chooses its own password wording', () => {
    expect(validateAuth('signup', blank)).toEqual({
      name: 'Please enter your name.',
      email: 'Please enter your email.',
      password: 'Please choose a password.',
    });
  });

  it('wants at least eight characters', () => {
    expect(validateAuth('signup', { name: 'Ana', email: 'ana@example.com', password: 'short' })).toEqual({
      password: 'Use at least 8 characters.',
    });
  });

  it('never trims a password: spaces count as typed', () => {
    expect(validateAuth('signup', { name: 'Ana', email: 'ana@example.com', password: '   ' })).toEqual({
      password: 'Use at least 8 characters.',
    });
    expect(validateAuth('signup', { name: 'Ana', email: 'ana@example.com', password: ' secret12 ' })).toEqual({});
  });

  it('trims the name and email before checking them', () => {
    expect(validateAuth('signup', { name: '   ', email: '  ana@example.com  ', password: 'longenough' })).toEqual({
      name: 'Please enter your name.',
    });
  });
});
