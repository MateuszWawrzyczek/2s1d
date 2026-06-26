const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;
const PREFIX = 'pbkdf2-sha256';

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: salt.buffer as ArrayBuffer,
      iterations,
    },
    key,
    HASH_BYTES * 8
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `${PREFIX}$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

export async function verifyPassword(
  password: string,
  encoded: string
): Promise<boolean> {
  const [prefix, iterationsValue, saltValue, hashValue, extra] =
    encoded.split('$');
  const iterations = Number(iterationsValue);
  if (
    prefix !== PREFIX ||
    extra !== undefined ||
    !Number.isInteger(iterations) ||
    iterations < 100_000
  ) {
    return false;
  }

  try {
    const salt = fromBase64(saltValue);
    const expected = fromBase64(hashValue);
    if (salt.length < SALT_BYTES || expected.length !== HASH_BYTES)
      return false;
    const actual = await derive(password, salt, iterations);
    let difference = 0;
    for (let index = 0; index < expected.length; index += 1) {
      difference |= expected[index] ^ actual[index];
    }
    return difference === 0;
  } catch {
    return false;
  }
}

export async function verifyLegacyPassword(
  password: string,
  encoded: string
): Promise<boolean> {
  if (!/^[a-f0-9]{64}$/.test(encoded)) return false;
  const actual = new Uint8Array(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password))
  );
  const expected = Uint8Array.from(encoded.match(/.{2}/g) ?? [], (byte) =>
    Number.parseInt(byte, 16)
  );
  let difference = 0;
  for (let index = 0; index < actual.length; index += 1) {
    difference |= actual[index] ^ expected[index];
  }
  return difference === 0;
}
