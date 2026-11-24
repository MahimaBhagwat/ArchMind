# ArchMind

ArchMind is a tool that helps you plan the technical side of a software product before you start building it. You describe your idea in plain words, and it asks the right questions, identifies the decisions you need to make (like which database to use, how to handle auth, whether you need real-time features, etc.), and helps you think through each one. At the end, it generates a structured prompt you can feed directly into any AI coding tool to start building with a solid foundation.

---

## Features

- **AI-driven analysis** — describe a product idea and get a breakdown of the architectural decisions involved
- **Decision flow** — work through each decision one at a time, with priorities and dependencies handled for you
- **Alternatives comparison** — for each decision, see AI-generated options with trade-off analysis
- **Project persistence** — save your sessions and pick up where you left off
- **Report generation** — export a Markdown architecture report with a dependency graph
- **Auth** — register and log in; your projects are private to your account

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite |
| **Backend** | Python 3.12, FastAPI, Pydantic v2 |
| **Database** | MongoDB Atlas (Motor async driver) |
| **Auth** | JWT (python-jose), bcrypt |
| **AI** | Groq API (Llama) or Google Gemini API (switchable via env var) |

---

## Project Structure

```
archmind/
├── backend/          # FastAPI backend
│   ├── app/
│   │   ├── api/      # Route handlers (auth, ai, projects)
│   │   ├── core/     # Config, database, security
│   │   ├── models/   # Pydantic request/response models
│   │   └── services/ # AI pipelines, orchestration, report builder
│   ├── run.py        # Dev server entry point
│   ├── requirements.txt
│   └── .env.example
└── client/           # React frontend
    ├── src/
    │   ├── views/    # Page-level components
    │   ├── components/
    │   └── lib/      # API client, router
    ├── index.html
    └── vite.config.js
```

---

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)
- A [Groq](https://console.groq.com) or [Google AI Studio](https://aistudio.google.com) API key

---

### 1. Backend setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Open .env and fill in your values
```

**`.env` variables:**

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/archmind
JWT_SECRET=your-long-random-secret-string

# Choose one AI provider
AI_PROVIDER=groq           # or: gemini
GROQ_API_KEY=gsk_...
GEMINI_API_KEY=AIza...
```

**Start the backend:**

```bash
python run.py
# Runs at http://localhost:5000
```

---

### 2. Frontend setup

```bash
cd client
npm install
npm run dev
# Runs at http://localhost:5173
```

The Vite dev server proxies all `/api` requests to `http://localhost:5000` automatically — no extra config needed.

---

### 3. Open the app

Navigate to **http://localhost:5173** in your browser.

---

## API Overview

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Create account |
| `POST` | `/api/auth/login` | No | Login, receive JWT |
| `POST` | `/api/analyze` | No | Analyze a product idea |
| `POST` | `/api/alternatives` | Yes | Fetch alternatives for a decision |
| `POST` | `/api/generate` | Yes | Generate implementation prompt |
| `GET` | `/api/projects` | Yes | List saved projects |
| `POST` | `/api/projects` | Yes | Save a project |
| `GET` | `/api/projects/:id` | Yes | Load a project |
| `POST` | `/api/projects/:id/report` | Yes | Generate Markdown report |

Full interactive docs are available at **http://localhost:5000/docs** when the backend is running.

---

## Switching AI Provider

Set `AI_PROVIDER` in `backend/.env`:

```env
AI_PROVIDER=groq     # Groq (Llama models) — fast, free tier available
AI_PROVIDER=gemini   # Google Gemini
```

No code changes needed — the backend picks the provider at startup.

---

## License

This project is private and not licensed for public use. All rights reserved.
