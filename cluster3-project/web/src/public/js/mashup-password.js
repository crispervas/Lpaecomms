/**
 * @file Mashups page password checker.
 *
 * Mashup 3: combines the Lpaecomms registration field with the Have I Been
 * Pwned data set. Strength is scored locally; the breach check uses
 * k-anonymity — the SHA-1 is computed in this browser, only its first five
 * characters leave the page, and the suffix comparison happens here. The
 * password itself is never sent anywhere and never logged, not even to the
 * console.
 *
 * Defensive by design: if the card is not on the page it does nothing.
 */

(() => {
  const input = document.getElementById('mashup-password');
  const bar = document.getElementById('mashup-strength-bar');
  const label = document.getElementById('mashup-strength-label');
  const status = document.getElementById('mashup-breach-status');

  if (!input || !bar || !label || !status) return;

  /** Long enough that a whole word is typed before a lookup is made. */
  const DEBOUNCE_MS = 500;

  /** A registration must not stall on a third party. */
  const REQUEST_TIMEOUT_MS = 3000;

  /**
   * Strength level names, weakest first. The colour for each level lives in the
   * stylesheet under .strength__segment.is-N and .strength__label.is-N; this
   * file names the level and nothing else.
   */
  const LEVELS = ['Weak', 'Fair', 'Strong', 'Very strong'];

  /** @type {number|undefined} */
  let debounceTimer;

  /** Guards against a slow earlier lookup overwriting a newer result. */
  let latestRequestId = 0;

  /**
   * Score a password from 1 to 4 on local rules only.
   *
   * Local scoring is deliberate: it gives instant feedback, and it means a
   * weak password never has to leave the browser to be recognised as weak.
   *
   * @param {string} password - The candidate password.
   * @returns {number} A score from 1 (weak) to 4 (very strong).
   */
  const scorePassword = (password) => {
    let score = 0;
    if (password.length >= 8) score += 1;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;
    return Math.max(1, score);
  };

  /**
   * Paint the strength meter for a score.
   *
   * @param {number} score - Score from 1 to 4.
   * @returns {void}
   */
  const renderStrength = (score) => {
    [...bar.children].forEach((segment, index) => {
      segment.className = index < score ? `strength__segment is-${score}` : 'strength__segment';
    });

    label.className = `strength__label is-${score}`;
    label.textContent = `Strength: ${LEVELS[score - 1]}`;
  };

  /**
   * Reset the meter and status to their empty state.
   *
   * @returns {void}
   */
  const renderEmpty = () => {
    [...bar.children].forEach((segment) => {
      segment.className = 'strength__segment';
    });
    label.className = 'strength__label';
    label.textContent = 'Strength: enter a password';
    status.className = 'breach-status';
    status.textContent = 'Type a password to check it against known data breaches.';
  };

  /**
   * Compute the upper-case SHA-1 hexadecimal digest of a string.
   *
   * @param {string} value - Text to hash.
   * @returns {Promise<string>} 40 upper-case hexadecimal characters.
   */
  const sha1Hex = async (value) => {
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(value));
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  };

  /**
   * Check the password against known breaches without disclosing it.
   *
   * @param {string} password - The candidate password.
   * @returns {Promise<void>}
   */
  const checkBreaches = async (password) => {
    const requestId = (latestRequestId += 1);

    status.className = 'breach-status';
    status.textContent = 'Checking password security…';

    try {
      const hash = await sha1Hex(password);
      const prefix = hash.slice(0, 5);
      const suffix = hash.slice(5);

      const response = await fetch(`/api/v1/password/breaches?prefix=${prefix}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) throw new Error(`Breach lookup responded ${response.status}`);

      const result = await response.json();

      // A slower earlier request must not overwrite a newer answer.
      if (requestId !== latestRequestId) return;

      const breaches = result.suffixes[suffix];

      if (breaches) {
        status.className = 'breach-status is-breached';
        status.textContent = `This password has appeared in ${breaches.toLocaleString()} data breaches. Please choose another.`;
      } else {
        status.className = 'breach-status is-safe';
        status.textContent = '✓ This password was not found in known breaches';
      }
    } catch {
      if (requestId !== latestRequestId) return;

      // The check is advisory. A third party being down is not a reason to
      // block someone from choosing a password.
      status.className = 'breach-status is-pending';
      status.textContent = 'The breach check is unavailable right now — choose a strong password.';
    }
  };

  input.addEventListener('input', () => {
    const password = input.value;

    clearTimeout(debounceTimer);

    if (!password) {
      // Invalidate any lookup still in flight so its result cannot land in an
      // emptied field.
      latestRequestId += 1;
      renderEmpty();
      return;
    }

    renderStrength(scorePassword(password));

    // crypto.subtle only exists in a secure context (HTTPS or localhost).
    // Without it the strength meter still works; only the lookup is disabled.
    if (!globalThis.crypto?.subtle) {
      status.className = 'breach-status is-pending';
      status.textContent = 'The breach check needs a secure connection (HTTPS) and is disabled here.';
      return;
    }

    debounceTimer = setTimeout(() => checkBreaches(password), DEBOUNCE_MS);
  });
})();
