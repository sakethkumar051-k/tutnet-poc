# Fixing 404 Error for Admin Login Page

## The Problem
When navigating directly to `/admin-login` (or refreshing the page), Vercel returns a 404 because it's looking for a file at that path. Since this is a React Router route (client-side routing), Vercel needs to be configured to serve `index.html` for all routes.

## The Solution
I've created a `vercel.json` file in the `client/` directory that tells Vercel to rewrite all routes to `index.html`, allowing React Router to handle the routing.

## What Was Added

**File**: `client/vercel.json`
```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

## Next Steps

### 1. Verify Vercel Project Settings
Make sure your Vercel project is configured correctly:

1. Go to Vercel Dashboard → Your Project → Settings → General
2. Check **Root Directory**: Should be `client` (if deploying from monorepo) or leave empty if deploying the whole repo
3. Check **Build Command**: Should be `npm run build` (or `cd client && npm run build` if root is repo)
4. Check **Output Directory**: Should be `dist` (Vite default)

### 2. Redeploy Vercel
After the `vercel.json` file is pushed:

1. Vercel should auto-deploy, OR
2. Go to Deployments tab → Click "Redeploy" on latest deployment

### 3. Test
After redeploy:
- Navigate to: `https://tutnet-ffxb.vercel.app/admin-login`
- Should load the admin login page (not 404)
- All other routes should also work when accessed directly

## How It Works

- **Before**: Vercel tries to find `/admin-login` as a file → 404
- **After**: Vercel rewrites all requests to `/index.html` → React Router handles `/admin-login` → Page loads ✅

## Alternative: If vercel.json Doesn't Work

If you're using a different setup, you can also create a `_redirects` file in the `client/public/` directory:

**File**: `client/public/_redirects`
```
/*    /index.html   200
```

But `vercel.json` is the preferred method for Vercel.

## Troubleshooting

### Still Getting 404?
1. **Check file location**: `vercel.json` should be in the `client/` directory (or root if that's what Vercel deploys)
2. **Verify deployment**: Check Vercel build logs to ensure the file is included
3. **Clear cache**: Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
4. **Check Vercel settings**: Ensure Root Directory is set correctly

### Routes Work But API Calls Fail?
That's a different issue - check:
- `VITE_API_URL` environment variable is set in Vercel
- Backend is running and accessible
- CORS is configured correctly

