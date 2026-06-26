import { describe, expect, it } from 'vitest';
import {
  hashPassword,
  verifyLegacyPassword,
  verifyPassword,
} from '../src/lib/password';

describe('password hashing', () => {
  it('verifies the correct password and rejects a different password', async () => {
    const encoded = await hashPassword('correct horse battery staple');

    expect(encoded).toMatch(/^pbkdf2-sha256\$210000\$/);
    await expect(
      verifyPassword('correct horse battery staple', encoded)
    ).resolves.toBe(true);
    await expect(verifyPassword('wrong password', encoded)).resolves.toBe(
      false
    );
  });

  it('uses a unique salt for each hash', async () => {
    const first = await hashPassword('same password');
    const second = await hashPassword('same password');

    expect(first).not.toBe(second);
  });

  it('rejects malformed and legacy unsalted hashes', async () => {
    await expect(verifyPassword('password', 'not-a-hash')).resolves.toBe(false);
    await expect(verifyPassword('password', 'a'.repeat(64))).resolves.toBe(
      false
    );
  });

  it('recognizes a correct legacy hash only for one-time migration', async () => {
    const legacy =
      '6bed82f7da9a703f86f1d89288910edc2681b26d010db89c3666807d364e68a6';
    await expect(verifyLegacyPassword('legacy-password', legacy)).resolves.toBe(
      true
    );
    await expect(verifyLegacyPassword('wrong-password', legacy)).resolves.toBe(
      false
    );
    await expect(
      verifyLegacyPassword('legacy-password', 'not-a-hash')
    ).resolves.toBe(false);
  });
});
