/**
 * @file Contact page tests.
 *
 * The page reads no model, so nothing here is stubbed. Two things are worth
 * knowing before changing any of it:
 *
 * The server is the only validator that counts. `public/js/contact-form.js`
 * makes the same checks earlier, but a submission that reaches POST /contact
 * must be judged here regardless of what ran in the browser — every assertion
 * about rejection below posts directly, with no client involved.
 *
 * The attribute assertions are the seam between the two. The template renders
 * each field's limit as native HTML and each message into a `data-error-*`
 * attribute, and the browser script reads them back out. Drop an attribute and
 * the server still rejects correctly while the inline error goes blank, which
 * is why they are pinned rather than treated as markup detail.
 */

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

import { createApp } from '../src/app.js';
import { prisma } from '../src/lib/prisma.js';
import { CONTACT_FIELDS, toHtmlPattern } from '../src/lib/contactValidation.js';

// The app imports the shared Prisma client, which builds a connection pool at
// import time. Closing it lets the test process exit instead of hanging.
after(async () => {
  await prisma.$disconnect();
});

/** A submission that passes every rule. */
const valid = {
  name: 'Jordan Kim',
  email: 'jordan@example.com',
  orderNumber: '',
  message: 'My keyboard arrived with a dead key.',
};

test('the Contact page opens with the mockup heading', async () => {
  const response = await request(createApp()).get('/contact');

  assert.equal(response.status, 200);
  assert.match(response.text, /We're here to help/);
  assert.match(response.text, /<h1[^>]*>\s*Get in touch/);
});

test('the page offers the three contact channels', async () => {
  const response = await request(createApp()).get('/contact');

  assert.match(response.text, /Email support/);
  assert.match(response.text, /Phone/);
  assert.match(response.text, /Studio/);
});

test('the workshop section places the studio where the map points', async () => {
  const response = await request(createApp()).get('/contact');

  // contact-map.js centres on -27.9685, 153.4144 — Australia Fair, Southport,
  // which is also one of the catalogue's store locations. The mockup says San
  // Francisco; following it would put the address a hemisphere from the pin.
  assert.match(response.text, /Visit the workshop/);
  assert.match(response.text, /Southport/);
  assert.doesNotMatch(response.text, /San Francisco/);
});

test('the map container survives the rebuild', async () => {
  const response = await request(createApp()).get('/contact');

  // contact-map.js finds the map by this id and renders nothing without it.
  assert.match(response.text, /id="contact-map"/);
});

test('every field states its own limit in the markup', async () => {
  const response = await request(createApp()).get('/contact');

  for (const [field, rules] of Object.entries(CONTACT_FIELDS)) {
    const tag = response.text.match(new RegExp(`<(?:input|textarea)[^>]*name="${field}"[^>]*>`));

    assert.ok(tag, `${field} renders a form control`);
    assert.match(tag[0], new RegExp(`maxlength="${rules.maxLength}"`), `${field} caps its length`);
    if (rules.required) {
      assert.match(tag[0], /\brequired\b/, `${field} is marked required`);
    } else {
      assert.doesNotMatch(tag[0], /\brequired\b/, `${field} is not marked required`);
    }
  }
});

test('every field carries its messages for the browser script to read', async () => {
  const response = await request(createApp()).get('/contact');

  for (const [field, rules] of Object.entries(CONTACT_FIELDS)) {
    const tag = response.text.match(new RegExp(`<(?:input|textarea)[^>]*name="${field}"[^>]*>`));

    assert.match(tag[0], /data-error-too-long="/, `${field} carries its too-long message`);
    if (rules.required) {
      assert.match(tag[0], /data-error-required="/, `${field} carries its required message`);
    }
    if (rules.pattern) {
      assert.match(tag[0], /data-error-invalid="/, `${field} carries its invalid message`);
    }
  }
});

test('a field with a shape hands that shape to the browser', async () => {
  const response = await request(createApp()).get('/contact');

  // Rendered from the server's own regular expression rather than retyped, so
  // the browser rejects exactly what the server would.
  for (const [field, rules] of Object.entries(CONTACT_FIELDS)) {
    if (!rules.pattern) continue;

    const tag = response.text.match(new RegExp(`<input[^>]*name="${field}"[^>]*>`))[0];
    const expected = toHtmlPattern(rules.pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    assert.match(tag, new RegExp(`pattern="${expected}"`), `${field} renders its pattern`);
  }
});

test('an empty submission is rejected field by field', async () => {
  const response = await request(createApp())
    .post('/contact')
    .type('form')
    .send({ name: '', email: '', orderNumber: '', message: '' });

  assert.equal(response.status, 422);
  assert.match(response.text, /Please enter your name\./);
  assert.match(response.text, /Please enter your email\./);
  assert.match(response.text, /Please enter a message\./);
});

test('a rejected submission hands back what was typed', async () => {
  const response = await request(createApp())
    .post('/contact')
    .type('form')
    .send({ ...valid, email: 'jordan@' });

  assert.equal(response.status, 422);
  assert.match(response.text, /value="Jordan Kim"/);
  assert.match(response.text, /value="jordan@"/);
  assert.match(response.text, /My keyboard arrived with a dead key\./);
});

test('a field in error is wired to its message for assistive technology', async () => {
  const response = await request(createApp())
    .post('/contact')
    .type('form')
    .send({ ...valid, email: 'jordan@' });

  // Without both halves a screen reader reaches the field, announces nothing
  // unusual, and the reader never learns why the form came back.
  const field = response.text.match(/<input[^>]*name="email"[^>]*>/)[0];

  assert.match(field, /aria-invalid="true"/);
  assert.match(field, /aria-describedby="email-error"/);
  assert.match(response.text, /id="email-error"/);
});

test('a field that passed is not marked invalid', async () => {
  const response = await request(createApp())
    .post('/contact')
    .type('form')
    .send({ ...valid, email: 'jordan@' });

  const field = response.text.match(/<input[^>]*name="name"[^>]*>/)[0];

  assert.doesNotMatch(field, /aria-invalid="true"/);
});

test('the order number may be left out', async () => {
  const response = await request(createApp()).post('/contact').type('form').send(valid);

  assert.equal(response.status, 200);
  assert.match(response.text, /we have received your message/i);
});

test('an order number that is filled in is checked', async () => {
  const response = await request(createApp())
    .post('/contact')
    .type('form')
    .send({ ...valid, orderNumber: '248' });

  assert.equal(response.status, 422);
  assert.match(response.text, /Order numbers look like LPA-00248\./);
});

test('an accepted submission clears the form', async () => {
  const response = await request(createApp())
    .post('/contact')
    .type('form')
    .send({ ...valid, orderNumber: 'LPA-00248' });

  assert.equal(response.status, 200);
  // Re-offering the sent message invites sending it twice.
  assert.doesNotMatch(response.text, /My keyboard arrived with a dead key\./);
});

test('the confirmation is announced rather than only shown', async () => {
  const response = await request(createApp()).post('/contact').type('form').send(valid);

  assert.match(response.text, /role="status"/);
});

test('an oversized message is refused', async () => {
  const response = await request(createApp())
    .post('/contact')
    .type('form')
    .send({ ...valid, message: 'x'.repeat(CONTACT_FIELDS.message.maxLength + 1) });

  // maxlength stops this in a browser; nothing stops a direct POST but this.
  assert.equal(response.status, 422);
  assert.match(response.text, /2000 characters/);
});

test('the page carries no class from the retired palette', async () => {
  const response = await request(createApp()).get('/contact');

  assert.doesNotMatch(response.text, /slate-/);
  assert.doesNotMatch(response.text, /green-/);
});
