import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encode, decode, Z85Error } from '../src/index.js';

test('encodes the ZeroMQ Z85 test vector', () => {
  const input = new Uint8Array([0x86, 0x4f, 0xd2, 0x6f, 0xb5, 0x59, 0xf7, 0x5b]);
  assert.equal(encode(input), 'HelloWorld');
});

test('decodes the ZeroMQ Z85 test vector', () => {
  const expected = new Uint8Array([0x86, 0x4f, 0xd2, 0x6f, 0xb5, 0x59, 0xf7, 0x5b]);
  assert.deepEqual(decode('HelloWorld'), expected);
});

test('round-trips arbitrary bytes', () => {
  const bytes = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe, 0xfd, 0xfc]);
  assert.deepEqual(decode(encode(bytes)), bytes);
});

test('encodes an empty input to an empty string', () => {
  assert.equal(encode(new Uint8Array(0)), '');
});

test('decodes an empty string to an empty Uint8Array', () => {
  assert.deepEqual(decode(''), new Uint8Array(0));
});

test('rejects encode input whose length is not a multiple of 4', () => {
  assert.throws(() => encode(new Uint8Array([1, 2, 3])), Z85Error);
});

test('rejects decode input whose length is not a multiple of 5', () => {
  assert.throws(() => decode('abcd'), Z85Error);
});

test('rejects invalid characters during decode', () => {
  assert.throws(() => decode('~~~~~'), Z85Error);
});

test('rejects encode input that is not a Uint8Array', () => {
  assert.throws(() => encode('not bytes'), TypeError);
});

test('rejects decode input that is not a string', () => {
  assert.throws(() => decode(new Uint8Array([1, 2, 3, 4])), TypeError);
});

test('rejects values that overflow 32 bits', () => {
  // 85^5 - 1 is the largest 5-digit base-85 value; values above 2^32-1
  // cannot be produced by a canonical encoder.
  assert.throws(() => decode('#####'), Z85Error);
});

test('accepts the maximum encodable 32-bit value', () => {
  const bytes = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
  assert.deepEqual(decode(encode(bytes)), bytes);
});
