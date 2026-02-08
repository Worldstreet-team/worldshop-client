/**
 * Development utilities for testing authentication locally
 * These functions are only available in development mode
 */

import { setCookie, deleteCookie, getAccessToken, getRefreshToken } from './cookies';

export const authDevUtils = {
    /**
     * Set test cookies for local development
     */
    setTestCookies: () => {
        setCookie('accessToken', 'test-access-token', { path: '/', days: 1 });
        setCookie('refreshToken', 'test-refresh-token', { path: '/', days: 7 });
        console.log('✅ Test cookies set!');
        console.log('Access Token:', getAccessToken());
        console.log('Refresh Token:', getRefreshToken());
        console.log('Now refresh the page to authenticate.');
    },

    /**
     * Set custom token values
     */
    setCustomTokens: (accessToken: string, refreshToken: string) => {
        setCookie('accessToken', accessToken, { path: '/', days: 1 });
        setCookie('refreshToken', refreshToken, { path: '/', days: 7 });
        console.log('✅ Custom tokens set!');
        console.log('Access Token:', accessToken.substring(0, 20) + '...');
        console.log('Refresh Token:', refreshToken.substring(0, 20) + '...');
        console.log('Now refresh the page to authenticate.');
    },

    /**
     * Clear all auth cookies
     */
    clearCookies: () => {
        deleteCookie('accessToken', '/');
        deleteCookie('refreshToken', '/');
        console.log('✅ Auth cookies cleared!');
        console.log('Now refresh the page.');
    },

    /**
     * View current cookies
     */
    viewCookies: () => {
        console.log('Current Auth Cookies:');
        console.log('Access Token:', getAccessToken() || '(not set)');
        console.log('Refresh Token:', getRefreshToken() || '(not set)');
        console.log('\nAll cookies:', document.cookie || '(empty)');
    },

    /**
     * Check environment configuration
     */
    checkConfig: () => {
        console.log('Auth Configuration:');
        console.log('Auth Service URL:', import.meta.env.VITE_AUTH_SERVICE_URL);
        console.log('Login URL:', import.meta.env.VITE_LOGIN_URL);
        console.log('Register URL:', import.meta.env.VITE_REGISTER_URL);
        console.log('Skip Verification:', import.meta.env.VITE_SKIP_AUTH_VERIFICATION);
        console.log('\nIf any are undefined, restart the dev server!');
    },

    /**
     * Show help
     */
    help: () => {
        console.log(`
╔════════════════════════════════════════════════════════════╗
║           Auth Development Utilities - Help                ║
╚════════════════════════════════════════════════════════════╝

Available Commands (in browser console):

  window.authDev.setTestCookies()
    → Set test cookies with dummy values (for dev mode)

  window.authDev.setCustomTokens(accessToken, refreshToken)
    → Set specific token values (e.g., from real auth)

  window.authDev.clearCookies()
    → Clear all auth cookies

  window.authDev.viewCookies()
    → View current cookie values

  window.authDev.checkConfig()
    → Check environment variable configuration

  window.authDev.help()
    → Show this help message

Quick Start for Local Testing:
1. Set VITE_SKIP_AUTH_VERIFICATION=true in .env
2. Restart dev server
3. Run: window.authDev.setTestCookies()
4. Refresh the page
5. You should be authenticated!

For more details, see LOCAL-AUTH-TESTING.md
    `.trim());
    },
};

// Expose to window in development mode
if (import.meta.env.DEV) {
    (window as any).authDev = authDevUtils;
    console.log('🔧 Auth dev utilities loaded! Run window.authDev.help() for commands.');
}
