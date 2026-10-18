# Production Deployment Guide: Render & MongoDB Atlas

This document outlines the step-by-step production deployment procedure for **PlayNear** (Next.js frontend in `/client`, Express & Socket.IO backend in `/server`) on **Render** paired with **MongoDB Atlas**.

---

## Architecture Overview

```
+-------------------------------------------------------------------------+
|                              USER BROWSER                               |
+-------------------------------------------------------------------------+
                    |                                  |
           (HTTPS Requests)                    (WSS / API with Cookies)
                    v                                  v
+------------------------------------+   +------------------------------------+
|        Render Web Service          |   |        Render Web Service          |
|         (Client Frontend)          |   |          (Server Backend)          |
|       Next.js 14 (App Router)      |   |       Express + Socket.IO v4       |
|  https://playnear-app.onrender.com |   |  https://playnear-api.onrender.com |
+------------------------------------+   +------------------------------------+
                                                       |
                                           (Mongoose over TLS)
                                                       v
                                         +----------------------------+
                                         |    MongoDB Atlas Cluster   |
                                         |    (Database: playnear_db) |
                                         +----------------------------+
```

---

## 1. Database Provisioning: MongoDB Atlas

1. **Create an Atlas Account & Cluster**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/atlas) and sign in.
   - Create a free **M0 Sandbox** or dedicated cluster (select a region close to your Render server, e.g., `ap-south-1` Mumbai, `us-east-1` N. Virginia, or `eu-central-1` Frankfurt).
2. **Configure Database User**:
   - In Atlas Sidebar $\rightarrow$ **Security** $\rightarrow$ **Database Access**.
   - Click **Add New Database User**.
   - Authentication Method: **Password**.
   - Set Username (e.g. `playnear_admin`) and generate a secure password.
   - Database User Privileges: `Read and write to any database`.
3. **Configure Network Whitelist**:
   - In Atlas Sidebar $\rightarrow$ **Security** $\rightarrow$ **Network Access**.
   - Click **Add IP Address**.
   - Select **Allow Access from Anywhere** (`0.0.0.0/0`).
   - *(Note: Render dynamic cloud IPs require `0.0.0.0/0` so your Express instances can communicate with Atlas).*
4. **Obtain Connection URI**:
   - In Atlas Sidebar $\rightarrow$ **Database** $\rightarrow$ Click **Connect**.
   - Select **Drivers** (Node.js).
   - Copy the SRV connection string:
     ```
     mongodb+srv://playnear_admin:<password>@cluster0.abcde.mongodb.net/playnear_platform_db?retryWrites=true&w=majority
     ```
   - Replace `<password>` with your database user password, and ensure the database name at the end is set to `playnear_platform_db`.

---

## 2. Environment Variables Reference Tables

### Server (`/server`) Environment Variables

| Variable Name | Required | Default / Example Value | Description |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | **Yes** | `production` | Enables production security, `sameSite: "none"` and `secure: true` cookies. |
| `PORT` | Auto | `5000` (Render sets automatically) | Port Express listens on (bound to host `0.0.0.0`). |
| `MONGODB_URI` | **Yes** | `mongodb+srv://user:pass@cluster.mongodb.net/playnear_platform_db?retryWrites=true&w=majority` | Connection string to MongoDB Atlas. |
| `JWT_SECRET` | **Yes** | Random 32+ character secret | Cryptographic key for JWT authentication cookies and tokens. |
| `JWT_EXPIRES_IN` | No | `7d` | Token session lifetime (e.g. `7d`, `24h`). |
| `CLIENT_URL` | **Yes** | `https://playnear-app.onrender.com` | Allowed frontend origin(s) for CORS. Comma-separated if multiple (e.g. `https://playnear-app.onrender.com,http://localhost:3000`). |
| `ADMIN_EMAIL` | No | `admin@playnear.com` | Initial admin account email used by `npm run seed`. |
| `ADMIN_PASSWORD` | No | `AdminPass123!` | Initial admin account password used by `npm run seed`. |
| `SMTP_HOST` | No | `smtp.gmail.com` | Optional email server host for verification/reset emails. |
| `SMTP_PORT` | No | `587` | Optional email server port. |
| `SMTP_USER` | No | `your-email@gmail.com` | Optional email user. |
| `SMTP_PASS` | No | `your-app-password` | Optional email app password. |
| `EMAIL_FROM` | No | `PlayNear <noreply@playnear.com>` | Sender address for transactional emails. |

---

### Client (`/client`) Environment Variables

| Variable Name | Required | Default / Example Value | Description |
| :--- | :---: | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | **Yes** | `https://playnear-api.onrender.com/api/v1` | Full public URL to backend REST API (must end in `/api/v1`). |
| `NEXT_PUBLIC_SOCKET_URL` | No | `https://playnear-api.onrender.com` | Real-time WebSocket server URL (defaults to origin of `NEXT_PUBLIC_API_URL`). |
| `PORT` | Auto | `3000` (Render sets automatically) | Port Next.js binds to. |

---

## 3. Deploying the Backend on Render (Web Service)

