/**
 * @file Contact API tests.
 *
 * The endpoint applies the web contact form's own rules, so these tests pin
 * the JSON contract rather than re-testing every rule: acceptance, the
 * field-tagged 422, and the 400s for bodies that are not an object.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

after(async () => {
  await prisma.$disconnect();
});

test('POST /api/v1/contact accepts a valid message', async () => {
  const response = await request(createApp())
    .post('/api/v1/contact')
    .send({ name: 'Ana', email: 'ana@example.com', message: 'Hello there' });

  assert.equal(response.status, 202);
  assert.deepEqual(response.body, { received: true });
});

test('POST /api/v1/contact names every missing required field', async () => {
  const response = await request(createApp()).post('/api/v1/contact').send({});

  assert.equal(response.status, 422);
  assert.equal(response.body.message, 'Some fields need attention.');
  assert.deepEqual(response.body.errors, [
    { field: 'name', message: 'Please enter your name.' },
    { field: 'email', message: 'Please enter your email.' },
    { field: 'message', message: 'Please enter a message.' },
  ]);
});

test('POST /api/v1/contact rejects a malformed email and order number', async () => {
  const response = await request(createApp())
    .post('/api/v1/contact')
    .send({ name: 'Ana', email: 'nope', orderNumber: '123', message: 'Hi' });

  assert.equal(response.status, 422);
  assert.deepEqual(response.body.errors, [
    { field: 'email', message: 'Please enter a valid email address.' },
    { field: 'orderNumber', message: 'Order numbers look like LPA-00248.' },
  ]);
});

test('POST /api/v1/contact answers 400 for a body that is not an object', async () => {
  const array = await request(createApp()).post('/api/v1/contact').send([1, 2]);
  const none = await request(createApp()).post('/api/v1/contact');

  assert.equal(array.status, 400);
  assert.equal(none.status, 400);
  assert.equal(array.body.message, 'Send the message as a JSON object.');
});
