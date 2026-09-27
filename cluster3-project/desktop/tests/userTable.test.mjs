/**
 * @file Tests for the Users table's filtering and avatar initials.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { filterUsers, initialsOf } from '../src/renderer/lib/userTable.mjs';

const USERS = [
  { name: 'Jordan Kim', email: 'jordan.kim@email.com', role: 'Customer' },
  { name: 'Sam Ortiz', email: 'sam.ortiz@lpaecomms.com', role: 'Admin' },
  { name: 'Ava Chen', email: 'ava.chen@email.com', role: 'Customer' },
];

const names = (users) => users.map((user) => user.name);

test('filters by role', () => {
  assert.deepEqual(names(filterUsers(USERS, { query: '', role: 'Admin' })), ['Sam Ortiz']);
  assert.equal(filterUsers(USERS, { query: '', role: 'All' }).length, 3);
});

test('searches name and email', () => {
  assert.deepEqual(names(filterUsers(USERS, { query: 'AVA', role: 'All' })), ['Ava Chen']);
  assert.deepEqual(names(filterUsers(USERS, { query: '@lpaecomms', role: 'All' })), ['Sam Ortiz']);
});

test('combines search and role', () => {
  assert.deepEqual(filterUsers(USERS, { query: 'sam', role: 'Customer' }), []);
});

test('derives initials from the first and last word', () => {
  assert.equal(initialsOf('Diego Fonseca'), 'DF');
  assert.equal(initialsOf('  mina  van der sato '), 'MS');
  assert.equal(initialsOf('Cher'), 'C');
  assert.equal(initialsOf('   '), '');
});
