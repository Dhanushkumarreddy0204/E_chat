# ⚡ EChat — Real-Time Social & Messaging Platform

EChat is a production-grade, full-stack real-time social networking and messaging platform combining Instagram, WhatsApp, and Messenger experiences into a unified, responsive application.

Built with **FastAPI**, **MongoDB Atlas (Motor & GridFS)**, **React 18**, **Tailwind CSS**, and **WebSockets**.

---

## 🌟 Key Features

- ☁️ **MongoDB Atlas Cloud Database & GridFS:** Fully cloud-hosted database architecture using MongoDB Atlas with native GridFS media streaming for all user-uploaded photos, videos, and files.
- 🔐 **Authentication & Security:** JWT-based authentication, bcrypt password hashing, session recovery, credential-masking in logs, and granular access controls.
- 🏠 **Dynamic Home Feed:** Multi-media posts (photos/videos), captions, hashtag filtering, double-tap like animations, comment threads, and bookmarks.
- ⏱️ **Stories System (24-Hour Expiration):** Photo/video stories, auto-progress timers, pause on hold, story reactions, and direct replies into messaging.
- 💬 **Real-Time WebSockets Messaging:** 
  - 1-to-1 & Group Conversations
  - Instant live messaging without page refresh
  - Real-time typing indicators
  - Emoji reactions on message bubbles
  - Read receipts (double checkmarks)
  - Photo, video, and file attachments
- 👥 **Social Graph & Presence:** Follow/unfollow creators, follower/following statistics, and live online/offline presence indicators.
- 🔔 **Live Push Notifications:** Instant WebSocket alerts for likes, comments, follows, mentions, and story reactions.
- 🔎 **Search & Discovery:** Instant lookup for users, hashtags, topics, and explore media feed.
- 🎨 **Sleek Modern UI:** Glassmorphism, neon gradient highlights, custom dark mode, responsive 3-panel desktop layout and mobile bar navigation.
- 🐳 **Containerized Deployment:** Docker Compose deployment configured directly with MongoDB Atlas (no heavy local database containers required).

---

## ☁️ MongoDB Atlas Configuration Guide

EChat connects directly to **MongoDB Atlas** for both application data and media file storage (GridFS). Follow these steps to configure your Atlas cluster:

### Step 1: Create or Access Your Cluster
1. Sign in to your [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Locate or create your cluster (e.g. `echatcluster.lkhvkjw.mongodb.net` or `EChatCluster`).

### Step 2: Create a Database User
1. In the Atlas sidebar, navigate to **Security** → **Database Access**.
2. Click **Add New Database User**.
3. Select **Password** authentication.
4. Set a username (e.g., `echat_admin`) and a secure password.
5. Under **Database User Privileges**, assign `Read and write to any database` (or `Built-in Role: readWriteAnyDatabase`).
6. Click **Add User**.

### Step 3: Configure Network Access (IP Whitelist)
1. In the Atlas sidebar, navigate to **Security** → **Network Access**.
2. Click **Add IP Address**.
3. For cloud deployment (or dynamic IPs), select **Allow Access from Anywhere** (`0.0.0.0/0`), or specify your deployment server's static IP.
4. Confirm and save the configuration.

### Step 4: Obtain Connection String
1. In the Atlas sidebar, navigate to **Deployment** → **Database**.
2. Click **Connect** on your cluster.
3. Select **Drivers** (Python / Motor / PyMongo).
4. Copy the connection string, which will look like:
   ```
   mongodb+srv://<db_username>:<db_password>@echatcluster.lkhvkjw.mongodb.net/?retryWrites=true&w=majority
   ```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root or inside `backend/` by copying `.env.example`:

```bash
cp .env.example .env
```

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `MONGODB_URL` | MongoDB Atlas SRV connection string | `mongodb+srv://<username>:<password>@echatcluster.lkhvkjw.mongodb.net/?retryWrites=true&w=majority` |
| `DATABASE_NAME` | Target database name on the Atlas cluster | `EChatCluster` |
| `SECRET_KEY` | JWT secret key for token issuance & signing | Random 64-char string |
| `BACKEND_URL` | Public-facing backend service URL | `http://localhost:8000` |
| `BACKEND_CORS_ORIGINS` | Comma-separated allowed frontend origins | `http://localhost:3000,http://localhost:5173` |

> [!IMPORTANT]
> Never commit actual `.env` files, passwords, or JWT secrets to Git. Both `.env` and `backend/.env` are automatically ignored by `.gitignore`.

---

## 🚀 Deployment with Docker Compose

Run the entire stack (FastAPI Backend + React Frontend + Nginx Reverse Proxy) connected to MongoDB Atlas:

1. Create your root `.env` file with your Atlas credentials:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your `<db_username>` and `<db_password>`.

2. Launch the containers:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - **Frontend Application:** [http://localhost:3000](http://localhost:3000)
   - **FastAPI Backend & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Check Endpoint:** [http://localhost:8000/health](http://localhost:8000/health)

---

## 💻 Local Development Setup

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv

# Activate Virtual Environment
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies (includes motor, pymongo[srv], dnspython)
pip install -r requirements.txt

# Configure backend/.env
cp .env.example .env
# Edit .env with your MongoDB Atlas credentials

# Optional: Seed initial demo users & posts to your Atlas cluster
python -m app.seed

# Start FastAPI dev server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (React 18 + Vite)

```bash
cd frontend
npm install
npm run dev
```

The frontend development server runs at [http://localhost:5173](http://localhost:5173).

---

## 👥 Demo Accounts (Seeded via `python -m app.seed`)

When you run `python -m app.seed`, the following accounts are provisioned on your MongoDB Atlas cluster (Password: `password123`):

| Username | Full Name | Role |
| :--- | :--- | :--- |
| `dhanush` | Dhanush Kumar | Full-Stack Architect |
| `sarah_designer` | Sarah Jenkins | Lead Product Designer |
| `alex_tech` | Alex Rivera | Distributed Systems Engineer |
| `elena_travel` | Elena Rostova | Travel Photographer |

---

## 🏗️ Architecture Overview

```
                        ECHAT
                          │
            ┌─────────────┴─────────────┐
            │                           │
         Frontend                    Backend
      React 18 + Vite                FastAPI
            │                           │
            │                  ┌────────┼────────┐
            │                  │        │        │
            │                Auth      Chat    Social
            │                  │        │        │
            │                  └────────┼────────┘
            │                           │
            │                  MongoDB Atlas Cluster
            │                  ├─ Collections (Users, Posts, Chats)
            │                  └─ GridFS (Images, Videos, Media)
            │
            └────── REST API & WebSockets
```

---

## 🔒 Security Best Practices

1. **Credential Masking in Logs:** The database manager automatically masks database user passwords in all log outputs (`mongodb+srv://user:****@...`).
2. **DNS & SRV Protocol:** Built-in support for `dnspython` ensures secure TLS/SRV cluster discovery and automatic replica set failover.
3. **CORS Restrictions:** Configured with specific allowed origins instead of wildcards when authentication credentials are used.
4. **GridFS Media Storage:** User media files are stored directly in MongoDB GridFS, eliminating unmanaged disk storage on application servers.
