# Vercel Frontend Setup Guide

## Issue: Frontend Getting 404 Errors

The frontend was calling `/auth/login` but the backend expects `/api/auth/login`. This has been fixed in the code, but you also need to configure the Vercel environment variable correctly.

## Step 1: Set Vercel Environment Variable

1. Go to your Vercel dashboard
2. Select your project (`tutnet-ffxb` or similar)
3. Go to **Settings** → **Environment Variables**
4. Add or update the following variable:

   **Variable Name**: `VITE_API_URL`
   
   **Value**: `https://tutnet-1.onrender.com`
   
   **Note**: The code will automatically append `/api` to this URL, so don't include `/api` in the value.

5. Make sure to set it for:
   - ✅ Production
   - ✅ Preview (optional but recommended)
   - ✅ Development (optional)

6. **Redeploy** your Vercel application after adding/updating the variable

## Step 2: Verify the Fix

After redeploying, the frontend should now:
- ✅ Call `https://tutnet-1.onrender.com/api/auth/login` (not `/auth/login`)
- ✅ Successfully authenticate users
- ✅ Work with all API endpoints

## Step 3: Test the Connection

1. Open your Vercel-deployed frontend
2. Try to login
3. Check the browser console (F12) → Network tab
4. Verify the request URL is: `https://tutnet-1.onrender.com/api/auth/login`
5. Should get a 200 OK response (not 404)

## What Was Fixed

### Before:
- If `VITE_API_URL` was set to `https://tutnet-1.onrender.com`
- Frontend called `/auth/login`
- Final URL: `https://tutnet-1.onrender.com/auth/login` ❌ (404)

### After:
- Code automatically ensures `/api` is appended
- Frontend calls `/auth/login`
- Final URL: `https://tutnet-1.onrender.com/api/auth/login` ✅ (200)

## Alternative: Manual Configuration

If you prefer to set the full URL including `/api` in Vercel:

**Variable Name**: `VITE_API_URL`
**Value**: `https://tutnet-1.onrender.com/api`

The code will handle both cases correctly now.

## CORS Configuration

Your backend CORS is already configured to allow:
- ✅ `https://tutnet-ffxb.vercel.app`
- ✅ All `*.vercel.app` domains (for preview deployments)

If your Vercel domain is different, update `server/server.js`:

```javascript
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://tutnet-ffxb.vercel.app',
        'https://your-actual-vercel-domain.vercel.app', // Add your domain here
        /\.vercel\.app$/  // This already covers all Vercel previews
    ],
    credentials: true
}));
```

Then redeploy the backend on Render.

## Troubleshooting

### Still Getting 404?
1. ✅ Check Vercel environment variable is set correctly
2. ✅ Redeploy Vercel after setting the variable
3. ✅ Check browser console Network tab to see the actual URL being called
4. ✅ Verify backend is running: `https://tutnet-1.onrender.com/api/health`

### CORS Errors?
1. ✅ Check your Vercel domain is in the CORS whitelist
2. ✅ Verify `credentials: true` is set in CORS config
3. ✅ Check browser console for specific CORS error messages

### Authentication Not Working?
1. ✅ Verify token is being saved: Check localStorage in browser DevTools
2. ✅ Check Authorization header is being sent (Network tab → Headers)
3. ✅ Verify JWT_SECRET is set in Render environment variables

