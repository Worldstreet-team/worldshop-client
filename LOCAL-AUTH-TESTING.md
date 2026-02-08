# Local Testing Guide for External Auth

## Problem: Redirecting to Profile Page Instead of Login

If you're experiencing redirects to the profile page when testing locally, this is likely due to token verification failing. Here's how to debug and test locally.

## Quick Fix: Enable Local Dev Mode

1. **Update your `.env` file:**

```env
VITE_SKIP_AUTH_VERIFICATION=true
```

2. **Restart your dev server** (important - Vite needs to reload env variables)

3. **Set cookies manually in browser console:**

```javascript
// Open browser DevTools Console (F12)
document.cookie = "accessToken=any-test-token-value; path=/; max-age=3600";
document.cookie = "refreshToken=any-test-refresh-token; path=/; max-age=604800";
```

4. **Refresh the page** - You should now be authenticated with a mock user

## Understanding the Problem

When `VITE_SKIP_AUTH_VERIFICATION=false` (default), the app:
1. Gets access token from cookies
2. Sends it to `https://api.worldstreetgold.com/api/auth/verify`
3. If verification fails (service unreachable, invalid token, etc.) → tries to refresh
4. If refresh fails → redirects to login

**Common failure reasons:**
- Auth service is unreachable (CORS, network, wrong URL)
- Token format is invalid
- Token is expired
- Auth service returned unexpected response

## Debugging Steps

### 1. Check Browser Console

With the new changes, you'll see detailed logs:
- `🔍 Verifying access token...` - Started verification
- `✅ Token verified successfully` - Verification passed
- `⚠️ Access token verification failed` - Verification failed (check error below)
- `❌ Token verification failed:` - Detailed error
- `🔄 Redirecting to login...` - About to redirect

### 2. Check Network Tab

1. Open DevTools → Network tab
2. Visit `/account`
3. Look for request to `https://api.worldstreetgold.com/api/auth/verify`
4. Check:
   - **Status Code**: Should be 200
   - **Request Headers**: Should have `Authorization: Bearer <token>`
   - **Response**: Should contain user data

**Common issues:**
- **No request sent** → CORS blocking or invalid URL
- **401 Unauthorized** → Token is invalid
- **404 Not Found** → Wrong endpoint URL
- **CORS error** → Auth service needs proper CORS headers

### 3. Check Cookies

DevTools → Application → Cookies → `http://localhost:5173`

Should see:
- `accessToken` with your value
- `refreshToken` with your value

**If cookies disappear:**
- Check if `Path` is correct (should be `/`)
- Check if they're being cleared by code (they shouldn't be with new changes)

### 4. Check Environment Variables

**In browser console:**
```javascript
console.log('Auth Service URL:', import.meta.env.VITE_AUTH_SERVICE_URL);
console.log('Login URL:', import.meta.env.VITE_LOGIN_URL);
console.log('Skip Verification:', import.meta.env.VITE_SKIP_AUTH_VERIFICATION);
```

Should output:
```
Auth Service URL: https://api.worldstreetgold.com
Login URL: https://worldstreetgold.com/login
Skip Verification: true (or false)
```

**If undefined** → Restart dev server (Vite needs restart to load .env changes)

## Local Testing Modes

### Mode 1: Skip Verification (Recommended for Local Dev)

**`.env`:**
```env
VITE_SKIP_AUTH_VERIFICATION=true
```

**Pros:**
- No external dependencies
- Fast testing
- Works offline

**Cons:**
- Doesn't test real auth flow
- Mock user always has ADMIN role

**Use when:**
- Testing UI/UX
- Developing features
- Auth service not available

### Mode 2: Mock Auth Service (Advanced)

Set up a local mock server that mimics the auth service endpoints.

**`.env`:**
```env
VITE_AUTH_SERVICE_URL=http://localhost:4000
VITE_SKIP_AUTH_VERIFICATION=false
```

Create `mock-auth-server.js`:
```javascript
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());

app.get('/api/auth/verify', (req, res) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    res.json({
      success: true,
      message: 'Token valid',
      data: {
        user: {
          userId: 'test-123',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'ADMIN',
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      }
    });
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
});

app.post('/api/auth/refresh-token', (req, res) => {
  res.json({
    success: true,
    data: {
      tokens: {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      }
    }
  });
});

app.listen(4000, () => console.log('Mock auth server on http://localhost:4000'));
```

Run: `node mock-auth-server.js`

### Mode 3: Real Auth Service

**`.env`:**
```env
VITE_AUTH_SERVICE_URL=https://api.worldstreetgold.com
VITE_SKIP_AUTH_VERIFICATION=false
```

**Requirements:**
- Auth service must be running
- Proper CORS configuration
- Valid JWT tokens

## Setting Cookies Manually

### Method 1: Browser Console

```javascript
// Set cookies (expires in 1 hour)
document.cookie = "accessToken=your-jwt-token-here; path=/; max-age=3600";
document.cookie = "refreshToken=your-refresh-token-here; path=/; max-age=604800";

// View current cookies
console.log(document.cookie);

// Clear cookies
document.cookie = "accessToken=; path=/; max-age=0";
document.cookie = "refreshToken=; path=/; max-age=0";
```

### Method 2: Chrome DevTools

1. Open DevTools (F12)
2. Go to **Application** tab
3. Expand **Cookies** → `http://localhost:5173`
4. Double-click to edit or click `+` to add new cookie

**Required fields:**
- **Name**: `accessToken` or `refreshToken`
- **Value**: Your token
- **Path**: `/`
- **Max-Age**: `3600` (1 hour)

### Method 3: Copy from Real Auth

1. Login to real auth service in another tab
2. Open DevTools → Application → Cookies
3. Copy `accessToken` and `refreshToken` values
4. Paste into localhost cookies

## Why "Profile Page" Redirect?

If you're still seeing redirects to profile instead of login, check:

1. **Browser cache redirect:** Clear browser cache and cookies completely
2. **Multiple tabs:** Close all tabs and try in incognito
3. **Extension interference:** Disable browser extensions
4. **Service worker:** Check if there's a service worker caching the redirect

**Check in DevTools Console:**
```javascript
// Should show the login URL
console.log(import.meta.env.VITE_LOGIN_URL);
```

**Expected:** `https://worldstreetgold.com/login`  
**If different:** Update `.env` and restart server

## Testing Checklist

- [ ] Set `VITE_SKIP_AUTH_VERIFICATION=true` in `.env`
- [ ] Restart dev server (`Ctrl+C` then `npm run dev`)
- [ ] Clear browser cookies
- [ ] Set test cookies in console
- [ ] Refresh page
- [ ] Check console for auth logs (should see `✅ Token verified successfully`)
- [ ] Visit `/account` - should see account page, not redirect
- [ ] Check console - should see `✅ ProtectedRoute: User authenticated`

## Still Having Issues?

1. **Share console logs:** Take a screenshot of browser console when visiting `/account`
2. **Share network tab:** Screenshot of the failed auth verification request
3. **Check public paths:** `/account` might need to be added to public paths if you don't want it protected

## Disabling Redirects Temporarily

If you want to test without any redirects, comment out the redirect in `ProtectedRoute.tsx`:

```tsx
if (isInitialized && !isAuthenticated) {
  const returnUrl = `${window.location.origin}${location.pathname}${location.search}`;
  console.log('Would redirect to:', returnUrl);
  // redirectToLogin(returnUrl); // COMMENTED OUT FOR TESTING
}
```

This will let you see what's happening without being redirected away.
