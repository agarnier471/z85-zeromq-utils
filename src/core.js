// Z85 is ZeroMQ's binary-to-text encoding, a variant of Base85 with a fixed
// 85-character alphabet. It encodes 4 bytes into 5 characters and decodes the
// reverse. The alphabet is chosen so the output contains no whitespace and no
// characters that need escaping in JSON, making it safe for ZeroMQ metadata.

const ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#';

// Reverse lookup table built once. Using a plain object avoids Map overhead
// and the keys are all single ASCII characters.
const DECODE_MAP = Object.create(null);
for (let i = 0; i < ALPHABET.length; i++) {
  DECODE_MAP[ALPHABET[i]] = i;
}

const UINT32_MAX = 0xffffffff;

/**
 * Error thrown for malformed input or output that cannot be produced by Z85.
 */
export class Z85Error extends Error {
  constructor(message) {
    super(message);
    this.name = 'Z85Error';
  }
}

/**
 * Encode a Uint8Array (or Buffer) as a Z85 string.
 *
 * The input length must be a multiple of 4 because Z85 encodes whole 4-byte
 * blocks. There is no padding defined in the Z85 spec, so we reject partial
 * blocks rather than inventing a padding scheme.
 *
 * @param {Uint8Array} bytes
 * @returns {string}
 */
export function encode(bytes) {
  if (!(bytes instanceof Uint8Array)) {
    throw new TypeError('encode expects a Uint8Array');
  }
  if (bytes.length % 4 !== 0) {
    throw new Z85Error('input length must be a multiple of 4');
  }

  const out = new Array((bytes.length / 4) * 5);
  let outIndex = 0;

  for (let i = 0; i < bytes.length; i += 4) {
    // Assemble the 32-bit big-endian value. Using multiplication by 256
    // keeps the result a positive integer within the safe integer range.
    const value =
      bytes[i] * 0x1000000 +
      bytes[i + 1] * 0x10000 +
      bytes[i + 2] * 0x100 +
      bytes[i + 3];

    // Extract 5 base-85 digits, most significant first.
    let divisor = 85 * 85 * 85 * 85; // 85^4
    let remaining = value;
    for (let j = 0; j < 5; j++) {
      const digit = Math.floor(remaining / divisor);
      out[outIndex++] = ALPHABET[digit];
      remaining -= digit * divisor;
      divisor = Math.floor(divisor / 85);
    }
  }

  return out.join('');
}

/**
 * Decode a Z85 string back into a Uint8Array.
 *
 * The string length must be a multiple of 5. We validate every character
 * against the alphabet and reject values that would overflow 32 bits, which
 * can only happen with a non-canonical encoding (e.g. the last group
 * representing a value larger than 0xffffffff).
 *
 * @param {string} text
 * @returns {Uint8Array}
 */
export function decode(text) {
  if (typeof text !== 'string') {
    throw new TypeError('decode expects a string');
  }
  if (text.length % 5 !== 0) {
    throw new Z85Error('input length must be a multiple of 5');
  }

  const out = new Uint8Array((text.length / 5) * 4);
  let outIndex = 0;

  for (let i = 0; i < text.length; i += 5) {
    let value = 0;
    for (let j = 0; j < 5; j++) {
      const char = text[i + j];
      const digit = DECODE_MAP[char];
      if (digit === undefined) {
        throw new Z85Error(`invalid character at index ${i + j}: ${JSON.stringify(char)}`);
      }
      value = value * 85 + digit;
    }

    if (value > UINT32_MAX) {
      throw new Z85Error(`encoded value overflows 32 bits at index ${i}`);
    }

    // Write the 32-bit value as 4 big-endian bytes. Using bitwise shifts
    // would coerce to signed 32-bit; division keeps it unsigned.
    out[outIndex++] = Math.floor(value / 0x1000000) & 0xff;
    out[outIndex++] = Math.floor(value / 0x10000) & 0xff;
    out[outIndex++] = Math.floor(value / 0x100) & 0xff;
    out[outIndex++] = value & 0xff;
  }

  return out;
}
