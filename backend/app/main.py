from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .database import init_db
from .routers import (
    admin_users,
    analytics,
    auth,
    enquiries,
    events,
    invoices,
    media,
    news,
    newsletter,
    pages,
    services,
    tasks,
    vendor_audit,
    vendor_documents,
    vendor_notifications,
    vendor_platform_auth,
    vendor_settings,
    vendors,
)

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
app.include_router(vendors.router)
app.include_router(invoices.router)
app.include_router(vendor_documents.router)
app.include_router(services.router)
app.include_router(vendor_platform_auth.router)
app.include_router(vendor_notifications.router)
app.include_router(vendor_audit.router)
app.include_router(vendor_settings.router)
