/**
 * @file Validation middleware tests.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';

import { validate } from '../src/middlewares/validate.js';

const run = (mw, req) => new Promise((resolve) => mw(req, {}, resolve));

test('valid input is parsed, coerced and undeclared keys are dropped', async () => {
  const mw = validate({
    params: z.object({ id: z.coerce.number().int().positive() }),
    body: z.object({ name: z.string() }),
  });
  const req = { params: { id: '3' }, query: {}, body: { name: 'A', status: 9, created: {} } };
  const err = await run(mw, req);
  assert.equal(err, undefined);
  assert.equal(req.valid.params.id, 3);
  assert.deepEqual(req.body, { name: 'A' });
});

test('invalid input becomes a 400 with one entry per field', async () => {
  const mw = validate({ body: z.object({ name: z.string().min(1), price: z.number() }) });
  const err = await run(mw, { params: {}, query: {}, body: { name: '' } });
  assert.equal(err.output.statusCode, 400);
  assert.deepEqual(err.data.details.map((d) => d.field).sort(), ['name', 'price']);
});
