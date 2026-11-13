import { mkdir, readFile, rename, chmod, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { StoredEcobeeTokens } from '../models/auth-tokens.js';

/**
 * Stores Ecobee tokens outside config.json with restrictive POSIX permissions.
 * This is at-rest permission hardening, not encryption; protect the Homebridge
 * service account and its storage directory.
 */
export class EcobeeTokenStore {
  private readonly tokenPath: string;

  constructor(storageDirectory: string) {
    this.tokenPath = join(storageDirectory, 'homebridge-ecobee-comfort', 'tokens.json');
  }

  async load(): Promise<StoredEcobeeTokens | undefined> {
    try {
      const raw = await readFile(this.tokenPath, 'utf8');
      const value: unknown = JSON.parse(raw);
      if (!isStoredTokens(value)) {
        throw new Error('Stored Ecobee token data is invalid. Reauthorize the plugin.');
      }
      return value;
    } catch (error) {
      if (isNodeError(error) && error.code === 'ENOENT') return undefined;
      throw error;
    }
  }

  async save(tokens: StoredEcobeeTokens): Promise<void> {
    const directory = join(this.tokenPath, '..');
    await mkdir(directory, { recursive: true, mode: 0o700 });
    await chmod(directory, 0o700);

    const temporaryPath = `${this.tokenPath}.tmp`;
    await writeFile(temporaryPath, JSON.stringify(tokens), { encoding: 'utf8', mode: 0o600 });
    await chmod(temporaryPath, 0o600);
    await rename(temporaryPath, this.tokenPath);
    await chmod(this.tokenPath, 0o600);
  }

  async clear(): Promise<void> {
    const { unlink } = await import('node:fs/promises');
    try {
      await unlink(this.tokenPath);
    } catch (error) {
      if (!isNodeError(error) || error.code !== 'ENOENT') throw error;
    }
  }
}

function isStoredTokens(value: unknown): value is StoredEcobeeTokens {
  if (!value || typeof value !== 'object') return false;
  const tokens = value as Record<string, unknown>;
  return typeof tokens.accessToken === 'string'
    && typeof tokens.refreshToken === 'string'
    && typeof tokens.tokenType === 'string'
    && typeof tokens.expiresAt === 'string'
    && typeof tokens.scope === 'string';
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
