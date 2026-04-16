# External Auth Integration - Quick Start Guide

## Summary

The WorldShop client has been updated to integrate with an external authentication service. Users now login/register through an external page, and the client receives authentication tokens via HTTP-only cookies.

## What Changed

### Files Added

1. **`src/utils/cookies.ts`** - Cookie management utilitiess
2. **`src/services/externalAuthService.ts`** - External auth API client
3. **`src/hooks/useAuth.ts`** - Convenient auth hooks
4. **`EXTERNAL-AUTH-INTEGRATION.md`** - Comprehensive documentation

### Files Modified

1. **`src/store/authStore.ts`**
   - Removed `login()` and `register()` methods
   - Added `initializeAuth()` - runs on app load
   - Added `redirectToLogin()` and `redirectToRegister()`
   - Updated `refreshAccessToken()` to work with cookies
   - Tokens now read from cookies instead of localStorage

2. **`src/services/api.ts`**
   - Updated to read access token from cookies
   - Improved token refresh logic

3. **`src/App.tsx`**
   - Now calls `initializeAuth()` on mount
   - Shows loading state during initialization

4. **`src/components/auth/ProtectedRoute.tsx`**
   - Redirects to external login instead of internal route
   - Shows loading during auth initialization

5. **`src/components/auth/AdminRoute.tsx`**
   - Same updates as ProtectedRoute

6. **`.env.example`**
   - Added external auth service configuration

## Configuration

### 1. Environment Variables

Create/update `.env` file:

```env
# External Auth Service
VITE_AUTH_SERVICE_URL=https://api.worldstreetgold.com
VITE_LOGIN_URL=https://worldstreetgold.com/login
VITE_REGISTER_URL=https://worldstreetgold.com/register

# Main API (for other services like products, cart, etc.)
VITE_API_BASE_URL=http://localhost:3000/api
```

### 2. Cookie Domain Setup

**CRITICAL:** The external auth service must set cookies with the correct domain so they're accessible by the client app.

If your setup is:
- Auth service: `api.worldstreetgold.com`
- Client app: `app.worldstreetgold.com` or `worldstreetgold.com`

Then cookies should be set with `domain=.worldstreetgold.com` (note the leading dot for subdomain support).

### 3. CORS Configuration

The external auth service must be configured to:
- Allow requests from the client domain
- Allow credentials (cookies): `Access-Control-Allow-Credentials: true`
- Allow required headers: `Authorization`, `Content-Type`

## Usage Examples

### 1. Display User Info

```tsx
import { useAuth } from '@/hooks';

function UserProfile() {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {user?.firstName}!</h1>
      <p>Email: {user?.email}</p>
      <p>Role: {user?.role}</p>
    </div>
  );
}
```

### 2. Login/Register Buttons

```tsx
import { useAuth } from '@/hooks';

function AuthButtons() {
  const { isAuthenticated, user, login, logout } = useAuth();

  if (isAuthenticated) {
    return (
      <div>
        <span>Hi, {user?.firstName}</span>
        <button onClick={logout}>Logout</button>
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => login()}>Login</button>
      <button onClick={() => login('/products')}>Login & Return Here</button>
    </div>
  );
}
```

### 3. Protect a Route

```tsx
import { Route } from 'react-router-dom';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import ProfilePage from '@/pages/ProfilePage';

<Route 
  path="/profile" 
  element={
    <ProtectedRoute>
      <ProfilePage />
    </ProtectedRoute>
  } 
/>
```

### 4. Admin-Only Content

```tsx
import { useHasRole } from '@/hooks';

function AdminPanel() {
  const isAdmin = useHasRole('ADMIN');

  if (!isAdmin) {
    return <div>Access Denied</div>;
  }

  return <div>Admin Controls...</div>;
}
```

### 5. Require Auth in Component

```tsx
import { useRequireAuth } from '@/hooks';

function MyAccountPage() {
  const { user, isLoading } = useRequireAuth();
  // Automatically redirects to login if not authenticated

  if (isLoading) return <div>Loading...</div>;

  return <div>Account: {user.email}</div>;
}
```

## Authentication Flow

### On App Load

1. `App.tsx` calls `initializeAuth()`
2. Get `accessToken` from cookies
3. If token exists, verify with `GET /api/auth/verify`
4. If verification fails, try to refresh token
5. If refresh fails, clear cookies and show login (only for protected pages)

### On API Call (401 Error)

1. API interceptor detects 401 response
2. Automatically calls `refreshAccessToken()`
3. Retries original request with new token
4. If refresh fails, redirect to login

### On Logout

1. Call `logout()` or `logoutAll()`
2. External auth service revokes refresh token(s)
3. Clear local state and cookies
4. Redirect to external login page

## Testing Checklist

- [ ] Configure environment variables in `.env`
- [ ] Verify auth service sets cookies with correct domain
- [ ] Test: Visit app → should initialize without errors
- [ ] Test: Visit protected route → should redirect to external login
- [ ] Test: Login externally → should return to app with user info
- [ ] Test: Wait 15 min → access token expires, should auto-refresh
- [ ] Test: Logout → should clear cookies and redirect to login
- [ ] Test: API calls include `Authorization: Bearer <token>` header
- [ ] Test: 401 errors trigger automatic token refresh

## Common Issues

### Issue: Cookies not being set/read

**Solution:**
- Check auth service sets cookies with correct `domain` attribute
- Verify `withCredentials: true` in axios config (already set)
- Check browser blocks third-party cookies (shouldn't be an issue if same domain)

### Issue: CORS errors

**Solution:**
- Auth service must set `Access-Control-Allow-Origin` to client domain
- Auth service must set `Access-Control-Allow-Credentials: true`
- Client must use `withCredentials: true` (already set)

### Issue: Redirect loop

**Solution:**
- Check if refresh token is valid and not expired
- Verify refresh endpoint is working correctly
- Check browser console for specific errors

## Migration Notes

If you have existing components using the old `login()` or `register()` methods:

**Before:**
```tsx
const { login } = useAuthStore();
await login(email, password);
```

**After:**
```tsx
const { redirectToLogin } = useAuthStore();
// or use the hook:
const { login } = useAuth();
login(); // Redirects to external login page
```

## Next Steps

1. Configure environment variables
2. Test the authentication flow
3. Update any UI components that reference login/register
4. Remove any old auth pages (`src/pages/Login.tsx`, etc.) if they exist
5. Test protected routes and API calls

## Additional Resources

- [EXTERNAL-AUTH-INTEGRATION.md](./EXTERNAL-AUTH-INTEGRATION.md) - Comprehensive documentation
- [Auth Service API Guide](../docs/AUTH-SERVICE-API-TEST-GUIDE.md) - External auth API reference

## Support

For issues or questions:
1. Check browser console for errors
2. Verify network tab shows correct cookie/header values
3. Check auth service logs
4. Review [EXTERNAL-AUTH-INTEGRATION.md](./EXTERNAL-AUTH-INTEGRATION.md) for troubleshooting
