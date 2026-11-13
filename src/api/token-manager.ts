import type { EcobeeAuthClient, EcobeeTokens } from './ecobee-auth.js';
import { waitForPinAuthorization } from './ecobee-auth.js';
import { EcobeeTokenStore } from './token-store.js';
import type { StoredEcobeeTokens } from '../models/auth-tokens.js';

const REFRESH_SKEW_MS = 5 * 60 * 1_000;

export class EcobeeTokenManager {
  private tokens?: StoredEcobeeTokens;
  private refreshInFlight?: Promise<string>;

  constructor(
    private readonly auth: EcobeeAuthClient,
    private readonly store: EcobeeTokenStore,
  ) {}

  async authorize(
    onPin: (pin: string, expiresInMinutes: number) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const pin = await this.auth.beginPinAuthorization('smartWrite');
    onPin(pin.pin, pin.expiresInMinutes);
    const tokens = await waitForPinAuthorization(this.auth, pin, signal);
    await this.persist(tokens);
  }

  async getAccessToken(): Promise<string> {
    if (!this.tokens) this.tokens = await this.store.load();
    if (!this.tokens) {
      throw new Error('Ecobee authorization is required. Complete PIN authorization in Homebridge logs.');
    }

    if (Date.parse(this.tokens.expiresAt) - REFRESH_SKEW_MS > Date.now()) {
      return this.tokens.accessToken;
    }

    if (!this.refreshInFlight) {
      this.refreshInFlight = this.refresh();
    }
    try {
      return await this.refreshInFlight;
    } finally {
      this.refreshInFlight = undefined;
    }
  }

  private async refresh(): Promise<string> {
    if (!this.tokens) throw new Error('No Ecobee token state is available.');
    const next = await this.auth.refreshTokens(this.tokens.refreshToken);
    await this.persist(next);
    return next.accessToken;
  }

  private async persist(tokens: EcobeeTokens): Promise<void> {
    const stored: StoredEcobeeTokens = {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      tokenType: tokens.tokenType,
      expiresAt: new Date(Date.now() + tokens.expiresInSeconds * 1_000).toISOString(),
      scope: tokens.scope,
    };
    await this.store.save(stored);
    this.tokens = stored;
  }
}
