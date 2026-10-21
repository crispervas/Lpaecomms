/**
 * @file Tests for the user form's rules, which mirror the API's user schema
 * (web/src/resources/user.resource.js).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { validateUser } from '../src/renderer/lib/userRules.mjs';

const form = (overrides = {}) => ({
  firstName: ' Ada ', lastName: 'Lovelace', email: ' Ada@Example.com ', password: 'Secret123',
  roleId: '2', genderId: '1', documentTypeId: '1', document: '', phone: ' +61 400 ', address: '',
  ...overrides,
});

test('accepts a new user and normalises it', () => {
  assert.deepEqual(validateUser(form(), { creating: true }), {
    errors: {},
    record: {
      firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com', password: 'Secret123',
      roleId: 2, genderId: 1, documentTypeId: 1, document: '', phone: '+61 400', address: '',
    },
  });
});

test('a new user needs a strong password', () => {
  assert.equal(validateUser(form({ password: '' }), { creating: true }).errors.password, 'Please enter a password.');
  assert.equal(validateUser(form({ password: 'short1' }), { creating: true }).errors.password, 'Use at least 8 characters.');
  assert.equal(validateUser(form({ password: 'longenough' }), { creating: true }).errors.password, 'Include a digit.');
  assert.equal(validateUser(form({ password: '12345678' }), { creating: true }).errors.password, 'Include a letter.');
  assert.equal(validateUser(form({ password: 'a1'.repeat(37) }), { creating: true }).errors.password, 'Please keep this to 72 characters or fewer.');
});

test('an edit may leave the password blank, but a typed one must be strong', () => {
  assert.deepEqual(validateUser(form({ password: '' }), { creating: false }).errors, {});
  assert.equal(validateUser(form({ password: 'weak' }), { creating: false }).errors.password, 'Use at least 8 characters.');
});

test('requires the names, a valid email and every lookup', () => {
  const { errors, record } = validateUser(
    form({ firstName: '', lastName: ' ', email: 'nope', roleId: '', genderId: '', documentTypeId: '' }),
    { creating: true },
  );
  assert.equal(record, null);
  assert.deepEqual(errors, {
    firstName: 'Please enter a first name.',
    lastName: 'Please enter a last name.',
    email: 'Please enter a valid email address.',
    roleId: 'Please choose a role.',
    genderId: 'Please choose a gender.',
    documentTypeId: 'Please choose a document type.',
  });
});

test('caps every text field at the API limit', () => {
  const { errors } = validateUser(
    form({ firstName: 'a'.repeat(101), document: 'd'.repeat(51), phone: '1'.repeat(31), address: 'x'.repeat(301) }),
    { creating: true },
  );
  assert.equal(errors.firstName, 'Please keep this to 100 characters or fewer.');
  assert.equal(errors.document, 'Please keep this to 50 characters or fewer.');
  assert.equal(errors.phone, 'Please keep this to 30 characters or fewer.');
  assert.equal(errors.address, 'Please keep this to 300 characters or fewer.');
});
