/**
 * @file Inline validation for the contact form.
 *
 * A convenience, never a gate. `contact.controller.js` validates every
 * submission again with the same rules, because a POST can arrive from anywhere
 * and nothing here is reachable by the server. Removing this file costs the
 * reader a round trip and costs the site no safety at all.
 *
 * It holds no messages of its own. The template renders each field's wording
 * into `data-error-*` attributes from lib/contactValidation.js, and this script
 * reads them back out, so the sentence shown before submitting is the same
 * sentence the server would have sent afterwards.
 *
 * The rules likewise come from the markup: `required`, `maxlength`, `pattern`
 * and `type="email"` are enforced by the browser's own constraint validation,
 * and this file only decides which message that verdict deserves.
 */
(() => {
  const form = document.querySelector('form[action="/contact"]');
  if (!form) return;

  // Every control the template gave messages to. Fields without them are not
  // this script's business.
  const controls = [...form.querySelectorAll('[data-error-too-long]')];
  if (controls.length === 0) return;

  /** Set once the form has been submitted: until then, validation stays quiet. */
  let submitted = false;

  /**
   * Pick the message a control's current value deserves.
   *
   * Checked in the same order as the server — presence, then length, then
   * shape — so the two never disagree about which problem to report first.
   *
   * @param {HTMLInputElement|HTMLTextAreaElement} control - The control to judge.
   * @returns {string} The message, or an empty string when the value is fine.
   */
  const messageFor = (control) => {
    const { validity, dataset } = control;
    const value = control.value.trim();

    if (!value) return validity.valueMissing || control.required ? dataset.errorRequired ?? '' : '';
    // `validity.tooLong` only reports on a value the user did not type, since
    // maxlength blocks typing past the limit — a paste still gets here.
    if (value.length > Number(control.maxLength)) return dataset.errorTooLong ?? '';
    if (validity.typeMismatch || validity.patternMismatch) return dataset.errorInvalid ?? '';
    return '';
  };

  /**
   * Show or clear a control's error line.
   *
   * Writes into the element the template already rendered rather than creating
   * one, so `aria-describedby` stays pointed at the same node throughout.
   *
   * @param {HTMLInputElement|HTMLTextAreaElement} control - The control to mark.
   * @param {string} message - Message to show; empty clears the field.
   * @returns {void}
   */
  const render = (control, message) => {
    const line = document.getElementById(`${control.name}-error`);
    if (!line) return;

    line.textContent = message;
    line.classList.toggle('hidden', !message);

    if (message) {
      control.setAttribute('aria-invalid', 'true');
      control.classList.remove('border-line-strong');
      control.classList.add('border-red-400');
    } else {
      control.removeAttribute('aria-invalid');
      control.classList.remove('border-red-400');
      control.classList.add('border-line-strong');
    }
  };

  /**
   * Validate one control and report the result.
   *
   * @param {HTMLInputElement|HTMLTextAreaElement} control - The control to check.
   * @returns {boolean} True when the value passes.
   */
  const check = (control) => {
    const message = messageFor(control);
    render(control, message);
    return !message;
  };

  for (const control of controls) {
    control.addEventListener('blur', () => {
      // Leaving a field untouched is not a mistake worth interrupting someone
      // over: an empty field only complains once it has been filled in and
      // emptied again, or once the form has been sent.
      if (submitted || control.value.trim()) check(control);
    });

    control.addEventListener('input', () => {
      // Once a control is marked, correcting it clears the mark immediately
      // rather than making the reader submit to find out they fixed it.
      if (control.getAttribute('aria-invalid') === 'true' || submitted) check(control);
    });
  }

  form.addEventListener('submit', (event) => {
    submitted = true;

    // Every control is checked, not just up to the first failure, so the reader
    // sees all of the work left to do at once.
    const invalid = controls.filter((control) => !check(control));
    if (invalid.length === 0) return;

    event.preventDefault();
    // Nothing else moves focus on a blocked submit, so without this the page
    // simply appears not to have reacted.
    invalid[0].focus();
    invalid[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
})();
