/**
 * @file Error-handling middleware tests.
 *
 * Covers the branch that splits failed requests by client: REST clients get
 * JSON, browsers get the rendered error page. The tests drive a minimal Express
 * app wired exactly like `createApp` — same view engine, same middleware order —
 * but with routes that throw on purpose, which the real app has none of.
 *
 * No database is involved, so these run without `docker compose up -d`.
 */

import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import request from 'supertest';

import { errorHandler, logErrors, wrapErrors } from '../src/config/errorHandler.js';
import { apiCorsHeaders } from '../src/config/apiCors.js';

/** Absolute path to `src`, so the test app resolves views the way `app.js` does. */
const srcDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Message thrown by the test routes, used to assert what reaches the client. */
const BOOM_MESSAGE = 'Deliberate failure for testing';

/**
 * Build an Express app whose only routes throw.
 *
 * Mirrors `createApp`'s view configuration and error-middleware order; the
 * throwing routes stand in for a controller that fails in production.
 *
 * @returns {import('express').Express} The configured app, not yet listening.
 */
const buildFailingApp = () => {
  const app = express();

  app.set('view engine', 'ejs');
  app.set('views', path.join(srcDir, 'views'));

  app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    next();
  });

  // Mirrors app.js: CORS applies to every /api response and must be mounted
  // ahead of the routes, not left to wrapErrors — this app has no routes.js,
  // so it is wired here directly.
  app.use('/api', apiCorsHeaders);

  app.get('/boom', () => {
    throw new Error(BOOM_MESSAGE);
  });

  app.get('/api/v1/boom', () => {
    throw new Error(BOOM_MESSAGE);
  });

  app.use(logErrors);
  app.use(wrapErrors);
  app.use(errorHandler);

  return app;
};

/** Silence the expected `logErrors` output so the test report stays readable. */
let originalConsoleError;
let originalNodeEnv;

beforeEach(() => {
  originalConsoleError = console.error;
  originalNodeEnv = process.env.NODE_ENV;
  console.error = () => {};
});

afterEach(() => {
  console.error = originalConsoleError;
  process.env.NODE_ENV = originalNodeEnv;
});

test('a failed browser request renders the HTML error page', async () => {
  const response = await request(buildFailingApp()).get('/boom');

  assert.equal(response.status, 500);
  assert.match(response.headers['content-type'], /text\/html/);
  assert.match(response.text, /Something went wrong/);
  // The shared chrome renders too, so the page is not a bare fragment.
  assert.match(response.text, /Back to home/);
});

test('a failed API request answers with JSON, never HTML', async () => {
  const response = await request(buildFailingApp()).get('/api/v1/boom');

  assert.equal(response.status, 500);
  assert.match(response.headers['content-type'], /application\/json/);
  assert.equal(response.body.error, 'Internal Server Error');
  assert.equal(response.body.url, '/api/v1/boom');
  assert.equal(response.body.method, 'GET');
});

test('outside production the error detail reaches both clients', async () => {
  process.env.NODE_ENV = 'development';
  const app = buildFailingApp();

  const web = await request(app).get('/boom');
  const api = await request(app).get('/api/v1/boom');

  assert.match(web.text, new RegExp(BOOM_MESSAGE));
  assert.ok(api.body.stack.includes(BOOM_MESSAGE));
});

test('production withholds the stack trace and the error message from clients', async () => {
  process.env.NODE_ENV = 'production';
  const app = buildFailingApp();

  const web = await request(app).get('/boom');
  const api = await request(app).get('/api/v1/boom');

  assert.doesNotMatch(web.text, new RegExp(BOOM_MESSAGE));
  assert.equal(api.body.stack, undefined);
  assert.doesNotMatch(JSON.stringify(api.body), new RegExp(BOOM_MESSAGE));
});

test('errorHandler delegates to Express once the response has started streaming', async () => {
  // A broken include partway through a render leaves headers already sent;
  // writing a second response would throw ERR_HTTP_HEADERS_SENT.
  const err = new Error('too late');
  const res = { headersSent: true };

  let forwarded;
  errorHandler(err, { originalUrl: '/boom', path: '/boom' }, res, (passed) => {
    forwarded = passed;
  });

  assert.equal(forwarded, err);
});

test('CORS headers are set for API errors only', async () => {
  const app = buildFailingApp();

  const api = await request(app).get('/api/v1/boom');
  const web = await request(app).get('/boom');

  assert.equal(api.headers['access-control-allow-origin'], '*');
  assert.equal(web.headers['access-control-allow-origin'], undefined);
});
