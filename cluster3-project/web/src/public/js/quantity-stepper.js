/**
 * @file The − / + buttons of any form marked `data-quantity-stepper`.
 *
 * A convenience over the number field beside them, which works on its own:
 * the buttons render hidden, and revealing them is the first thing this script
 * does, so a visitor without it never sees a control that does nothing. The
 * range comes from the field's own `min` and `max`, and the server clamps
 * whatever arrives regardless. Writes the value and the `u-hidden` class only.
 */
document.querySelectorAll('form[data-quantity-stepper]').forEach((form) => {
  const field = form.querySelector('input[type="number"]');
  const buttons = [...form.querySelectorAll('button[data-step]')];
  if (!field || buttons.length === 0) return;

  const min = Number(field.min) || 1;
  const max = Number(field.max) || Infinity;

  /**
   * Disable whichever button would leave the range.
   *
   * @returns {void}
   */
  const sync = () => {
    const value = Number(field.value);
    buttons.forEach((button) => {
      const step = Number(button.dataset.step);
      button.disabled = step < 0 ? value <= min : value >= max;
    });
  };

  buttons.forEach((button) => {
    button.classList.remove('u-hidden');
    button.addEventListener('click', () => {
      // An emptied or mistyped field restarts from the minimum.
      const current = Number.parseInt(field.value, 10) || min;
      field.value = String(Math.min(max, Math.max(min, current + Number(button.dataset.step))));
      sync();
    });
  });

  field.addEventListener('input', sync);
  sync();
});
