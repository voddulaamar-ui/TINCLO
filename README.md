# � TINCLO — Job Swipe Matching Platform

**TINCLO v2 · Phase 1**

A MERN-stack job discovery platform inspired by Naukri + Tinder. Candidates swipe through jobs scored by a rule-based matching engine. Recruiters post jobs and manage applicants through a full pipeline dashboard.

---

## ✨ Phase 1 Features

| Area | What's included |
|------|----------------|
| **Auth** | JWT login/register for Candidate & Recruiter roles, protected routes |
| **Candidate Profile** | Skills, domain, experience, preferred locations, education, projects, LinkedIn/GitHub |
| **Job Matching** | Rule-based scoring — Skills 50% · Domain 20% · Location 20% · Experience 10% |
| **Job Feed** | Sorted: highest match first → newest → remaining; New/Today/Recent badges |
| **Swipe System** | Swipe right = save, left = skip; skipped jobs never shown again |
| **Application Tracker** | 6-stage pipeline: Saved → Applied → Under Review → Interview Scheduled → Offer → Rejected |
| **Recruiter Dashboard** | Post/edit/delete/close jobs (own jobs only), view applicants, update status |
| **Search & Filters** | By domain, work mode, job type, location, keyword; newest/today/week time filter |
| **Why This Matches** | Expandable card panel showing matched skills, domain, location, missing skills |
| **Recent Jobs** | New badge (24h/48h/72h), "Posted X ago" timestamps, last-visit highlight |
| **Real-time** | WebSocket push for new jobs & application status updates |
| **Admin Panel** | Full user/job/match management at `/admin` |

---

## 🏗 Tech Stack

**Frontend** — React 18 + Vite + Tailwind CSS + Socket.io-client  
**Backend** — Node.js + Express + MongoDB Atlas + Mongoose + Socket.io  
**Auth** — JWT (bcryptjs, jsonwebtoken)  
**Email** — Nodemailer (Gmail SMTP + Ethereal fallback)

---

## 📁 Project Structure

```
TINCLO-main/
├── backend/
│   ├── middleware/auth.js          # JWT middleware
│   ├── models/
│   │   ├── User.js                 # Candidate + Recruiter schema
│   │   ├── Job.js                  # Extended job schema (Phase 1)
│   │   ├── Match.js                # 6-stage tracker + match score
│   │   └── JobView.js
│   ├── routes/
│   │   ├── auth.js                 # register/login/update-candidate-profile/me
│   │   ├── jobs.js                 # Public job browse + admin CRUD
│   │   ├── matches.js              # JWT-protected, match score on create
│   │   ├── recruiter.js            # Recruiter job CRUD + applicant management
│   │   ├── users.js
│   │   ├── externalJobs.js         # JSearch API + mock fallback
│   │   ├── apply.js                # Email confirmation
│   │   ├── admin.js                # Admin-only stats
│   │   └── jobViews.js
│   ├── services/
│   │   ├── matchingService.js      # Rule-based scoring engine
│   │   └── emailService.js
│   ├── server.js
│   ├── .env                        # See variables below
│   └── package.json
└── frontend/
    ├── src/
    │   ├── App.jsx                 # Main job-browser view
    │   ├── AppRouter.jsx           # Routes + role guards
    │   ├── components/
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx       # Role selection (Candidate / Recruiter)
    │   │   ├── LandingPage.jsx
    │   │   ├── ProfilePage.jsx     # 4-tab profile (Phase 1 fields)
    │   │   ├── JobBrowser.jsx      # Match-sorted feed + filters
    │   │   ├── JobCard.jsx         # Match %, why-matches, work-mode badge
    │   │   ├── MatchesView.jsx     # Pipeline tracker
    │   │   ├── RecruiterDashboard.jsx
    │   │   ├── AdminPanel.jsx
    │   │   ├── Navigation.jsx      # Profile completeness ring
    │   │   └── ...
    │   ├── services/
    │   │   ├── ApiService.js       # All API calls
    │   │   └── MatchingService.js  # Client-side scoring
    │   ├── state/StateManager.js   # Matches state + localStorage sync
    │   └── hooks/useJobAge.js      # Time badges + last-visit
    └── package.json
```

---

## ⚙️ Getting Started

### Prerequisites

- Node.js ≥ 18
- MongoDB Atlas account (free tier works)
- Git

