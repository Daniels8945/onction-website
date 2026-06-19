from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from .database import init_db, get_session
from .models import Enquiry, EnquiryCreate, EnquiryRead


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


app = FastAPI(
    title="Onction Energy API",
    description="Backend for the Onction Energy website (enquiries, etc.).",
    version="1.0.0",
    lifespan=lifespan,
)

# Belt-and-suspenders: also ensure tables exist at import time, so the app
# works no matter how it's started (uvicorn, gunicorn, test client, etc.).
init_db()

# Allow the Vite dev server (and your production domain) to call the API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        # add your production frontend origin here, e.g.
        # "https://onctionenergy.com",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "onction-energy-api"}


@app.post("/api/enquiries", response_model=EnquiryRead, status_code=201)
def create_enquiry(payload: EnquiryCreate, session: Session = Depends(get_session)):
    enquiry = Enquiry(**payload.model_dump())
    session.add(enquiry)
    session.commit()
    session.refresh(enquiry)
    return enquiry


@app.get("/api/enquiries", response_model=list[EnquiryRead])
def list_enquiries(session: Session = Depends(get_session)):
    """Simple admin listing — newest first.

    NOTE: unprotected for now. Put this behind auth before exposing publicly.
    """
    rows = session.exec(select(Enquiry).order_by(Enquiry.created_at.desc())).all()
    return rows
