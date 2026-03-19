import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import create_all
from routers.auth import router as auth_router
from routers.schedules import router as schedules_router
from services.scheduler import scheduler, setup_scheduler

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Creating database tables...")
    await create_all()
    logger.info("Starting scheduler...")
    await setup_scheduler()
    yield
    # Shutdown
    logger.info("Shutting down scheduler...")
    scheduler.shutdown(wait=False)
    logger.info("Scheduler stopped")


app = FastAPI(
    title="TikTok Upload Scheduler",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(schedules_router)


@app.get("/")
async def root():
    return {"message": "TikTok Upload Scheduler API", "version": "1.0.0"}