1. Log into your [Render Dashboard](https://dashboard.render.com).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your GitHub repository:
   `https://github.com/varunmittapalli96-wq/Local-Sports-Indoor-Games-Partner-Finder-Platform.git`
4. Configure the Web Service settings:
   - **Name**: `playnear-api` (or your preferred name)
   - **Region**: Choose the same region as your MongoDB Atlas cluster (e.g., Singapore, Frankfurt, Oregon, Ohio).
   - **Branch**: `main`
   - **Root Directory**: `server`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start` *(runs `node dist/index.js`)*
5. Click **Advanced** and set:
   - **Health Check Path**: `/health`
6. Add the following **Environment Variables** in the Render settings:
   - `NODE_ENV`: `production`
   - `MONGODB_URI`: `<your MongoDB Atlas connection string>`
   - `JWT_SECRET`: `<generate a secure random 32+ character string>`
   - `CLIENT_URL`: `https://playnear-app.onrender.com` *(use your frontend Render URL once assigned)*
   - `ADMIN_EMAIL`: `admin@playnear.com`
   - `ADMIN_PASSWORD`: `<your-custom-admin-password>`
7. Click **Create Web Service**.
8. Once built and running, verify the backend:
   - Navigate to `https://playnear-api.onrender.com/health` $\rightarrow$ should return `{"status":"ok"}`.
   - Navigate to `https://playnear-api.onrender.com/api/docs` $\rightarrow$ should display Swagger UI.

---

## 4. Deploying the Frontend on Render (Web Service)

1. In the [Render Dashboard](https://dashboard.render.com), click **New +** $\rightarrow$ **Web Service**.
2. Select the same repository:
   `https://github.com/varunmittapalli96-wq/Local-Sports-Indoor-Games-Partner-Finder-Platform.git`
3. Configure the Web Service settings:
   - **Name**: `playnear-app`
   - **Region**: Same region as backend.
   - **Branch**: `main`
   - **Root Directory**: `client`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start` *(runs `next start -p $PORT`)*
4. Add the following **Environment Variables**:
   - `NODE_ENV`: `production`
   - `NEXT_PUBLIC_API_URL`: `https://playnear-api.onrender.com/api/v1`
   - `NEXT_PUBLIC_SOCKET_URL`: `https://playnear-api.onrender.com`
5. Click **Create Web Service**.
6. Once deployed, copy your client URL (e.g., `https://playnear-app.onrender.com`).
7. **Important**: Go back to your Backend Web Service settings on Render and verify that `CLIENT_URL` matches your frontend URL `https://playnear-app.onrender.com`.

---

## 5. Seeding the Database on MongoDB Atlas

The seed script initializes the 10 core sports/indoor games, demo communities, active game preferences, and the initial Administrator account. It has built-in safety guards to prevent accidental deletion of production data.

### Option A: From your Local Terminal (Recommended)

Run the seed script against your Atlas cluster from your local terminal with confirmation:

```bash
cd server
npm run build
$env:MONGODB_URI="mongodb+srv://playnear_admin:<password>@cluster0.abcde.mongodb.net/playnear_platform_db?retryWrites=true&w=majority"
$env:CONFIRM_SEED="true"
$env:ADMIN_EMAIL="admin@playnear.com"
$env:ADMIN_PASSWORD="YourStrongAdminPassword123!"
npm run seed
```

*(On macOS/Linux bash: use `export MONGODB_URI="..."` before running `npm run seed`)*

### Option B: Using the Render Shell

1. Open your backend Web Service in the Render Dashboard.
2. Click the **Shell** tab.
3. Run:
   ```bash
   CONFIRM_SEED=true npm run seed
   ```
4. Output will confirm creation of the games, communities, and admin account.

---

## 6. Verification Checklist

- [ ] **Health Endpoint**: `https://<backend-url>/health` returns `{"status":"ok"}`.
- [ ] **Swagger Documentation**: `https://<backend-url>/api/docs` opens the OpenAPI explorer.
- [ ] **CORS Check**: Frontend at `https://<frontend-url>` successfully calls `GET /api/v1/games` without CORS policy errors in the browser console.
- [ ] **Authentication & Cookies**:
  - Login at `https://<frontend-url>/login` with your admin email and password.
  - Inspect Developer Tools $\rightarrow$ Application/Storage $\rightarrow$ Cookies:
    - Cookie `token` should be present with `HttpOnly: true`, `Secure: true`, and `SameSite: None`.
- [ ] **WebSocket Connectivity**:
  - Browser console logs `[PlayNear Realtime] Connected to WebSocket server with ID: ...`.
  - Online player badge displays real-time counter.

---

## 7. Troubleshooting

### Issue: CORS error in browser (`Access to fetch at ... has been blocked by CORS policy`)
- **Fix**: Check `CLIENT_URL` in the Backend Render Web Service environment variables. It must exactly match the frontend URL without trailing slashes (e.g. `https://playnear-app.onrender.com`). If you test locally too, use `https://playnear-app.onrender.com,http://localhost:3000`.

### Issue: Login succeeds but page reloads into login (cookies not retained)
- **Fix**: Ensure both backend and frontend use HTTPS (`https://`). Cross-origin cookies (`sameSite: "none"`) are rejected by modern browsers if not served over secure HTTPS.
- Ensure `app.set("trust proxy", 1)` is active (already included in backend).

### Issue: Next.js build fails on Render
- **Fix**: Ensure `Root Directory` is set to `client` in the Render Web Service settings, and Build Command is `npm install && npm run build`.

### Issue: Seed script exits with "AUTOMATED SEED ABORTED"
- **Fix**: When running non-interactively, set the environment variable `CONFIRM_SEED=true` to confirm database re-population.
