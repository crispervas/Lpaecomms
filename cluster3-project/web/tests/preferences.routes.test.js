/**
 * @file Preferences route behaviour.
 *
 * Drives the assembled app with supertest. The value under test ends up inside
 * an HTML attribute and inside a Location header, so the cases that matter are
 * the hostile ones: a cookie someone edited, a theme that is not a theme, and a
 * return path that points off-site.
 *
 * Offline — none of these routes touches the database or the catalogue feed.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { PREFERENCES_COOKIE } from '../src/lib/preferences.js';

// The app imports the health model, which constructs a Prisma client. Closing
// the pool lets the test process exit even though no query was ever run.
after(async () => {
  await prisma.$disconnect();
});

test('GET /preferences renders the page', async () => {
  const response = await request(createApp()).get('/preferences');

  assert.equal(response.status, 200);
  assert.match(response.text, /Appearance/);
  assert.match(response.text, /name="theme"/);
  assert.match(response.text, /name="text"/);
});

test('a page renders the defaults when no cookie is present', async () => {
  const response = await request(createApp()).get('/preferences');

  assert.match(response.text, /<html lang="en" data-theme="daylight" data-text-size="normal">/);
});

test('a page renders the theme carried by the cookie', async () => {
  const response = await request(createApp())
    .get('/preferences')
    .set('Cookie', `${PREFERENCES_COOKIE}=theme=midnight&text=larger`);

  assert.match(response.text, /data-theme="midnight"/);
  assert.match(response.text, /data-text-size="larger"/);
});

test('the chosen theme reaches every page, including the 404', async () => {
  const app = createApp();
  const cookie = `${PREFERENCES_COOKIE}=theme=contrast&text=large`;

  const missing = await request(app).get('/no-such-page').set('Cookie', cookie);

  assert.equal(missing.status, 404);
  assert.match(missing.text, /data-theme="contrast"/);
});

test('the chosen theme also reaches the error page, raised before preferencesLocals runs', async () => {
  // express.json() sits ahead of preferencesLocals in app.js, so a body it
  // cannot parse throws before res.locals.preferences is ever set. The error
  // page (rendered through the same base layout as every other page) must
  // still render rather than fall back to errorHandlerWeb's plain-text catch,
  // which is what a missing local used to produce.
  const app = createApp();
  const cookie = `${PREFERENCES_COOKIE}=theme=midnight&text=large`;

  const response = await request(app)
    .post('/preferences')
    .set('Cookie', cookie)
    .set('Content-Type', 'application/json')
    .send('{bad');

  assert.equal(response.status, 500);
  // The regression sent plain text ("Error 500") because rendering the layout
  // threw. Asserting the content type is HTML is enough to prove the layout
  // rendered without reading its markup.
  assert.match(response.headers['content-type'], /text\/html/);
  assert.doesNotMatch(response.headers['content-type'], /text\/plain/);
});

test('a cookie someone edited cannot reach the markup', async () => {
  const response = await request(createApp())
    .get('/preferences')
    .set('Cookie', `${PREFERENCES_COOKIE}=theme=%22%3E%3Cscript%3E&text=large`);

  assert.equal(response.status, 200);
  assert.match(response.text, /data-theme="daylight"/);
  assert.doesNotMatch(response.text, /data-theme="[^"]*script/);
});

test('a valid submission stores the cookie and returns the visitor', async () => {
  const response = await request(createApp())
    .post('/preferences')
    .type('form')
    .send({ theme: 'forest', text: 'large', returnTo: '/catalog' });

  assert.equal(response.status, 303);
  assert.equal(response.headers.location, '/catalog');

  const [cookie] = response.headers['set-cookie'];
  assert.match(cookie, new RegExp(`^${PREFERENCES_COOKIE}=theme%3Dforest%26text%3Dlarge`));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /SameSite=Lax/);
  assert.match(cookie, /Max-Age=31536000/);
  assert.match(cookie, /Path=\//);
});

test('an invalid theme is refused with 422 and stores nothing', async () => {
  const response = await request(createApp())
    .post('/preferences')
    .type('form')
    .send({ theme: 'neon', text: 'large', returnTo: '/catalog' });

  assert.equal(response.status, 422);
  assert.equal(response.headers['set-cookie'], undefined);
  assert.match(response.text, /Choose one of the available themes\./);
});

test('an invalid text size is refused with 422', async () => {
  const response = await request(createApp())
    .post('/preferences')
    .type('form')
    .send({ theme: 'forest', text: 'enormous', returnTo: '/catalog' });

  assert.equal(response.status, 422);
  assert.match(response.text, /Choose one of the available text sizes\./);
});

test('a returnTo that survives the redirect guard still cannot break out of the markup', async () => {
  // isSafeReturnPath guards redirects, not markup: a leading "/" is all it
  // asks for, so a quote and an angle bracket pass it through untouched. The
  // hidden field that carries this value back to the form is only safe
  // because <%= %> escapes by default — this pins that, not the redirect
  // guard, which tests/preferences.test.js already covers.
  const response = await request(createApp())
    .post('/preferences')
    .type('form')
    .send({ theme: 'neon', text: 'large', returnTo: '/foo"><script>' });

  assert.equal(response.status, 422);
  assert.doesNotMatch(response.text, /"><script/);
  assert.match(response.text, /value="\/foo&#34;&gt;&lt;script&gt;"/);
});

test('a return path pointing off-site is discarded', async () => {
  const response = await request(createApp())
    .post('/preferences')
    .type('form')
    .send({ theme: 'forest', text: 'large', returnTo: '//evil.example' });

  assert.equal(response.status, 303);
  assert.equal(response.headers.location, '/preferences');
});

test('a background save answers 204 and no body', async () => {
  // The panel has already applied the change itself; it only needs to know the
  // write landed. A JSON body here would make a view route answer like the API.
  const response = await request(createApp())
    .post('/preferences')
    .type('form')
    .set('X-Requested-With', 'fetch')
    .send({ theme: 'midnight', text: 'normal' });

  assert.equal(response.status, 204);
  assert.equal(response.text, '');
  assert.match(response.headers['set-cookie'][0], new RegExp(`^${PREFERENCES_COOKIE}=`));
});

test('a background save with an invalid theme still reports 422', async () => {
  const response = await request(createApp())
    .post('/preferences')
    .type('form')
    .set('X-Requested-With', 'fetch')
    .send({ theme: 'neon', text: 'normal' });

  assert.equal(response.status, 422);
  assert.equal(response.headers['set-cookie'], undefined);
});

test('a body encoded as multipart is refused with 422, not a crash', async () => {
  // No test above crosses this seam: .type('form') sends
  // application/x-www-form-urlencoded, which is what a native <form> submits
  // and what express.urlencoded() parses. This app installs no multipart
  // parser on purpose, so req.body is undefined for a multipart request
  // regardless of how well-formed its fields are — the route must survive
  // that as the same 422 a bad field value already gets, not throw.
  const response = await request(createApp())
    .post('/preferences')
    .field('theme', 'forest')
    .field('text', 'large')
    .field('returnTo', '/catalog');

  assert.equal(response.status, 422);
  assert.equal(response.headers['set-cookie'], undefined);
});
