/**
 * @file Audit middleware tests.
 *
 * Pins the clock so serverDate/serverTime/unixTime are exact, and checks the
 * two properties the audit block exists for: it is computed per request, and
 * it records who acted.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { makeAudit } from '../src/middlewares/audit.js';

// 2026-09-27T02:30:15Z is 12:30:15 in Brisbane (UTC+10, no DST).
const fixed = new Date('2026-09-27T02:30:15Z');
const { createTime, updateTime } = makeAudit({ now: () => fixed, timeZone: 'Australia/Brisbane' });

const run = (mw, req) => new Promise((resolve) => mw(req, {}, resolve)).then(() => req);

test('createTime stamps the body with server time and the actor', async () => {
  const req = await run(createTime, {
    time: '2026-09-27T02:30:14.000Z',
    clientTime: undefined,
    user: { id: 7, role: 'ADMIN' },
    body: { name: 'Lamps' },
  });
  assert.deepEqual(req.body.created, {
    client: '2026-09-27T02:30:14.000Z',
    server: '2026-09-27T02:30:14.000Z',
    serverDate: '2026-09-27',
    serverTime: '12:30:15',
    unixTime: 1790476215,
    user: 7,
    role: 'ADMIN',
  });
  assert.equal(req.body.unixTime, 1790476215);
});

test('without a session the actor is null and the client time is kept', async () => {
  const req = await run(updateTime, { time: 't', clientTime: 'c', body: {} });
  assert.equal(req.body.updated.user, null);
  assert.equal(req.body.updated.role, null);
  assert.equal(req.body.updated.client, 'c');
});

test('a request without a body still gets a stamp', async () => {
  const req = await run(updateTime, { time: 't' });
  assert.equal(req.body.updated.server, 't');
});

test('the stamp is computed per call, not at module load', async () => {
  let current = new Date('2026-01-01T00:00:00Z');
  const audit = makeAudit({ now: () => current, timeZone: 'UTC' });
  const first = await run(audit.createTime, { time: 't', body: {} });
  current = new Date('2026-01-08T00:00:00Z');
  const second = await run(audit.createTime, { time: 't', body: {} });
  assert.notEqual(first.body.created.serverDate, second.body.created.serverDate);
});
