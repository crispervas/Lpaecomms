// Applies an appearance choice the moment it is made, and saves it in the
// background.
//
// Progressive enhancement: the form works without any of this — it posts, the
// server stores the cookie and redirects. This only removes the round trip.
//
// The script writes state attributes and state classes, never a colour and
// never a layout value. What `data-theme="midnight"` looks like is decided in
// styles/less/abstracts/_themes.less and nowhere else.
(function () {
  const toggle = document.getElementById('appearance-toggle');
  const panel = document.getElementById('appearance-panel');
  if (!toggle || !panel) {
    return;
  }

  const form = panel.querySelector('[data-appearance-form]');
  const status = panel.querySelector('[data-appearance-status]');

  toggle.addEventListener('click', () => {
    // The stylesheet keeps the panel closed by default; this class is what
    // opens it, so the toggle's return value is the open state directly.
    const isOpen = panel.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(isOpen));
  });

  // A panel that stays open after the reader has moved on is a panel in the
  // way. Closing on an outside click costs nothing and does not trap focus.
  document.addEventListener('click', (event) => {
    if (panel.contains(event.target) || toggle.contains(event.target)) return;

    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !panel.classList.contains('is-open')) return;

    panel.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.focus();
  });

  if (!form) {
    return;
  }

  /**
   * Show a message when a save could not be stored.
   *
   * @param {string} message - What to tell the reader; empty clears the line.
   * @returns {void}
   */
  function report(message) {
    if (!status) return;

    status.textContent = message;
    status.classList.toggle('u-hidden', message === '');
  }

  /**
   * Bring every other copy of the appearance form into agreement after a
   * background save succeeds.
   *
   * `/preferences` renders this form twice — once in the header panel, once
   * on the page itself — so the two can never offer different options. Only
   * the panel's copy is bound above; the page's copy still submits normally.
   * Without this, a visitor who changes theme in the panel and then presses
   * the page copy's "Save appearance" would resubmit the page copy's stale
   * radio value and silently undo the choice that was just saved. Setting
   * `checked` directly does not dispatch a `change` event, so it cannot loop
   * back into this handler.
   *
   * @param {HTMLInputElement} control - The radio that was just changed.
   * @returns {void}
   */
  function syncOtherCopies(control) {
    document.querySelectorAll('[data-appearance-form]').forEach((otherForm) => {
      if (otherForm === form) return;

      const twin = otherForm.querySelector(
        `input[name="${control.name}"][value="${control.value}"]`,
      );
      if (twin) twin.checked = true;
    });
  }

  form.addEventListener('change', async (event) => {
    const control = event.target;
    if (control.name !== 'theme' && control.name !== 'text') return;

    // Applied first, so the change is visible whether or not the save lands.
    if (control.name === 'theme') {
      document.documentElement.dataset.theme = control.value;
    } else {
      document.documentElement.dataset.textSize = control.value;
    }

    report('');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        // Marks this as the background save, which the controller answers with
        // 204 rather than a redirect it would be pointless to follow.
        headers: { 'X-Requested-With': 'fetch' },
        // A bare FormData body is always sent as multipart/form-data by fetch,
        // no matter what headers say — and the server has no multipart parser,
        // on purpose, since nothing here ever needs one. URLSearchParams turns
        // the same fields into application/x-www-form-urlencoded instead, the
        // encoding express.urlencoded() already reads. Safe here because this
        // form is only radios and a hidden field, never a file input.
        body: new URLSearchParams(new FormData(form)),
      });

      if (response.ok) {
        syncOtherCopies(control);
      } else {
        report('That choice could not be saved. It will reset on your next visit.');
      }
    } catch {
      // Offline, or the server went away. The change is already applied; only
      // its persistence failed, and saying so is more useful than silence.
      report('That choice could not be saved. It will reset on your next visit.');
    }
  });
})();
