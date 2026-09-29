from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


class VendorAuditLog(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    action: str
    performed_by: str = Field(default="Admin")
    details: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class VendorAuditLogRead(SQLModel):
    id: int
    action: str
    performed_by: str
    details: Optional[str]
    timestamp: datetime
