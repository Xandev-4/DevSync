<div align="center">

# 🔗 DevSync

**Discover developers. Match on skills. Build together.**

DevSync is a real-time developer collaboration platform where devs discover complementary peers, form hackathon teams, and collaborate — all in one place.

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)

</div>

---

## 📖 What is DevSync?

Finding hackathon teammates via random WhatsApp groups or Discord servers is noisy and unstructured. DevSync fixes that.

It replicates how teams organically form at physical hackathons — profile-based discovery, mutual interest matching, real-time chat, and a collab board — but in a scalable, persistent digital environment.

**Target users:**
- 🎓 College students looking for hackathon teammates
- 🛠️ Indie hackers seeking co-founders for side projects
- 💼 Freelancers hunting for short-term collab gigs

---

## 🌊 User Flow

```
Sign Up → Build Profile (AI Resume Parse)
  → Discovery Feed (Filter-based dev discovery)
    → Swipe Right → Mutual Match
      → Auto 1-on-1 DM
        → Either user clicks "Create Team Room"
          → Group Team Room created
            → Invite others (consent-based)
              → Team collaborates
                → Browse / Post on the Collab Board
                  → Notifications throughout
```

---

## ✨ Core Features

### 🔐 Authentication & Security
- Register / Login / Logout with JWT in HTTP-only cookies
- Access token: **15 min** | Refresh token: **7 days** with rotation
- Rate limiting on `/auth` and `/match` routes via `express-rate-limit`
- Helmet, CORS, `express-mongo-sanitize` for a hardened API
- All routes versioned under `/api/v1/`

### 👤 Intelligent Profile
- Bio, GitHub link, tech stack, role type, and structured city (Country → State → City dropdown)
- Avatar upload stored on Cloudinary
- **AI Resume Parsing** — upload a PDF (≤ 5 MB), Gemini auto-fills your skills & experience
- Manual fallback if Gemini fails — no silent errors

### 🔍 Smart Discovery Feed
- Tinder-style card stack of developer profiles
- Excludes: the logged-in user + anyone already swiped on
- **Filter by:** tech stack tags, city/state, role type
- Redis-cached per user (`feed:{userId}`, TTL: 1 hr)
- Cache invalidated on profile update, feed exhaustion, or TTL expiry
- 10 cards per page | Swipe: **Right = Interested**, **Left = Ignore**

> 🔮 V2: AI semantic matching via Gemini embeddings + skill-gap vectors

### 💘 Matching Engine
- Right swipe → `SwipeRecord { type: interested }`
- Left swipe → `SwipeRecord { type: ignored }` (prevents re-appearance)
- **Mutual match** = two `interested` records pointing at each other → both become `matched` → `Match` record created
- On match: real-time notification + **auto 1-on-1 DM created**
- Compound unique index on `(senderId, receiverId)` — no duplicates, no ghost matches

### 💬 1-on-1 Direct Messaging
- Auto-created on mutual match
- Real-time via **Socket.io** with online status, typing indicators, and read receipts
- Online presence tracked via in-memory `Set` keyed by `userId` on the Socket.io server
- Cursor-based message pagination (`?before=messageId`)
- JWT verified **once** at handshake — no per-message overhead
- WebSocket events are rate-limited against spam

### 🏠 Group Team Rooms ⭐
- Create a team room from any 1-on-1 DM
- Creator is assigned as **room owner**
- Hard cap: **6 participants** (enforced at API level, not just UI)
- **Role system inside rooms:**
  - `owner` — promotes/demotes admins, sends invites
  - `admin` — can send invites (promoted by owner)
  - `member` — default role
- Consent-based invites — only owner/admin can invite; recipient must accept
- Inside the room:
  - Real-time group messaging
  - Code snippet sharing (`type: code` + `language` field → syntax highlighting on frontend)
  - Pinned messages — capped at **10**; oldest pin auto-removed when cap exceeded
  - File sharing via Cloudinary

### 📋 Collab / Gig Board
- Public board for posting collab requests + required skill tags
- Likes are **toggleable** (stored in a separate `Like` collection, not embedded)
- Max **3 comments per user per post** — enforced at service layer; edits don't count toward limit
- Posts **auto-expire after 14 days** via a UTC `expiresAt` timestamp + daily cron job

### 🔔 Notifications
- **Dual delivery:** real-time via Socket.io + always persisted in DB
- Triggers: new match, incoming DM, group room invite, group message
- `(userId, read)` index powers unread badge count
- Auto-deleted after **30 days** via MongoDB TTL index on `createdAt`

---

## 🏗️ Architecture

DevSync uses a classic **client–server architecture** with REST for standard operations and WebSockets for real-time features.

```
┌─────────────────────────────────┐
│         React Frontend          │
│  Vite · TanStack Query · Zustand│
│     socket.io-client · Zod      │
└────────────────┬────────────────┘
                 │ HTTP / WebSocket
┌────────────────▼────────────────┐
│        Express.js Backend       │
│  Routes → Controllers → Services│
│  Socket.io Server (JWT handshake)│
│  node-cron · Winston · Middleware│
└──────┬───────────────┬──────────┘
       │               │
┌──────▼──────┐  ┌──────▼──────┐
│  MongoDB    │  │    Redis    │
│  (Mongoose) │  │  (Feed Cache)│
└─────────────┘  └─────────────┘
                       │
               ┌───────▼───────┐
               │  Cloudinary   │
               │  (Files/Media)│
               └───────────────┘
```

**State management strategy:**
- **TanStack Query** → all REST/server state
- **Zustand** → local UI state (modals, active chat, notification badge)
- **Socket.io events** → invalidate relevant TanStack Query cache keys

---

## 🛠️ Tech Stack

### Backend

