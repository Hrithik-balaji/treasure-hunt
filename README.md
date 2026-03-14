# 🏴‍☠️ Technical Treasure Hunt 2026 — MERN Stack

A full-stack pirate-themed web app for running your technical treasure hunt event.

---

## 🗂️ Project Structure

```
treasure-hunt/
├── backend/                    ← Express + MongoDB API
│   ├── server.js               ← Entry point
│   ├── .env.example            ← Copy to .env and fill in values
│   ├── models/
│   │   ├── User.js             ← Player schema + password hashing
│   │   ├── Team.js             ← Team/crew schema with join code
│   │   └── Round.js            ← Questions + submissions
│   ├── middleware/
│   │   └── auth.js             ← JWT protect + adminOnly guards
│   ├── controllers/
│   │   └── authController.js   ← Register / Login logic
│   └── routes/
│       ├── auth.js             ← /api/auth/*
│       ├── teams.js            ← /api/teams/*
│       ├── rounds.js           ← /api/rounds/*
│       ├── leaderboard.js      ← /api/leaderboard
│       └── admin.js            ← /api/admin/*
│
└── frontend/                   ← React app
    └── src/
        ├── App.js              ← Router + protected routes
        ├── context/
        │   └── AuthContext.js  ← Global auth state (login/logout)
        ├── utils/
        │   └── api.js          ← Axios instance with auto-token
        ├── styles/
        │   └── global.css      ← CSS variables + shared classes
        ├── components/
        │   └── Navbar.js       ← Top navigation
        └── pages/
            ├── Landing.js      ← Home page
            ├── Login.js        ← Login form
            ├── Register.js     ← Registration with team options
            ├── Dashboard.js    ← Player hub
            ├── RoundPage.js    ← Quiz with countdown timer
            ├── Leaderboard.js  ← Rankings + podium
            └── AdminPanel.js   ← Full admin dashboard
```

---

## 🚀 Setup Instructions

### Step 1 — Prerequisites
Make sure you have installed:
- Node.js (v18+)
- MongoDB (local) OR a free MongoDB Atlas account
- A terminal (Git Bash / Terminal / PowerShell)

---

### Step 2 — Backend Setup

```bash
# Navigate to backend folder
cd treasure-hunt/backend

# Install dependencies
npm install

# Create your environment file
cp .env.example .env

# Edit .env with your values:
# MONGO_URI = your MongoDB connection string
# JWT_SECRET = any long random string
# PORT = 5000
# CLIENT_URL = http://localhost:3000
```

Start the backend:
```bash
npm run dev     # development (auto-restarts with nodemon)
# OR
npm start       # production
```

You should see:
```
⚓ MongoDB connected – anchors aweigh!
🏴‍☠️ Server sailing on port 5000
```

---

### Step 3 — Frontend Setup

```bash
# Navigate to frontend folder
cd treasure-hunt/frontend

# Install dependencies
npm install

# Start the React dev server
npm start
```

Open http://localhost:3000 in your browser.

---

### Step 4 — Create Your Admin Account

1. Register a new account at http://localhost:3000/register
2. Open MongoDB Compass (or run this in your terminal):

```bash
# Using MongoDB shell
mongosh treasure_hunt
db.users.updateOne({ email: "your@email.com" }, { $set: { role: "admin" } })
```

3. Now log in — you'll see the ⚙ Admin link in the navbar.

---

### Step 5 — Seed the Questions

1. Log in as admin
2. Go to Admin Panel → Rounds tab
3. Click **"Seed Default Questions"**
4. All 3 rounds from the PDF are now loaded!

---

### Step 6 — Run the Event

1. **Admin Panel → Rounds** → Click **"Open Round"** when ready
2. Teams can now see and attempt the round
3. Close it when time is up
4. Check **Leaderboard** for rankings

---

## ❓ Is MongoDB Enough for Registration?

**YES — absolutely.** Here's why:

| Feature | MongoDB handles it? |
|---|---|
| User accounts (username, email, password) | ✅ Yes — User model |
| Team registration with join codes | ✅ Yes — Team model |
| Round questions & answers | ✅ Yes — Round model |
| Score tracking per team per round | ✅ Yes — embedded in Team |
| Leaderboard sorting | ✅ Yes — MongoDB sort query |
| JWT authentication | ✅ Yes — tokens stored on client |
| Admin vs player roles | ✅ Yes — `role` field on User |

MongoDB is a great fit because:
- The data is document-shaped (a team document embeds members + scores)
- No complex SQL joins needed — `.populate()` handles references
- Schema-flexible: easy to add new fields later

For a hackathon/college event with hundreds of users, MongoDB is more than sufficient.

---

## 🔑 API Endpoints

| Method | Path | Access | Description |
|---|---|---|---|
| POST | /api/auth/register | Public | Register user |
| POST | /api/auth/login | Public | Login |
| GET | /api/auth/me | Player | Get own profile |
| GET | /api/teams/my-team | Player | Get your team |
| POST | /api/teams/create | Player | Create team |
| POST | /api/teams/join | Player | Join by code |
| GET | /api/rounds | Player | Get open rounds |
| GET | /api/rounds/:num | Player | Get round questions |
| POST | /api/rounds/:num/submit | Player | Submit answers |
| GET | /api/leaderboard | Player | Get rankings |
| GET | /api/admin/stats | Admin | Dashboard stats |
| GET | /api/admin/users | Admin | All users |
| PATCH | /api/rounds/:num/toggle | Admin | Open/close round |
| POST | /api/rounds/seed | Admin | Load PDF questions |
| PATCH | /api/teams/:id/eliminate | Admin | Eliminate team |

---

## 🧠 What You Learned (MERN Concepts)

| Concept | Where used |
|---|---|
| Mongoose Schema + Model | `models/*.js` |
| Password hashing (bcrypt) | `models/User.js` pre-save hook |
| JWT generation + verification | `controllers/authController.js` + `middleware/auth.js` |
| Express middleware | `middleware/auth.js` → protect, adminOnly |
| React Context API | `context/AuthContext.js` |
| React Router v6 | `App.js` — Routes, Navigate, useParams |
| Axios interceptors | `utils/api.js` |
| useEffect + useState | Every page component |
| Protected routes | `App.js` — ProtectedRoute, AdminRoute |
| CSS Variables | `styles/global.css` |
