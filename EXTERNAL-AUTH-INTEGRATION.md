# External Auth Service Integration

This document explains how the WorldShop client integrates with an external authentication service.

## Overview

The WorldShop client **does not handle authentication internally**. Instead, it relies on an external auth service (hosted at `api.worldstreetgold.com`) for all authentication operations. Users login/register through an external page (`worldstreetgold.com/login`), and the client receives authentication tokens via HTTP-only cookies.

## Architecture

### Authentication Flow

```
┌─────────────────┐
│   User visits   │
│  WorldShop App  │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  App Initialization (App.tsx)      │
│  - Calls initializeAuth()          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  1. Get accessToken from cookies    │
│     (set by external auth service)  │
└────────┬────────────────────────────┘
         │
         ├─── Token exists ─────────────┐
         │                              │
         │                              ▼
         │                    ┌──────────────────────┐
         │                    │ 2. Verify Token      │
         │                    │    GET /api/auth/    │
         │                    │        verify        │
         │                    └──────┬───────────────┘
         │                           │
         │                           ├─── Valid ───────┐
         │                           │                  │
         │                           │                  ▼
         │                           │        ┌─────────────────┐
         │                           │        │ Set user info   │
         │                           │        │ isAuthenticated │
         │                           │        │     = true      │
         │                           │        └─────────────────┘
         │                           │
         │                           └─── Invalid/Expired ────┐
         │                                                     │
         │                                                     ▼
         │                                          ┌────────────────────┐
         │                                          │ 3. Refresh Token   │
         │                                          │  POST /api/auth/   │
         │                                          │   refresh-token    │
         │                                          └────────┬───────────┘
         │                                                   │
         │                                                   ├─── Success ─┐
         │                                                   │              │
         │                                                   │              ▼
         │                                                   │    ┌─────────────┐
         │                                                   │    │  Retry #2   │
         │                                                   │    │   Verify    │
         │                                                   │    └─────────────┘
         │                                                   │
         │                                                   └─── Failed ──┐
         │                                                                  │
         └─── No token ─────────────────────────────────────────────────┐  │
                                                                         │  │
                                                                         ▼  ▼
                                                              ┌──────────────────────┐
                                                              │ Clear cookies        │
                                                              │ isAuthenticated      │
                                                              │     = false          │
                                                              │                      │
                                                              │ If on protected page:│
                                                              │ → Redirect to login  │
                                                              └──────────────────────┘
```

## Key Components

### 1. Cookie Utilities (`utils/cookies.ts`)

Functions for reading/writing cookies:
- `getAccessToken()` - Reads `accessToken` cookie
- `getRefreshToken()` - Reads `refreshToken` cookie  
- `clearAuthCookies()` - Clears all auth-related cookies

### 2. External Auth Service (`services/externalAuthService.ts`)

Communicates with the external auth service:
- `verifyToken(accessToken)` - Validates token with `GET /api/auth/verify`
- `refreshToken(refreshToken?)` - Gets new tokens with `POST /api/auth/refresh-token`
- `logout(refreshToken?)` - Revokes refresh token with `POST /api/auth/logout`
- `logoutAll(accessToken)` - Revokes all sessions with `POST /api/auth/logout-all`
- `redirectToLogin(returnUrl?)` - Navigates to external login page
- `redirectToRegister(returnUrl?)` - Navigates to external register page

### 3. Auth Store (`store/authStore.ts`)

Zustand store managing authentication state:

**State:**
- `user: User | null` - Current user info
- `tokens: AuthTokens | null` - Access and refresh tokens
- `isAuthenticated: boolean` - Whether user is logged in
- `isLoading: boolean` - Loading state
- `isInitialized: boolean` - Whether auth check is complete
- `error: string | null` - Error message

**Actions:**
- `initializeAuth()` - Main initialization on app load (see flow above)
- `refreshAccessToken()` - Refresh the access token
- `logout()` - Logout from current session
- `logoutAll()` - Logout from all sessions
- `redirectToLogin(returnUrl?)` - Redirect to external login
- `redirectToRegister(returnUrl?)` - Redirect to external register

### 4. API Interceptor (`services/api.ts`)

Axios interceptor that:
- **Request:** Attaches `accessToken` from cookies as `Authorization: Bearer <token>`
- **Response:** On 401 error, automatically calls `refreshAccessToken()` and retries the request

### 5. Protected Routes (`components/auth/`)

**ProtectedRoute.tsx:**
- Redirects to external login if not authenticated
- Shows loading state during initialization
- Passes return URL to login page

**AdminRoute.tsx:**
- Same as ProtectedRoute but also checks for `ADMIN` role
- Non-admin users are redirected to home page

## Environment Variables

Configure these in `.env`:

```env
# External Auth Service Configuration
VITE_AUTH_SERVICE_URL=https://api.worldstreetgold.com
VITE_LOGIN_URL=https://worldstreetgold.com/login
VITE_REGISTER_URL=https://worldstreetgold.com/register
```

