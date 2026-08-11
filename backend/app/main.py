from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db
from .routers import admin_users, analytics, auth, enquiries, events, media, news, newsletter, pages, tasks

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Onction Energy API",
    description="Backend for the Onction Energy website: public site (enquiries, "
    "dynamic pages) plus the admin dashboard (auth, page builder, media, analytics).",
    version="2.0.0",
    lifespan=lifespan,
)

# Belt-and-suspenders: also ensure tables exist at import time, so the app
# works no matter how it's started (uvicorn, gunicorn, test client, etc.).
init_db()

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "onction-energy-api"}


app.include_router(auth.router)
app.include_router(admin_users.router)
app.include_router(enquiries.router)
app.include_router(pages.router)
app.include_router(media.router)
app.include_router(analytics.router)
app.include_router(news.router)
app.include_router(events.router)
app.include_router(newsletter.router)
app.include_router(tasks.router)
