/**
 * @file Sample orders shown by the Orders preview and the Dashboard.
 *
 * The API has no orders endpoint yet, so both screens read the desktop
 * mockup's orders from here — one list, so the Dashboard's "Recent orders" can
 * never disagree with the Orders table. Replace these with calls through
 * window.api once the endpoint exists; the screens only depend on the shape
 * below.
 */

/**
 * Every order, newest first.
 *
 * @type {ReadonlyArray<Readonly<{id: string, customer: string, placedOn: string,
 *   items: ReadonlyArray<string>, total: number,
 *   status: 'pending'|'shipped'|'delivered'|'cancelled'}>>}
 *   `placedOn` is "YYYY-MM-DD"; `total` is whole dollars, as in the mockup.
 */
export const SAMPLE_ORDERS = Object.freeze(
  [
    { id: '#LPA-10312', customer: 'Jordan Kim', placedOn: '2026-08-05', items: ['Aria 87 Mechanical'], total: 149, status: 'pending' },
    { id: '#LPA-10311', customer: 'Ava Chen', placedOn: '2026-08-04', items: ['Frame 27" QHD', 'Nexus Dock'], total: 428, status: 'shipped' },
    { id: '#LPA-10310', customer: 'Marcus Lee', placedOn: '2026-08-03', items: ['Nexus 12-in-1 Dock'], total: 99, status: 'delivered' },
    { id: '#LPA-10309', customer: 'Priya Nair', placedOn: '2026-08-02', items: ['Frame 27" QHD'], total: 329, status: 'delivered' },
    { id: '#LPA-10308', customer: 'Diego Fonseca', placedOn: '2026-08-01', items: ['Glide X Wireless'], total: 79, status: 'cancelled' },
    { id: '#LPA-10307', customer: 'Mina Sato', placedOn: '2026-07-31', items: ['Cadence Pro ANC'], total: 189, status: 'delivered' },
    { id: '#LPA-10306', customer: 'Rina Alvarez', placedOn: '2026-07-30', items: ['Aria 65 Compact'], total: 129, status: 'shipped' },
    { id: '#LPA-10305', customer: 'Sam Ortiz', placedOn: '2026-07-29', items: ['Lucid 4K Webcam'], total: 119, status: 'pending' },
  ].map((order) => Object.freeze({ ...order, items: Object.freeze(order.items) })),
);
