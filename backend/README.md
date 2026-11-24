# ArchMind Backend (FastAPI)

Python FastAPI backend replacing the original Node.js/Express server. Full feature parity — same API contract, same response shapes, zero frontend changes required.

## Stack

| Layer | Tech |
|---|---|
| Framework | Python 3.12 + FastAPI + Uvicorn |
| Validation | Pydantic v2 + Pydantic-Settings |
| Database | MongoDB Atlas (async via Motor) |
| Auth | JWT (`python-jose`) + bcrypt (`passlib`) |
| LLM | Groq Python SDK **or** Google Gemini (`google-genai`) |

## Project Layout

```
backend/
├── app/
│   ├── main.py                      # FastAPI app, CORS, lifespan hooks
│   ├── core/
│   │   ├── config.py                # Pydantic BaseSettings (env vars)
│   │   ├── database.py              # Motor async MongoDB client
│   │   └── security.py             # bcrypt hashing + JWT create/decode
│   ├── models/                      # Pydantic request / response schemas
│   │   ├── user.py                  # UserRegister, UserLogin, TokenResponse
│   │   ├── decision.py              # Decision, Alternative, FlowAction
│   │   ├── analysis.py              # Analysis, AnalyzeRequest, ReadinessResult
│   │   └── project.py              # ProjectCreate, ProjectResponse, ReportRequest
│   ├── api/
│   │   ├── deps.py                  # get_current_user_id, get_database deps
│   │   └── routes/
│   │       ├── auth.py              # POST /api/auth/register, /api/auth/login
│   │       ├── ai.py                # POST /api/analyze, /api/alternatives, /api/generate
│   │       └── projects.py          # /api/projects CRUD + /:id/flow + /:id/report
│   └── services/
│       ├── ai/
│       │   ├── base.py              # AIProvider Protocol
│       │   ├── groq_provider.py     # Groq SDK: JSON + text generation
│       │   ├── gemini_provider.py   # Gemini SDK: JSON + text generation
│       │   └── provider_factory.py  # Pluggable provider selection via AI_PROVIDER env
│       ├── prompts.py               # All system prompts (ported from config/prompts.js)
│       ├── ai_service.py            # analyze_product, get_alternatives, generate_prompt
│       ├── orchestrator.py          # run_analysis_pipeline, run_alternatives_pipeline, run_generate_pipeline
│       ├── validation.py            # LLM output validation + repair
│       ├── decision_filter.py       # Architectural vs implementation filter
│       ├── decision_prioritizer.py  # Dedup + priority sort
│       ├── decision_flow.py         # resolve / skip / clarify state machine
│       ├── decision_graph.py        # Coupling graph builder (for reports)
│       ├── ambiguity.py             # Ambiguity classifier (decisions / needs_clarification / no_decisions_required)
│       ├── readiness.py             # Readiness computation (gates prompt generation)
│       └── report_builder.py        # Markdown architecture report + Mermaid graph
├── requirements.txt
├── .env.example
├── run.py                           # Quick-start: python run.py
└── README.md
```

## Setup

### 1. Create a virtual environment

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# Mac / Linux
# source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure environment variables

```bash
# Windows
copy .env.example .env

# Mac / Linux
# cp .env.example .env
```

Edit `.env`:

```env
# AI Provider: "groq" (default) or "gemini"
AI_PROVIDER=groq

GROQ_API_KEY=your-groq-key-here
GROQ_MODEL=qwen/qwen3.8-27b

# GEMINI_API_KEY=your-gemini-key-here
# GEMINI_MODEL=gemini-2.0-flash

MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>?retryWrites=true&w=majority

JWT_SECRET=any-long-random-string
```

### 4. Run the server

```bash
# Option A — quick start
python run.py

# Option B — uvicorn directly
uvicorn app.main:app --reload --port 5000
```

The API is at **http://localhost:5000**  
Interactive docs at **http://localhost:5000/docs**

---

## Running with the React frontend

The Vite dev proxy is already configured to forward `/api` to `http://localhost:5000`.

```bash
# Terminal 1 — FastAPI backend
cd backend
python run.py

# Terminal 2 — Vite + React frontend
cd client
npm run dev
```

Open **http://localhost:5173**. Everything works as before.

---

## API Reference

All endpoints except `/api/auth/*` and `POST /api/analyze` require `Authorization: Bearer <token>`.

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | No | Register — returns `{ user, token }` |
| `POST` | `/api/auth/login` | No | Login — returns `{ token }` |
| `POST` | `/api/analyze` | No | Analyze idea — returns `{ analysis, ambiguity, filteredOut }` |
| `POST` | `/api/alternatives` | Yes | Fetch alternatives for a decision |
| `POST` | `/api/generate` | Yes | Generate implementation prompt |
| `POST` | `/api/projects` | Yes | Save project |
| `GET` | `/api/projects` | Yes | List user's projects |
| `GET` | `/api/projects/{id}` | Yes | Get single project |
| `POST` | `/api/projects/{id}/report` | Yes | Generate architecture report (Markdown) |
| `GET` | `/api/projects/{id}/flow` | Yes | Get decision flow state |
| `POST` | `/api/projects/{id}/flow` | Yes | resolve / skip / clarify a decision |
| `GET` | `/api/health` | No | Health check |

---

## Production Deployment

### Backend (Render / Railway / Fly.io)

1. Set root directory to `backend/`.
2. **Build:** `pip install -r requirements.txt`
3. **Start:** `uvicorn app.main:app --host 0.0.0.0 --port 5000`
4. Environment variables: `AI_PROVIDER`, `GROQ_API_KEY` (or `GEMINI_API_KEY`), `MONGODB_URI`, `JWT_SECRET`, `CORS_ORIGINS=https://your-frontend.vercel.app`

### Frontend (Vercel)

Same as before — set `VITE_API_URL=https://your-backend.onrender.com/api`.
