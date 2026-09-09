/**
 * Mocking Expo's SecureStore for the Web Preview environment.
 * In a real Expo app, this would use expo-secure-store.
 */
export const SecureStore = {
  setItemAsync: async (key: string, value: string) => {
    localStorage.setItem(`secure_${key}`, value);
    return Promise.resolve();
  },
  getItemAsync: async (key: string) => {
    return Promise.resolve(localStorage.getItem(`secure_${key}`));
  },
  deleteItemAsync: async (key: string) => {
    localStorage.removeItem(`secure_${key}`);
    return Promise.resolve();
  }
};

/**
 * Mocking expo-auth-session's makeRedirectUri.
 */
export const makeRedirectUri = () => {
  return `${window.location.origin}/auth/callback`;
};
