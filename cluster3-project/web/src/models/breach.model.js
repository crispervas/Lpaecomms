/**
 * @file Breach model.
 *
 * Data access for the Have I Been Pwned "Pwned Passwords" range API. It is
 * given the first five characters of a password's SHA-1 hash and returns every
 * known suffix sharing that prefix — the k-anonymity model. Neither this
 * service nor the upstream one ever receives a password or a complete hash;
 * the caller does the final comparison itself.
 */

/** Upstream range lookup. Public: no API key required. */
const RANGE_URL = 'https://api.pwnedpasswords.com/range';

/** Exactly five upper-case hexadecimal characters — the k-anonymity prefix. */
const PREFIX_PATTERN = /^[0-9A-F]{5}$/;

/** Short timeout: a registration must not wait on a third party. */
const REQUEST_TIMEOUT_MS = 3000;

/**
 * Looks up known-breached password hash suffixes.
 */
export class BreachModel {
  /**
   * The shape a valid prefix must have.
   *
   * @returns {RegExp} Pattern matching five upper-case hex characters.
   */
  static get prefixPattern() {
    return PREFIX_PATTERN;
  }

  /**
   * Fetch every known hash suffix sharing a prefix.
   *
   * @param {string} prefix - Five upper-case hexadecimal characters.
   * @returns {Promise<Record<string, number>>} Suffix to breach count. Empty
   *   when the prefix matches nothing known.
   * @throws {Error} When the upstream service is unreachable, times out, or
   *   answers a non-2xx status.
   */
  async findSuffixes(prefix) {
    const response = await fetch(`${RANGE_URL}/${prefix}`, {
      // Padding makes the upstream response a uniform size, so an observer of
      // our outbound call cannot infer how many real matches the prefix has.
      headers: { 'Add-Padding': 'true' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Breach service responded ${response.status}`);
    }

    const body = await response.text();
    /** @type {Record<string, number>} */
    const suffixes = {};

    for (const line of body.split('\n')) {
      const [suffix, rawCount] = line.trim().split(':');
      const count = Number(rawCount);

      // Padding decoys arrive with a count of zero, and no real breach count
      // is ever negative — rejecting the whole non-positive range (not just
      // an exact zero) is what keeps a malformed or hostile upstream line
      // from being written into the map as a fabricated "real" entry.
      if (!suffix || !Number.isFinite(count) || count <= 0) continue;

      suffixes[suffix] = count;
    }

    return suffixes;
  }
}
