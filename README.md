# 🚀 FolioHub — Creative Portfolio Platform

---

## 📌 About This Project

**FolioHub** is a full-featured creative portfolio platform — inspired by Behance and Awwwards — built from scratch as part of the **Future Interns Full Stack Web Development Internship (Task 1)**.

This is a **real, production-ready web application** that developers, designers, and creatives can use to:
- Showcase their projects and skills
- Get discovered by companies and recruiters
- Hire freelancers for their projects
- Connect and collaborate with other creators worldwide

---

## ✨ Features

### 🎨 Frontend
- **Landing Page** — Hero, category grid, trending projects, stats
- **Authentication** — Login & Signup with beautiful split-screen layout
- **Dashboard** — Real-time stats, bar chart, donut chart, project grid, activity feed
- **Explore Page** — Masonry grid with 5 filters + Grid/List toggle
- **Hire Page** — Freelancer listings with sidebar filters + Apply button
- **Profile Page** — Cover photo, avatar, stats bar, project portfolio
- **Settings Page** — Profile, Security, Notifications, Privacy, Appearance, Billing
- **Project Detail Modal** — Behance-style popup with comments, like/save
- **User Profile Modal** — Freelancer popup with work grid and messaging
- **Upload Modal** — Drag & drop image upload with live preview
- **Notifications** — Real-time activity feed
- **Upgrade to Pro** — Monthly & yearly pricing modal
- **Fully Responsive** — Mobile, tablet, and desktop

### ⚙️ Backend
- **REST API** — 20+ endpoints with error handling
- **JWT Authentication** — Secure login with HTTP-only cookies
- **File Uploads** — Multer for project images & avatars
- **Rate Limiting** — Brute force protection
- **Security** — Helmet, CORS, input validation

### 🗄️ Database
- **MySQL** — 10 tables with relationships
- **Real-time Stats** — Profile views, likes, followers
- **Notifications System** — Auto-generated on interactions
- **Messaging System** — User-to-user inquiries

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | HTML5, CSS3, JavaScript (Vanilla) |
| **Backend** | Node.js, Express.js |
| **Database** | MySQL 8.0 |
| **Authentication** | JWT + bcryptjs |
| **File Upload** | Multer |
| **Security** | Helmet, CORS, express-rate-limit |
| **Fonts** | Google Fonts (Syne, Figtree, DM Mono) |

---

## 📁 Project Structure

```
foliohub/
├── server.js                    # Main Express server
├── package.json                 # Dependencies
├── database.sql                 # MySQL schema + seed data
├── .env.example                 # Environment variables template
│
├── backend/
│   ├── config/
│   │   └── db.js               # MySQL connection pool
│   ├── middleware/
│   │   └── auth.js             # JWT middleware
│   └── routes/
│       ├── auth.js             # Login, register, logout
│       ├── projects.js         # CRUD, likes, comments
│       ├── users.js            # Profiles, follow, stats
│       └── misc.js             # Notifications, messages, jobs
│
├── frontend/
│   ├── index.html              # Single Page Application
│   ├── css/
│   │   └── style.css          # Dark theme styles
│   ├── js/
│   │   └── modules.js         # All frontend logic
│   └── images/                # Category images
│
└── uploads/                    # User uploaded files
    ├── projects/
    └── avatars/
```

---

## 🗄️ Database Tables

| Table | Purpose |
|---|---|
| `users` | User accounts and profiles |
| `projects` | Portfolio projects |
| `project_images` | Multiple images per project |
| `likes` | Project appreciations |
| `comments` | Project comments |
| `follows` | User follow relationships |
| `saved_projects` | Bookmarked projects |
| `notifications` | Activity notifications |
| `messages` | User-to-user messages |
| `jobs` | Job postings |
| `profile_views` | View tracking |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Login |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/auth/me` | Current user |
| GET | `/api/projects` | List with filters |
| POST | `/api/projects` | Create project |
| GET | `/api/projects/:id` | Project details |
| PUT | `/api/projects/:id` | Update project |
| DELETE | `/api/projects/:id` | Delete project |
| POST | `/api/projects/:id/like` | Toggle like |
| POST | `/api/projects/:id/save` | Toggle save |
| POST | `/api/projects/:id/comment` | Add comment |
| GET | `/api/users` | Browse freelancers |
| GET | `/api/users/:username` | Public profile |
| PUT | `/api/users/me/update` | Update profile |
| POST | `/api/users/:id/follow` | Follow/unfollow |
| GET | `/api/users/me/stats` | Dashboard stats |
| GET | `/api/notifications` | Notifications |
| POST | `/api/messages` | Send message |
| GET | `/api/jobs` | Browse jobs |
| POST | `/api/jobs` | Post job |

---

## ⚡ Setup & Installation

### Prerequisites
- **Node.js** v18+ → [nodejs.org](https://nodejs.org)
- **MySQL** v8+ → [dev.mysql.com](https://dev.mysql.com/downloads/)
- **Git** → [git-scm.com](https://git-scm.com)

### Step 1 — Clone Repository
```bash
git clone https://github.com/YOURUSERNAME/foliohub.git
cd foliohub
```

### Step 2 — Install Dependencies
```bash
npm install
```

### Step 3 — Setup Database
```bash
# Login to MySQL
mysql -u root -p

# Run schema + seed data
mysql -u root -p < database.sql

# Verify
mysql -u root -p -e "USE foliohub; SHOW TABLES;"
```

### Step 4 — Configure Environment
```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=foliohub
JWT_SECRET=foliohub_super_secret_key_2026_minimum_32_chars
UPLOAD_PATH=./uploads
NODE_ENV=development
```

### Step 5 — Run Server
```bash
npm start
```

### Step 6 — Open Browser
```
http://localhost:3000
```

---

## 🔑 Demo Accounts

| Name | Email | Password |
|---|---|---|
| Demo User | demo@foliohub.io | password123 |
| Priya Mehta | priya@example.com | password123 |
| Rohan Kumar | rohan@example.com | password123 |

---

## 🚀 Deployment

### Railway.app (Recommended — Free)
1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → Sign up with GitHub
3. **New Project** → **Deploy from GitHub** → Select `foliohub`
4. Add **MySQL** plugin
5. Set environment variables
6. Run `database.sql` on Railway MySQL
7. Site is live! 🎉

### Render.com (Free)
1. Go to [render.com](https://render.com)
2. **New Web Service** → Connect GitHub repo
3. Build: `npm install` | Start: `npm start`
4. Add environment variables

### VPS Production
```bash
npm install -g pm2
pm2 start server.js --name foliohub
pm2 startup && pm2 save
```

---

## 🔒 Security Features

- Password hashing with **bcryptjs** (10 salt rounds)
- **JWT tokens** in HTTP-only cookies (7 day expiry)
- **Rate limiting** — 200 req/15min global, 20 req/15min auth
- **Helmet** security headers
- **CORS** protection
- SQL injection prevention via **parameterized queries**
- File type validation on uploads

---

## 🤝 Connect With Me

| Platform | Link |
|---|---|
| **LinkedIn** | [Add your LinkedIn URL] |
| **GitHub** | [Add your GitHub URL] |
| **Email** | yuvrajranarmg1234@gmail.com |
| **Live Portfolio** | [Add your deployed URL] |

---

## 📝 License

MIT License — Free to use and modify.

---

## 🙏 Acknowledgements

- **Future Interns** — Internship opportunity and project guidelines
- **Behance & Awwwards** — Design inspiration
- **Unsplash** — Free images
- **Google Fonts** — Typography

---

<div align="center">

**Built with ❤️ by Yuvraj**


⭐ Star this repo if you found it helpful!

</div>
