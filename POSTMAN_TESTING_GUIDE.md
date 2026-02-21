# Postman Testing Guide for Tutnet API

## Quick Start

1. **Import the Collection**
   - Open Postman
   - Click "Import" button
   - Select `Tutnet_API_Collection.postman_collection.json`
   - The collection will be imported with all endpoints pre-configured

2. **Base URL**
   - The collection uses `https://tutnet-1.onrender.com` as the base URL
   - You can change it in the collection variables if needed

## Testing Flow

### Step 1: Test Health Check (No Auth Required)
- Run "Health Check" or "Root Endpoint"
- Should return 200 OK

### Step 2: Register/Login to Get Token
- **Register a Student**: Use "Register User (Student)"
- **Register a Tutor**: Use "Register User (Tutor)"
- **Login**: Use "Login" with your credentials

**Important**: The collection automatically saves your token after login/register. The token is stored in the `token` variable and will be used in subsequent requests.

### Step 3: Test Protected Endpoints
Once you have a token, you can test:
- **Get Current User**: `GET /api/auth/me` (requires token)
- **Tutor Endpoints**: Requires tutor role
- **Student Endpoints**: Requires student role
- **Admin Endpoints**: Requires admin role

## Common Error Codes

### 401 Unauthorized
- **Cause**: Missing or invalid token
- **Solution**: 
  - Make sure you've logged in first
  - Check that the token is set in collection variables
  - Verify the Authorization header format: `Bearer <token>`

### 403 Forbidden
- **Cause**: Wrong user role for the endpoint
- **Examples**:
  - Student trying to access tutor-only endpoints
  - Tutor trying to access admin-only endpoints
- **Solution**: 
  - Use the correct user role for each endpoint
  - Check the endpoint requirements in the collection

### CORS Errors
- **Cause**: Frontend origin not allowed
- **Note**: Postman doesn't have CORS restrictions, but your frontend might
- **Solution**: Check `server.js` CORS configuration and add your frontend URL

## Endpoint Requirements

### Public Endpoints (No Auth)
- `GET /api/health`
- `GET /`
- `GET /api/tutors` (list all tutors)
- `GET /api/tutors/:id` (get specific tutor)
- `GET /api/reviews/tutor/:tutorId` (get tutor reviews)
- `POST /api/auth/register`
- `POST /api/auth/login`

### Protected Endpoints (Require Token)
- `GET /api/auth/me` - Any authenticated user
- `GET /api/tutors/me` - Tutor role only
- `PUT /api/tutors/profile` - Tutor role only
- `PATCH /api/tutors/profile/submit` - Tutor role only
- `POST /api/bookings` - Student role only
- `GET /api/bookings/mine` - Any authenticated user
- `PATCH /api/bookings/:id/cancel` - Student role only
- `PATCH /api/bookings/:id/approve` - Tutor role only
- `PATCH /api/bookings/:id/reject` - Tutor role only
- `POST /api/reviews` - Student role only
- All `/api/admin/*` endpoints - Admin role only

## Testing Tips

1. **Use Collection Variables**
   - The collection automatically saves `token`, `userId`, `tutorId`, and `bookingId`
   - These are updated after successful requests

2. **Test Different Roles**
   - Create separate requests for student, tutor, and admin
   - Or use different Postman environments

3. **Check Response Headers**
   - Look for error messages in the response body
   - Check status codes to understand what went wrong

4. **Token Expiration**
   - If you get 401 errors after a while, your token may have expired
   - Simply login again to get a new token

## Example Testing Sequence

1. ✅ Health Check → Should work
2. ✅ Register Student → Get token
3. ✅ Get Current User → Should return student info
4. ✅ Get All Tutors → Should work (public)
5. ✅ Create Booking → Should work (student role)
6. ✅ Get My Bookings → Should work
7. ❌ Update Tutor Profile → Should fail (403 - wrong role)
8. ✅ Register Tutor → Get new token
9. ✅ Update Tutor Profile → Should work (tutor role)

## Troubleshooting Forbidden Errors

If you're getting 403 Forbidden errors:

1. **Check User Role**
   ```json
   // After login, check the response:
   {
     "user": {
       "role": "student" // or "tutor" or "admin"
     }
   }
   ```

2. **Verify Endpoint Requirements**
   - Student endpoints: `/api/bookings` (POST), `/api/reviews` (POST)
   - Tutor endpoints: `/api/tutors/me`, `/api/tutors/profile`
   - Admin endpoints: `/api/admin/*`

3. **Check Token in Headers**
   - Make sure Authorization header is: `Bearer <your-token>`
   - Token should be from a user with the correct role

4. **Test with Postman First**
   - If it works in Postman but not in frontend, it's likely a CORS issue
   - Check your frontend URL is in the CORS whitelist in `server.js`

## CORS Configuration

If your frontend is getting CORS errors, update `server/server.js`:

```javascript
app.use(cors({
    origin: [
        'http://localhost:5173',
        'https://tutnet-ffxb.vercel.app',
        'https://your-frontend-domain.com', // Add your frontend URL here
        /\.vercel\.app$/
    ],
    credentials: true
}));
```

Then redeploy your backend.

