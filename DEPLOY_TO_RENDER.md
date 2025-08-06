# 🚀 Deploy PDF Field Extractor to Render

## Prerequisites
- GitHub account
- Render account (free tier works)
- Git installed locally

## Step 1: Prepare the Code

### 1.1 Initialize Git Repository
```bash
cd /Users/hugo/Desktop/pdf-field-extractor
git init
git add .
git commit -m "Initial commit - PDF Field Extractor"
```

### 1.2 Create GitHub Repository
1. Go to [GitHub](https://github.com/new)
2. Create a new repository named `pdf-field-extractor`
3. Don't initialize with README (we already have one)

### 1.3 Push to GitHub
```bash
git remote add origin https://github.com/YOUR_USERNAME/pdf-field-extractor.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy to Render

### Option A: One-Click Deploy (Recommended)

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **New +** → **Web Service**
3. Connect your GitHub account if not already connected
4. Select your `pdf-field-extractor` repository
5. Configure the service:

   **Basic Settings:**
   - **Name**: `pdf-field-extractor`
   - **Region**: Choose closest to you
   - **Branch**: `main`
   - **Root Directory**: Leave empty (we use root)
   - **Runtime**: `Docker`
   - **Instance Type**: `Free`

   **Advanced Settings:**
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Build Context Directory**: `.`

6. Click **Create Web Service**

### Option B: Using render.yaml

1. Update the `render.yaml` file with your GitHub username
2. Go to [Render Dashboard](https://dashboard.render.com/blueprints)
3. Click **New Blueprint Instance**
4. Connect your repository
5. Render will automatically detect `render.yaml` and deploy

## Step 3: Environment Variables (Optional)

If you want to restrict CORS, add these environment variables in Render:

1. Go to your service's dashboard
2. Click **Environment** tab
3. Add:
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://your-app.onrender.com` (if deploying frontend separately)

## Step 4: Verify Deployment

Once deployed, your app will be available at:
```
https://pdf-field-extractor.onrender.com
```

Test it by:
1. Opening the URL in your browser
2. Uploading a PDF
3. Extracting field names

## 🎯 What Render Provides

- **Free Tier**: 750 hours/month (perfect for this app)
- **Automatic HTTPS**: SSL certificate included
- **Auto-deploy**: Pushes to GitHub trigger new deployments
- **Docker Support**: Our Dockerfile handles pdftk installation
- **Static Site Hosting**: Frontend served directly

## 📝 Important Notes

### Free Tier Limitations
- Service spins down after 15 minutes of inactivity
- First request after spin-down takes ~30 seconds
- 100GB bandwidth/month (more than enough)

### pdftk Installation
The Dockerfile automatically installs pdftk, so it works out of the box on Render.

### File Uploads
Temporary files are stored in `/tmp` which Render provides. Files are automatically cleaned up after processing.

## 🔧 Troubleshooting

### Build Fails
Check the build logs in Render dashboard. Common issues:
- Missing dependencies in package.json
- Dockerfile syntax errors

### 502 Bad Gateway
- Service is likely starting up (wait 30 seconds)
- Check logs for startup errors

### CORS Errors
If frontend is hosted separately:
1. Add `FRONTEND_URL` environment variable
2. Restart the service

### pdftk Not Found
- Ensure Dockerfile includes pdftk installation
- Check build logs for installation errors

## 🚀 Advanced: Custom Domain

1. Go to service **Settings** → **Custom Domains**
2. Add your domain
3. Configure DNS as instructed
4. HTTPS automatically configured

## 📊 Monitoring

Render provides:
- Real-time logs
- Metrics dashboard
- Health check monitoring
- Bandwidth usage

Access via your service dashboard.

## 🔄 Updates

To deploy updates:
```bash
git add .
git commit -m "Update description"
git push
```

Render automatically redeploys on push!

## 💡 Tips

1. **Performance**: Upgrade to paid tier ($7/month) to avoid spin-downs
2. **Logs**: Use `console.log` for debugging, visible in Render logs
3. **Health Check**: Already configured in Dockerfile
4. **Scaling**: Can easily scale to multiple instances on paid tier

## 📞 Support

- [Render Documentation](https://render.com/docs)
- [Render Community](https://community.render.com)
- Check logs first - most issues are visible there

---

## Quick Start Commands

```bash
# Clone (if needed)
git clone https://github.com/YOUR_USERNAME/pdf-field-extractor.git

# Make changes
cd pdf-field-extractor
# ... edit files ...

# Deploy updates
git add .
git commit -m "Your update message"
git push

# View logs (after deployment)
# Go to Render Dashboard → Your Service → Logs
```

That's it! Your PDF Field Extractor is now live on Render! 🎉