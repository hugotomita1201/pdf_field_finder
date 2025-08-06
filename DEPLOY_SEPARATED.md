# 🚀 Deploy PDF Field Extractor - Separated Frontend & Backend

This guide shows how to deploy the frontend and backend as separate services on Render for better scalability and performance.

## Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Frontend      │  HTTPS  │   Backend API   │
│  (Static Site)  │────────►│   (Docker)      │
│  onrender.com   │         │  onrender.com   │
└─────────────────┘         └─────────────────┘
```

## Step 1: Deploy Backend API

### 1.1 Create Backend Service

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect repository: `hugotomita1201/pdf_field_finder`
4. Configure:
   - **Name**: `pdf-field-finder-backend`
   - **Root Directory**: `backend`
   - **Runtime**: Docker
   - **Dockerfile Path**: `./Dockerfile.backend`
   - **Instance Type**: Free

### 1.2 Add Environment Variables

In the backend service settings, add:
- `NODE_ENV` = `production`
- `FRONTEND_URL` = `https://pdf-field-finder.onrender.com` (or your frontend URL)

### 1.3 Deploy

Click **Create Web Service**. Wait for deployment (~5 minutes).

Your backend will be at: `https://pdf-field-finder-backend.onrender.com`

## Step 2: Deploy Frontend

### 2.1 Create Static Site

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Static Site**
3. Connect repository: `hugotomita1201/pdf_field_finder`
4. Configure:
   - **Name**: `pdf-field-finder`
   - **Root Directory**: `frontend`
   - **Build Command**: `echo "window.BACKEND_URL = 'https://pdf-field-finder-backend.onrender.com';" > config.js`
   - **Publish Directory**: `.`

### 2.2 Deploy

Click **Create Static Site**. Deployment takes ~2 minutes.

Your frontend will be at: `https://pdf-field-finder.onrender.com`

## Step 3: Update Backend URL (Important!)

After both services are deployed, you need to update the frontend config:

1. Get your actual backend URL from Render dashboard
2. Update the build command in your Static Site settings:
   ```
   echo "window.BACKEND_URL = 'YOUR_ACTUAL_BACKEND_URL';" > config.js
   ```
3. Trigger a redeploy

## Alternative: Use Environment Variables

### For Frontend (Static Site)
Add a build command that creates config.js dynamically:
```bash
echo "window.BACKEND_URL = '${BACKEND_URL}';" > config.js
```

Then add environment variable:
- `BACKEND_URL` = `https://pdf-field-finder-backend.onrender.com`

## Benefits of Separated Deployment

✅ **Independent Scaling**: Scale frontend and backend separately
✅ **Better Performance**: Static files served from CDN
✅ **Cost Efficient**: Frontend uses free static hosting
✅ **Easier Updates**: Deploy frontend changes without touching backend
✅ **Better Security**: Backend can have stricter CORS policies

## URLs After Deployment

- **Frontend**: `https://pdf-field-finder.onrender.com`
- **Backend API**: `https://pdf-field-finder-backend.onrender.com`
- **Health Check**: `https://pdf-field-finder-backend.onrender.com/health`

## Testing the Deployment

1. **Test Backend**:
   ```bash
   curl https://pdf-field-finder-backend.onrender.com/health
   ```

2. **Test Frontend**:
   - Open `https://pdf-field-finder.onrender.com`
   - Upload a PDF
   - Check browser console for any CORS errors

## Troubleshooting

### CORS Errors
If you see CORS errors:
1. Check backend environment variable `FRONTEND_URL`
2. Ensure it matches your actual frontend URL
3. Restart the backend service

### API Connection Failed
1. Verify backend is running: check `/health` endpoint
2. Check frontend config.js has correct backend URL
3. Look at browser Network tab for actual request URLs

### Backend Not Starting
1. Check Render logs for Docker build errors
2. Ensure `Dockerfile.backend` is in backend folder
3. Verify pdftk installation in logs

## Local Development

For local development with separated services:

```bash
# Terminal 1 - Backend
cd backend
npm install
npm start

# Terminal 2 - Frontend
cd frontend
python -m http.server 8000
# Open http://localhost:8000
```

## Monitoring

Both services provide:
- **Logs**: Real-time in Render dashboard
- **Metrics**: CPU, Memory, Response times
- **Alerts**: Set up in Render settings

## Cost

- **Frontend (Static)**: Free forever
- **Backend (Web Service)**: Free tier (750 hours/month)
- **Total**: $0 for hobby use

## Future Improvements

1. **Add CDN**: CloudFlare for frontend
2. **Add Database**: PostgreSQL for storing extraction history
3. **Add Authentication**: Protect API endpoints
4. **Add Rate Limiting**: Prevent abuse
5. **Add Caching**: Redis for frequent PDFs

---

## Quick Reference

### Backend URL Structure
```
https://pdf-field-finder-backend.onrender.com/api/extract
```

### Frontend Config
```javascript
window.BACKEND_URL = 'https://pdf-field-finder-backend.onrender.com';
```

### CORS Settings (Backend)
```javascript
origin: process.env.FRONTEND_URL || '*'
```

That's it! Your PDF Field Extractor is now deployed with separated frontend and backend! 🎉