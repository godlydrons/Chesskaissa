import axios from 'axios';
import { SecureStore, makeRedirectUri } from '../lib/expo-mocks';

const CLIENT_ID = 'caissa-core';
const AUTH_URL = 'https://lichess.org/oauth';
const TOKEN_URL = 'https://lichess.org/api/token';
const SCOPES = ['preference:read', 'email:read'];

/**
 * Generates a random code verifier for PKCE.
 */
function generateCodeVerifier() {
  const array = new Uint32Array(56);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec => ('0' + dec.toString(16)).substr(-2)).join('');
}

/**
 * Generates a code challenge from the verifier using SHA-256.
 */
async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export const LichessAuth = {
  /**
   * Initiates the PKCE OAuth flow and redirects.
   */
  async login() {
    const url = await this.startAuth();
    window.location.href = url;
  },

  /**
   * Initiates the PKCE OAuth flow.
   */
  async startAuth() {
    const verifier = generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const redirectUri = makeRedirectUri();

    // Store verifier for the callback phase
    await SecureStore.setItemAsync('lichess_code_verifier', verifier);

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: CLIENT_ID,
      redirect_uri: redirectUri,
      scope: SCOPES.join(' '),
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state: Math.random().toString(36).substring(7),
    });

    return `${AUTH_URL}?${params.toString()}`;
  },

  /**
   * Exchanges the authorization code for an access token.
   */
  async exchangeCode(code: string) {
    const verifier = await SecureStore.getItemAsync('lichess_code_verifier');
    const redirectUri = makeRedirectUri();

    if (!verifier) {
      throw new Error('Missing code verifier');
    }

    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', CLIENT_ID);
    params.append('redirect_uri', redirectUri);
    params.append('code_verifier', verifier);

    const response = await axios.post(TOKEN_URL, params, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });

    const { access_token } = response.data;
    await SecureStore.setItemAsync('lichess_token', access_token);
    await SecureStore.deleteItemAsync('lichess_code_verifier');

    return access_token;
  },

  /**
   * Fetches the Lichess user profile using the stored token.
   */
  async getProfile() {
    const token = await SecureStore.getItemAsync('lichess_token');
    if (!token) return null;

    try {
      const response = await axios.get('https://lichess.org/api/account', {
        headers: { Authorization: `Bearer ${token}` }
      });
      return response.data;
    } catch (e) {
      // If token is invalid, clear it
      await SecureStore.deleteItemAsync('lichess_token');
      return null;
    }
  },

  /**
   * Logs out the user.
   */
  async logout() {
    await SecureStore.deleteItemAsync('lichess_token');
  },

  /**
   * Fetches recent analyzed games from Lichess.
   */
  async syncGames(username: string) {
    const token = await SecureStore.getItemAsync('lichess_token');
    if (!token) return [];

    try {
      // Fetch last 10 games with analysis
      const response = await axios.get(`https://lichess.org/api/games/user/${username}`, {
        params: {
          max: 10,
          evals: true,
          opening: true,
          ongoing: false,
          finished: true,
        },
        headers: { 
          Authorization: `Bearer ${token}`,
          Accept: 'application/x-ndjson'
        },
        responseType: 'text'
      });

      // Parse NDJSON
      const games = response.data
        .split('\n')
        .filter((line: string) => line.trim())
        .map((line: string) => JSON.parse(line));

      return games;
    } catch (e) {
      console.error('Failed to sync Lichess games:', e);
      return [];
    }
  }
};
