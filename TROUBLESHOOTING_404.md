# Troubleshooting 404 Error on Render

## Issue: Getting 404 for `/api/health`

If you're getting a 404 error, it means the server is running but the routes aren't being found. Here's how to fix it:

## Step 1: Check Render Logs

1. Go to your Render dashboard
2. Click on your service (tutnet-api)
3. Go to the "Logs" tab
4. Look for:
   - `Server running on port XXXX` - confirms server started
   - `MongoDB Connected` - confirms database connection
   - `All routes loaded successfully` - confirms routes loaded
   - Any error messages

## Step 2: Test Root Endpoint First

Before testing `/api/health`, test the root endpoint:
- **URL**: `https://tutnet-1.onrender.com/`
- **Expected**: Should return "Tutor Connect API is running"

If the root endpoint works but `/api/health` doesn't, there's a route registration issue.

## Step 3: Common Issues and Fixes

### Issue A: Server Not Starting
**Symptoms**: No logs showing "Server running on port"
**Fix**: 
- Check that `MONGODB_URI` environment variable is set in Render
- Check that `JWT_SECRET` is set
- Verify the start command in render.yaml is correct

### Issue B: Routes Not Loading
**Symptoms**: Server starts but routes return 404
**Fix**:
- Check logs for "Error loading routes"
- Verify all route files exist and are properly exported
- Make sure all dependencies are installed

### Issue C: Wrong Working Directory
**Symptoms**: Module not found errors
**Fix**: 
- Verify `render.yaml` has correct paths
- The start command should be: `cd server && npm start`
- Make sure `package.json` is in the `server/` directory

### Issue D: Port Configuration
**Symptoms**: Server starts but can't connect
**Fix**:
- Render automatically sets `PORT` environment variable
- Your server.js should use `process.env.PORT || 5000`
- Don't hardcode the port

## Step 4: Verify Deployment Configuration

Check your `render.yaml`:

```yaml
services:
  - type: web
    name: tutnet-api
    runtime: node
    buildCommand: cd server && npm install
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: MONGODB_URI
        sync: false  # Must be set manually in Render dashboard
      - key: JWT_SECRET
        sync: false  # Must be set manually in Render dashboard
```

## Step 5: Manual Testing Steps

1. **Test Root Endpoint**:
   ```bash
   curl https://tutnet-1.onrender.com/
   ```
   Should return: "Tutor Connect API is running"

2. **Test Health Check**:
   ```bash
   curl https://tutnet-1.onrender.com/api/health
   ```
   Should return JSON with status: "OK"

3. **Check Server Logs**:
   - Look for any errors during startup
   - Check if MongoDB connection is successful
   - Verify routes are loading

## Step 6: Quick Fixes Applied

I've updated your `server.js` to:
- ✅ Define health check endpoint early (before routes)
- ✅ Add better error handling for route loading
- ✅ Make MongoDB connection non-blocking
- ✅ Add a helpful 404 handler with available endpoints
- ✅ Add database status to health check response

## Step 7: Redeploy

After making changes:
1. Commit your changes:
   ```bash
   git add server/server.js
   git commit -m "Fix server startup and error handling"
   git push
   ```

2. Render will auto-deploy, or manually trigger a deploy

3. Wait for deployment to complete (check logs)

4. Test again:
   - Root: `https://tutnet-1.onrender.com/`
   - Health: `https://tutnet-1.onrender.com/api/health`

## Step 8: If Still Not Working

If you're still getting 404 after redeploying:

1. **Check Render Service Status**:
   - Is the service "Live" (green)?
   - Or is it showing an error?

2. **Check Environment Variables**:
   - Go to Render dashboard → Your service → Environment
   - Verify all required variables are set:
     - `MONGODB_URI`
     - `JWT_SECRET`
     - `ADMIN_SECRET` (if used)
     - `NODE_ENV` (should be "production")

3. **Check Build Logs**:
   - Look for npm install errors
   - Check if all dependencies installed correctly

4. **Test Locally First**:
   ```bash
   cd server
   npm install
   npm start
   ```
   Then test: `curl http://localhost:5000/api/health`

## Expected Behavior

After the fix, you should see:
- ✅ Root endpoint (`/`) returns text
- ✅ Health check (`/api/health`) returns JSON
- ✅ All other routes work as expected
- ✅ Logs show "Server running on port XXXX"
- ✅ Logs show "All routes loaded successfully"

## Still Having Issues?

If the problem persists:
1. Share the Render logs (last 50-100 lines)
2. Share the exact error message you're seeing
3. Confirm which endpoint you're testing
4. Check if the service is actually running (green status in Render)

