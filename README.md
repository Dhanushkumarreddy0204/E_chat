# ⚡ EChat — Real-Time Social & Messaging Platform

EChat is a production-grade, full-stack real-time social networking and messaging platform combining Instagram, WhatsApp, and Messenger experiences into a unified, responsive application.

Built with **FastAPI**, **MongoDB (Motor)**, **React 18**, **Tailwind CSS**, and **WebSockets**.

---

## 🌟 Key Features

- 🔐 **Authentication & Security:** JWT-based auth, secure bcrypt password hashing, session recovery, and access controls.
- 🏠 **Dynamic Home Feed:** Posts with multi-media (photos/videos), captions, hashtag filtering, double-tap like animations, comment threads, and bookmarks.
- ⏱️ **Stories System (24-Hour Expiration):** Upload photo/video stories, auto-progress timers, pause on hold, story reactions, and direct replies into messaging.
- 💬 **Real-Time WebSockets Messaging:** 
  - 1-to-1 & Group Conversations
  - Instant live messaging without page refresh
  - Real-time typing indicators
  - Emoji reactions on message bubbles
  - Read receipts (double checkmarks)
  - Photo/video/file attachments
- 👥 **Social Graph & Presence:** Follow/unfollow creators, follower/following statistics, and live online/offline presence indicators.
- 🔔 **Live Push Notifications:** Instant WebSocket alerts for likes, comments, follows, mentions, and story reactions.
- 🔎 **Search & Discovery:** Instant lookup for users, hashtags, topics, and explore media feed.
- 🎨 **Sleek Modern UI:** Glassmorphism, neon gradient highlights, custom dark mode, responsive 3-panel desktop layout and mobile bar navigation.
- 🐳 **Full Dockerized Architecture:** Single-command deployment with Docker Compose.

---

## 🚀 Quick Start with Docker

Run the entire stack (MongoDB + FastAPI + React + Nginx) with a single command:

```bash
docker-compose up --build
```

- **Frontend Application:** [http://localhost:3000](http://localhost:3000)
- **FastAPI Backend & Swagger Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **MongoDB:** `localhost:27017`

---

## 💻 Local Development Setup

### 1. Backend Setup (FastAPI)

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt

# Run seed data to populate demo accounts & posts
python -m app.seed

# Start FastAPI server
uvicorn app.main:app --reload --port 8000
```

### 2. Frontend Setup (React + Vite)

```bash
cd frontend
npm install
npm run dev
```

The frontend dev server runs at [http://localhost:5173](http://localhost:5173).

---

## 👥 Demo Accounts

The seed script (`python -m app.seed`) provisions the following instant accounts (Password: `password123`):

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
            │                        MongoDB
            │
            └────── REST API & WebSockets
```