---

### 1 — Clone

```bash
git clone https://github.com/voddulaamar-ui/TINCLO.git
cd TINCLO-main
```

---

### 2 — Backend Setup

```bash
cd backend
npm install
```

Create / update `backend/.env`:

```env
# MongoDB Atlas connection string
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/job-swipe-matcher?retryWrites=true&w=majority

# Server
PORT=5002

# CORS — frontend origin
FRONTEND_URL=http://localhost:5173

# JWT
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d

# Email (Gmail SMTP — optional; Ethereal used as fallback)
EMAIL_USER=you@gmail.com
EMAIL_PASS=your_gmail_app_password
EMAIL_FROM=TINCLO Jobs <you@gmail.com>

# External jobs (optional — mock jobs shown when empty)
JSEARCH_API_KEY=
```

> **Gmail app password**: [https://myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)

Start the backend:

```bash
npm run dev        # development (nodemon)
# or
npm start          # production
```

Backend runs on **http://localhost:5002**

---

### 3 — Frontend Setup

```bash
cd frontend
npm install
```

Check `frontend/.env` (already configured):

```env
VITE_API_URL=http://localhost:5002/api
```

Start the frontend:

```bash
npm run dev
```

Frontend runs on **http://localhost:5173**

---

### 4 — Seed Sample Jobs (optional)

```bash
cd backend
npm run seed
```

---

## 🔑 Default Accounts

| Role | How to create |
|------|--------------|
| **Candidate** | Sign up at `/signup` → select "Job Seeker" |
| **Recruiter** | Sign up at `/signup` → select "Recruiter" |
| **Admin** | Manually set `role: "admin"` in MongoDB for a user, then log in at `/admin/login` |

---

## 🌐 Routes

| Path | Description |
|------|-------------|
| `/` | Landing page |
| `/signup` | Register (candidate or recruiter) |
| `/login` | Login (candidates + recruiters) |
| `/jobs` | Job browser (candidates only) |
| `/profile` | Candidate profile — skills, education, projects |
| `/recruiter` | Recruiter dashboard (recruiter role only) |
| `/analytics` | Job search analytics |
| `/admin/login` | Admin login |
| `/admin` | Admin panel |

---

## 🔌 Key API Endpoints

### Auth
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register (role: user \| recruiter) |
| POST | `/api/auth/login` | — | Login, returns JWT |
| PUT | `/api/auth/update-candidate-profile` | JWT | Update full Phase-1 profile |
| GET | `/api/auth/me` | JWT | Get current user profile |

### Jobs (public browse)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/jobs?search=&domain=&workMode=&jobType=` | Filtered job list |
| GET | `/api/external-jobs?query=&location=` | Live jobs (JSearch / mock) |

### Matches
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/matches` | JWT | Save a job (computes match score) |
| PATCH | `/api/matches/:id/status` | JWT | Update application status |
| DELETE | `/api/matches/:id` | JWT | Remove saved job |

### Recruiter
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/recruiter/jobs` | JWT+Recruiter | List own jobs |
| POST | `/api/recruiter/jobs` | JWT+Recruiter | Create job |
| PUT | `/api/recruiter/jobs/:id` | JWT+Recruiter | Edit job |
| PATCH | `/api/recruiter/jobs/:id/status` | JWT+Recruiter | Open/close job |
| DELETE | `/api/recruiter/jobs/:id` | JWT+Recruiter | Delete job |
| GET | `/api/recruiter/jobs/:id/applicants` | JWT+Recruiter | List applicants |
| PATCH | `/api/recruiter/applications/:id/status` | JWT+Recruiter | Update applicant stage |

---

## 🎯 Match Scoring

```
Score = Skills (50%) + Domain (20%) + Location (20%) + Experience (10%)
```

- **Skills**: fraction of required skills found in candidate's skills list
- **Domain**: fuzzy match between job domain and candidate's preferred domain
- **Location**: candidate's preferred locations include job location (or job is Remote)
- **Experience**: candidate's years fit within the job's required range

Computed server-side on `POST /api/matches` and client-side for instant display.

---

## 📱 Android / Capacitor

The project includes an Android build via Capacitor. See `frontend/ANDROID.md` for build instructions.

---

## � License

MIT — built with ❤️ by [Amar Voddula](mailto:voddulaamar@gmail.com)
