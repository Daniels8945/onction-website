from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class Service(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    category: Optional[str] = None  # IT & Software | Logistics | Manufacturing | Consulting | Maintenance | Supply | Other
    unit: Optional[str] = None  # e.g. "per hour"
    unit_price: float = Field(default=0)
    description: Optional[str] = None
    active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


# --- API payload/response shapes -------------------------------------------

class ServiceCreate(SQLModel):
    name: str = Field(min_length=1, max_length=200)
    category: Optional[str] = Field(default=None, max_length=80)
    unit: Optional[str] = Field(default=None, max_length=40)
    unit_price: float = Field(default=0, ge=0)
    description: Optional[str] = Field(default=None, max_length=2000)
    active: bool = True


class ServiceUpdate(SQLModel):
    name: Optional[str] = None
    category: Optional[str] = None
    unit: Optional[str] = None
    unit_price: Optional[float] = None
    description: Optional[str] = None
    active: Optional[bool] = None


class ServiceRead(SQLModel):
    id: int
    name: str
    category: Optional[str]
    unit: Optional[str]
    unit_price: float
    description: Optional[str]
    active: bool
    created_at: datetime
    updated_at: Optional[datetime]
