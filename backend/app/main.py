"""FastAPI application entrypoint — port of server/index.js"""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import get_settings
from app.core.database import connect_db, close_db
from app.api.routes import auth, ai, projects

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle — connect/disconnect MongoDB."""
    logger.info("Connecting to MongoDB...")
    await connect_db()
    logger.info("MongoDB connected.")
    yield
    logger.info("Disconnecting from MongoDB...")
    await close_db()
    logger.info("MongoDB disconnected.")


settings = get_settings()

app = FastAPI(
    title="ArchMind API",
    description="Architectural decision assistant — turn a vague idea into a structured implementation prompt.",
    version="2.0.0",
    lifespan=lifespan,
    redirect_slashes=False,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(projects.router, prefix="/api")


@app.get("/api/health")
async def health():
    return {"status": "ok"}


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=502,
        content={"error": "An unexpected error occurred. Please try again.", "retryable": True},
    )