| Tool | Purpose |
|------|---------|
| Node.js | Runtime |
| Express.js | HTTP framework |
| MongoDB + Mongoose | Primary database |
| Redis | Feed caching |
| Socket.io | Real-time WebSocket layer |
| JWT + bcrypt | Auth & password hashing |
| Multer + Cloudinary | File uploads & storage |
| `@google/generative-ai` | AI resume parsing (Gemini) |
| node-cron | Background jobs |
| Winston | Structured logging |
| Helmet, express-rate-limit, express-mongo-sanitize | Security middleware |

### Frontend

| Tool | Purpose |
|------|---------|
| Vite + React | Build tool & UI framework |
| Tailwind CSS + shadcn/ui | Styling & component library |
| Zustand | Local / UI state |
| TanStack Query | Server / REST state |
| React Hook Form + Zod | Forms & validation |
| Framer Motion | Animations |
| socket.io-client | WebSocket client |
| country-state-city | Bundled location data (no API call) |

---

## 🗄️ Data Models

| Model | Key Fields |
|-------|-----------|
| `User` | `email`, `passwordHash`, `role (user\|admin)`, `refreshToken` |
| `Profile` | `userId`, `bio`, `techStack[]`, `roleType`, `city { name, stateCode, countryCode }`, `avatarUrl`, `resumeUrl` |
| `SwipeRecord` | `senderId`, `receiverId`, `type (interested\|ignored\|matched)` |
| `Match` | `userA`, `userB`, `matchedAt` — stored in normalized sorted order |
| `ChatRoom` | `members[{ userId, role }]`, `type (direct\|group)`, `name`, `hackathonTag`, `pinnedMessages[]` (max 10) |
| `Message` | `chatRoomId`, `senderId`, `content`, `type (text\|code\|file)`, `language`, `status (sent\|read)` |
| `GroupInvite` | `chatRoomId`, `invitedBy`, `invitedUser`, `status (pending\|accepted\|rejected)` |
| `Post` | `authorId`, `description`, `skillTags[]`, `status (active\|expired)`, `likeCount`, `expiresAt (UTC)` |
| `Like` | `postId`, `userId` — separate collection |
| `Comment` | `postId`, `authorId`, `content`, `createdAt` |
| `Notification` | `userId`, `type`, `referenceId`, `read`, `createdAt (30-day TTL)` |

### Key DB Indexes

| Collection | Index | Reason |
|------------|-------|--------|
| `SwipeRecord` | `(senderId, receiverId)` unique | Prevents duplicate swipes |
| `Match` | `(userA, userB)` unique | Race-condition-safe match creation |
| `Profile` | `techStack`, `roleType`, `city.stateCode` | Discovery filters |
| `ChatRoom` | `members.userId` array index | "Find all rooms for this user" queries |
| `Message` | `(chatRoomId, _id)` | Cursor-based pagination |
| `Post` | `(status, expiresAt)` | Cron expiry queries |
| `Notification` | `(userId, read)` + TTL on `createdAt` | Unread badge + auto-cleanup |
| `Like` | `(postId, userId)` unique | Prevents duplicate likes |
| `Comment` | `(postId, authorId)` | Enforces 3-comment limit |

---

## 🚀 Local Setup

### Prerequisites
- Node.js (v18+)
- Docker (for MongoDB + Redis)

### 1. Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/devsync.git
cd devsync
```

### 2. Start MongoDB + Redis

```bash
docker compose up -d
```

### 3. Backend setup

```bash
cd server
npm install
cp .env.example .env   # fill in your env vars
npm run dev
```

### 4. Frontend setup

```bash
cd client
npm install
npm run dev
```

---

## 🔑 Environment Variables

Create a `.env` file in `/server`:

```env
PORT=5000

MONGODB_URI=mongodb://localhost:27017/devsync
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

GEMINI_API_KEY=your_gemini_api_key
```

---

## 📅 Development Roadmap

| Phase | Scope | Highlights |
|-------|-------|------------|
| **Phase 1** | Foundation | Repo scaffold, Docker Compose, Socket.io server, JWT handshake, logging, `/health` endpoint |
| **Phase 2** | Auth | Register/Login/Logout, JWT access + refresh tokens, refresh rotation, auth middleware |
| **Phase 3** | Profiles | `GET/PUT /me`, avatar upload, structured city field, AI resume parsing (Gemini) |
| **Phase 4** | Discovery | Aggregation pipeline, Redis feed cache + invalidation rules, swipe recording |
| **Phase 5** | Matching | Mutual detection, normalized Match model, MongoDB transaction, real-time match notification |
| **Phase 6** | 1-on-1 DM | WebSocket chat, typing indicators, read receipts, cursor pagination, event rate limiting |
| **Phase 7** | Group Rooms | Create from DM, GroupInvite model, 6-member cap, code snippets, pinned messages (max 10) |
| **Phase 8** | Post Board | Post CRUD, toggleable likes, comment cap (3/user/post), UTC expiry, daily cron job |
| **Phase 9** | Polish | Security hardening, seed script (15 dev profiles), README, E2E manual test |

---

## 🔮 Future Scope (V2+)

- 🤖 **AI Semantic Matching** — Gemini embeddings + skill-gap vectors (replaces filter feed)
- 🌍 **Geospatial Discovery** — `2dsphere` index + `$near` queries
- 📧 **Weekly Summary Emails** — cron + Nodemailer / Resend
- 🎥 **Video / Voice Huddles** — WebRTC inside team rooms
- 🐙 **GitHub Integration** — link repos directly to team rooms
- 🏆 **Hackathon Listings** — browse events and find teams in one place
- ⭐ **Reputation System** — rate teammates after a collab ends

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

---

<div align="center">
  Built with ❤️ by <a href="https://github.com/YOUR_USERNAME">S Gyan Prasad Achary</a>
</div>
