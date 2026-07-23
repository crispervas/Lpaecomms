/**
 * @file Health check tests.
 *
 * Covers the health endpoint at two levels: an integration test that drives the
 * assembled Express app with supertest against the real database, and a unit
 * test that exercises the controller with a fake model to cover the degraded
 * branch without needing to take the database down. The unit test also
 * demonstrates the constructor-injection design that makes controllers testable.
 *
 * The integration test requires the development database to be running
 * (`docker compose up -d`).
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { HealthController } from '../src/controllers/health.controller.js';

// Close the shared connection pool so the test process exits cleanly.
after(async () => {
  await prisma.$disconnect();
});

test('GET /v1/api/health returns 200 and reports the database as connected', async () => {
  const app = createApp();

  const response = await request(app).get('/v1/api/health');

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: 'ok', db: 'connected' });
});

test('HealthController.check reports 503 when the database is unreachable', async () => {
  // Fake model injected in place of the real one — no database involved.
  const controller = new HealthController({ isDatabaseReachable: async () => false });

  let statusCode;
  let payload;
  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(body) {
      payload = body;
    },
  };

  await controller.check({}, res);

  assert.equal(statusCode, 503);
  assert.deepEqual(payload, { status: 'degraded', db: 'unreachable' });
});
