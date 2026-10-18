# PlayNear - Production Deployment Guide

This guide details instructions for deploying **PlayNear** to modern cloud hosting platforms: **Vercel** (Frontend), **Render / AWS / Fly.io** (Backend API), and **MongoDB Atlas** (Database), as well as running the multi-container Docker stack locally.

---

## 1. Database Provisioning: MongoDB Atlas

1. Log in to [MongoDB Atlas](https://www.mongodb.com/atlas).
2. Create a new Cluster (e.g. M0 Free Tier in `ap-south-1` Mumbai or your preferred region).
3. Under **Database Access**, create a user with Read/Write privileges:
   - Username: `playnear_admin`
   - Password: `<secure-password>`
4. Under **Network Access**, add IP address whitelist:
   - For Render/Vercel serverless traffic, add `0.0.0.0/0` (Allow Access from Anywhere).
5. In **Database Deployments**, click **Connect** $\rightarrow$ **Drivers** (Node.js) and copy the URI:
   ```env
   MONGODB_URI=mongodb+srv://playnear_admin:<password>@cluster0.mongodb.net/playnear_platform_db?retryWrites=true&w=majority
   ```
   *(Note: Ensure the database name is `playnear_platform_db`).*
6. Seed the Atlas database using the repository seed script:
   ```bash
   cd server
   MONGODB_URI="your-atlas-uri" npm run seed
   ```

---

## 2. Backend Deployment: Render.com / AWS / Fly.io

### Deploying to Render.com (Web Service)
1. Link your GitHub repository in Render.
2. Select **New Web Service**, choose **Root Directory**: `server`.
3. Set **Runtime**: `Node`.
4. Configure Build & Start Commands:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node dist/index.js`
5. Configure Environment Variables in Render Dashboard:
   ```env
   PORT=5000
   NODE_ENV=production
   MONGODB_URI=mongodb+srv://playnear_admin:<password>@cluster0.mongodb.net/playnear_platform_db?retryWrites=true&w=majority
   JWT_SECRET=super_secret_playnear_jwt_key_replace_in_production_32chars!
   JWT_EXPIRES_IN=7d
   CLIENT_URL=https://your-playnear-frontend.vercel.app
   EMAIL_FROM=no-reply@playnear.local
   ```
6. Click **Deploy Web Service**.
7. Note down your backend URL (e.g., `https://playnear-api.onrender.com`).

---

## 3. Frontend Deployment: Vercel

1. Log in to [Vercel](https://vercel.com) and click **Add New Project**.
2. Import your GitHub repository.
3. In **Root Directory**, click Edit and select `client`.
4. Vercel automatically detects **Next.js**.
5. Configure Environment Variables in Vercel:
   ```env
   NEXT_PUBLIC_API_URL=https://playnear-api.onrender.com/api/v1
   NEXT_PUBLIC_MAP_DEFAULT_LAT=12.9716
   NEXT_PUBLIC_MAP_DEFAULT_LNG=77.5946
   ```
6. Click **Deploy**. Vercel will build the optimized App Router pages and assign a live production URL.

---

## 4. Local Deployment with Docker Compose

To run the entire full-stack application (MongoDB + Express Backend + Next.js Frontend) in local containers with a single command:

```bash
docker compose up --build
```

- **Frontend**: Accessible at `http://localhost:3000`
- **Backend API**: Accessible at `http://localhost:5000/api/v1`
- **Interactive Swagger Docs**: Accessible at `http://localhost:5000/api/docs`
- **Health Check**: Accessible at `http://localhost:5000/api/health`

To stop the containers:
```bash
docker compose down
```
