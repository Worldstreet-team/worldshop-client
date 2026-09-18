/**
 * Utility functions for cookie management
 */

/**
 * Get a cookie value by name
 */
export function getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);

    if (parts.length === 2) {
        const cookieValue = parts.pop()?.split(';').shift();
        return cookieValue || null;
    }

    return null;
}

/**
 * Set a cookie with optional parameters
 */
export function setCookie(
    name: string,
    value: string,
    options: {
        days?: number;
        path?: string;
        domain?: string;
        secure?: boolean;
        sameSite?: 'Strict' | 'Lax' | 'None';
    } = {}
): void {
    let cookieString = `${name}=${encodeURIComponent(value)}`;

    if (options.days) {
        const date = new Date();
        date.setTime(date.getTime() + (options.days * 24 * 60 * 60 * 1000));
        cookieString += `; expires=${date.toUTCString()}`;
    }

    cookieString += `; path=${options.path || '/'}`;

    if (options.domain) {
        cookieString += `; domain=${options.domain}`;
    }

    if (options.secure) {
        cookieString += '; secure';
    }

    if (options.sameSite) {
        cookieString += `; samesite=${options.sameSite}`;
    }

    document.cookie = cookieString;
}

/**
 * Delete a cookie by name
 */
export function deleteCookie(name: string, path: string = '/'): void {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=${path}`;
}

/**
 * Get access token from cookies
 */
export function getAccessToken(): string | null {
    return getCookie('accessToken');
}

/**
 * Get refresh token from cookies
 */
export function getRefreshToken(): string | null {
    return getCookie('refreshToken');
}

/**
 * Clear all auth-related cookies
 */
export function clearAuthCookies(): void {
    deleteCookie('accessToken', '/');
    deleteCookie('refreshToken', '/api/auth');
}
