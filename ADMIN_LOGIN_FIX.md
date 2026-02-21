# Admin Login Fix

## Issue
Admin login was failing because the token wasn't being stored in localStorage before the verify-admin API call.

## What Was Fixed

### Before:
- Token was received from login but not stored
- verify-admin call tried to manually set Authorization header
- API interceptor couldn't find token in localStorage
- Request failed with authentication errors

### After:
- Token is stored in localStorage immediately after successful login
- verify-admin call uses the token from localStorage (via interceptor)
- If verification fails, token is removed for security
- Proper error handling throughout

## Admin Login Flow

1. **User enters credentials:**
   - Email
   - Password
   - Admin Secret Key

2. **Backend validates:**
   - Login with email/password → Returns token + user data
   - Check if user role is 'admin'
   - Verify admin secret matches `ADMIN_SECRET` environment variable

3. **Frontend handles:**
   - Store token in localStorage
   - Call verify-admin endpoint with token
   - If verified, store user data and redirect to admin dashboard
   - If failed, remove token and show error

## Required Environment Variables

### Backend (Render):
- `ADMIN_SECRET` - Secret key for admin verification
- `JWT_SECRET` - For token generation
- `MONGODB_URI` - Database connection

### Frontend (Vercel):
- `VITE_API_URL` - Backend URL (e.g., `https://tutnet-1.onrender.com`)

## Testing Admin Login

### Step 1: Verify Admin User Exists
You need an admin user in your database. You can:
- Use the seed script: `cd server && node scripts/seed.js`
- Or register manually with admin role + admin secret

### Step 2: Set Environment Variables
**In Render:**
- `ADMIN_SECRET` = Your secret key (e.g., "my-secret-admin-key-123")

**In Vercel:**
- `VITE_API_URL` = `https://tutnet-1.onrender.com`

### Step 3: Test Login
1. Go to `/admin-login` page
2. Enter admin email and password
3. Enter the admin secret key (must match `ADMIN_SECRET` in Render)
4. Should successfully login and redirect to admin dashboard

## Common Issues

### "Access denied. This is not an admin account"
- The user you're logging in with doesn't have `role: 'admin'`
- Solution: Create an admin user or update existing user's role

### "Invalid admin secret key"
- The secret you entered doesn't match `ADMIN_SECRET` in Render
- Solution: Check Render environment variables and use the correct secret

### "Not authorized, token failed"
- Token is invalid or expired
- Solution: Try logging in again

### 404 Error on verify-admin
- Backend route not found
- Solution: Verify backend is deployed and routes are loaded

## API Endpoints Used

1. `POST /api/auth/login`
   - Body: `{ email, password }`
   - Returns: `{ token, user }`

2. `POST /api/auth/verify-admin`
   - Requires: Authorization header with Bearer token
   - Body: `{ adminSecret }`
   - Returns: `{ verified: true/false }`

## Security Notes

- Admin secret is verified server-side
- Token is required for verify-admin endpoint
- Token is removed from localStorage if verification fails
- Only users with `role: 'admin'` can verify admin secret

