import axios, { type AxiosInstance, type AxiosError } from 'axios';

const API_BASE_URL = 'https://api.ecobee.com';
const DEFAULT_SCOPE = 'smartWrite';

export interface EcobeePinAuthorization {
  pin: string;
  authorizationCode: string;
  expiresInMinutes: number;
  pollingIntervalSeconds: number;
}

export interface EcobeeTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  scope: string;
}

interface PinResponse {
  ecobeePin?: string;
  code?: string;
  expires_in?: number;
  interval?: number;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
}

interface OAuthErrorResponse {
  error?: string;
  error_description?: string;
}

export class EcobeeAuthorizationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'EcobeeAuthorizationError';
  }
}

/**
 * Implements Ecobee's documented device PIN authorization and refresh-token
 * exchanges. The application key is injected; it is never embedded in source.
 */
export class EcobeeAuthClient {
  constructor(
    private readonly applicationKey: string,
    private readonly http: AxiosInstance = axios.create({ timeout: 15_000 }),
  ) {
    if (!applicationKey.trim()) {
      throw new Error('An Ecobee application key is required.');
    }
  }

  async beginPinAuthorization(scope = DEFAULT_SCOPE): Promise<EcobeePinAuthorization> {
    try {
      const response = await this.http.get<PinResponse>(`${API_BASE_URL}/authorize`, {
        params: { response_type: 'ecobeePin', client_id: this.applicationKey, scope },
      });
      const data = response.data;
      if (!data.ecobeePin || !data.code || !data.expires_in || !data.interval) {
        throw new EcobeeAuthorizationError('Ecobee returned an incomplete PIN authorization response.', 'INVALID_RESPONSE');
      }
      return {
        pin: data.ecobeePin,
        authorizationCode: data.code,
        expiresInMinutes: data.expires_in,
        pollingIntervalSeconds: data.interval,
      };
    } catch (error) {
      throw this.toAuthorizationError(error, 'Unable to start Ecobee PIN authorization.');
    }
  }

  async exchangePinForTokens(
    authorizationCode: string,
    signal?: AbortSignal,
  ): Promise<EcobeeTokens> {
    return this.exchange({
      grant_type: 'ecobeePin',
      code: authorizationCode,
      client_id: this.applicationKey,
      ecobee_type: 'jwt',
    }, signal);
  }

  async refreshTokens(refreshToken: string, signal?: AbortSignal): Promise<EcobeeTokens> {
    return this.exchange({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.applicationKey,
      ecobee_type: 'jwt',
    }, signal);
  }

  private async exchange(
    values: Record<string, string>,
    signal?: AbortSignal,
  ): Promise<EcobeeTokens> {
    try {
      const body = new URLSearchParams(values);
      const response = await this.http.post<TokenResponse>(`${API_BASE_URL}/token`, body, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        signal,
      });
      const data = response.data;
      if (!data.access_token || !data.refresh_token || !data.expires_in) {
        throw new EcobeeAuthorizationError('Ecobee returned incomplete token data.', 'INVALID_RESPONSE');
      }
      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        tokenType: data.token_type ?? 'Bearer',
        expiresInSeconds: data.expires_in,
        scope: data.scope ?? DEFAULT_SCOPE,
      };
    } catch (error) {
      throw this.toAuthorizationError(error, 'Ecobee token exchange failed.');
    }
  }

  private toAuthorizationError(error: unknown, fallback: string): Error {
    if (error instanceof EcobeeAuthorizationError) return error;
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<OAuthErrorResponse>;
      const code = axiosError.response?.data?.error ?? 'HTTP_OR_NETWORK_ERROR';
      const status = axiosError.response?.status;
      const message = code === 'authorization_pending'
        ? 'Ecobee authorization is still pending.'
        : code === 'authorization_expired'
          ? 'The Ecobee authorization PIN has expired. Start a new authorization.'
          : code === 'slow_down'
            ? 'Ecobee requested a slower authorization polling rate.'
            : fallback;
      return new EcobeeAuthorizationError(message, code, status);
    }
    return error instanceof Error ? error : new Error(fallback);
  }
}

/**
 * Polls at Ecobee's minimum interval, respecting cancellation and PIN expiry.
 * slow_down increases the interval rather than causing a tight retry loop.
 */
export async function waitForPinAuthorization(
  client: EcobeeAuthClient,
  pin: EcobeePinAuthorization,
  signal?: AbortSignal,
): Promise<EcobeeTokens> {
  const deadline = Date.now() + pin.expiresInMinutes * 60_000;
  let intervalMs = pin.pollingIntervalSeconds * 1_000;

  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException('Authorization cancelled.', 'AbortError');
    await delay(intervalMs, signal);
    try {
      return await client.exchangePinForTokens(pin.authorizationCode, signal);
    } catch (error) {
      if (!(error instanceof EcobeeAuthorizationError)) throw error;
      if (error.code === 'authorization_pending') continue;
      if (error.code === 'slow_down') {
        intervalMs += 5_000;
        continue;
      }
      throw error;
    }
  }
  throw new EcobeeAuthorizationError('The Ecobee authorization PIN has expired. Start a new authorization.', 'authorization_expired');
}

function delay(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Authorization cancelled.', 'AbortError'));
      return;
    }
    const timer = setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => {
      clearTimeout(timer);
      reject(new DOMException('Authorization cancelled.', 'AbortError'));
    }, { once: true });
  });
}
