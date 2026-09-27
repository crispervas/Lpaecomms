/**
 * @file Tests for the Orders table's filtering and the Dashboard's recent orders.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { filterOrders, recentOrders } from '../src/renderer/lib/orderTable.mjs';

const ORDERS = [
  { id: '#LPA-10309', customer: 'Priya Nair', items: ['Frame 27" QHD'], status: 'delivered', placedOn: '2026-08-02' },
  { id: '#LPA-10311', customer: 'Ava Chen', items: ['Frame 27" QHD', 'Nexus Dock'], status: 'shipped', placedOn: '2026-08-04' },
  { id: '#LPA-10312', customer: 'Jordan Kim', items: ['Aria 87 Mechanical'], status: 'pending', placedOn: '2026-08-04' },
];

const ids = (orders) => orders.map((order) => order.id);

test('filters by status', () => {
  assert.deepEqual(ids(filterOrders(ORDERS, { query: '', status: 'shipped' })), ['#LPA-10311']);
  assert.equal(filterOrders(ORDERS, { query: '', status: 'all' }).length, 3);
});

test('searches the id, the customer and every item', () => {
  assert.deepEqual(ids(filterOrders(ORDERS, { query: '10312', status: 'all' })), ['#LPA-10312']);
  assert.deepEqual(ids(filterOrders(ORDERS, { query: 'priya', status: 'all' })), ['#LPA-10309']);
  assert.deepEqual(ids(filterOrders(ORDERS, { query: 'DOCK', status: 'all' })), ['#LPA-10311']);
});

test('combines search and status', () => {
  assert.deepEqual(filterOrders(ORDERS, { query: 'frame', status: 'pending' }), []);
});

test('lists the newest orders first, breaking date ties by id', () => {
  assert.deepEqual(ids(recentOrders(ORDERS, 2)), ['#LPA-10312', '#LPA-10311']);
});

test('does not reorder its input', () => {
  const before = ids(ORDERS);
  recentOrders(ORDERS, 3);
  assert.deepEqual(ids(ORDERS), before);
});
