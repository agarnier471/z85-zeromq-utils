# z85-zeromq-utils

Encodes and decodes ZeroMQ's Z85 variant of Base85 for binary-to-text use in ZeroMQ protocols.

```js
import { encode, decode } from 'z85-zeromq-utils';

const bytes = new Uint8Array([0x86, 0x4f, 0xd2, 0x6f, 0xb5, 0x59, 0xf7, 0x5b]);
const text = encode(bytes); // 'HelloWorld'
const roundTrip = decode(text); // Uint8Array of the original bytes
```

## Why this exists

ZeroMQ messages can carry arbitrary binary data, but some transports and metadata
fields need text. Z85 packs 4 bytes into 5 printable ASCII characters, giving a
25% overhead instead of the 33% of Base64. The alphabet is fixed and excludes
whitespace, quotes, and backslashes, so the output can be embedded in JSON or
protocol headers without escaping.

The trade-off is strictness: Z85 has no padding, so input lengths must be exact
multiples of 4 bytes (encoding) or 5 characters (decoding). This library rejects
anything else rather than guessing a padding convention. It also rejects
non-canonical five-character groups that decode to a value above 2^32-1.

## Edge case

Because there is no padding, you cannot encode a 3-byte payload directly. Pad it
yourself to a multiple of 4 if your protocol requires it; the library will not
silently add bytes you did not ask for.

## API

- `encode(bytes: Uint8Array): string`
- `decode(text: string): Uint8Array`
- `Z85Error` — thrown for malformed input.

## Design notes

The window stores values eagerly rather than keeping running aggregates. Running
sums drift with floating point over long streams, and recomputing from a small
buffer is cheap enough that the drift is not worth the speed.