## Cookie Configuration

The external auth service sets these cookies:

| Cookie Name     | Scope      | Expires  | HttpOnly | SameSite |
|-----------------|------------|----------|----------|----------|
| `accessToken`   | `/`        | 15 min   | ✅       | Lax      |
| `refreshToken`  | `/api/auth`| 7 days   | ✅       | Lax      |

**Important:** Cookies must be set with domain `worldstreetgold.com` (or `.worldstreetgold.com` for subdomain support) so they're shared between the auth service and the client app.

## Usage Examples

### Accessing User Info

```tsx
import { useAuthStore } from '@/store/authStore';

function MyComponent() {
  const { user, isAuthenticated, isLoading } = useAuthStore();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return <div>Welcome, {user?.firstName}!</div>;
}
```

### Protecting a Route

```tsx
import ProtectedRoute from '@/components/auth/ProtectedRoute';

<Route 
  path="/profile" 
  element={
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  } 
/>
```

### Admin-Only Route

```tsx
import AdminRoute from '@/components/auth/AdminRoute';

<Route 
  path="/admin" 
  element={
    <AdminRoute>
      <AdminDashboard />
    </AdminRoute>
  } 
/>
```

### Manual Logout

```tsx
import { useAuthStore } from '@/store/authStore';

function LogoutButton() {
  const { logout } = useAuthStore();

  return (
    <button onClick={() => logout()}>
      Logout
    </button>
  );
}
```

### Redirect to Login/Register

```tsx
import { useAuthStore } from '@/store/authStore';

function AuthButtons() {
  const { redirectToLogin, redirectToRegister } = useAuthStore();

  return (
    <div>
      <button onClick={() => redirectToLogin()}>Login</button>
      <button onClick={() => redirectToRegister()}>Register</button>
    </div>
  );
}
```

## Token Refresh Logic

The app automatically handles token refresh in two places:

### 1. During Initialization (initializeAuth)
If the access token is invalid on app load, it automatically attempts to refresh before redirecting to login.

### 2. During API Calls (api.ts interceptor)
If any API call returns 401, the interceptor automatically:
1. Calls `refreshAccessToken()`
2. Retries the original request with the new token
3. If refresh fails, redirects to login

## Security Considerations

1. **HttpOnly Cookies:** Tokens are stored in HttpOnly cookies, preventing XSS attacks from accessing them.
2. **Token Rotation:** The refresh token is rotated on each refresh, invalidating the old one.
3. **Secure Transmission:** Always use HTTPS in production.
4. **CORS:** Ensure the auth service allows CORS requests from the client domain with credentials (`Access-Control-Allow-Credentials: true`).
5. **SameSite:** Cookies use `SameSite=Lax` for CSRF protection while allowing navigation from external auth pages.

## Troubleshooting

### Issue: "No access token available" on app load

**Cause:** Cookies not being set or not being sent.

**Solutions:**
- Verify cookies are set with the correct domain (should match or be parent domain)
- Check `withCredentials: true` in axios config
- Ensure auth service sets `Access-Control-Allow-Credentials: true`
- Verify cookies have correct `Path` (accessToken: `/`, refreshToken: `/api/auth`)

### Issue: Infinite redirect loop to login

**Cause:** Token refresh failing repeatedly.

**Solutions:**
- Check if refresh token is present in cookies
- Verify refresh token hasn't expired (7 days default)
- Check auth service logs for refresh endpoint errors
- Ensure VITE_AUTH_SERVICE_URL points to correct auth service

### Issue: 401 errors on API calls

**Cause:** Access token not being attached to requests.

**Solutions:**
- Verify `getAccessToken()` returns a valid token
- Check API interceptor is configured correctly
- Ensure API calls use the `apiClient` instance, not a different axios instance

## Testing

### Testing Authentication Flow

1. **Clear cookies**: Open DevTools → Application → Cookies → Delete all
2. **Visit protected page**: Should redirect to external login
3. **Login**: Should return to app with `accessToken` cookie set
4. **Check verification**: Open DevTools → Network → Look for `GET /api/auth/verify` call (status 200)
5. **Wait 15 min**: Access token should expire
6. **Make API call**: Should automatically refresh and retry (check Network tab for `POST /api/auth/refresh-token`)

### Manual Testing with DevTools

```javascript
// In browser console

// Check cookies
document.cookie

// Get current auth state
const authStore = window.__AUTH_STORE__ // (if you expose it for debugging)

// Manually trigger refresh
await fetch('https://api.worldstreetgold.com/api/auth/refresh-token', {
  method: 'POST',
  credentials: 'include'
})
```

## API Reference

See [AUTH-SERVICE-API-TEST-GUIDE.md](../docs/AUTH-SERVICE-API-TEST-GUIDE.md) for complete API documentation of the external auth service endpoints.
