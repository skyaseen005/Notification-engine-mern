# 🔔 Notification Prioritization Engine

> **Cyepro Solutions — Round 2: Build & Ship Test**  
> An AI-native, full-stack system that intelligently decides — for every incoming notification — whether to send it **Now**, defer it **Later**, or suppress it **Never**.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Decision Pipeline](#-decision-pipeline)
- [Project Structure](#-project-structure)
- [API Reference](#-api-reference)
- [UI Screens](#-ui-screens-7-total)
- [Getting Started](#-getting-started)
- [Environment Variables](#-environment-variables)
- [Deployment](#-deployment)
- [Fail-Safe Strategy](#-fail-safe-strategy)
- [Alert Fatigue Strategy](#-alert-fatigue-strategy)
- [Deduplication](#-deduplication)
- [AI Tools Used](#-ai-tools-used)

---

## 🧠 Overview

Modern products send notifications from dozens of sources — messages, reminders, alerts, promotions, system events — creating a compounding problem: users get overwhelmed, important notifications get buried, and trust erodes.

This engine solves it with a **layered decision pipeline**:

| Decision | Meaning |
|----------|---------|
| ✅ **NOW** | Send immediately |
| ⏰ **LATER** | Defer to an optimal time |
| 🚫 **NEVER** | Suppress entirely |

Every decision is logged with a human-readable explanation — fully auditable, explainable, and observable.

---

## 🚀 Live Demo

| Service | URL |
|---------|-----|
| Frontend | _Deploy via Vercel — see [Deployment](#-deployment)_ |
| Backend API | _Deploy via Railway/Vercel — see [Deployment](#-deployment)_ |
| Health Check | `GET /health` |

---

## 🛠 Tech Stack

### Backend
| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Framework | Express.js 4.18 |
| Database | MongoDB + Mongoose 8 |
| AI | Anthropic Claude (`claude-haiku-4-5-20251001`) |
| Security | Helmet, CORS, express-rate-limit |
| Logging | Winston |

### Frontend
| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Routing | React Router v6 |
| Charts | Recharts |
| HTTP | Axios |
| Styling | Custom CSS (dark theme, mobile-first) |

---

## 🏗 System Architecture

```
                    Incoming Notification Event
                            │
                    ┌───────▼────────┐
                    │  Ingestion API  │  POST /v1/notifications/evaluate
                    └───────┬────────┘
                            │
          ┌─────────────────▼──────────────────────┐
          │           Decision Orchestrator          │
          │                                          │
          │  [1] Validate & Normalize                │
          │  [2] Expiry Check       → NEVER          │
          │  [3] Exact Dedup        → NEVER          │
          │  [4] Near-Dedup         → NEVER          │
          │  [5] Rule Engine        → NOW/LATER/NEVER│
          │  [6] AI Scoring         → NOW/LATER/NEVER│
          │  [7] Fallback (if AI fails) → LATER      │
          └──────────────────┬─────────────────────┘
                             │
         ┌───────────────────┼──────────────────────┐
         ▼                   ▼                       ▼
   ┌───────────┐     ┌──────────────┐     ┌──────────────────┐
   │ Send Now  │     │ Scheduler    │     │  Audit Log       │
   │ (Queue)   │     │ (Send Later) │     │  (Suppressed +   │
   └───────────┘     └──────────────┘     │   all decisions) │
                                          └──────────────────┘
```

### Key Components

| Component | Responsibility |
|-----------|---------------|
| `DecisionOrchestrator` | Coordinates all services in the pipeline |
| `DeduplicationService` | Exact hash + word-overlap near-dedup |
| `RuleEngine` | Priority-ordered, human-configurable rules |
| `AIScoringService` | Claude AI with 5s timeout + graceful fallback |
| MongoDB Models | Event storage, audit log, rule config, history |

---

## ⚙️ Decision Pipeline

```
Event In
  │
  ├─ expires_at < now?              → NEVER  (stale)
  │
  ├─ Exact duplicate (SHA-256)?     → NEVER  (duplicate)
  │
  ├─ Near-duplicate (>80% overlap)? → NEVER  (near-dup)
  │
  ├─ priority_hint = "critical"?    → NOW    (bypass all limits)
  │
  ├─ Rule matched?
  │    ├─ action = NOW + fatigue OK → NOW
  │    ├─ action = NOW + fatigue ↑  → LATER  (downgraded)
  │    ├─ action = LATER            → LATER
  │    └─ action = NEVER            → NEVER
  │
  ├─ Fatigue limit hit (10/hr)?     → LATER
  │
  ├─ AI scores it (Claude Haiku)
  │    ├─ confidence + reasoning    → NOW / LATER / NEVER
  │    └─ timeout / error           → Fallback
  │
  └─ Fallback: high priority → NOW, else → LATER
```

---

## 📁 Project Structure

```
notification-engine-mern/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js           # MongoDB connection
│   │   ├── middleware/
│   │   │   └── errorHandler.js       # Global error handler
│   │   ├── models/
│   │   │   ├── NotificationEvent.js  # Raw incoming events
│   │   │   ├── NotificationDecision.js # Full audit log
│   │   │   ├── SuppressionRule.js    # Configurable rules
│   │   │   └── UserNotificationHistory.js # 24h rolling history
│   │   ├── routes/
│   │   │   ├── notifications.js      # Core decision endpoints
│   │   │   └── rules.js              # Rule CRUD endpoints
│   │   ├── services/
│   │   │   ├── decisionOrchestrator.js # Main pipeline coordinator
│   │   │   ├── ruleEngine.js         # Rule evaluation engine
│   │   │   ├── aiScoringService.js   # Claude AI integration
│   │   │   └── deduplicationService.js # Dedup logic
│   │   ├── scripts/
│   │   │   └── seedRules.js          # Default rules seed
│   │   └── server.js                 # Express entry point
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.js          # Stats + charts
│       │   ├── Simulator.js          # Test events manually
│       │   ├── AuditLog.js           # Decision history
│       │   ├── RulesManager.js       # Rule CRUD UI
│       │   ├── UserHistory.js        # Per-user fatigue view
│       │   ├── BatchProcessor.js     # Bulk evaluation
│       │   └── HealthMonitor.js      # System status
│       ├── services/
│       │   └── api.js                # Axios API client
│       ├── App.js                    # Router + sidebar layout
│       └── App.css                   # Dark-theme styles
│
└── docs/
    ├── SYSTEM_WORKFLOW.md
    ├── BUILD_PLAN.md
    ├── ARCHITECTURE_DECISIONS.md
    └── DEPLOYMENT.md
```

---

## 📡 API Reference

### Notifications

#### `POST /v1/notifications/evaluate`
Evaluate a single notification event.

**Request Body:**
```json
{
  "user_id": "user_123",
  "event_type": "message",
  "message": "You have a new message from Alex",
  "source": "chat-service",
  "priority_hint": "high",
  "channel": "push",
  "timestamp": "2025-02-25T10:00:00Z",
  "dedupe_key": "msg_9876",
  "expires_at": "2025-02-25T12:00:00Z",
  "metadata": {}
}
```

**Response:**
```json
{
  "decision": "NOW",
  "reason": "Rule \"Direct Message - Always Now\" matched",
  "decision_id": "d_abc123",
  "scheduled_for": null,
  "decision_path": "rule_engine",
  "rule_matched": "Direct Message - Always Now",
  "ai_score": null
}
```

---

#### `POST /v1/notifications/batch-evaluate`
Evaluate up to **100 events** in a single request.

**Request:** `{ "events": [ ...array of event objects... ] }`

**Response:** `{ "processed": 5, "results": [ { "event_id": "...", "status": "processed", "result": {...} } ] }`

---

#### `GET /v1/notifications/decisions`
List all decisions with optional filters.

| Query Param | Type | Description |
|------------|------|-------------|
| `user_id` | string | Filter by user |
| `decision` | NOW \| LATER \| NEVER | Filter by outcome |
| `page` | number | Page number (default: 1) |
| `limit` | number | Per page (default: 50) |
| `from` | ISO date | Start date filter |
| `to` | ISO date | End date filter |

---

#### `GET /v1/notifications/decisions/:id`
Retrieve a specific decision with full audit trail.

---

#### `GET /v1/notifications/users/:userId/history`
Get a user's notification history and current fatigue counters.

---

#### `GET /v1/notifications/stats`
Dashboard statistics — decision counts, channel breakdown, priority breakdown, recent decisions (last 24h).

---

### Rules

#### `GET /v1/rules`
List all suppression/prioritization rules.

#### `POST /v1/rules`
Create a new rule. No code deployment required.

**Request Body:**
```json
{
  "name": "Suppress Marketing During High Volume",
  "description": "Don't send promos if user got 3+ this hour",
  "conditions": {
    "event_type": ["promo", "marketing"],
    "recent_count_1h": { "gte": 3 }
  },
  "action": "NEVER",
  "priority": 80,
  "override_fatigue": false,
  "defer_minutes": 60,
  "is_active": true
}
```

**Available Condition Keys:**

| Key | Type | Example |
|-----|------|---------|
| `event_type` | string \| array | `["promo", "marketing"]` |
| `priority_hint` | string \| array | `["low", "medium"]` |
| `channel` | string \| array | `["push", "email"]` |
| `source` | string \| array | `["marketing-service"]` |
| `recent_count_1h` | object | `{ "gte": 3 }` |

#### `PUT /v1/rules/:id`
Update an existing rule.

#### `DELETE /v1/rules/:id`
Delete a rule.

---

#### `GET /health`
```json
{
  "status": "ok",
  "service": "Notification Prioritization Engine",
  "version": "1.0.0",
  "timestamp": "2025-03-01T10:00:00.000Z"
}
```

---

## 🖥 UI Screens (7 Total)

| # | Screen | Description |
|---|--------|-------------|
| 1 | **Dashboard** | Real-time stats, decision distribution pie chart, channel bar chart, recent decisions table |
| 2 | **Simulator** | Test any notification with presets (Critical Security, Direct Message, Promo, System Update) and see the full decision result |
| 3 | **Audit Log** | Paginated, filterable decision history — click any row to expand full details including AI reasoning |
| 4 | **Rules Manager** | Create, edit, delete prioritization rules via JSON editor — live without any redeployment |
| 5 | **User History** | Lookup any user's send history and current hourly fatigue counter |
| 6 | **Batch Processor** | Submit a JSON array of up to 100 events and see aggregated results |
| 7 | **Health Monitor** | Live service status checks, system info, and key performance metrics |

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- Anthropic API key _(optional — AI scoring has a built-in fallback)_

---

### 1. Clone the repository

```bash
git clone https://github.com/your-username/notification-engine-mern.git
cd notification-engine-mern
```

---

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env` with your values:
```env
MONGODB_URI=mongodb://localhost:27017/notification_engine
ANTHROPIC_API_KEY=sk-ant-api03-...
PORT=5000
FRONTEND_URL=http://localhost:3000
```

Seed default rules:
```bash
node src/scripts/seedRules.js
```

Start the server:
```bash
npm run dev       # development (nodemon)
npm start         # production
```

Server runs at: `http://localhost:5000`

---

### 3. Frontend Setup

```bash
cd frontend
npm install
echo "REACT_APP_API_URL=http://localhost:5000" > .env
npm start
```

App runs at: `http://localhost:3000`

---

### 4. Test it immediately

```bash
curl -X POST http://localhost:5000/v1/notifications/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_001",
    "event_type": "message",
    "message": "Alice sent you a message",
    "source": "chat-service",
    "priority_hint": "high",
    "channel": "push"
  }'
```

---

## 🔐 Environment Variables

### Backend (`.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MONGODB_URI` | ✅ Yes | — | MongoDB connection string |
| `ANTHROPIC_API_KEY` | ⚠️ Optional | — | Enables real AI scoring; fallback used if missing |
| `PORT` | No | `5000` | Server port |
| `NODE_ENV` | No | `development` | `development` or `production` |
| `FRONTEND_URL` | No | `*` | CORS origin whitelist |

### Frontend (`.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_API_URL` | ✅ Yes | Backend base URL |

---

## ☁️ Deployment

### Backend → Vercel

Create `backend/vercel.json`:
```json
{
  "version": 2,
  "builds": [{ "src": "src/server.js", "use": "@vercel/node" }],
  "routes": [{ "src": "/(.*)", "dest": "src/server.js" }]
}
```

```bash
cd backend
vercel --prod
```

Set environment variables in the Vercel dashboard: `MONGODB_URI`, `ANTHROPIC_API_KEY`, `NODE_ENV=production`.

---

### Backend → Railway

1. Connect your GitHub repo to [Railway](https://railway.app)
2. Set root directory to `backend`
3. Add env vars: `MONGODB_URI`, `ANTHROPIC_API_KEY`
4. Railway auto-detects Node.js and runs `npm start`

---

### Frontend → Vercel

```bash
cd frontend
# Create production env file
echo "REACT_APP_API_URL=https://your-backend.vercel.app" > .env.production
vercel --prod
```

---

### MongoDB Atlas (Free Tier)

1. Create a free cluster at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Under **Network Access**, add `0.0.0.0/0` to allow all IPs
3. Create a database user
4. Copy the connection string: `mongodb+srv://<user>:<pass>@cluster.mongodb.net/notification_engine`

After deploying, seed the rules:
```bash
MONGODB_URI=your_atlas_uri node backend/src/scripts/seedRules.js
```

---

## 🛡 Fail-Safe Strategy

The system is designed so **important notifications are never silently lost**.

| Failure Scenario | Behavior |
|-----------------|----------|
| AI timeout (>5s) | Fallback: `critical/high` → `NOW`, others → `LATER` |
| AI service error | Same as timeout — logged, does not crash |
| MongoDB unavailable | In-memory dedup cache + stale rule cache continue |
| Rule fetch failure | Stale 5-minute cache is used |
| Full system degradation | Emergency defaults: `critical` → `NOW`, all else → `LATER` |

**Key Principle:** When in doubt, defer — never suppress.

---

## 😮‍💨 Alert Fatigue Strategy

| Strategy | Implementation |
|----------|---------------|
| Per-channel cap | Max 10 notifications/channel/hour/user |
| Critical bypass | `priority_hint: critical` skips all fatigue limits |
| Rule override | Rules with `override_fatigue: true` bypass caps |
| Graceful downgrade | `NOW` decisions downgrade to `LATER` when cap is hit (never dropped) |
| Near-duplicate batching | Similar messages within 1h can be grouped into digest |

---

## 🔁 Deduplication

**Exact Duplicates**
- SHA-256 hash of `user_id + event_type + (dedupe_key OR message)`
- Checked against a 24-hour rolling in-memory cache + MongoDB history
- Match → `NEVER` with reason: _"Exact duplicate found in 24h history"_

**Near-Duplicates**
- Jaccard word-overlap similarity (words >3 chars) compared against last 10 events of the same `event_type` within the past hour
- Similarity >80% → `NEVER` with reason: _"Near-duplicate detected (85% similarity)"_

---

## 🤖 AI Tools Used

> In accordance with the assignment rules:

- **Claude (claude.ai)** was used for architecture design, code generation (backend services, React pages), and all documentation.
- **Manual changes made**: business logic tuning (fatigue thresholds, similarity cutoffs), UI layout and color decisions, error handling edge cases, and integration wiring between services.

---

## 📊 Default Seeded Rules

After running `seedRules.js`, these 5 rules are active:

| Rule | Condition | Action | Priority |
|------|-----------|--------|----------|
| Critical Security Alert | event_type in `[account_breach, suspicious_login, ...]` | **NOW** | 100 |
| Direct Message — Always Now | event_type in `[message, direct_message, chat]` + priority high/medium | **NOW** | 90 |
| Promotional Suppression — High Volume | event_type in `[promo, marketing]` + recent_count_1h ≥ 3 | **NEVER** | 80 |
| System Update — Defer | event_type in `[system_update, maintenance]` | **LATER** (2h) | 50 |
| Low Priority Promotion | event_type in `[promo, marketing]` + priority low | **LATER** (4h) | 40 |

---

## 📦 Data Models

### `NotificationEvent`
Stores every incoming raw event for traceability.

### `NotificationDecision`
Full audit log — every decision with reason, rule matched, AI score, decision path, and original event snapshot.

### `SuppressionRule`
Human-configurable rules stored in MongoDB. Editable at runtime via the Rules Manager UI or `PUT /v1/rules/:id`.

### `UserNotificationHistory`
24-hour rolling history per user with a MongoDB TTL index for automatic cleanup. Used for fatigue counting and deduplication.

---

## 📄 License

Built for **Cyepro Solutions — Round 2 Hiring Test**.  
For evaluation purposes only.
