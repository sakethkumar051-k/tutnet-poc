# Fixing 404 Errors on Vercel Frontend

## Current Issue
Frontend is calling `/auth/login` instead of `/api/auth/login`, causing 404 errors.

## Root Cause
The `VITE_API_URL` environment variable is either:
1. Not set in Vercel
2. Set incorrectly (missing or wrong value)
3. The Vercel deployment hasn't picked up the latest code changes

## Solution Steps

### Step 1: Set Environment Variable in Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project (`tutnet-ffxb` or similar)
3. Go to **Settings** → **Environment Variables**
4. Click **Add New**
5. Set:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://tutnet-1.onrender.com`
   - **Environment**: Select all (Production, Preview, Development)
6. Click **Save**

**Important**: Do NOT include `/api` in the value. The code automatically adds it.

### Step 2: Redeploy Vercel Application

After setting the environment variable:

1. Go to **Deployments** tab
2. Click the **⋯** (three dots) on the latest deployment
3. Click **Redeploy**
4. Or push a new commit to trigger auto-deploy

### Step 3: Verify the Fix

1. Open your Vercel-deployed frontend
2. Open browser DevTools (F12) → **Console** tab
3. Look for log messages showing the API Base URL (in development mode)
4. Go to **Network** tab
5. Try to login
6. Check the login request:
   - **Request URL** should be: `https://tutnet-1.onrender.com/api/auth/login`
   - **Method** should be: `POST`
   - **Status** should be: `200` or `401` (not `404`)

## Debugging

### Check Current Environment Variable

In Vercel:
1. Settings → Environment Variables
2. Look for `VITE_API_URL`
3. Verify it's set to `https://tutnet-1.onrender.com` (without `/api`)

### Check Browser Console

After redeploying, open browser console and check:
- Any errors about API calls
- Network requests to see the actual URL being called

### Test Backend Directly

Verify backend is working:
```bash
curl -X POST https://tutnet-1.onrender.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test"}'
```

Should return: `{"message":"Invalid credentials"}` (not 404)

## Expected Behavior After Fix

✅ Login requests go to: `https://tutnet-1.onrender.com/api/auth/login`
✅ Status code: `200` (success) or `401` (wrong credentials)
✅ No more 404 errors
✅ User can successfully login

## If Still Not Working

1. **Clear browser cache** and hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
2. **Check Vercel build logs** for any errors
3. **Verify the environment variable** is set for the correct environment
4. **Check Network tab** to see the exact URL being called
5. **Verify backend is running**: `https://tutnet-1.onrender.com/api/health`

## Quick Test

After setting the environment variable and redeploying, test with:

```bash
# Should return JSON with status OK
curl https://tutnet-1.onrender.com/api/health
```

If this works but frontend still fails, the issue is with the Vercel environment variable configuration.

