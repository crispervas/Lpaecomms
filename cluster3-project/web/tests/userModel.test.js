/**
 * @file UserModel tests: hashing, omission of the password, active status.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';

import { UserModel } from '../src/models/user.model.js';
import userResource from '../src/resources/user.resource.js';
import { createFakePrisma } from './helpers/fakePrisma.js';

test('create hashes the password and activates the user', async () => {
  const prisma = createFakePrisma({ user: { create: (a) => ({ id: 1, ...a.data }) } });
  await new UserModel(prisma, userResource).create({
    email: 'a@b.co', password: 'Secret123!', name: 'A', lastName: 'B', roleId: 1, genderId: 1, documentTypeId: 1,
  });
  const { data, omit } = prisma.calls[0].args;
  assert.notEqual(data.password, 'Secret123!');
  assert.ok(await bcrypt.compare('Secret123!', data.password));
  assert.equal(data.status, 1);
  assert.equal(data.statusName, 'ACTIVE');
  assert.deepEqual(omit, { password: true });
});

test('update rehashes only when a password is sent', async () => {
  const prisma = createFakePrisma({ user: { findFirst: { id: 1 }, update: (a) => a.data } });
  const model = new UserModel(prisma, userResource);
  await model.update(1, { name: 'Z' });
  assert.equal(prisma.calls.at(-1).args.data.password, undefined);
  await model.update(1, { password: 'Another123!' });
  assert.ok(await bcrypt.compare('Another123!', prisma.calls.at(-1).args.data.password));
});

test('soft delete sets deletedAt as well as status', async () => {
  const prisma = createFakePrisma({ user: { findFirst: { id: 4 }, update: {} } });
  await new UserModel(prisma, userResource).softDelete(4, {});
  const data = prisma.calls.at(-1).args.data;
  assert.equal(data.status, 0);
  assert.ok(data.deletedAt instanceof Date);
});

test('the user resource rejects a weak password', () => {
  assert.equal(userResource.createSchema.shape.password.safeParse('short').success, false);
  assert.equal(userResource.createSchema.shape.password.safeParse('longenoughbutnodigit').success, false);
});
