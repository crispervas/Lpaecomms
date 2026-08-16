/**
 * @file Login and sign-up page tests.
 *
 * The page has two modes on one URL, and most of what can go wrong here is the
 * mode getting lost. The tabs are real links so the page works without
 * JavaScript, which means the mode has to survive a round trip: submit the
 * sign-up form badly and the answer must come back on the sign-up tab, with the
 * name still filled in. A client-only tab would drop you back on Log in and
 * throw the typing away.
 *
 * Nothing here authenticates anyone. There is no user model yet, and the POST
 * handler says so; these tests pin that it keeps saying so rather than
 * appearing to sign someone in.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';

// The app imports the shared Prisma client, which builds a connection pool at
// import time. Closing it lets the test process exit instead of hanging.
after(async () => {
  await prisma.$disconnect();
});

test('the login page opens on the log in tab', async () => {
  const response = await request(createApp()).get('/login');

  assert.equal(response.status, 200);
  assert.match(response.text, /Welcome back/);
  assert.match(response.text, /<input[^>]*name="email"/);
  assert.match(response.text, /<input[^>]*name="password"/);
});

test('logging in does not ask for a name', async () => {
  const response = await request(createApp()).get('/login');

  assert.doesNotMatch(response.text, /<input[^>]*name="name"/);
});

test('the sign-up tab renders its own form', async () => {
  const response = await request(createApp()).get('/login?tab=signup');

  assert.equal(response.status, 200);
  assert.match(response.text, /Create your account/);
  assert.match(response.text, /<input[^>]*name="name"/);
});

test('the tabs are links, so they work without JavaScript', async () => {
  const response = await request(createApp()).get('/login');

  // Rendered as anchors rather than buttons on purpose: with no script, a
  // button switches nothing and the sign-up form becomes unreachable.
  assert.match(response.text, /<a[^>]*href="\/login"[^>]*>[\s\S]*?Log in/);
  assert.match(response.text, /<a[^>]*href="\/login\?tab=signup"/);
});

test('an unrecognised tab falls back to logging in', async () => {
  const response = await request(createApp()).get('/login?tab=administrator');

  assert.equal(response.status, 200);
  assert.match(response.text, /Welcome back/);
  assert.doesNotMatch(response.text, /<input[^>]*name="name"/);
});

test('a repeated tab parameter does not break the page', async () => {
  // Express hands back an array when a parameter repeats, which is not a string
  // and matches no mode.
  const response = await request(createApp()).get('/login?tab=signup&tab=login');

  assert.equal(response.status, 200);
  assert.match(response.text, /Welcome back/);
});

test('an empty log in is rejected field by field', async () => {
  const response = await request(createApp())
    .post('/login')
    .type('form')
    .send({ mode: 'login', email: '', password: '' });

  assert.equal(response.status, 422);
  assert.match(response.text, /Please enter your email\./);
  assert.match(response.text, /Please enter your password\./);
});

test('a rejected sign-up comes back on the sign-up tab', async () => {
  const response = await request(createApp())
    .post('/login')
    .type('form')
    .send({ mode: 'signup', name: 'Jordan Kim', email: 'jordan@', password: 'correct-horse' });

  assert.equal(response.status, 422);
  // The whole reason the mode is a form field and not just a query string.
  assert.match(response.text, /Create your account/);
  assert.match(response.text, /<input[^>]*name="name"/);
  assert.match(response.text, /value="Jordan Kim"/);
});

test('a sign-up password must clear the minimum', async () => {
  const response = await request(createApp())
    .post('/login')
    .type('form')
    .send({ mode: 'signup', name: 'Jordan Kim', email: 'jordan@example.com', password: 'short' });

  assert.equal(response.status, 422);
  assert.match(response.text, /8 characters/);
});

test('a short password is accepted when logging in', async () => {
  const response = await request(createApp())
    .post('/login')
    .type('form')
    .send({ mode: 'login', email: 'jordan@example.com', password: 'short' });

  assert.equal(response.status, 200);
});

test('the password is never echoed back into the page', async () => {
  const response = await request(createApp())
    .post('/login')
    .type('form')
    .send({ mode: 'login', email: 'jordan@', password: 'sup3r-s3cret-value' });

  // Re-rendering the field with its value would put the password in the HTML,
  // where it reaches the browser cache, any proxy log, and view-source.
  assert.equal(response.status, 422);
  assert.doesNotMatch(response.text, /sup3r-s3cret-value/);
  // The address is handed back, so only the password is being withheld.
  assert.match(response.text, /value="jordan@"/);
});

test('an unknown mode is not taken at its word', async () => {
  const response = await request(createApp())
    .post('/login')
    .type('form')
    .send({ mode: 'administrator', email: 'jordan@example.com', password: 'hunter2!' });

  // `mode` arrives from the client like any other field.
  assert.equal(response.status, 200);
  assert.match(response.text, /Welcome back/);
});

test('a valid submission still admits there is no authentication', async () => {
  const response = await request(createApp())
    .post('/login')
    .type('form')
    .send({ mode: 'login', email: 'jordan@example.com', password: 'hunter2!' });

  assert.equal(response.status, 200);
  assert.match(response.text, /not available yet/i);
  // Nothing was signed in, so nothing may suggest it was.
  assert.doesNotMatch(response.text, /Signed in|Welcome, Jordan/);
});

test('the form opts into inline validation', async () => {
  const response = await request(createApp()).get('/login');

  // form-validation.js only touches forms carrying this attribute.
  assert.match(response.text, /<form[^>]*data-validate/);
});

test('the password field keeps its whitespace rule in the markup', async () => {
  const response = await request(createApp()).get('/login');
  const field = response.text.match(/<input[^>]*name="password"[^>]*>/)[0];

  // Without this the script trims and the server does not, so a password of
  // spaces is empty to one of them and valid to the other.
  assert.match(field, /data-preserve-whitespace/);
  assert.match(field, /type="password"/);
});

test('the page carries no class from the retired palette', async () => {
  const response = await request(createApp()).get('/login');

  assert.doesNotMatch(response.text, /slate-/);
  assert.doesNotMatch(response.text, /amber-/);
});
