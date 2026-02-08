# Quick Fix: Profile Page Redirect Issue

## What Was Wrong

1. **Cookies being cleared too early** - When token verification failed, cookies were immediately cleared, even if the auth service was just unreachable
2. **Poor error logging** - Hard to debug what was happening
3. **No local testing mode** - Required external auth service to be available

## What's Fixed

### 1. **Don't Clear Cookies on Verification Failure**
Cookies are now preserved even if verification fails. They're only cleared when explicitly logging out.

### 2. **Better Error Logging**
Added console logs throughout the auth flow:
- `🔍 Verifying access token...`
- `✅ Token verified successfully`
- `⚠️ Access token verification failed`
- `🔄 Redirecting to login...`

### 3. **Local Development Mode**
New env variable `VITE_SKIP_AUTH_VERIFICATION=true` bypasses external auth and uses mock data.

### 4. **Dev Utilities**
Convenient browser console commands to set/clear cookies.

## How to Test Right Now

### Step 1: Enable Dev Mode

**Edit `.env`:**
```env
VITE_SKIP_AUTH_VERIFICATION=true
```

### Step 2: Restart Dev Server

```bash
# Press Ctrl+C to stop
npm run dev
```

**IMPORTANT:** Vite needs a restart to pick up .env changes!

### Step 3: Set Test Cookies

Open browser console (F12) and run:
```javascript
window.authDev.setTestCookies()
```

### Step 4: Refresh Page

Refresh the browser. You should now see:
- `✅ Token verified successfully: test@example.com`
- No redirects to login or profile

### Step 5: Visit Account Page

Go to `http://localhost:5173/account` - should load without redirect!

## Browser Console Commands

Once the app loads, you have these commands available:

```javascript
// Set test cookies
window.authDev.setTestCookies()

// Set real tokens (if you have them)
window.authDev.setCustomTokens('your-access-token', 'your-refresh-token')

// View current cookies
window.authDev.viewCookies()

// Clear all cookies
window.authDev.clearCookies()

// Check configuration
window.authDev.checkConfig()

// Show help
window.authDev.help()
```

## Testing with Real Auth Service

When ready to test with the real service:

### Step 1: Update .env

```env
VITE_SKIP_AUTH_VERIFICATION=false
VITE_AUTH_SERVICE_URL=https://api.worldstreetgold.com
```

### Step 2: Get Real Tokens

Option A: Login on real auth service, copy cookies from DevTools

Option B: Get tokens from auth service response and set them:
```javascript
window.authDev.setCustomTokens('real-jwt-token', 'real-refresh-token')
```

### Step 3: Restart Server & Refresh

### Step 4: Check Console

Should see:
```
🔍 Verifying access token...
✅ Token verified successfully: user@example.com
```

If you see errors, check:
- Network tab for failed requests
- CORS errors
- Auth service is reachable

## Troubleshooting

### Still redirecting to profile page?

1. **Clear browser cache completely**
2. **Close ALL tabs and reopen**
3. **Try incognito mode**
4. **Check console logs** - should show redirect URL

### "undefined" environment variables?

Run:
```javascript
window.authDev.checkConfig()
```

If you see `undefined` → **Restart dev server!**

### Cookies not persisting?

Check:
```javascript
window.authDev.viewCookies()
```

Make sure you see both tokens.

### Auth service unreachable?

Keep using dev mode:
```env
VITE_SKIP_AUTH_VERIFICATION=true
```

## What to Provide if Still Having Issues

1. **Console logs** - Screenshot of console when visiting `/account`
2. **Network tab** - Screenshot showing the verify request (or lack thereof)
3. **Environment check** - Output of `window.authDev.checkConfig()`
4. **Cookie check** - Output of `window.authDev.viewCookies()`

## Files Changed

- ✅ `src/store/authStore.ts` - Better error handling, don't clear cookies on failure
- ✅ `src/services/externalAuthService.ts` - Added dev mode and error logging
- ✅ `src/components/auth/ProtectedRoute.tsx` - Added logging
- ✅ `src/utils/authDevUtils.ts` - NEW: Dev utilities
- ✅ `src/main.tsx` - Load dev utilities
- ✅ `.env` - Added VITE_SKIP_AUTH_VERIFICATION flag

## Next Steps

Once local testing works:
1. Set `VITE_SKIP_AUTH_VERIFICATION=false`
2. Ensure auth service has proper CORS
3. Test with real tokens
4. Implement proper login flow

For more details, see [LOCAL-AUTH-TESTING.md](./LOCAL-AUTH-TESTING.md)
